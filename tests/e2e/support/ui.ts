import { expect, Page } from "@playwright/test";

export async function loginUi(page: Page, url: string, emailOrPhone: string, password: string) {
  await page.goto(url);
  const email = page.getByLabel(/correo|teléfono/i).first();
  await email.fill(emailOrPhone);
  await page.getByLabel(/contraseña/i).first().fill(password);
  await page.getByRole("button", { name: /ingresar/i }).click();
}

export async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.waitForLoadState("networkidle").catch(() => undefined);
  expect(errors, "sin errores de consola de la app").toEqual([]);
}
