import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { PostgrestError } from '@supabase/supabase-js'
import { crearCodigo, actualizarCodigo, eliminarCodigo, obtenerOCrearCodigoPorTexto } from '@/api/codigos'
import { mensajeDeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'

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

import { asignar } from '@/api/asignaciones'
import { vincularEquivalencia } from '@/api/catalogo'

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
      // 1. Crear el código
      const nuevo = await crearCodigo({
        codigo: params.codigo,
        descripcion: params.descripcion,
        marca_id: params.marca_id,
      })

      // 2. Si hay BLI, lo asignamos
      if (params.bliId) {
        await asignar({
          bli_id: params.bliId,
          codigo_id: nuevo.id,
          existencia: params.existencia || 0,
        })
      }

      // 3. Si hay equivalencia, resolvemos el código y vinculamos
      if (params.equivCodigo) {
        const eqId = await obtenerOCrearCodigoPorTexto(params.equivCodigo, params.marcaEquivId)
        if (eqId) {
          await vincularEquivalencia(nuevo.id, eqId)
          
          // También registramos el equivalente en el mismo casillero (existencia 0 inicial
          // para no duplicar el inventario total de la pieza física, pero para que aparezca)
          if (params.bliId) {
            await asignar({
              bli_id: params.bliId,
              codigo_id: eqId,
              existencia: 0,
            })
          }
        }
      }

      return nuevo
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codigos'] })
      qc.invalidateQueries({ queryKey: ['asignaciones'] })
      toast.success('Código registrado exitosamente')
    },
    onError: (e) => toast.error(mensajeDeError(e as PostgrestError)),
  })
}

export function useActualizarCodigo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { 
      id: number; 
      codigo: string; 
      activo: boolean;
      bliId?: number;
      existencia?: number;
      equivCodigo?: string;
      marcaEquivId?: number;
    }) => {
      // 1. Actualizar el código
      await actualizarCodigo(params.id, {
        codigo: params.codigo,
        activo: params.activo,
      })

      // 2. Si se mandó ubicación/existencia, reemplazamos la asignación
      if (params.bliId !== undefined && params.existencia !== undefined) {
        // Borramos asignaciones previas (simplificación para este modal)
        await supabase.from('asignaciones').delete().eq('codigo_id', params.id)
        
        // Creamos la nueva
        if (params.bliId) {
          await supabase.from('asignaciones').insert({
            codigo_id: params.id,
            bli_id: params.bliId,
            existencia: params.existencia
          })
        }
      }

      // 3. Si se mandó equivalencia, reemplazamos
      if (params.equivCodigo !== undefined) {
        // Borramos las anteriores donde el código actual participe
        await supabase.from('equivalencias')
          .delete()
          .or(`codigo_id.eq.${params.id},equivalente_id.eq.${params.id}`)
        
        // Si hay una nueva, la vinculamos
        if (params.equivCodigo.trim() !== '') {
          const eqId = await obtenerOCrearCodigoPorTexto(params.equivCodigo, params.marcaEquivId)
          if (eqId) {
            // Asegurarnos de que no estemos intentando vincular consigo mismo
            if (eqId !== params.id) {
              await supabase.from('equivalencias').insert({
                codigo_id: Math.min(params.id, eqId),
                equivalente_id: Math.max(params.id, eqId)
              })
              
              // También lo metemos al mismo casillero (existencia 0) si hay BLI
              if (params.bliId) {
                // Removemos previas asignaciones de la equivalencia para simplificar
                await supabase.from('asignaciones').delete().eq('codigo_id', eqId)
                await supabase.from('asignaciones').insert({
                  codigo_id: eqId,
                  bli_id: params.bliId,
                  existencia: 0
                })
              }
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success('Código actualizado')
      queryClient.invalidateQueries({ queryKey: ['codigos'] })
    },
    onError: (err: PostgrestError) => toast.error(mensajeDeError(err)),
  })
}

export function useEliminarCodigo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: eliminarCodigo,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codigos'] })
      toast.success('Código desactivado')
    },
    onError: (e) => toast.error(mensajeDeError(e as PostgrestError)),
  })
}
