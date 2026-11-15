// A8: la url https de la página, del manifiesto y del service worker responden 200,
// y la versión del pie es la del último commit.
// Uso: npm run a8 -- https://mulheyamar.github.io/kia-app-prueba/
// Lee el pie con Chromium (Playwright), igual que lo vería el móvil.

import { execSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const pagina = process.argv[2];
if (!pagina) {
  console.error('Falta la url. Ejemplo: npm run a8 -- https://usuario.github.io/kia-app-prueba/');
  process.exit(2);
}

const fallos = [];
function comprobar(bien, texto) {
  console.log(`${bien ? 'ok   ' : 'FALLA'} ${texto}`);
  if (!bien) fallos.push(texto);
}

comprobar(new URL(pagina).protocol === 'https:', `la url es https: ${pagina}`);

const html = await (await fetch(pagina, { cache: 'no-store' })).text();
const href = html.match(/<link[^>]*rel=["']manifest["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? 'manifest.webmanifest';
const urls = {
  'página': new URL(pagina),
  manifiesto: new URL(href, pagina),
  'service worker': new URL('sw.js', pagina),
};
for (const [nombre, url] of Object.entries(urls)) {
  const respuesta = await fetch(url, { cache: 'no-store' });
  comprobar(respuesta.status === 200, `${nombre}: ${url} responde ${respuesta.status}`);
}

let commit = '(sin commits)';
try {
  commit = execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch {
  // Sin commits la comparación de abajo falla, que es lo que tiene que pasar.
}
const navegador = await chromium.launch();
try {
  const pestana = await navegador.newPage();
  await pestana.goto(pagina);
  const pie = (await pestana.locator('footer').textContent({ timeout: 15_000 })) ?? '';
  const publicada = pie.match(/· ([0-9a-f]{7}\S*) ·/)?.[1] ?? '(no se lee)';
  console.log(`      pie publicado: «${pie.trim()}»`);
  comprobar(publicada === commit, `versión del pie ${publicada} = último commit ${commit}`);
} finally {
  await navegador.close();
}

console.log(fallos.length === 0 ? '\nA8: PASA' : `\nA8: FALLA (${fallos.length})`);
process.exit(fallos.length === 0 ? 0 : 1);
