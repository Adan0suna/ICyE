// src/api/catalogo.ts
import { supabase } from '@/lib/supabase';

export type Codigo = {
  id: number;
  codigo: string;
  descripcion: string | null;
  familia_id: number | null;
  marca_id: number | null;
  familias: { nombre: string } | null;
  marcas: { nombre: string } | null;
};

export type Opcion = { id: number; nombre: string };

export type Equivalente = {
  id: number;
  codigo: string;
  descripcion: string | null;
  marca: string | null;
};

const SELECT_CODIGO = `
  id, codigo, descripcion, familia_id, marca_id,
  familias(nombre), marcas(nombre)
`;

// PostgREST usa comas y paréntesis como separadores dentro de .or(),
// así que hay que sacarlos del texto que escribe el usuario.
function limpiar(termino: string) {
  return termino.replace(/[,()*]/g, '').trim();
}

export async function listarCodigos(termino = ''): Promise<Codigo[]> {
  let consulta = supabase
    .from('codigos')
    .select(SELECT_CODIGO)
    .eq('activo', true)
    .order('codigo')
    .limit(100);

  const q = limpiar(termino);
  if (q.length >= 2) {
    consulta = consulta.or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%`);
  }

  const { data, error } = await consulta;
  if (error) throw error;
  return data as unknown as Codigo[];
}

export type DatosCodigo = {
  codigo: string;
  descripcion: string | null;
  familia_id: number | null;
  marca_id: number | null;
};

export async function crearCodigo(datos: DatosCodigo) {
  const { data, error } = await supabase
    .from('codigos')
    .insert(datos)
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function editarCodigo(id: number, datos: DatosCodigo) {
  const { error } = await supabase.from('codigos').update(datos).eq('id', id);
  if (error) throw error;
  return { id }; // mismo tipo de retorno que crearCodigo
}

// RF-15: baja lógica. El código desaparece de las listas pero las
// asignaciones históricas que lo apuntan siguen siendo legibles.
export async function darDeBajaCodigo(id: number) {
  const { error } = await supabase
    .from('codigos')
    .update({ activo: false })
    .eq('id', id);
  if (error) throw error;
}

// --- Equivalencias (RF-11) -----------------------------------

export async function equivalentesDe(codigoId: number): Promise<Equivalente[]> {
  const { data, error } = await supabase.rpc('equivalentes_de', {
    p_codigo_id: codigoId,
  });
  if (error) throw error;
  return (data ?? []) as Equivalente[];
}

export async function vincularEquivalencia(a: number, b: number) {
  const { data, error } = await supabase.rpc('vincular_equivalencia', {
    p_codigo_a: a,
    p_codigo_b: b,
  });
  if (error) throw error;
  return data as number; // id del grupo resultante
}

export async function desvincularEquivalencia(codigoA: number, codigoB: number) {
  const { error } = await supabase.rpc('desvincular_equivalencia', {
    p_codigo_a: codigoA,
    p_codigo_b: codigoB,
  });
  if (error) throw error;
}

// --- Catálogos auxiliares ------------------------------------

export async function listarFamilias(): Promise<Opcion[]> {
  const { data, error } = await supabase
    .from('familias')
    .select('id, nombre')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function listarMarcas(): Promise<Opcion[]> {
  const { data, error } = await supabase
    .from('marcas')
    .select('id, nombre')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function crearFamilia(nombre: string): Promise<Opcion> {
  const { data, error } = await supabase
    .from('familias')
    .insert({ nombre: nombre.trim().toUpperCase() })
    .select('id, nombre')
    .single();
  if (error) throw error;
  return data;
}

export async function crearMarca(nombre: string): Promise<Opcion> {
  const { data, error } = await supabase
    .from('marcas')
    .insert({ nombre: nombre.trim().toUpperCase() })
    .select('id, nombre')
    .single();
  if (error) throw error;
  return data;
}
