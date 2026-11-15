// A1: lee el manifiesto publicado y comprueba lo que pide el apartado 3.
// Uso: npm run a1 -- https://mulheyamar.github.io/kia-app-prueba/
// Sale con código 1 si falta algo.

const pagina = process.argv[2];
if (!pagina) {
  console.error('Falta la url de la página. Ejemplo: npm run a1 -- https://usuario.github.io/kia-app-prueba/');
  process.exit(2);
}

const fallos = [];
function comprobar(bien, texto) {
  console.log(`${bien ? 'ok   ' : 'FALLA'} ${texto}`);
  if (!bien) fallos.push(texto);
}

async function pedir(url) {
  const respuesta = await fetch(url, { cache: 'no-store' });
  return respuesta;
}

// Ancho y alto de un PNG: bytes 16 a 23 de la cabecera IHDR.
function ladoPng(bytes) {
  const firma = [0x89, 0x50, 0x4e, 0x47];
  if (!firma.every((b, i) => bytes[i] === b)) return null;
  const vista = new DataView(bytes.buffer, bytes.byteOffset);
  return `${vista.getUint32(16)}x${vista.getUint32(20)}`;
}

const html = await (await pedir(pagina)).text();
const etiqueta = html.match(/<link[^>]*rel=["']manifest["'][^>]*>/i)?.[0];
const href = etiqueta?.match(/href=["']([^"']+)["']/i)?.[1];
comprobar(Boolean(href), `la página enlaza un manifiesto (${href ?? 'ninguno'})`);
if (!href) process.exit(1);

const urlManifiesto = new URL(href, pagina);
const respuesta = await pedir(urlManifiesto);
comprobar(respuesta.ok, `${urlManifiesto} responde ${respuesta.status}`);
const manifiesto = await respuesta.json();

comprobar(typeof manifiesto.name === 'string' && manifiesto.name.length > 0, `name: ${JSON.stringify(manifiesto.name)}`);
comprobar(typeof manifiesto.start_url === 'string', `start_url: ${JSON.stringify(manifiesto.start_url)}`);
comprobar(manifiesto.display === 'standalone', `display: ${JSON.stringify(manifiesto.display)}`);

const ambito = new URL(manifiesto.scope ?? './', urlManifiesto).href;

for (const lado of ['192x192', '512x512']) {
  const icono = (manifiesto.icons ?? []).find(
    (i) => (i.sizes ?? '').split(' ').includes(lado) && (i.purpose ?? 'any').split(' ').includes('any'),
  );
  if (!icono) {
    comprobar(false, `icono de ${lado}`);
    continue;
  }
  const urlIcono = new URL(icono.src, urlManifiesto);
  const r = await pedir(urlIcono);
  const real = r.ok ? ladoPng(new Uint8Array(await r.arrayBuffer())) : null;
  comprobar(r.ok && real === lado, `icono de ${lado}: ${urlIcono} responde ${r.status}, PNG de ${real ?? '?'}`);
}

const atajo = (manifiesto.shortcuts ?? []).find((s) => s.name === 'Apuntar repostaje');
comprobar(Boolean(atajo), 'acceso directo «Apuntar repostaje»');
if (atajo) {
  const urlAtajo = atajo.url ? new URL(atajo.url, urlManifiesto).href : '';
  comprobar(Boolean(atajo.url), `url del acceso directo: ${urlAtajo || 'ninguna'}`);
  if (urlAtajo) comprobar(urlAtajo.startsWith(ambito), `el acceso directo está dentro del ámbito ${ambito}`);
}

console.log(fallos.length === 0 ? '\nA1: PASA' : `\nA1: FALLA (${fallos.length})`);
process.exit(fallos.length === 0 ? 0 : 1);
