import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

type Recommendation = "Conservar" | "Revisar manualmente" | "Mover a staging" | "Anonimizar" | "Eliminar";

interface AuditItem {
  type: string;
  id: string;
  reference: string;
  createdAt: string | null;
  related: Record<string, number | string | null>;
  reasons: string[];
  deletionRisk: "Bajo" | "Medio" | "Alto" | "Crítico";
  recommendation: Recommendation;
}

const outputDir = join(process.cwd(), "audit-output");
const qaWords = /\b(qa|test|testing|prueba|demo|example|ejemplo|staging)\b/i;
const qaEmail = /(qa|test|testing|prueba|demo|example|staging)|@(example\.com|qa\.miclubchile\.cl|test\.com|demo\.com)$/i;
const knownQaDateStart = new Date("2026-07-05T00:00:00.000Z");

function requireReadOnlyConfirmation() {
  if (process.env.QA_AUDIT_CONFIRM !== "production-readonly") {
    throw new Error("Auditoría bloqueada: define QA_AUDIT_CONFIRM=production-readonly. El script es solo lectura.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("Auditoría bloqueada: DATABASE_URL no está definido.");
  }
}

function redactEmail(email?: string | null) {
  if (!email) return "sin email";
  const [name, domain] = email.split("@");
  if (!domain) return "[email inválido redactado]";
  return `${name.slice(0, 2)}***@${domain}`;
}

function redactPhone(phone?: string | null) {
  if (!phone) return "sin teléfono";
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : "***";
}

function redactRut(rut?: string | null) {
  if (!rut) return "sin RUT";
  const clean = rut.replace(/\s/g, "");
  return clean.length > 3 ? `***${clean.slice(-3)}` : "***";
}

function date(value?: Date | string | null) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function asJson(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) => {
      if (typeof item === "bigint") return item.toString();
      if (item && typeof item === "object" && "toNumber" in (item as any)) return (item as any).toNumber();
      return item;
    },
    2,
  );
}

function isFictitiousPhone(phone?: string | null) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  const tail = digits.slice(-8);
  return (
    /^(0+|1+|2+|9+)$/.test(tail) ||
    ["12345678", "87654321", "00000000", "11111111", "22222222", "99999999", "12345679"].includes(tail) ||
    digits.includes("56912345678") ||
    digits.includes("56900000000")
  );
}

function isTestRut(rut?: string | null) {
  if (!rut) return false;
  const clean = rut.replace(/[.\s]/g, "").toLowerCase();
  return /^(1{7,8}-?1|2{7,8}-?2|12345678-?9|11111111-?1|22222222-?2|00000000-?0)$/.test(clean);
}

function addReason(reasons: string[], condition: boolean, reason: string) {
  if (condition) reasons.push(reason);
}

function scoreRecommendation(reasons: string[], related: Record<string, number | string | null>): { deletionRisk: AuditItem["deletionRisk"]; recommendation: Recommendation } {
  const activity =
    Number(related.transactions ?? 0) +
    Number(related.rewards ?? 0) +
    Number(related.cycles ?? 0) +
    Number(related.payments ?? 0) +
    Number(related.customers ?? 0);
  const strongQa = reasons.some((reason) => /email|nombre|comercio|programa|recompensa|referencia/i.test(reason));
  if (activity >= 5) return { deletionRisk: "Alto", recommendation: strongQa ? "Mover a staging" : "Revisar manualmente" };
  if (activity > 0) return { deletionRisk: "Medio", recommendation: strongQa ? "Revisar manualmente" : "Conservar" };
  if (strongQa) return { deletionRisk: "Bajo", recommendation: "Eliminar" };
  return { deletionRisk: "Medio", recommendation: "Revisar manualmente" };
}

function dbFingerprint() {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(raw);
    return {
      protocol: url.protocol.replace(":", ""),
      host: url.hostname,
      database: url.pathname.replace("/", "") || null,
      appearsProduction: /railway|render|prod|production|miclub/i.test(`${url.hostname}/${url.pathname}`),
    };
  } catch {
    return { protocol: "unknown", host: "no parseable", database: null, appearsProduction: false };
  }
}

