# Kia · app de prueba

**Última actualización:** 15/11/2026

App de usar y tirar para medir en el móvil lo que el papel no resuelve en la decisión D11 (tecnología de la app del Kia). Sale del encargo del apartado 3 de `docs/app/evaluacion-tecnologia.md`, en el repositorio `kia-sportage`. No es el principio de la app real: se borra al cerrar D11.

- Url: https://mulheyamar.github.io/kia-app-prueba/
- React, TypeScript y Vite. Los datos se guardan en IndexedDB, dentro del navegador.
- Sin servidor, sin Supabase, sin datos personales, sin claves. No hace ninguna petición a otro dominio.

## Qué hace

- **Datos protegidos: Sí / No / No disponible.** Al abrir, pide a Chrome que proteja los datos (`navigator.storage.persist()`) y enseña lo que responde la consulta (`persisted()`), con la hora.
- **Registros de prueba: N** y **Último: nº N · fecha y hora · origen**.
- Botón **Añadir 10 registros de prueba** (origen «botón»).
- Acceso directo **Apuntar repostaje**, al mantener pulsado el icono: abre `./?pantalla=repostaje`, con el botón **Guardar repostaje de prueba** (+1, origen «acceso directo»).
- Pie: **Versión 1 · commit corto · fecha de publicación**. El número 1 está en `src/version.ts`.
- Abre sin red. El service worker (`src/service-worker.js`) guarda la app entera la primera vez. Cuando hay versión nueva, la descarga al abrir y la enseña en la apertura siguiente.

## Requisitos

- Node 22 o más reciente, con npm.
- git.
- Solo para las pruebas automáticas: el Chromium de Playwright (paso 2).

## Construir y probar en el PC

```
npm ci
npx playwright install chromium
npm run build
npm run pruebas
npm run a7
```

1. `npm ci` instala exactamente las versiones de `package-lock.json`.
2. `npx playwright install chromium` descarga el navegador de las pruebas. Basta una vez por equipo.
3. `npm run build` deja la app en `dist/`. El pie lleva el commit actual; si hay cambios sin commit, añade `+cambios`.
4. `npm run pruebas` construye la app, la sirve en `http://localhost:4173/` y pasa A2 a A6 en Chromium.
5. `npm run a7` busca claves, contraseñas y tokens en el repositorio, en todo el historial de git y en `dist/`.

Para A1 en local hacen falta dos terminales: en una, `npm run preview`; en la otra, `npm run a1 -- http://localhost:4173/`.

Para ver la app en el PC: `npm run preview` y abrir http://localhost:4173/. `npm run dev` también la abre, pero sin service worker.

## Publicar

### Una vez, a mano en GitHub

1. Crear el repositorio `kia-app-prueba`, **público** y vacío (sin README, sin .gitignore, sin licencia). GitHub Pages gratis solo publica repositorios públicos.
2. En el repositorio: Settings › Pages › Build and deployment › Source: **GitHub Actions**.
3. En el PC, dentro de esta carpeta:
   ```
   git remote add origin https://github.com/mulheyamar/kia-app-prueba.git
   git push -u origin main
   ```

### Cada vez

- `git push origin main` lanza la acción **Publicar** (`.github/workflows/publicar.yml`): `npm ci`, `npm run build` y publicación en Pages. Tarda uno o dos minutos.
- Para publicar sin commit nuevo: Actions › Publicar › Run workflow › main, o `gh workflow run publicar.yml`.
- Para seguirla: `gh run watch`, o la pestaña Actions.

### Comprobar lo publicado

```
npm run a1 -- https://mulheyamar.github.io/kia-app-prueba/
npm run a8 -- https://mulheyamar.github.io/kia-app-prueba/
npm run a7 -- --url https://mulheyamar.github.io/kia-app-prueba/
```

Pruebas A2 a A6 contra lo publicado, en lugar del servidor local:

- PowerShell: `$env:URL_PRUEBA='https://mulheyamar.github.io/kia-app-prueba/'; npm run pruebas; Remove-Item Env:URL_PRUEBA`
- bash: `URL_PRUEBA=https://mulheyamar.github.io/kia-app-prueba/ npm run pruebas`

A8 compara el pie con `git rev-parse --short=7 HEAD`. Antes de pasarlo, `git pull` para que tu HEAD sea lo publicado.

## Criterios de aceptación

