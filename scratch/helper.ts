export async function obtenerOCrearCodigoPorTexto(codigoStr: string) {
  const limpio = codigoStr.trim()
  if (!limpio) return null

  const { data: existente } = await supabase
    .from('codigos')
    .select('id')
    .ilike('codigo', limpio)
    .single()

  if (existente) {
    return existente.id
  }

  // Si no existe, lo creamos
  const nuevo = await crearCodigo({ codigo: limpio, descripcion: 'Creado como equivalencia automática' })
  return nuevo.id
}
