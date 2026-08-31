import { supabase } from '@/lib/supabase'

export type CodigoBusqueda = {
  id: number
  codigo: string
  descripcion: string | null
  marcas: { nombre: string } | null
}

export async function buscarCodigos(termino: string): Promise<CodigoBusqueda[]> {
  const limpio = termino.replace(/[,()*]/g, '').trim()
  if (limpio.length < 2) return []

  const { data, error } = await supabase
    .from('codigos')
    .select('id, codigo, descripcion, marcas(nombre)')
    .or(`codigo.ilike.%${limpio}%,descripcion.ilike.%${limpio}%`)
    .eq('activo', true)
    .limit(20)

  if (error) throw error
  return data as unknown as CodigoBusqueda[]
}

export async function listarCodigos() {
  const { data, error } = await supabase
    .from('codigos')
    .select('id, codigo, descripcion, activo, creado_en, marca_id, marcas(nombre), familias(nombre)')
    .order('creado_en', { ascending: false })

  if (error) throw error
  return data
}

// grupo_id eliminado — ya no existe en la BD (migración 02)
export async function crearCodigo(input: {
  codigo: string
  descripcion?: string | null
  familia_id?: number | null
  marca_id?: number | null
}) {
  const { data, error } = await supabase
    .from('codigos')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function actualizarCodigo(
  id: number,
  input: { codigo?: string; descripcion?: string; activo?: boolean },
) {
  const { error } = await supabase.from('codigos').update(input).eq('id', id)
  if (error) throw error
}

export async function eliminarCodigo(id: number) {
  const { error } = await supabase.from('codigos').update({ activo: false }).eq('id', id)
  if (error) throw error
}

export async function obtenerOCrearCodigoPorTexto(codigoStr: string, marca_id?: number) {
  const limpio = codigoStr.trim()
  if (!limpio) return null

  const { data: existente } = await supabase
    .from('codigos')
    .select('id')
    .ilike('codigo', limpio)
    .single()

  if (existente) {
    return existente.id
  }

  const nuevo = await crearCodigo({ codigo: limpio, marca_id, descripcion: 'Creado automáticamente como equivalencia' })
  return nuevo.id
}
