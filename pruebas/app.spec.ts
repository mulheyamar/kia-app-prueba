// Criterios A2 a A6 del apartado 3 de docs/app/evaluacion-tecnologia.md (repositorio kia-sportage).
// Cada prueba empieza con el navegador vacío. Se ejecutan en orden: A6 usa lo que apuntan A2 a A4.

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const peticiones: string[] = [];

function apuntarPeticiones(contexto: BrowserContext) {
  contexto.on('request', (peticion) => peticiones.push(peticion.url()));
}

async function leerTotal(pagina: Page): Promise<number> {
  const linea = pagina.getByText(/^Registros de prueba: \d+$/);
  await expect(linea).toBeVisible();
  return Number((await linea.textContent())!.match(/\d+/)![0]);
}

function lineaTotal(pagina: Page, total: number) {
  return pagina.getByText(`Registros de prueba: ${total}`, { exact: true });
}

function lineaUltimo(pagina: Page, numero: number, origen: string) {
  return pagina.getByText(new RegExp(`^Último: nº ${numero} · \\d\\d/\\d\\d/\\d{4} \\d\\d:\\d\\d:\\d\\d · ${origen}$`));
}

async function esperarServiceWorker(pagina: Page) {
  await pagina.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((listo) =>
        navigator.serviceWorker.addEventListener('controllerchange', listo, { once: true }),
      );
    }
  });
}

test('A2: «Añadir 10» y recargar da N+10', async ({ page, context }) => {
  apuntarPeticiones(context);
  await page.goto('./');
  const n = await leerTotal(page);
  await page.getByRole('button', { name: 'Añadir 10 registros de prueba' }).click();
  await expect(lineaTotal(page, n + 10)).toBeVisible();
  await page.reload();
  await expect(lineaTotal(page, n + 10)).toBeVisible();
  await expect(lineaUltimo(page, n + 10, 'botón')).toBeVisible();
  console.log(`A2: N=${n}; tras «Añadir 10» y recargar: ${await page.getByText(/^Registros de prueba/).textContent()} | ${await page.getByText(/^Último/).textContent()}`);
});

test('A3: sin red tras la primera carga sigue abriendo con N+10', async ({ page, context }) => {
  apuntarPeticiones(context);
  await page.goto('./');
  const n = await leerTotal(page);
  await page.getByRole('button', { name: 'Añadir 10 registros de prueba' }).click();
  await expect(lineaTotal(page, n + 10)).toBeVisible();
  await esperarServiceWorker(page);
  await context.setOffline(true);
  const sinRed = await page.evaluate(() => fetch('./?comprobar-red=' + Date.now(), { cache: 'no-store' }).then(() => 'hay red', () => 'sin red'));
  await page.reload();
  await expect(lineaTotal(page, n + 10)).toBeVisible();
  await expect(lineaUltimo(page, n + 10, 'botón')).toBeVisible();
  console.log(`A3: red cortada (${sinRed}); tras recargar: ${await page.getByText(/^Registros de prueba/).textContent()}`);
  await context.setOffline(false);
});

test('A4: el acceso directo abre «Apuntar repostaje» y suma exactamente 1', async ({ page, context }) => {
  apuntarPeticiones(context);
  await page.goto('./');
  // Las dos url salen del manifiesto, no están escritas aquí.
  const { acceso, inicio } = await page.evaluate(async () => {
    const enlace = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!;
    const manifiesto = await (await fetch(enlace.href)).json();
    const atajo = manifiesto.shortcuts.find((s: { name: string }) => s.name === 'Apuntar repostaje');
    return {
      acceso: new URL(atajo.url, enlace.href).href,
      inicio: new URL(manifiesto.start_url, enlace.href).href,
    };
  });

  await page.goto(acceso);
  await expect(page.getByRole('heading', { name: 'Apuntar repostaje' })).toBeVisible();

  await page.goto(inicio);
  const n = await leerTotal(page);
  await expect(page.getByText('Apuntar repostaje')).toHaveCount(0);

  await page.goto(acceso);
  await page.getByRole('button', { name: 'Guardar repostaje de prueba' }).click();
  await expect(lineaTotal(page, n + 1)).toBeVisible();
  await expect(lineaUltimo(page, n + 1, 'acceso directo')).toBeVisible();

  await page.goto(inicio);
  await expect(lineaTotal(page, n + 1)).toBeVisible();
  console.log(`A4: acceso directo ${acceso} | inicio ${inicio} | antes ${n}, después ${await page.getByText(/^Registros de prueba/).textContent()} | ${await page.getByText(/^Último/).textContent()}`);
});

test('A5: la pantalla pasa de «Sí» a «No» cuando la protección cambia', async ({ page }) => {
  const simular = (valor: boolean) => {
    Object.defineProperty(navigator.storage, 'persist', { configurable: true, value: async () => valor });
    Object.defineProperty(navigator.storage, 'persisted', { configurable: true, value: async () => valor });
  };
  await page.addInitScript(simular, true);
  await page.goto('./');
  await expect(page.getByText('Datos protegidos: Sí', { exact: true })).toBeVisible();
  const conSi = await page.getByText(/^Datos protegidos/).textContent();

  await page.addInitScript(simular, false);
  await page.reload();
  await expect(page.getByText('Datos protegidos: No', { exact: true })).toBeVisible();
  console.log(`A5: simulado sí → «${conSi}»; simulado no → «${await page.getByText(/^Datos protegidos/).textContent()}» (${await page.getByText(/^Consultado/).textContent()})`);
});

test('A6: ninguna petición de A2 a A4 va a otro dominio', async ({ baseURL }) => {
  const origen = new URL(baseURL!).origin;
  const porOrigen = new Map<string, number>();
  for (const url of peticiones) {
    const o = new URL(url).origin;
    porOrigen.set(o, (porOrigen.get(o) ?? 0) + 1);
  }
  console.log(`A6: ${peticiones.length} peticiones apuntadas en A2–A4`);
  for (const [o, cuantas] of porOrigen) console.log(`A6:   ${o} → ${cuantas}`);
  expect(peticiones.length).toBeGreaterThan(0);
  expect(peticiones.filter((url) => new URL(url).origin !== origen)).toEqual([]);
});
