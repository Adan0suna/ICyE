import { useState, type ReactNode, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useCodigos } from '@/hooks/useCatalogo';

type Seleccion = { id: number; codigo: string };

type Props = {
  onSeleccionar: (codigo: Seleccion) => void;
  excluir?: number;
  placeholder?: string;
  icono?: ReactNode;
  autoFocus?: boolean;
};

export function BuscadorCodigo({
  onSeleccionar,
  excluir,
  placeholder = 'Buscar código…',
  icono,
  autoFocus = false,
}: Props) {
  const [termino, setTermino] = useState('');
  const { data: resultados = [], isFetching } = useCodigos(termino);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [enfocado, setEnfocado] = useState(autoFocus);

  const visibles = resultados.filter((c) => c.id !== excluir).slice(0, 8);
  const mostrarLista = termino.trim().length >= 2 && enfocado;

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setEnfocado(false);
      }
    }
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  function elegir(c: Seleccion) {
    onSeleccionar(c);
    setTermino('');
    setEnfocado(false);
  }

  return (
    <div className="field relative" ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}>
        {icono ?? <Search style={{ width: 16, height: 16 }} />}
      </div>

      <input
        value={termino}
        onChange={(e) => {
          setTermino(e.target.value);
          setEnfocado(true);
        }}
        onFocus={() => setEnfocado(true)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        style={{ paddingLeft: '36px' }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && visibles.length > 0) {
            e.preventDefault();
            elegir(visibles[0]);
          }
          if (e.key === 'Escape') {
            setTermino('');
            setEnfocado(false);
          }
        }}
      />

      {mostrarLista && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '100%',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '8px', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          {visibles.length === 0 ? (
            <p style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              {isFetching ? 'Buscando…' : 'Ningún código coincide.'}
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: '0.25rem', maxHeight: '250px', overflowY: 'auto' }}>
              {visibles.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => elegir(c)}
                    style={{
                      display: 'flex', width: '100%', alignItems: 'baseline', gap: '0.75rem',
                      padding: '0.5rem 0.75rem', textAlign: 'left', background: 'transparent',
                      border: 'none', color: 'inherit', cursor: 'pointer', borderRadius: '4px',
                      fontFamily: 'inherit', fontSize: '0.85rem'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{c.codigo}</span>
                    <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.descripcion}
                    </span>
                    {c.marcas && (
                      <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {c.marcas.nombre}
                      </span>
                    )}
                    {i === 0 && (
                      <kbd style={{
                        marginLeft: '0.5rem', flexShrink: 0, borderRadius: '4px', border: '1px solid var(--border)',
                        padding: '0 0.25rem', fontSize: '10px', color: 'var(--muted)'
                      }}>
                        Enter
                      </kbd>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
