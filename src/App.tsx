import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import LoginPage from '@/pages/LoginPage'
import CodigosPage from '@/pages/CodigosPage'
import Layout from '@/components/Layout'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Cargando sesión
  if (session === undefined) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f17' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route element={session ? <Layout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/codigos" replace />} />
          <Route path="/codigos" element={<CodigosPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