| Nº | Dónde | Cómo se pasa |
|---|---|---|
| A1 | `scripts/a1-manifiesto.mjs` | `npm run a1 -- <url>` |
| A2 a A6 | `pruebas/app.spec.ts` | `npm run pruebas` (con `URL_PRUEBA` para lo publicado) |
| A7 | `scripts/a7-secretos.mjs` | `npm run a7 -- --url <url>`, después de la demostración de abajo |
| A8 | `scripts/a8-publicado.mjs` | `npm run a8 -- <url>` |
| A9 | Este README | Clonar en una carpeta vacía y seguir solo «Construir y probar» y «Publicar» |

### A7: demostrar antes que la búsqueda encuentra una clave

A7 solo vale si antes encuentra una clave falsa plantada. En PowerShell o bash, dentro de esta carpeta y con `dist/` construido:

```
node -e "require('fs').writeFileSync('clave-falsa-temporal.txt', 'SUPABASE_KEY=sb_' + 'secret_FALSA' + 'x'.repeat(24))"
npm run a7
```

Tiene que salir `A7: 1 coincidencias. FALLA`, con `clave-falsa-temporal.txt`. Después se borra `clave-falsa-temporal.txt` y se pasa `npm run a7` otra vez: 0 coincidencias. La clave se escribe por trozos en la orden para que el README no la contenga.

## Despublicar y volver a publicar (M7)

Despublicar:

1. En GitHub, repositorio `kia-app-prueba`: Settings › Pages. Según la documentación de GitHub, el aviso «Your site is live at…» también sale en la página principal del repositorio.
2. Junto a «Your site is live at…», el botón ⋯ › **Unpublish site**.
3. Comprobar en el PC en una **ventana de incógnito** (Ctrl+Mayús+N): la url ya no tiene que abrir la app. En una ventana normal donde ya se abrió, el service worker la sigue enseñando desde la copia guardada, y eso no cuenta. GitHub dice que el sitio «deja de estar disponible», sin decir qué página sale (lo esperado es un 404). También vale `curl -I https://mulheyamar.github.io/kia-app-prueba/`: no tiene que dar 200.

Volver a publicar:

1. Actions › Publicar › Run workflow › main, o `gh workflow run publicar.yml`. Según GitHub, una ejecución correcta de la acción crea un despliegue nuevo y el sitio vuelve.
2. Comprobar con `npm run a8 -- https://mulheyamar.github.io/kia-app-prueba/`: tiene que dar `A8: PASA`.

Al despublicar, GitHub no toca los ajustes ni el contenido. Si al volver a publicar la acción falla en «configure-pages», mira que Settings › Pages › Source siga en GitHub Actions.

## Publicar la versión 2 (M8)

1. En `src/version.ts`, cambiar `NUMERO_VERSION = 1` por `NUMERO_VERSION = 2`.
2. Commit, por ejemplo «Subir la app de prueba a la versión 2», y `git push origin main`.
3. Esperar a que termine la acción (`gh run watch`) y pasar `npm run a8 -- <url>`: el pie publicado tiene que decir «Versión 2» y el commit nuevo.
4. En el móvil, con datos, abrir la app, cerrarla y volver a abrirla. Apuntar en qué apertura sale «Versión 2» y cuántos minutos pasaron.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | Página única; enlaza el manifiesto |
| `src/main.tsx` | Arranca React y registra el service worker (solo en lo construido) |
| `src/App.tsx` | Las dos pantallas: principal y «Apuntar repostaje» |
| `src/datos.ts` | Registros en IndexedDB |
| `src/proteccion.ts` | `persist()` y `persisted()` |
| `src/version.ts` | Número de versión del pie (1 o 2) |
| `src/globales.d.ts` | Tipos de la versión y la fecha que pone Vite |
| `src/estilos.css` | Estilos, con modo oscuro |
| `src/service-worker.js` | Plantilla del service worker; al construir sale `dist/sw.js` |
| `public/manifest.webmanifest` | Manifiesto con iconos y acceso directo |
| `public/icono-192.png`, `public/icono-512.png` | Iconos, generados con `npm run iconos` (`scripts/iconos.mjs`) |
| `vite.config.ts` | Versión del pie y escritura de `dist/sw.js` |
| `tsconfig.json` | TypeScript |
| `playwright.config.ts`, `pruebas/app.spec.ts` | Pruebas A2 a A6 |
| `scripts/a1-manifiesto.mjs`, `scripts/a7-secretos.mjs`, `scripts/a8-publicado.mjs` | A1, A7 y A8 |
| `.github/workflows/publicar.yml` | Publicación en GitHub Pages |

## Dependencias

Dos de la app: `react` y `react-dom`. Cinco para construir y probar: `vite`, `typescript`, `@types/react`, `@types/react-dom` y `@playwright/test`. Todas con versión exacta y publicadas antes del 01/11/2026. No se usa `@vitejs/plugin-react`: Vite compila JSX sin él.
