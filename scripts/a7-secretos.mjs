// A7: busca claves, contraseñas y tokens en el repositorio y en lo publicado.
// Uso:
//   npm run a7                       archivos del repositorio, historial de git y dist/
//   npm run a7 -- --url https://…/   además, cada archivo publicado en esa url
// Sale con código 1 si encuentra algo. Las coincidencias salen recortadas.
//
// Antes de fiarse del resultado hay que comprobar que encuentra una clave falsa
// plantada (ver README, «A7»).

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PATRONES = [
  ['clave secreta de Supabase', /sb_secret_[A-Za-z0-9_-]{10,}/],
  ['clave publicable de Supabase', /sb_publishable_[A-Za-z0-9_-]{10,}/],
  // Escrito en dos trozos para que el script no se encuentre a sí mismo.
  ['rol de servicio de Supabase', new RegExp('service' + '_role', 'i')],
  ['JWT (claves antiguas de Supabase y otros tokens)', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/],
  ['token de GitHub', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/],
  ['token fino de GitHub', /github_pat_[A-Za-z0-9_]{30,}/],
  ['clave de AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['clave de Google', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['clave sk- (OpenAI, Anthropic y otros)', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/],
  ['clave de Stripe', /\b[rs]k_(?:live|test)_[A-Za-z0-9]{10,}/],
  ['clave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  [
    'contraseña, clave o token con valor',
    /\b(?:password|passwd|pwd|contrase(?:ñ|n)a|clave|secret|token|api[_-]?key|apikey|access[_-]?key)\b["']?\s*[:=]\s*["'`][^"'`\s]{6,}["'`]/i,
  ],
  ['usuario y contraseña dentro de una url', /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@"'`]+:[^\s:/@"'`]+@/i],
  ['cookie de sesión', /\b(?:session|sessionid|sid|connect\.sid)=[A-Za-z0-9%._-]{16,}/i],
];

const encontradas = [];
let revisados = 0;

function revisar(origen, nombre, texto) {
  revisados++;
  const lineas = texto.split('\n');
  lineas.forEach((linea, i) => {
    for (const [tipo, patron] of PATRONES) {
      const coincidencia = linea.match(patron);
      if (coincidencia) {
        encontradas.push({ origen, nombre, linea: i + 1, tipo, muestra: coincidencia[0].slice(0, 14) + '…' });
      }
    }
  });
}

function git(orden) {
  try {
    return execSync(`git ${orden}`, { encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function archivosDe(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivosDe(ruta) : [ruta];
  });
}

// 1. Archivos del repositorio: los de git y los nuevos que git no ignora.
const archivos = git('ls-files --cached --others --exclude-standard -z').split('\0').filter(Boolean);
for (const archivo of archivos) {
  if (existsSync(archivo)) revisar('repositorio', archivo, readFileSync(archivo, 'utf8'));
}
console.log(`Repositorio: ${archivos.length} archivos`);

// 2. Todo el historial de git (cambios y mensajes de commit, de todas las ramas).
const historial = git('log -p --all --no-color');
const commits = (historial.match(/^commit [0-9a-f]{40}/gm) ?? []).length;
revisar('historial de git', 'git log -p --all', historial);
console.log(`Historial de git: ${commits} commits`);

// 3. Lo construido.
if (existsSync('dist')) {
  const construidos = archivosDe('dist');
  for (const ruta of construidos) revisar('dist', relative('.', ruta), readFileSync(ruta, 'utf8'));
  console.log(`dist/: ${construidos.length} archivos`);
} else {
  console.log('dist/: no existe (npm run build para crearlo)');
}

// 4. Lo publicado: la página, el manifiesto, sw.js y cada archivo que sw.js guarda.
const posicionUrl = process.argv.indexOf('--url');
if (posicionUrl !== -1) {
  const pagina = process.argv[posicionUrl + 1];
  const urls = new Set([new URL('./', pagina).href, new URL('sw.js', pagina).href, new URL('manifest.webmanifest', pagina).href]);
  const sw = await (await fetch(new URL('sw.js', pagina), { cache: 'no-store' })).text();
  const lista = sw.match(/const ARCHIVOS = (\[[\s\S]*?\]);/)?.[1];
  for (const archivo of lista ? JSON.parse(lista) : []) urls.add(new URL(archivo, pagina).href);
  for (const url of urls) {
    const respuesta = await fetch(url, { cache: 'no-store' });
    revisar('publicado', `${url} (${respuesta.status})`, await respuesta.text());
  }
  console.log(`Publicado en ${pagina}: ${urls.size} archivos`);
}

console.log(`\nPatrones buscados: ${PATRONES.length}. Textos revisados: ${revisados}.`);
if (encontradas.length === 0) {
  console.log('A7: 0 coincidencias. PASA');
  process.exit(0);
}
for (const e of encontradas) console.log(`  ${e.origen} · ${e.nombre}:${e.linea} · ${e.tipo} · ${e.muestra}`);
console.log(`A7: ${encontradas.length} coincidencias. FALLA`);
process.exit(1);
