import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const reportPath = process.env.QA_AUDIT_REPORT ?? join(process.cwd(), "audit-output", "qa-production-audit-latest.json");

if (!existsSync(reportPath)) {
  console.error(`No existe informe de auditoría: ${reportPath}`);
  console.error("Ejecuta primero: $env:QA_AUDIT_CONFIRM='production-readonly'; npm.cmd run audit:qa-prod");
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
  generatedAt: string;
  items: Array<{
    type: string;
    id: string;
    reference: string;
    recommendation: string;
    deletionRisk: string;
    reasons: string[];
    related: Record<string, unknown>;
  }>;
};

const removable = report.items.filter((item) => ["Eliminar", "Anonimizar", "Mover a staging"].includes(item.recommendation));

console.log("DRY-RUN limpieza QA MiClub Chile");
console.log(`Informe base: ${reportPath}`);
console.log(`Generado: ${report.generatedAt}`);
console.log("No se ejecutará ningún cambio en la base de datos.");
console.log("");
console.log(`Candidatos con acción potencial: ${removable.length}`);

for (const item of removable) {
  console.log("");
  console.log(`- ${item.type} ${item.id}`);
  console.log(`  Referencia: ${item.reference}`);
  console.log(`  Acción sugerida: ${item.recommendation}`);
  console.log(`  Riesgo: ${item.deletionRisk}`);
  console.log(`  Motivos: ${item.reasons.join("; ")}`);
  console.log(`  Relacionados: ${JSON.stringify(item.related)}`);
}

console.log("");
console.log("Este script es solo simulación. Para eliminar/anonimizar se requiere una instrucción separada y un script específico aprobado.");
