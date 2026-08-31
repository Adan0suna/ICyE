import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { PostgrestError } from '@supabase/supabase-js'
import {
  asignacionesDeBli,
  asignar,
  cambiarExistencia,
  quitarAsignacion,
} from '@/api/asignaciones'
import { mensajeDeError } from '@/lib/errores'

export function useAsignacionesDeBli(bliId?: number) {
  return useQuery({
    queryKey: ['asignaciones', bliId],
    queryFn: () => asignacionesDeBli(bliId!),
    enabled: bliId != null,
  })
}

export function useAsignar(bliId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: asignar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones', bliId] })
      qc.invalidateQueries({ queryKey: ['bli', bliId] })
    },
    onError: (e) => toast.error(mensajeDeError(e as PostgrestError)),
  })
}

export function useCambiarExistencia(bliId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, existencia }: { id: number; existencia: number }) =>
      cambiarExistencia(id, existencia),

    onMutate: async ({ id, existencia }) => {
      await qc.cancelQueries({ queryKey: ['asignaciones', bliId] })
      const previo = qc.getQueryData(['asignaciones', bliId])
      qc.setQueryData(['asignaciones', bliId], (viejo: Array<{ id: number }> = []) =>
        viejo.map((a) => (a.id === id ? { ...a, existencia } : a)),
      )
      return { previo }
    },

    onError: (e, _vars, ctx) => {
      qc.setQueryData(['asignaciones', bliId], ctx?.previo)
      toast.error(mensajeDeError(e as PostgrestError))
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones', bliId] })
    },
  })
}

export function useQuitarAsignacion(bliId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: quitarAsignacion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones', bliId] })
      toast.success('Asignación eliminada')
    },
    onError: (e) => toast.error(mensajeDeError(e as PostgrestError)),
  })
}
