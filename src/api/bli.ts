// src/api/blis.ts
import { supabase } from '@/lib/supabase';

export type EstadoBli = 'disponible' | 'asignado' | 'incompleto';

export type Bli = {
  id: number;
  control: string;
  estado: EstadoBli;
};

export type AsignacionDeBli = {
  id: number;
  existencia: number;
  codigos: {
    id: number;
    codigo: string;
    descripcion: string | null;
    marcas: { nombre: string } | null;
  };
};

export type UbicacionDeCodigo = {
  id: number;
  existencia: number;
  bli: Bli;
};

const TOPE_BUSQUEDA = 25;

// ------------------------------------------------------------
// Búsqueda de ubicaciones (alimenta el desplegable)
// ------------------------------------------------------------

// Devuelve también si quedaron resultados fuera del tope, para que
// el desplegable pueda avisarlo. Sin eso el capturista ve 25 de 500
// y cree que esos son todos los que existen.
export async function buscarBli(termino = ''): Promise<{
  resultados: Bli[];
  hayMas: boolean;
}> {
  let query = supabase
    .from('bli')
    .select('id, control, estado', { count: 'exact' });

  const q = termino.trim();
  if (q.length > 0) {
    // El control se guarda en mayúsculas; ilike las ignora de todos
    // modos, pero así el filtro es explícito.
    query = query.ilike('control', `%${q}%`);
  }

  const { data, error, count } = await query
    .order('control')
    .limit(TOPE_BUSQUEDA);

  if (error) throw error;

  return {
    resultados: data ?? [],
    hayMas: (count ?? 0) > TOPE_BUSQUEDA,
  };
}

export async function obtenerBliPorControl(control: string): Promise<Bli | null> {
  const { data, error } = await supabase
    .from('bli')
    .select('id, control, estado')
    .eq('control', control.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ------------------------------------------------------------
// Las dos direcciones de la relación
// ------------------------------------------------------------

// Dado un BLI, qué códigos tiene. Es la consulta de la pantalla de
// captura, la que más se va a usar.
export async function listarCodigosDeBli(bliId: number): Promise<AsignacionDeBli[]> {
  const { data, error } = await supabase
    .from('asignaciones')
    .select('id, existencia, codigos!inner(id, codigo, descripcion, marcas(nombre))')
    .eq('bli_id', bliId)
    .eq('activo', true)
    .order('id');

  if (error) throw error;
  return data as unknown as AsignacionDeBli[];
}

// Dado un código, en qué ubicaciones está. Alimenta la ficha del
// código. El !inner hace que supabase-js lo infiera como objeto y
// no como arreglo, que si no truena al escribir a.bli.control.
export async function listarBliDeCodigo(codigoId: number): Promise<UbicacionDeCodigo[]> {
  const { data, error } = await supabase
    .from('asignaciones')
    .select('id, existencia, bli!inner(id, control, estado)')
    .eq('codigo_id', codigoId)
    .eq('activo', true)
    .order('bli(control)');

  if (error) throw error;
  return data as unknown as UbicacionDeCodigo[];
}

// ------------------------------------------------------------
// Escritura (RF-08, RF-14, RF-15)
// ------------------------------------------------------------

export async function asignarCodigo(input: {
  bli_id: number;
  codigo_id: number;
  existencia: number;
}) {
  const { data, error } = await supabase
    .from('asignaciones')
    .insert(input)
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export async function cambiarExistencia(id: number, existencia: number) {
  const { error } = await supabase
    .from('asignaciones')
    .update({ existencia })
    .eq('id', id);

  if (error) throw error;
}

// RF-15: baja lógica. Nunca .delete() aquí, o se pierde el histórico
// y la auditoría queda apuntando a un renglón que ya no existe.
export async function quitarAsignacion(id: number) {
  const { error } = await supabase
    .from('asignaciones')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw error;
}

export async function cambiarEstadoBli(id: number, estado: EstadoBli) {
  const { error } = await supabase.from('bli').update({ estado }).eq('id', id);
  if (error) throw error;
}
