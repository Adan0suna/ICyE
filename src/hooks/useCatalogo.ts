// src/hooks/useCatalogo.ts
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PostgrestError } from '@supabase/supabase-js';
import { mensajeDeError } from '@/lib/errores';
import * as api from '@/api/catalogo';

export function useDebounce<T>(valor: T, ms = 300) {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return diferido;
}

export function useCodigos(termino: string) {
  const q = useDebounce(termino);
  return useQuery({
    queryKey: ['codigos', q],
    queryFn: () => api.listarCodigos(q),
    // Evita el parpadeo a "sin resultados" mientras se escribe.
    placeholderData: (previo) => previo,
  });
}

export function useEquivalentes(codigoId?: number) {
  return useQuery({
    queryKey: ['equivalentes', codigoId],
    queryFn: () => api.equivalentesDe(codigoId!),
    enabled: codigoId != null,
  });
}

export function useFamilias() {
  return useQuery({ queryKey: ['familias'], queryFn: api.listarFamilias });
}

export function useMarcas() {
  return useQuery({ queryKey: ['marcas'], queryFn: api.listarMarcas });
}

// Toda mutación del catálogo invalida las mismas llaves, así que
// conviene una sola fábrica en lugar de repetir onSuccess seis veces.
function useMutacionCatalogo<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  opciones: { alTerminar?: (data: TData) => void; exito?: string } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['codigos'] });
      qc.invalidateQueries({ queryKey: ['equivalentes'] });
      if (opciones.exito) toast.success(opciones.exito);
      opciones.alTerminar?.(data);
    },
    onError: (e) => toast.error(mensajeDeError(e as PostgrestError)),
  });
}

export function useGuardarCodigo(alTerminar?: () => void) {
  return useMutacionCatalogo(
    async (v: { id?: number; datos: api.DatosCodigo }) =>
      v.id ? api.editarCodigo(v.id, v.datos) : api.crearCodigo(v.datos),
    { alTerminar, exito: 'Código guardado' },
  );
}

export function useDarDeBaja() {
  return useMutacionCatalogo(api.darDeBajaCodigo, { exito: 'Código dado de baja' });
}

export function useVincular() {
  return useMutacionCatalogo(
    (v: { a: number; b: number }) => api.vincularEquivalencia(v.a, v.b),
    { exito: 'Equivalencia registrada' },
  );
}

export function useDesvincular() {
  return useMutacionCatalogo(
    (v: { a: number; b: number }) => api.desvincularEquivalencia(v.a, v.b),
    { exito: 'Equivalencia eliminada' }
  );
}

// Familias y marcas se crean desde el combo, sin salir del formulario.
export function useCrearOpcion(tipo: 'familia' | 'marca') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tipo === 'familia' ? api.crearFamilia : api.crearMarca,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tipo === 'familia' ? 'familias' : 'marcas'] });
    },
    onError: (e) => toast.error(mensajeDeError(e as PostgrestError)),
  });
}
