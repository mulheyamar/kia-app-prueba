// Pide a Chrome que no borre los datos por falta de espacio (persist) y consulta
// qué ha decidido (persisted). Chrome decide sin preguntar.

export type Proteccion = { estado: 'Sí' | 'No' | 'No disponible'; hora: Date };

export async function pedirProteccion(): Promise<Proteccion> {
  const almacenamiento = navigator.storage;
  if (!almacenamiento?.persist || !almacenamiento.persisted) {
    return { estado: 'No disponible', hora: new Date() };
  }
  try {
    await almacenamiento.persist();
  } catch {
    // Si la petición falla, la consulta de abajo dice lo que hay.
  }
  try {
    const protegidos = await almacenamiento.persisted();
    return { estado: protegidos ? 'Sí' : 'No', hora: new Date() };
  } catch {
    return { estado: 'No disponible', hora: new Date() };
  }
}