async function backupOperationalData(timestamp: string) {
  async function tableExists(table: string) {
    const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>("select to_regclass($1) is not null as exists", table);
    return Boolean(rows[0]?.exists);
  }
  async function rawTable(table: string, columns = "*") {
    if (!(await tableExists(table))) return [];
    return prisma.$queryRawUnsafe(`select ${columns} from ${table}`);
  }
  const backup = {
    generatedAt: new Date().toISOString(),
    note: "Respaldo JSON read-only previo a auditoría QA. Excluye passwordHash, tokens y sesiones.",
    users: await rawTable("users", "id,name,email,phone,rut,role,status,force_password_change,failed_login_attempts,locked_at,deleted_at,deleted_by_user_id,created_at,updated_at"),
    businesses: await rawTable("businesses"),
    businessUsers: await rawTable("business_users"),
    customerBusinesses: await rawTable("customer_businesses"),
    loyaltyPrograms: await rawTable("loyalty_programs"),
    cycles: await rawTable("cycles"),
    transactions: await rawTable("transactions"),
    rewards: await rawTable("rewards"),
    manualCustomers: await rawTable("manual_customers"),
    manualCustomerMovements: await rawTable("manual_customer_movements"),
    plans: await rawTable("plans"),
    businessSubscriptions: await rawTable("business_subscriptions"),
    billingPayments: await rawTable("billing_payments", "id,provider_payment_id,provider,business_id,subscription_id,amount,currency,status,paid_at,period_start,period_end,payment_method,reference,idempotency_key,created_at,updated_at"),
    commercialLeads: await rawTable("commercial_leads"),
  };
  const path = join(outputDir, `qa-production-backup-${timestamp}.json`);
  writeFileSync(path, asJson(backup), "utf8");
  return path;
}

