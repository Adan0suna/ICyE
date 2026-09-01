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

// El equivalente es un código de verdad, no una etiqueta: también
// se le asigna un BLI y también lleva piezas. Hay refacciones que
// solo existen con número FRACO. Por eso, si el código escrito no
// está en el catálogo, primero se da de alta y luego se vincula.
export async function vincularPorTexto(
  codigoId: number,
  textoEquivalente: string,
  marcaId?: number | null,
) {
  const texto = textoEquivalente.trim().toUpperCase()
  if (!texto) return null

  const { data: existente, error: eBusca } = await supabase
    .from('codigos')
    .select('id')
    .eq('codigo', texto)
    .maybeSingle()
  if (eBusca) throw eBusca

  let equivalenteId = existente?.id

  if (!equivalenteId) {
    const { data: nuevo, error: eAlta } = await supabase
      .from('codigos')
      .insert({ codigo: texto, marca_id: marcaId ?? null })
      .select('id')
      .single()
    if (eAlta) throw eAlta
    equivalenteId = nuevo.id
  }

  if (equivalenteId === codigoId) return null // no se vincula consigo mismo

  const { data, error } = await supabase.rpc('vincular_equivalencia', {
    p_codigo_a: codigoId,
    p_codigo_b: equivalenteId,
    p_nota: null,
  })

  // 23505 = el par ya estaba registrado. Al editar pasa siempre,
  // porque el campo llega precargado con la equivalencia actual.
  if (error && (error as any).code !== '23505') throw error

  return data ?? null
}
export async function desvincularPorTexto(codigoId: number, texto: string) {
  const limpio = texto.trim().toUpperCase()
  if (!limpio) return

  const { data } = await supabase
    .from('codigos')
    .select('id')
    .eq('codigo', limpio)
    .maybeSingle()
  if (!data) return

  const { error } = await supabase.rpc('desvincular_equivalencia', {
    p_codigo_a: codigoId,
    p_codigo_b: data.id,
  })
  if (error) throw error
}