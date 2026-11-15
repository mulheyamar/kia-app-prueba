import { defineConfig } from '@playwright/test';

// Sin URL_PRUEBA: construye la app y la prueba en local (http://localhost:4173/).
// Con URL_PRUEBA=https://…/ : prueba lo publicado.
const publicada = process.env.URL_PRUEBA;
const url = publicada ? (publicada.endsWith('/') ? publicada : `${publicada}/`) : 'http://localhost:4173/';

export default defineConfig({
  testDir: 'pruebas',
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: url,
    browserName: 'chromium',
  },
  webServer: publicada
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
