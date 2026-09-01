import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { PostgrestError } from '@supabase/supabase-js'
import { crearCodigo, actualizarCodigo, eliminarCodigo } from '@/api/codigos'
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

      // 3. Si hay equivalencia, la guardamos SOLO como texto (sin crear código duplicado)
      if (params.equivCodigo && params.equivCodigo.trim()) {
        // Primero borramos equivalencias previas de este código
        await supabase.from('equivalencias')
          .delete()
          .or(`codigo_id.eq.${nuevo.id},equivalente_id.eq.${nuevo.id}`)
        
        // Guardamos el texto de la equivalencia directamente
        await supabase.from('equivalencias').insert({
          codigo_id: nuevo.id,
          texto_equivalente: params.equivCodigo.trim().toUpperCase()
        })
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

      // 3. Si se mandó equivalencia, reemplazamos (solo texto, sin crear código duplicado)
      if (params.equivCodigo !== undefined) {
        // Borramos las anteriores
        await supabase.from('equivalencias')
          .delete()
          .or(`codigo_id.eq.${params.id},equivalente_id.eq.${params.id}`)
        
        // Si hay texto, lo guardamos
        if (params.equivCodigo.trim() !== '') {
          await supabase.from('equivalencias').insert({
            codigo_id: params.id,
            texto_equivalente: params.equivCodigo.trim().toUpperCase()
          })
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
