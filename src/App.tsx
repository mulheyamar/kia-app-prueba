import { useEffect, useState } from 'react';
import { anadir, leerResumen, type Resumen } from './datos';
import { pedirProteccion, type Proteccion } from './proteccion';
import { NUMERO_VERSION } from './version';

function fechaHora(fecha: Date): string {
  const dos = (numero: number) => String(numero).padStart(2, '0');
  return (
    `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ` +
    `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`
  );
}

function textoUltimo(resumen: Resumen | null): string {
  if (!resumen) return '…';
  if (!resumen.ultimo) return 'ninguno';
  const { n, fecha, origen } = resumen.ultimo;
  return `nº ${n} · ${fechaHora(new Date(fecha))} · ${origen}`;
}

// El acceso directo del manifiesto abre ./?pantalla=repostaje
const esRepostaje = new URLSearchParams(location.search).get('pantalla') === 'repostaje';

export function App() {
  const [proteccion, setProteccion] = useState<Proteccion | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pedirProteccion().then(setProteccion);
    leerResumen()
      .then(setResumen)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  async function guardar(cantidad: number, origen: string) {
    setOcupado(true);
    try {
      setResumen(await anadir(cantidad, origen));
    } catch (e) {
      setError(String(e));
    } finally {
      setOcupado(false);
    }
  }

  const bloqueado = ocupado || !resumen;

  return (
    <main>
      <h1>{esRepostaje ? 'Apuntar repostaje' : 'App de prueba'}</h1>

      <section className="estado">
        <p>
          Datos protegidos: <strong>{proteccion ? proteccion.estado : '…'}</strong>
        </p>
        {proteccion && <p className="nota">Consultado el {fechaHora(proteccion.hora)}</p>}
        <p>Registros de prueba: {resumen ? resumen.total : '…'}</p>
        <p>Último: {textoUltimo(resumen)}</p>
      </section>

      {esRepostaje ? (
        <>
          <button type="button" disabled={bloqueado} onClick={() => guardar(1, 'acceso directo')}>
            Guardar repostaje de prueba
          </button>
          <a href="./">Ir a la pantalla principal</a>
        </>
      ) : (
        <button type="button" disabled={bloqueado} onClick={() => guardar(10, 'botón')}>
          Añadir 10 registros de prueba
        </button>
      )}

      {error && <p role="alert">Error: {error}</p>}

      <footer>
        Versión {NUMERO_VERSION} · {__VERSION__} · {fechaHora(new Date(__FECHA__))}
      </footer>
    </main>
  );
}
