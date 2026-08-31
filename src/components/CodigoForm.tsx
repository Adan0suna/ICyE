import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Link2 } from 'lucide-react';
import { ComboCreable } from '@/components/ComboCreable';
import { BuscadorCodigo } from '@/components/BuscadorCodigo';
import {
  useFamilias,
  useMarcas,
  useCrearOpcion,
  useGuardarCodigo,
  useEquivalentes,
  useVincular,
  useDesvincular,
} from '@/hooks/useCatalogo';
import { equivalentesDe } from '@/api/catalogo';
import type { Codigo } from '@/api/catalogo';

const esquema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, 'El código es obligatorio')
    .max(50, 'Máximo 50 caracteres'),
  descripcion: z.string().trim().max(200).optional(),
  familia_id: z.number().int().nullable(),
  marca_id: z.number().int().nullable(),
});

type Valores = z.infer<typeof esquema>;

type Props = {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  codigo?: Codigo | null;
};

// Regla de prefijo → marca. Si algún día entra MAHLE u otra,
// se agrega un renglón aquí. Cuando sean muchas se migra a la BD.
const PREFIJOS: Record<string, string> = {
  CA:  'DC',
  HGX: 'FRACO',
};

export function CodigoForm({ abierto, onOpenChange, codigo }: Props) {
  const editando = codigo != null;

  const { data: familias = [] } = useFamilias();
  const { data: marcas = [] } = useMarcas();

  function sugerirMarca(texto: string) {
    if (form.getValues('marca_id') != null) return; // ya tiene marca, no pisar
    const cod = texto.trim().toUpperCase();
    const nombre = Object.entries(PREFIJOS).find(([p]) => cod.startsWith(p))?.[1];
    const marca = marcas.find((m) => m.nombre === nombre);
    if (marca) form.setValue('marca_id', marca.id);
  }
  const crearFamilia = useCrearOpcion('familia');
  const crearMarca = useCrearOpcion('marca');
  const guardar = useGuardarCodigo(() => onOpenChange(false));

  const { data: equivalentes = [] } = useEquivalentes(codigo?.id);
  const vincular = useVincular();
  const desvincular = useDesvincular();

  const [equivalentePendiente, setEquivalentePendiente] = useState<{
    id: number;
    codigo: string;
  } | null>(null);

  const form = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      codigo: '',
      descripcion: '',
      familia_id: null,
      marca_id: null,
    },
  });

  useEffect(() => {
    if (!abierto) return;
    setEquivalentePendiente(null);
    form.reset({
      codigo: codigo?.codigo ?? '',
      descripcion: codigo?.descripcion ?? '',
      familia_id: codigo?.familia_id ?? null,
      marca_id: codigo?.marca_id ?? null,
    });
  }, [abierto, codigo, form]);

  async function alGuardar(valores: Valores) {
    const datos = {
      codigo: valores.codigo,
      descripcion: valores.descripcion || null,
      familia_id: valores.familia_id,
      marca_id: valores.marca_id,
    };

    const resultado = await guardar.mutateAsync({ id: codigo?.id, datos });

    if (!editando && equivalentePendiente && resultado?.id) {
      await vincular.mutateAsync({
        a: resultado.id,
        b: equivalentePendiente.id,
      });
    }
  }

  async function agregarEquivalente(otro: { id: number; codigo: string }) {
    if (!codigo) {
      setEquivalentePendiente(otro);
      return;
    }

    const delOtro = await equivalentesDe(otro.id);
    if (equivalentes.length > 0 && delOtro.length > 0) {
      const total = equivalentes.length + delOtro.length + 2;
      const seguir = window.confirm(
        `Los dos códigos ya tienen equivalencias registradas. ` +
          `Al unirlos quedarán ${total} códigos en un mismo grupo. ¿Continuar?`,
      );
      if (!seguir) return;
    }

    vincular.mutate({ a: codigo.id, b: otro.id });
  }

  if (!abierto) return null;

  return (
    <div className="overlay" onClick={() => onOpenChange(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>{editando ? 'Editar código' : 'Nuevo código'}</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
          La equivalencia es opcional. Regístrala solo si es el mismo producto de otra marca.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="field">
            <label htmlFor="codigo">Código</label>
            <input
              id="codigo"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              style={{ fontFamily: 'monospace' }}
              {...form.register('codigo', {
                onBlur: (e) => sugerirMarca(e.target.value),
              })}
            />
            {form.formState.errors.codigo && (
              <p className="form-error">{form.formState.errors.codigo.message}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="descripcion">Descripción</label>
            <input id="descripcion" {...form.register('descripcion')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label>Familia</label>
              <Controller
                control={form.control}
                name="familia_id"
                render={({ field }) => (
                  <ComboCreable
                    opciones={familias}
                    valor={field.value}
                    onChange={field.onChange}
                    onCrear={crearFamilia.mutateAsync}
                    creando={crearFamilia.isPending}
                    placeholder="Sin familia"
                  />
                )}
              />
            </div>

            <div className="field">
              <label>Marca</label>
              <Controller
                control={form.control}
                name="marca_id"
                render={({ field }) => (
                  <ComboCreable
                    opciones={marcas}
                    valor={field.value}
                    onChange={field.onChange}
                    onCrear={crearMarca.mutateAsync}
                    creando={crearMarca.isPending}
                    placeholder="Sin marca"
                  />
                )}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.73rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Equivalencias
            </label>

            {equivalentes.length === 0 && !equivalentePendiente && (
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Sin equivalencias registradas.
              </p>
            )}

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {equivalentes.map((e) => (
                <li
                  key={e.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                >
                  <span>
                    <span style={{ fontFamily: 'monospace' }}>{e.codigo}</span>
                    {e.marca && (
                      <span style={{ marginLeft: '0.5rem', color: 'var(--muted)' }}>{e.marca}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '0.25rem', border: 'none', background: 'transparent', color: 'var(--muted)' }}
                    onClick={() => desvincular.mutate({ a: codigo!.id, b: e.id })}
                  >
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </li>
              ))}

              {equivalentePendiente && (
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px dashed var(--border)', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ fontFamily: 'monospace' }}>{equivalentePendiente.codigo}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    se vincula al guardar
                  </span>
                </li>
              )}
            </ul>

            <BuscadorCodigo
              excluir={codigo?.id}
              onSeleccionar={agregarEquivalente}
              icono={<Link2 style={{ width: 16, height: 16 }} />}
              placeholder="Buscar el código equivalente…"
            />
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={guardar.isPending}
            onClick={form.handleSubmit(alGuardar)}
          >
            {guardar.isPending ? '⏳' : 'Guardar código'}
          </button>
        </div>
      </div>
    </div>
  );
}
