// Genera public/icono-192.png y public/icono-512.png sin dependencias:
// fondo azul a sangre y una K blanca dentro de la zona segura de los iconos «maskable».
// Uso: npm run iconos

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const FONDO = [0x1f, 0x3a, 0x5f];
const LETRA = [0xff, 0xff, 0xff];
// Trazos de la K en coordenadas de 0 a 1.
const TRAZOS = [
  [0.36, 0.3, 0.36, 0.7],
  [0.39, 0.53, 0.64, 0.3],
  [0.45, 0.47, 0.65, 0.7],
];
const GROSOR = 0.075;

function distanciaASegmento(px, py, [ax, ay, bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(datos) {
  let c = 0xffffffff;
  for (const byte of datos) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloque(tipo, datos) {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length);
  const tipoYDatos = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tipoYDatos));
  return Buffer.concat([longitud, tipoYDatos, crc]);
}

function png(lado) {
  const filas = [];
  for (let y = 0; y < lado; y++) {
    const fila = Buffer.alloc(1 + lado * 3); // primer byte: filtro 0
    for (let x = 0; x < lado; x++) {
      const px = (x + 0.5) / lado;
      const py = (y + 0.5) / lado;
      const d = Math.min(...TRAZOS.map((trazo) => distanciaASegmento(px, py, trazo)));
      // Borde suavizado de un píxel.
      const cobertura = Math.max(0, Math.min(1, (GROSOR / 2 - d) * lado + 0.5));
      for (let c = 0; c < 3; c++) {
        fila[1 + x * 3 + c] = Math.round(FONDO[c] + (LETRA[c] - FONDO[c]) * cobertura);
      }
    }
    filas.push(fila);
  }
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(lado, 0);
  cabecera.writeUInt32BE(lado, 4);
  cabecera[8] = 8; // bits por canal
  cabecera[9] = 2; // color RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', cabecera),
    bloque('IDAT', deflateSync(Buffer.concat(filas), { level: 9 })),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

for (const lado of [192, 512]) {
  const ruta = new URL(`../public/icono-${lado}.png`, import.meta.url);
  writeFileSync(ruta, png(lado));
  console.log(`public/icono-${lado}.png`);
}
