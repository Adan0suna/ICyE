// src/components/SelectorBli.tsx
// Desplegable compacto. En reposo ocupa un renglón; al abrirse el
// panel flota encima del formulario en lugar de empujarlo, que en
// teléfono es la diferencia entre capturar y andar haciendo scroll.
import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    listarFilas,
    listarBliDeFila,
    obtenerResumenPorControl,
    type BliResumen,
} from '@/api/bli'

const POR_PAGINA = 25

type Props = {
    seleccionado: BliResumen | null
    onSeleccionar: (bli: BliResumen) => void
}

export function SelectorBli({ seleccionado, onSeleccionar }: Props) {
    const [abierto, setAbierto] = useState(false)
    const [filaId, setFilaId] = useState<number | null>(null)
    const [pagina, setPagina] = useState(0)
    const [salto, setSalto] = useState('')
    const [noEncontrado, setNoEncontrado] = useState(false)

    const caja = useRef<HTMLDivElement>(null)

    const { data: filas = [] } = useQuery({
        queryKey: ['filas'],
        queryFn: listarFilas,
    })

    // Abre en la fila de lo ya seleccionado; si no hay nada, la primera.
    useEffect(() => {
        if (filaId !== null || filas.length === 0) return
        setFilaId(seleccionado?.fila_id ?? filas[0].id)
    }, [filas, filaId, seleccionado])

    const { data: posiciones = [], isLoading } = useQuery({
        queryKey: ['bli-fila', filaId],
        queryFn: () => listarBliDeFila(filaId!),
        enabled: filaId !== null && abierto,
    })

    const totalPaginas = Math.max(1, Math.ceil(posiciones.length / POR_PAGINA))

    const visibles = useMemo(
        () => posiciones.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA),
        [posiciones, pagina],
    )

    // Cerrar al tocar fuera o con Escape.
    useEffect(() => {
        if (!abierto) return

        function fuera(e: MouseEvent) {
            if (caja.current && !caja.current.contains(e.target as Node)) {
                setAbierto(false)
            }
        }
        function tecla(e: KeyboardEvent) {
            if (e.key === 'Escape') setAbierto(false)
        }

        document.addEventListener('mousedown', fuera)
        document.addEventListener('keydown', tecla)
        return () => {
            document.removeEventListener('mousedown', fuera)
            document.removeEventListener('keydown', tecla)
        }
    }, [abierto])

    function elegir(p: BliResumen) {
        onSeleccionar(p)
        setAbierto(false)
        setSalto('')
        setNoEncontrado(false)
    }

    function cambiarFila(id: number) {
        setFilaId(id)
        setPagina(0)
    }

    async function irAControl() {
        const control = salto.trim()
        if (!control) return

        const bli = await obtenerResumenPorControl(control)
        if (!bli) {
            setNoEncontrado(true)
            return
        }

        setFilaId(bli.fila_id)
        // La subposición avanza de 10 en 10: su índice es el número entre 10.
        setPagina(Math.floor(Math.floor(parseInt(bli.subposicion, 10) / 10) / POR_PAGINA))
        elegir(bli)
    }

    return (
        <div className="bli-caja" ref={caja}>
            <button
                type="button"
                className={`bli-trigger ${abierto ? 'abierto' : ''}`}
                onClick={() => setAbierto(a => !a)}
            >
                {seleccionado ? (
                    <>
                        <span className="bli-trigger-control">{seleccionado.control}</span>
                        <span className="bli-trigger-detalle">
                            {seleccionado.codigos > 0
                                ? `${seleccionado.codigos} cód · ${seleccionado.existencia} pza`
                                : 'libre'}
                        </span>
                    </>
                ) : (
                    <span className="bli-trigger-vacio">Elegir ubicación</span>
                )}
                <span className="bli-trigger-flecha">{abierto ? '▴' : '▾'}</span>
            </button>

            {abierto && (
                <div className="bli-panel">
                    <div className="bli-panel-top">
                        <div className="bli-filas">
                            {filas.map(f => (
                                <button
                                    key={f.id}
                                    type="button"
                                    className={`bli-fila-btn ${f.id === filaId ? 'activa' : ''}`}
                                    onClick={() => cambiarFila(f.id)}
                                >
                                    {f.clave}
                                </button>
                            ))}
                        </div>

                        <input
                            type="text"
                            value={salto}
                            placeholder="2M-A0250"
                            autoComplete="off"
                            spellCheck={false}
                            autoFocus
                            className={`bli-salto ${noEncontrado ? 'input-error' : ''}`}
                            onChange={e => {
                                setSalto(e.target.value.toUpperCase())
                                setNoEncontrado(false)
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    irAControl()
                                }
                            }}
                        />
                    </div>

                    {noEncontrado && <p className="bli-aviso">Esa ubicación no existe.</p>}

                    <div className="bli-lista">
                        {isLoading ? (
                            <p className="bli-aviso">Cargando…</p>
                        ) : (
                            visibles.map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={`bli-item ${p.id === seleccionado?.id ? 'activa' : ''}`}
                                    onClick={() => elegir(p)}
                                >
                                    <span className="bli-item-control">{p.control}</span>
                                    <span className={p.codigos > 0 ? 'bli-item-ocup' : 'bli-item-libre'}>
                                        {p.codigos > 0 ? `${p.codigos} cód · ${p.existencia} pza` : 'libre'}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="bli-paginado">
                        <button
                            type="button"
                            className="bli-pag-btn"
                            disabled={pagina === 0}
                            onClick={() => setPagina(p => p - 1)}
                        >
                            ‹
                        </button>

                        <span className="bli-pag-texto">
                            {posiciones.length === 0
                                ? '—'
                                : `${pagina * POR_PAGINA + 1}–${Math.min((pagina + 1) * POR_PAGINA, posiciones.length)} de ${posiciones.length}`}
                        </span>

                        <button
                            type="button"
                            className="bli-pag-btn"
                            disabled={pagina >= totalPaginas - 1}
                            onClick={() => setPagina(p => p + 1)}
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}