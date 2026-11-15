import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Versión que sale en el pie: commit corto y fecha de construcción (= publicación).
function git(orden: string): string {
  try {
    return execSync(`git ${orden}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}
const commit = git('rev-parse --short=7 HEAD') || 'sin-commit';
const conCambios = git('status --porcelain') !== '';
const VERSION = conCambios ? `${commit}+cambios` : commit;
const FECHA = new Date().toISOString();

function archivosDe(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivosDe(ruta) : [ruta];
  });
}

// Escribe dist/sw.js a partir de src/service-worker.js con la versión y la lista
// de archivos que tiene que guardar para abrir sin red.
function serviceWorker(): Plugin {
  let raiz = '';
  let salida = '';
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved(config) {
      raiz = config.root;
      salida = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const archivos = archivosDe(salida)
        .map((ruta) => './' + relative(salida, ruta).split('\\').join('/'))
        .filter((ruta) => ruta !== './sw.js')
        .sort();
      const plantilla = readFileSync(join(raiz, 'src', 'service-worker.js'), 'utf8');
      const codigo = plantilla
        .replace('__VERSION_SW__', VERSION)
        .replace('/*ARCHIVOS*/ []', JSON.stringify(archivos, null, 2));
      writeFileSync(join(salida, 'sw.js'), codigo);
    },
  };
}

export default defineConfig({
  base: './',
  define: {
    __VERSION__: JSON.stringify(VERSION),
    __FECHA__: JSON.stringify(FECHA),
  },
  plugins: [serviceWorker()],
});
