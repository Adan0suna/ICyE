import { supabase } from '@/lib/supabase'

export async function buscarBli(termino: string = '') {
  let query = supabase.from('bli').select('id, control, estado')
  if (termino.trim().length > 0) {
    query = query.ilike('control', `%${termino.trim()}%`)
  }
  const { data, error } = await query.order('control').limit(25)
  if (error) throw error
  return data
}

export async function listarBliDeCodigo(codigoId: number) {
  const { data, error } = await supabase
    .from('asignaciones')
    .select('id, existencia, bli(id, control, estado)')
    .eq('codigo_id', codigoId)
    .eq('activo', true)
  if (error) throw error
  return data
}
