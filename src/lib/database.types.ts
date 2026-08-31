export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      perfiles: {
        Row: { id: string; nombre: string; rol: 'administrador' | 'capturista'; activo: boolean; creado_en: string }
        Insert: { id: string; nombre: string; rol?: 'administrador' | 'capturista'; activo?: boolean; creado_en?: string }
        Update: Partial<Database['public']['Tables']['perfiles']['Insert']>
      }
      casilleros: {
        Row: { id: number; clave: string; nombre: string | null; activo: boolean }
        Insert: { id?: number; clave: string; nombre?: string | null; activo?: boolean }
        Update: Partial<Database['public']['Tables']['casilleros']['Insert']>
      }
      filas: {
        Row: { id: number; casillero_id: number; clave: string; activo: boolean }
        Insert: { id?: number; casillero_id: number; clave: string; activo?: boolean }
        Update: Partial<Database['public']['Tables']['filas']['Insert']>
      }
      bli: {
        Row: { id: number; fila_id: number; subposicion: string; control: string; estado: 'disponible' | 'asignado' | 'incompleto'; notas: string | null; creado_en: string }
        Insert: { id?: number; fila_id: number; subposicion: string; control?: string; estado?: 'disponible' | 'asignado' | 'incompleto'; notas?: string | null; creado_en?: string }
        Update: Partial<Database['public']['Tables']['bli']['Insert']>
      }
      familias: {
        Row: { id: number; nombre: string }
        Insert: { id?: number; nombre: string }
        Update: Partial<Database['public']['Tables']['familias']['Insert']>
      }
      marcas: {
        Row: { id: number; nombre: string }
        Insert: { id?: number; nombre: string }
        Update: Partial<Database['public']['Tables']['marcas']['Insert']>
      }
      grupos: {
        Row: { id: number; clave: string; descripcion: string | null }
        Insert: { id?: number; clave: string; descripcion?: string | null }
        Update: Partial<Database['public']['Tables']['grupos']['Insert']>
      }
      codigos: {
        Row: { id: number; codigo: string; descripcion: string | null; familia_id: number | null; marca_id: number | null; grupo_id: number | null; activo: boolean; creado_en: string }
        Insert: { id?: number; codigo: string; descripcion?: string | null; familia_id?: number | null; marca_id?: number | null; grupo_id?: number | null; activo?: boolean; creado_en?: string }
        Update: Partial<Database['public']['Tables']['codigos']['Insert']>
      }
      asignaciones: {
        Row: { id: number; bli_id: number; codigo_id: number; existencia: number; activo: boolean; creado_por: string | null; creado_en: string; actualizado_en: string }
        Insert: { id?: number; bli_id: number; codigo_id: number; existencia?: number; activo?: boolean; creado_por?: string | null; creado_en?: string; actualizado_en?: string }
        Update: Partial<Database['public']['Tables']['asignaciones']['Insert']>
      }
      equivalencias: {
        Row: { codigo_a_id: number; codigo_b_id: number; nota: string | null }
        Insert: { codigo_a_id: number; codigo_b_id: number; nota?: string | null }
        Update: Partial<Database['public']['Tables']['equivalencias']['Insert']>
      }
    }
    Views: {
      v_asignaciones: { Row: Record<string, unknown> }
      v_exportacion:  { Row: Record<string, unknown> }
    }
    Functions: Record<string, unknown>
    Enums: Record<string, unknown>
  }
}
