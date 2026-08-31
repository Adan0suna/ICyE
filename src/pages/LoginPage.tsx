import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">🗄️</div>
        <h1>ICyE</h1>
        <p>Inventario de Códigos y Existencias</p>

        <div className="field">
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@ejemplo.com" required />
        </div>
        <div className="field">
          <label htmlFor="pass">Contraseña</label>
          <input id="pass" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
