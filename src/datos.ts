// Registros de prueba en IndexedDB. El número (n) lo pone la base de datos: 1, 2, 3…

export type Registro = { n: number; fecha: string; origen: string };
export type Resumen = { total: number; ultimo: Registro | null };

const BASE = 'kia-app-prueba';
const ALMACEN = 'registros';

let conexion: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  conexion ??= new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(BASE, 1);
    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore(ALMACEN, { keyPath: 'n', autoIncrement: true });
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
  return conexion;
}

export async function leerResumen(): Promise<Resumen> {
  const base = await abrir();
  return new Promise((resolver, rechazar) => {
    const transaccion = base.transaction(ALMACEN, 'readonly');
    const almacen = transaccion.objectStore(ALMACEN);
    const total = almacen.count();
    let ultimo: Registro | null = null;
    const cursor = almacen.openCursor(null, 'prev');
    cursor.onsuccess = () => {
      ultimo = (cursor.result?.value as Registro | undefined) ?? null;
    };
    transaccion.oncomplete = () => resolver({ total: total.result, ultimo });
    transaccion.onerror = () => rechazar(transaccion.error);
  });
}

export async function anadir(cantidad: number, origen: string): Promise<Resumen> {
  const base = await abrir();
  await new Promise<void>((resolver, rechazar) => {
    // durability 'strict': no da por guardado hasta que está escrito en disco.
    const transaccion = base.transaction(ALMACEN, 'readwrite', { durability: 'strict' });
    const almacen = transaccion.objectStore(ALMACEN);
    for (let i = 0; i < cantidad; i++) {
      almacen.add({ fecha: new Date().toISOString(), origen });
    }
    transaccion.oncomplete = () => resolver();
    transaccion.onerror = () => rechazar(transaccion.error);
    transaccion.onabort = () => rechazar(transaccion.error);
  });
  return leerResumen();
}
