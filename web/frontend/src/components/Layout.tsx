import {
  Camera,
  Grid3X3,
  LayoutDashboard,
  Menu,
  Shield,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { ModelStatus } from './ModelStatus'

function navItemClass(isActive: boolean) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
    isActive
      ? 'bg-emerald-500/15 text-emerald-500'
      : 'text-[#94a3b8] hover:bg-[#1e2d4a]/40 hover:text-[#e2e8f0]'
  }`
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 border-b border-[#1e2d4a] px-4 py-4">
        <Shield className="h-5 w-5 text-emerald-500" />
        <span className="text-lg font-semibold text-[#e2e8f0]">HaramBlur</span>
      </div>

      <nav className="px-3 py-4">
        <div className="space-y-1">
          <NavLink to="/" end className={({ isActive }) => navItemClass(isActive)}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/webcam" className={({ isActive }) => navItemClass(isActive)}>
            <Camera className="h-4 w-4 shrink-0" />
            <span>Webcam Test</span>
          </NavLink>
          <NavLink to="/batch" className={({ isActive }) => navItemClass(isActive)}>
            <Grid3X3 className="h-4 w-4 shrink-0" />
            <span>Batch Test</span>
          </NavLink>
        </div>
      </nav>

      <div className="mx-4 mt-auto rounded-xl border border-[#1e2d4a] bg-[#111827] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[#e2e8f0]">Model Status</h2>
        <ModelStatus />
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-[#e2e8f0]">
      <header className="flex items-center justify-between border-b border-[#1e2d4a] bg-[#111827] px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-500" />
          <span className="font-semibold">HaramBlur</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="rounded-lg border border-[#1e2d4a] p-2 text-[#e2e8f0] transition hover:bg-[#1e2d4a]/40"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </header>

      <div className="flex min-h-screen">
        <aside className="hidden w-[240px] flex-col border-r border-[#1e2d4a] bg-[#111827] md:flex">
          {sidebarContent}
        </aside>

        {menuOpen && (
          <aside className="fixed inset-0 z-40 flex md:hidden">
            <div className="flex min-h-full w-[240px] -translate-x-0 flex-col overflow-y-auto border-r border-[#1e2d4a] bg-[#111827] pb-4 transition-transform duration-200">
              {sidebarContent}
            </div>
            <button
              type="button"
              className="flex-1 bg-black/40"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu overlay"
            />
          </aside>
        )}

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
