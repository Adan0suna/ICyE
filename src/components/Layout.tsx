import { Outlet, NavLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🗄️</span>
          <span className="brand-name">ICyE</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/codigos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            📦 Códigos
          </NavLink>
        </nav>
        <button
          className="btn-logout"
          onClick={() => supabase.auth.signOut()}
        >
          ↩ Salir
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
