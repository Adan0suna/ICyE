import { useState } from 'react'
import { useCodigos, useCrearCodigoCompleto, useActualizarCodigo, useEliminarCodigo } from '@/hooks/useCodigos'
import Autocomplete from '@/components/Autocomplete'
import { buscarBli } from '@/api/bli'

// Prefijo del código → { nombre visible, marca_id en la BD }
// Si alguna marca nueva entra, se agrega aquí un renglón más.
const PREFIJOS_MARCA: Record<string, { nombre: string; id: number }> = {
  CA:  { nombre: 'DC',    id: 1 },
  HGX: { nombre: 'FRACO', id: 2 },
}

function detectarMarca(codigo: string) {
  const cod = codigo.trim().toUpperCase()
  const entrada = Object.entries(PREFIJOS_MARCA).find(([p]) => cod.startsWith(p))
  return entrada ? entrada[1] : null
}

export default function CodigosPage() {
  const { data, isLoading, isError } = useCodigos()
  const crear      = useCrearCodigoCompleto()
  const actualizar = useActualizarCodigo()
  const eliminar   = useEliminarCodigo()

  const [form, setForm] = useState({ codigo: '', existencia: 0 })
  const [marcaDet, setMarcaDet] = useState<{ nombre: string; id: number } | null>(null)
  const [marcaEquivDet, setMarcaEquivDet] = useState<{ nombre: string; id: number } | null>(null)
  const [bliSel, setBliSel] = useState<{ id: number; control: string } | null>(null)
  const [equivCodigo, setEquivCodigo] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ codigo: '', activo: true })

  function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!form.codigo.trim()) return
    crear.mutate({
      codigo: form.codigo.trim(),
      marca_id: marcaDet?.id,
      bliId: bliSel?.id,
      existencia: form.existencia,
      equivCodigo: equivCodigo,
      marcaEquivId: marcaEquivDet?.id
    })
    setForm({ codigo: '', existencia: 0 })
    setMarcaDet(null)
    setMarcaEquivDet(null)
    setBliSel(null)
    setEquivCodigo('')
  }

  function abrirEdit(row: { id: number; codigo: string; activo: boolean }) {
    setEditId(row.id)
    setEditForm({ codigo: row.codigo, activo: row.activo })
  }

  function handleGuardar() {
    if (!editId) return
    actualizar.mutate({ id: editId, ...editForm })
    setEditId(null)
  }

  function exportarCSV() {
    if (!data?.length) return
    // id, codigo, equivalencia y el bli, marca, existencia
    const cols = ['id', 'codigo', 'equivalencia', 'bli', 'marca', 'existencia']
    const headers = ['ID', 'CÓDIGO', 'EQUIVALENCIA', 'BLI', 'MARCA', 'EXISTENCIA']
    
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }
    const rows = [
      headers.join(','),
      ...data.map(r => cols.map(c => escape((r as any)[c])).join(','))
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `codigos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Captura Rápida de Inventario</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
          Agrega nuevos códigos, asígnalos a su ubicación física (BLI) y vincula equivalencias (códigos de otras marcas) en un solo paso.
        </p>
      </div>

      {/* FAST CAPTURE FORM */}
      <div className="card mb-6">
        <div className="card-title">Capturar Código</div>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleCrear}>
          <div className="row-form-1">
            <div className="field" style={{ position: 'relative' }}>
              <label>Código Original</label>
              <input
                type="text"
                placeholder="Ej. CA-94-G"
                value={form.codigo}
                onChange={e => {
                  setForm(f => ({ ...f, codigo: e.target.value }))
                  setMarcaDet(null) // limpiar mientras escribe
                }}
                onBlur={e => setMarcaDet(detectarMarca(e.target.value))}
                autoFocus
              />
              {marcaDet && (
                <span style={{
                  position: 'absolute', right: '8px', bottom: '8px',
                  background: 'var(--accent)', color: '#000',
                  borderRadius: '4px', padding: '1px 7px',
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em'
                }}>
                  {marcaDet.nombre}
                </span>
              )}
            </div>
          </div>
          <div className="row-form-4">
            <Autocomplete
              label="Ubicación (BLI)"
              placeholder="Ej. 2M-A0000"
              fetcher={buscarBli}
              renderItem={(item) => <span>{item.control} <small style={{color:'var(--muted)'}}>({item.estado})</small></span>}
              onSelect={(item) => setBliSel(item as any)}
              valueText={bliSel?.control || ''}
            />
            <div className="field">
              <label>Cantidad</label>
              <input type="number" min="0" value={form.existencia} onChange={e => setForm(f => ({ ...f, existencia: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="field flex-1" style={{ position: 'relative' }}>
              <label>Equivalencia (Otra marca)</label>
              <input
                type="text"
                placeholder="Ej. BOSCH-94"
                value={equivCodigo}
                onChange={e => {
                  setEquivCodigo(e.target.value)
                  setMarcaEquivDet(null)
                }}
                onBlur={e => setMarcaEquivDet(detectarMarca(e.target.value))}
              />
              {marcaEquivDet && (
                <span style={{
                  position: 'absolute', right: '8px', bottom: '8px',
                  background: 'var(--accent)', color: '#000',
                  borderRadius: '4px', padding: '1px 7px',
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em'
                }}>
                  {marcaEquivDet.nombre}
                </span>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={crear.isPending} style={{ height: '38px' }}>
              {crear.isPending ? '⏳' : '＋ Guardar'}
            </button>
          </div>
        </form>
      </div>

      {/* TABLE */}
      <div className="card p-0">
        <div className="table-header">
          <div className="card-title" style={{ margin: 0 }}>Registros</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge">{data?.length ?? 0} códigos</span>
            <button
              className="btn btn-ghost"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              onClick={exportarCSV}
              disabled={!data?.length}
              title="Exportar a CSV"
            >
              ⬇ CSV
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="table-wrap">
            <table><tbody>
              {Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(5).fill(0).map((_, j) => <td key={j}><div className="sk" /></td>)}
                </tr>
              ))}
            </tbody></table>
          </div>
        )}

        {isError && <p className="form-error p-6">Error al cargar los datos.</p>}

        {!isLoading && !isError && (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Código</th><th>Equivalencia</th><th>BLI</th><th>Marca</th><th>Exist.</th><th style={{textAlign: 'right'}}>Acciones</th>
              </tr></thead>
              <tbody>
                {data?.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">📭 Sin registros. Captura uno arriba.</td></tr>
                )}
                {data?.map(row => (
                  <tr key={row.id}>
                    <td><code className="td-code">{row.codigo}</code></td>
                    <td className="td-muted"><code style={{fontSize: '0.8rem'}}>{row.equivalencia || '—'}</code></td>
                    <td><span className="badge" style={{background: 'var(--border)'}}>{row.bli || '—'}</span></td>
                    <td className="td-muted">{row.marca || '—'}</td>
                    <td style={{fontWeight: 600}}>{row.existencia}</td>
                    <td>
                      <div className="td-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-edit" title="Editar" onClick={() => abrirEdit(row)}>✏️</button>
                        <button className="btn btn-danger" title="Eliminar" onClick={() => eliminar.mutate(row.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editId !== null && (
        <div className="overlay" onClick={() => setEditId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>✏️ Editar código</h3>
            <div className="field">
              <label>Código</label>
              <input type="text" value={editForm.codigo} onChange={e => setEditForm(f => ({ ...f, codigo: e.target.value }))} />
            </div>
            <label className="checkbox-label">
              <input type="checkbox" checked={editForm.activo} onChange={e => setEditForm(f => ({ ...f, activo: e.target.checked }))} />
              Activo
            </label>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditId(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={actualizar.isPending}>
                {actualizar.isPending ? '⏳' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