async function buildAuditItems() {
  const items: AuditItem[] = [];

  async function exists(table: string) {
    const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>("select to_regclass($1) is not null as exists", table);
    return Boolean(rows[0]?.exists);
  }

  const users = await prisma.$queryRawUnsafe<any[]>(`
    select
      u.id,u.name,u.email,u.phone,u.rut,u.role,u.status,u.created_at,
      (select count(*)::int from business_users bu where bu.user_id = u.id) as business_memberships,
      (select count(*)::int from customer_businesses cb where cb.customer_user_id = u.id) as customer_memberships,
      (select count(*)::int from cycles c where c.customer_user_id = u.id) as cycles,
      (select count(*)::int from transactions t where t.customer_user_id = u.id) as customer_transactions,
      (select count(*)::int from rewards r where r.customer_user_id = u.id) as rewards,
      (select count(*)::int from businesses b where b.owner_user_id = u.id) as owned_businesses
    from users u
    order by u.created_at asc
  `);

  for (const user of users) {
    const reasons: string[] = [];
    addReason(reasons, qaEmail.test(user.email), "Correo contiene patrón QA/prueba/demo/example");
    addReason(reasons, qaWords.test(user.name), "Nombre contiene patrón QA/prueba/demo/test");
    addReason(reasons, isFictitiousPhone(user.phone), "Teléfono parece ficticio");
    addReason(reasons, isTestRut(user.rut), "RUT parece de prueba");
    addReason(reasons, new Date(user.created_at) >= knownQaDateStart && qaEmail.test(user.email), "Creado durante jornadas QA con email QA");
    if (reasons.length) {
      const related = {
        role: user.role,
        status: user.status,
        businessesOwned: user.owned_businesses,
        businessMemberships: user.business_memberships,
        customerMemberships: user.customer_memberships,
        cycles: user.cycles,
        transactions: user.customer_transactions,
        rewards: user.rewards,
      };
      const decision = scoreRecommendation(reasons, related);
      items.push({
        type: "Usuario",
        id: user.id,
        reference: `${user.name} / ${redactEmail(user.email)} / ${redactPhone(user.phone)} / ${redactRut(user.rut)}`,
        createdAt: date(user.created_at),
        related,
        reasons,
        ...decision,
      });
    }
  }

  const hasBillingPayments = await exists("billing_payments");
  const businesses = await prisma.$queryRawUnsafe<any[]>(`
    select
      b.*,
      u.name as owner_name,
      u.email as owner_email,
      (select count(*)::int from business_users bu where bu.business_id = b.id) as users_count,
      (select count(*)::int from loyalty_programs lp where lp.business_id = b.id) as programs_count,
      (select count(*)::int from customer_businesses cb where cb.business_id = b.id) as customers_count,
      (select count(*)::int from cycles c where c.business_id = b.id) as cycles_count,
      (select count(*)::int from transactions t where t.business_id = b.id) as transactions_count,
      (select count(*)::int from rewards r where r.business_id = b.id) as rewards_count,
      (select count(*)::int from manual_customers mc where mc.business_id = b.id) as manual_customers_count
      ${hasBillingPayments ? ", (select count(*)::int from billing_payments bp where bp.business_id = b.id) as payments_count" : ", 0 as payments_count"}
    from businesses b
    join users u on u.id = b.owner_user_id
    order by b.created_at asc
  `);

  for (const business of businesses) {
    const reasons: string[] = [];
    addReason(reasons, qaWords.test(`${business.name} ${business.slug} ${business.business_type} ${business.address}`), "Comercio contiene patrón QA/prueba/demo/test");
    addReason(reasons, qaEmail.test(business.email), "Email de comercio contiene patrón QA/prueba/demo/example");
    addReason(reasons, isFictitiousPhone(business.phone), "Teléfono de comercio parece ficticio");
    addReason(reasons, isTestRut(business.rut_business), "RUT de comercio parece de prueba");
    addReason(reasons, qaEmail.test(business.owner_email) || qaWords.test(business.owner_name), "Dueño del comercio parece usuario QA");
    if (reasons.length) {
      const related = {
        status: business.status,
        ownerId: business.owner_user_id,
        users: business.users_count,
        programs: business.programs_count,
        customers: business.customers_count,
        cycles: business.cycles_count,
        transactions: business.transactions_count,
        rewards: business.rewards_count,
        manualCustomers: business.manual_customers_count,
        payments: business.payments_count,
      };
      const decision = scoreRecommendation(reasons, related);
      items.push({
        type: "Comercio",
        id: business.id,
        reference: `${business.name} / ${business.slug} / ${redactEmail(business.email)} / ${redactRut(business.rut_business)}`,
        createdAt: date(business.created_at),
        related,
        reasons,
        ...decision,
      });
    }
  }

  const suspiciousBusinessIds = new Set(items.filter((item) => item.type === "Comercio").map((item) => item.id));
  const suspiciousUserIds = new Set(items.filter((item) => item.type === "Usuario").map((item) => item.id));

  const programs = await prisma.$queryRawUnsafe<any[]>(`
    select lp.*, b.name as business_name, (select count(*)::int from cycles c where c.loyalty_program_id = lp.id) as cycles_count
    from loyalty_programs lp
    join businesses b on b.id = lp.business_id
  `);
  for (const program of programs) {
    const reasons: string[] = [];
    addReason(reasons, qaWords.test(`${program.name} ${program.reward_description}`), "Programa o recompensa configurada contiene patrón QA/prueba/demo/test");
    addReason(reasons, suspiciousBusinessIds.has(program.business_id), "Programa asociado a comercio sospechoso");
    if (reasons.length) {
      const related = { businessId: program.business_id, business: program.business_name, cycles: program.cycles_count, status: program.status, version: program.version };
      const decision = scoreRecommendation(reasons, related);
      items.push({ type: "Programa de fidelización", id: program.id, reference: `${program.name} / ${program.reward_description}`, createdAt: date(program.created_at), related, reasons, ...decision });
    }
  }

  const rewards = await prisma.$queryRawUnsafe<any[]>(`
    select r.*, b.name as business_name, u.email as customer_email
    from rewards r
    join businesses b on b.id = r.business_id
    join users u on u.id = r.customer_user_id
  `);
  for (const reward of rewards) {
    const reasons: string[] = [];
    addReason(reasons, qaWords.test(reward.reward_description), "Descripción de recompensa contiene patrón QA/prueba/demo/test");
    addReason(reasons, suspiciousBusinessIds.has(reward.business_id), "Recompensa asociada a comercio sospechoso");
    addReason(reasons, suspiciousUserIds.has(reward.customer_user_id), "Recompensa asociada a usuario sospechoso");
    if (reasons.length) {
      const related = { businessId: reward.business_id, customerUserId: reward.customer_user_id, status: reward.status };
      const decision = scoreRecommendation(reasons, { ...related, rewards: 1 });
      items.push({ type: "Recompensa", id: reward.id, reference: `${reward.business_name} / ${reward.reward_description} / cliente ${redactEmail(reward.customer_email)}`, createdAt: date(reward.generated_at), related, reasons, ...decision });
    }
  }

  const transactions = await prisma.$queryRawUnsafe<any[]>(`
    select t.*, b.name as business_name, cu.email as customer_email, pu.email as performer_email
    from transactions t
    join businesses b on b.id = t.business_id
    join users cu on cu.id = t.customer_user_id
    join users pu on pu.id = t.performed_by_user_id
  `);
  for (const transaction of transactions) {
    const reasons: string[] = [];
    addReason(reasons, suspiciousBusinessIds.has(transaction.business_id), "Transacción asociada a comercio sospechoso");
    addReason(reasons, suspiciousUserIds.has(transaction.customer_user_id), "Transacción asociada a cliente sospechoso");
    addReason(reasons, suspiciousUserIds.has(transaction.performed_by_user_id), "Transacción realizada por usuario sospechoso");
    if (reasons.length) {
      items.push({
        type: "Transacción",
        id: transaction.id,
        reference: `${transaction.business_name} / cliente ${redactEmail(transaction.customer_email)} / cajero ${redactEmail(transaction.performer_email)}`,
        createdAt: date(transaction.created_at),
        related: { businessId: transaction.business_id, customerUserId: transaction.customer_user_id, performedByUserId: transaction.performed_by_user_id, status: transaction.status },
        reasons,
        deletionRisk: "Alto",
        recommendation: "Revisar manualmente",
      });
    }
  }

  const manualCustomers = await prisma.$queryRawUnsafe<any[]>(`
    select mc.*, b.name as business_name, (select count(*)::int from manual_customer_movements mcm where mcm.manual_customer_id = mc.id) as movements_count
    from manual_customers mc
    join businesses b on b.id = mc.business_id
  `);
  for (const customer of manualCustomers) {
    const reasons: string[] = [];
    addReason(reasons, qaWords.test(`${customer.first_name} ${customer.last_name} ${customer.observation ?? ""}`), "Cliente manual contiene patrón QA/prueba/demo/test");
    addReason(reasons, isFictitiousPhone(customer.phone), "Teléfono de cliente manual parece ficticio");
    addReason(reasons, isTestRut(customer.rut), "RUT de cliente manual parece de prueba");
    addReason(reasons, suspiciousBusinessIds.has(customer.business_id), "Cliente manual asociado a comercio sospechoso");
    if (reasons.length) {
      const related = { businessId: customer.business_id, movements: customer.movements_count, status: customer.status };
      const decision = scoreRecommendation(reasons, { ...related, transactions: customer.movements_count });
      items.push({ type: "Cliente manual", id: customer.id, reference: `${customer.first_name} ${customer.last_name} / ${customer.business_name} / ${redactPhone(customer.phone)} / ${redactRut(customer.rut)}`, createdAt: date(customer.created_at), related, reasons, ...decision });
    }
  }

  if (await exists("commercial_leads")) {
    const leads = await prisma.$queryRawUnsafe<any[]>("select * from commercial_leads");
    for (const lead of leads) {
      const reasons: string[] = [];
      addReason(reasons, qaWords.test(`${lead.name} ${lead.business} ${lead.message} ${lead.industry}`), "Lead comercial contiene patrón QA/prueba/demo/test");
      addReason(reasons, qaEmail.test(lead.email), "Email de lead contiene patrón QA/prueba/demo/example");
      addReason(reasons, isFictitiousPhone(lead.phone), "Teléfono de lead parece ficticio");
      if (reasons.length) {
        const related = { status: lead.status, source: lead.source };
        const decision = scoreRecommendation(reasons, related);
        items.push({ type: "Lead comercial", id: lead.id, reference: `${lead.name} / ${lead.business} / ${redactEmail(lead.email)} / ${redactPhone(lead.phone)}`, createdAt: date(lead.created_at), related, reasons, ...decision });
      }
    }
  }

  const phoneGroups = new Map<string, typeof users>();
  for (const user of users) {
    const phone = user.phone?.replace(/\D/g, "");
    if (!phone) continue;
    phoneGroups.set(phone, [...(phoneGroups.get(phone) ?? []), user]);
  }
  for (const [phone, group] of phoneGroups.entries()) {
    if (group.length > 1) {
      items.push({
        type: "Duplicado teléfono usuario",
        id: phone,
        reference: `${redactPhone(phone)} usado por ${group.length} usuarios`,
        createdAt: null,
        related: { users: group.length },
        reasons: ["Teléfono duplicado entre usuarios"],
        deletionRisk: "Alto",
        recommendation: "Revisar manualmente",
      });
    }
  }

  return items.sort((a, b) => a.type.localeCompare(b.type) || (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
}

function writeMarkdown(timestamp: string, fingerprint: Awaited<ReturnType<typeof dbFingerprint>>, backupPath: string, items: AuditItem[]) {
  const summary = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});
  const lines = [
    "# Auditoría QA producción MiClub Chile",
    "",
    `Generado: ${new Date().toISOString()}`,
    "",
    "## Respaldo previo",
    "",
    `- Respaldo JSON read-only local: \`${backupPath}\``,
    "- No incluye contraseñas, hashes, tokens ni sesiones.",
    "- No se ejecutaron escrituras en la base de datos.",
    "",
    "## Base auditada",
    "",
    `- Host: ${fingerprint.host}`,
    `- Base: ${fingerprint.database ?? "no identificada"}`,
    `- Parece producción: ${fingerprint.appearsProduction ? "sí" : "no concluyente"}`,
    "",
    "## Resumen por tipo",
    "",
    ...Object.entries(summary).map(([type, count]) => `- ${type}: ${count}`),
    "",
    "## Elementos sospechosos",
    "",
  ];
  for (const item of items) {
    lines.push(
      `### ${item.type}: ${item.id}`,
      "",
      `- Referencia: ${item.reference}`,
      `- Fecha creación: ${item.createdAt ?? "no disponible"}`,
      `- Relacionados: \`${JSON.stringify(item.related)}\``,
      `- Motivos: ${item.reasons.join("; ")}`,
      `- Riesgo de eliminar: ${item.deletionRisk}`,
      `- Recomendación: ${item.recommendation}`,
      "",
    );
  }
  const path = join(outputDir, `qa-production-audit-${timestamp}.md`);
  writeFileSync(path, lines.join("\n"), "utf8");
  return path;
}

async function main() {
  requireReadOnlyConfirmation();
  mkdirSync(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fingerprint = dbFingerprint();
  const backupPath = await backupOperationalData(timestamp);
  const items = await buildAuditItems();
  const jsonPath = join(outputDir, `qa-production-audit-${timestamp}.json`);
  const latestPath = join(outputDir, "qa-production-audit-latest.json");
  const payload = { generatedAt: new Date().toISOString(), database: fingerprint, backupPath, items };
  writeFileSync(jsonPath, asJson(payload), "utf8");
  writeFileSync(latestPath, asJson(payload), "utf8");
  const mdPath = writeMarkdown(timestamp, fingerprint, backupPath, items);
  console.log(`Auditoría QA finalizada. Candidatos: ${items.length}`);
  console.log(`Informe Markdown: ${mdPath}`);
  console.log(`Informe JSON: ${jsonPath}`);
  console.log(`Backup JSON: ${backupPath}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
