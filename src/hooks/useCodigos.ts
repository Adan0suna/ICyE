import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { PostgrestError } from '@supabase/supabase-js'
import {
  crearCodigo,
  actualizarCodigo,
  eliminarCodigo,
  vincularPorTexto,
  desvincularPorTexto,
} from '@/api/codigos'
import { asignar } from '@/api/asignaciones'
import { mensajeDeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'

// Llaves que hay que refrescar después de cualquier cambio. El
// selector de BLI se alimenta de 'bli-fila': sin invalidarla, una
// ubicación recién ocupada sigue apareciendo como libre.
function refrescar(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['codigos'] })
  qc.invalidateQueries({ queryKey: ['asignaciones'] })
  qc.invalidateQueries({ queryKey: ['bli-fila'] })
}

export function useCodigos() {
  return useQuery({
    queryKey: ['codigos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_codigos_export')
        .select('*')
        .order('id', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useCrearCodigoCompleto() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      codigo: string
      descripcion?: string
      marca_id?: number
      bliId?: number
      existencia?: number
      equivCodigo?: string
      marcaEquivId?: number
    }) => {
      // 1. El código
      const nuevo = await crearCodigo({
        codigo: params.codigo,
        descripcion: params.descripcion,
        marca_id: params.marca_id,
      })

      // 2. Su ubicación
      if (params.bliId) {
        await asignar({
          bli_id: params.bliId,
          codigo_id: nuevo.id,
          existencia: params.existencia || 0,
        })
      }

      // 3. Su equivalencia. El código equivalente es un artículo del
      //    catálogo, no una etiqueta: también se le asigna BLI y
      //    también lleva piezas.
      if (params.equivCodigo?.trim()) {
        await vincularPorTexto(nuevo.id, params.equivCodigo, params.marcaEquivId)
      }

      return nuevo
    },

    onSuccess: () => {
      refrescar(qc)
      toast.success('Código registrado')
    },
    onError: (e) => toast.error(mensajeDeError(e as PostgrestError)),
  })
}

export function useActualizarCodigo() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      id: number
      codigo: string
      activo: boolean
      bliId?: number
      existencia?: number
      equivCodigo?: string
      equivOriginal?: string
      marcaEquivId?: number
    }) => {
      // 1. El código
      await actualizarCodigo(params.id, {
        codigo: params.codigo,
        activo: params.activo,
      })

      // 2. La ubicación. Baja lógica de la anterior, nunca delete:
      //    borrando se pierde el histórico y la auditoría queda
      //    apuntando a un renglón que ya no existe.
      if (params.bliId !== undefined && params.existencia !== undefined) {
        const { error } = await supabase
          .from('asignaciones')
          .update({ activo: false })
          .eq('codigo_id', params.id)
          .eq('activo', true)
        if (error) throw error

        if (params.bliId) {
          const { error: eAlta } = await supabase.from('asignaciones').insert({
            codigo_id: params.id,
            bli_id: params.bliId,
            existencia: params.existencia,
          })
          if (eAlta) throw eAlta
        }
      }

      /// 3. Equivalencia. Si el texto cambió, se quita el vínculo anterior
      //    y se pone el nuevo. Solo ese par: las demás equivalencias del
      //    código no se tocan.
      const anterior = (params.equivOriginal ?? '').trim().toUpperCase()
      const nuevo = (params.equivCodigo ?? '').trim().toUpperCase()

      if (anterior && anterior !== nuevo) {
        await desvincularPorTexto(params.id, anterior)
      }
      if (nuevo) {
        await vincularPorTexto(params.id, nuevo, params.marcaEquivId)
      }

      return { id: params.id }
    },

    onSuccess: () => {
      refrescar(qc)
      toast.success('Código actualizado')
    },
    onError: (e) => toast.error(mensajeDeError(e as PostgrestError)),
  })
}

export function useEliminarCodigo() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: eliminarCodigo,
    onSuccess: () => {
      refrescar(qc)
      toast.success('Código desactivado')
    },
    onError: (e) => toast.error(mensajeDeError(e as PostgrestError)),
  })
}