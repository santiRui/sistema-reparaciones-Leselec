"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Users,
  ClipboardList,
  Calculator,
  Wrench,
  Package,
  CheckCircle,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Recepción", href: "/reception", icon: ClipboardList },
  { name: "Presupuesto", href: "/budget", icon: Calculator },
  { name: "Reparación", href: "/repair", icon: Wrench },
  { name: "Entrega", href: "/delivery", icon: Package },
  { name: "Entregas Finalizadas", href: "/completed", icon: CheckCircle },
  { name: "Orden de compra", href: "/purchase-order", icon: Package },
  { name: "Órdenes de compra", href: "/purchase-orders", icon: Package },
  { name: "Usuarios", href: "/admin/users", icon: Users },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {}
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("user")
    router.push("/login")
  }

  // Read role
  if (typeof window !== 'undefined' && role === null) {
    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        if (u && typeof u.role === 'string') setRole(u.role)
        else setRole('')
      } else {
        setRole('')
      }
    } catch { setRole('') }
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-OT3bqWGGUTwASGyHFkHBFvPbvVlQID.png"
              alt="LESELEC INGENIERÍA"
              className="h-16 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {(() => {
              let items = navigation
              if (role === 'ventas') {
                items = navigation.filter(n => n.href === '/purchase-order' || n.href === '/purchase-orders')
              } else if (role === 'taller') {
                items = navigation.filter(n => n.href !== '/purchase-order' && n.href !== '/purchase-orders')
              } else if (role === 'encargado') {
                items = navigation
              }
              return items
            })().map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Button
                  key={item.name}
                  variant={isActive ? "default" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    router.push(item.href)
                    setIsOpen(false)
                  }}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Button>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}
