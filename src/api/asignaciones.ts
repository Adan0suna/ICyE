import { supabase } from '@/lib/supabase'

export async function asignacionesDeBli(bliId: number) {
  const { data, error } = await supabase
    .from('asignaciones')
    .select('id, existencia, codigos(id, codigo, descripcion, marcas(nombre))')
    .eq('bli_id', bliId)
    .eq('activo', true)
    .order('id')
  if (error) throw error
  return data
}

export async function asignar(input: {
  bli_id: number
  codigo_id: number
  existencia: number
}) {
  const { data, error } = await supabase
    .from('asignaciones')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function cambiarExistencia(id: number, existencia: number) {
  const { error } = await supabase
    .from('asignaciones')
    .update({ existencia })
    .eq('id', id)
  if (error) throw error
}

// RF-15: baja lógica — nunca .delete() sobre asignaciones
export async function quitarAsignacion(id: number) {
  const { error } = await supabase
    .from('asignaciones')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}
