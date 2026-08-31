import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

type Opcion = { id: number; nombre: string };

type Props = {
  opciones: Opcion[];
  valor: number | null;
  onChange: (id: number | null) => void;
  onCrear: (nombre: string) => Promise<Opcion>;
  placeholder: string;
  creando?: boolean;
};

export function ComboCreable({
  opciones,
  valor,
  onChange,
  onCrear,
  placeholder,
  creando = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const seleccionada = opciones.find((o) => o.id === valor);
  const escrito = busqueda.trim();
  const yaExiste = opciones.some(
    (o) => o.nombre.toLowerCase() === escrito.toLowerCase()
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (abierto && inputRef.current) {
      inputRef.current.focus();
    }
  }, [abierto]);

  async function crear() {
    const nueva = await onCrear(escrito);
    onChange(nueva.id);
    setBusqueda('');
    setAbierto(false);
  }

  const visibles = opciones.filter(o => 
    o.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="relative field" ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ width: '100%', justifyContent: 'space-between', textAlign: 'left', fontWeight: 'normal', background: 'var(--surface)' }}
        onClick={() => setAbierto(!abierto)}
      >
        <span style={{ color: seleccionada ? 'inherit' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {seleccionada?.nombre ?? placeholder}
        </span>
        <ChevronsUpDown style={{ width: 16, height: 16, opacity: 0.5, flexShrink: 0 }} />
      </button>

      {abierto && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '100%',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '8px', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar o escribir nueva…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit', outline: 'none', fontSize: '0.85rem' }}
            />
          </div>
          
          <ul style={{ listStyle: 'none', margin: 0, padding: '0.25rem', maxHeight: '200px', overflowY: 'auto' }}>
            {visibles.length === 0 && !escrito && (
              <li style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center' }}>
                Escribe para buscar
              </li>
            )}
            
            {visibles.length === 0 && escrito && (
              <li>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.5rem', border: 'none', background: 'transparent' }}
                  disabled={creando}
                  onClick={crear}
                >
                  <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
                  {creando ? 'Creando...' : `Crear «${escrito.toUpperCase()}»`}
                </button>
              </li>
            )}

            {valor != null && visibles.length > 0 && (
              <li
                onClick={() => {
                  onChange(null);
                  setAbierto(false);
                }}
                style={{ padding: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px', color: 'var(--muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Sin asignar
              </li>
            )}

            {visibles.map((o) => (
              <li
                key={o.id}
                onClick={() => {
                  onChange(o.id === valor ? null : o.id);
                  setAbierto(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', padding: '0.5rem',
                  fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px',
                  background: o.id === valor ? 'rgba(62,207,142,.12)' : 'transparent',
                  color: o.id === valor ? 'var(--accent)' : 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (o.id !== valor) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (o.id !== valor) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Check style={{ width: 16, height: 16, marginRight: 8, opacity: o.id === valor ? 1 : 0 }} />
                {o.nombre}
              </li>
            ))}

            {escrito && !yaExiste && visibles.length > 0 && (
              <li>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.5rem', border: 'none', background: 'transparent', marginTop: '4px' }}
                  onClick={crear}
                  disabled={creando}
                >
                  <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
                  {creando ? 'Creando...' : `Crear «${escrito.toUpperCase()}»`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
