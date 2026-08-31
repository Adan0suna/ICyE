import type { PostgrestError } from '@supabase/supabase-js'

export function mensajeDeError(error: PostgrestError): string {
  switch (error.code) {
    case '23505':
      if (error.message.includes('ux_asignacion_activa'))
        return 'Ese código ya está asignado a este BLI.'
      if (error.message.includes('bli_fila_id_subposicion_key'))
        return 'Esa subposición ya existe en la fila.'
      if (error.message.includes('codigos_codigo_key'))
        return 'Ese código ya está en el catálogo.'
      return 'El registro ya existe.'
    case '23503':
      return 'No se puede eliminar: hay registros que dependen de este.'
    case '23514':
      return 'Alguno de los datos no tiene el formato esperado.'
    case '42501':
      return 'Tu usuario no tiene permiso para esta acción.'
    default:
      return 'No se pudo completar la operación. Intenta de nuevo.'
  }
}
