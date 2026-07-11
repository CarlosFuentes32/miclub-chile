import { expect, test } from "@playwright/test";
import { adminApi, expectStatus, loginApi } from "../support/api";
import { cleanupQaArtifacts, createQaBusiness, qaRunId, validRut } from "../support/qa-data";
import { e2e } from "../support/env";
import { loginUi } from "../support/ui";

test.describe("Administrador", () => {
  test.afterEach(async () => {
    await cleanupQaArtifacts();
  });

  test("login válido e inválido", async ({ page }) => {
    await page.goto(e2e.adminUrl);
    await page.getByLabel(/correo/i).fill("no-existe@qa.miclubchile.cl");
    await page.getByLabel(/contraseña/i).fill("clave-invalida");
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();

    await page.getByLabel(/correo/i).fill(e2e.adminEmail);
    await page.getByLabel(/contraseña/i).fill(e2e.adminPassword);
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(page.getByRole("heading", { name: /dashboard global/i })).toBeVisible();
  });

  test("crear, editar, suspender, reactivar y eliminar comercio QA", async () => {
    const qa = await createQaBusiness(qaRunId("admin-business"));
    const admin = await adminApi();

    const edited = await admin.patch(`/admin/businesses/${qa.business.id}`, {
      data: { name: `${qa.business.name} Editado`, address: "Av. QA Editada 456" },
    });
    expect(edited.ok(), await edited.text()).toBeTruthy();
    expect((await edited.json()).name).toContain("Editado");

    await expectStatus(admin, "patch", `/admin/businesses/${qa.business.id}/status`, 200, { status: "suspended" });
    await expectStatus(admin, "patch", `/admin/businesses/${qa.business.id}/status`, 200, { status: "active" });
    await expectStatus(admin, "delete", `/admin/businesses/${qa.business.id}`, 200);
    await expectStatus(admin, "post", `/admin/businesses/${qa.business.id}/restore`, 201);
    await admin.dispose();
  });

  test("validar RUT y permitir escribir, corregir y borrar RUT completo en formulario", async ({ page }) => {
    await loginUi(page, e2e.adminUrl, e2e.adminEmail, e2e.adminPassword);
    await page.getByRole("link", { name: /comercios/i }).click();
    await page.getByRole("button", { name: /crear comercio|nuevo comercio|agregar/i }).first().click();
    const rut = page.getByLabel(/rut/i).first();
    await rut.fill(validRut("rut"));
    await expect(rut).not.toHaveValue("");
    await rut.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await rut.press("Backspace");
    await expect(rut).toHaveValue("");
    await rut.fill("12345678-9");
    await rut.press("ArrowLeft");
    await rut.press("Backspace");
    await expect(rut).not.toBeDisabled();
  });

  test("eliminar y reactivar usuario QA", async () => {
    const qa = await createQaBusiness(qaRunId("admin-user"));
    const admin = await adminApi();
    const ownerSession = await loginApi(qa.ownerEmail, qa.ownerPassword);
    expect(ownerSession.user.id).toBeTruthy();

    await expectStatus(admin, "delete", `/admin/users/${ownerSession.user.id}`, 200);
    await expectStatus(admin, "post", `/admin/users/${ownerSession.user.id}/reactivate`, 201);
    const relogin = await loginApi(qa.ownerEmail, qa.ownerPassword);
    expect(relogin.user.status).toBe("ACTIVE");
    await admin.dispose();
  });
});
