import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

interface AutocompleteProps<T> {
  label: string
  placeholder: string
  fetcher: (term: string) => Promise<T[]>
  renderItem: (item: T) => React.ReactNode
  onSelect: (item: T | null) => void
  valueText: string // The text to display when something is selected or typed
}

export default function Autocomplete<T extends { id: number | string }>({
  label,
  placeholder,
  fetcher,
  renderItem,
  onSelect,
  valueText,
}: AutocompleteProps<T>) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [options, setOptions] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  
  const debouncedTerm = useDebounce(term, 300)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sincronizar el texto externo con el input local (para limpieza)
  useEffect(() => {
    setTerm(valueText)
  }, [valueText])

  useEffect(() => {
    if (!open) {
      setOptions([])
      return
    }
    let valid = true
    setLoading(true)
    fetcher(debouncedTerm)
      .then((res) => {
        if (valid) setOptions(res)
      })
      .catch(() => {})
      .finally(() => {
        if (valid) setLoading(false)
      })
    return () => { valid = false }
  }, [debouncedTerm, open, fetcher])

  // Click outside
  useEffect(() => {
    function click(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  return (
    <div className="field flex-1" style={{ position: 'relative' }} ref={wrapperRef}>
      <label>{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
          onSelect(null) // Si escribe de nuevo, borra la selección previa
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '.5rem', margin: '.2rem 0 0 0',
          listStyle: 'none', zIndex: 10, maxHeight: '200px', overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          {loading && <li style={{ padding: '.5rem', fontSize: '.8rem', color: 'var(--muted)' }}>Buscando...</li>}
          {!loading && options.length === 0 && <li style={{ padding: '.5rem', fontSize: '.8rem', color: 'var(--muted)' }}>Sin resultados</li>}
          {!loading && options.map(item => (
            <li
              key={item.id}
              onClick={() => {
                onSelect(item)
                setOpen(false)
              }}
              style={{
                padding: '.5rem', fontSize: '.85rem', cursor: 'pointer',
                borderRadius: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
