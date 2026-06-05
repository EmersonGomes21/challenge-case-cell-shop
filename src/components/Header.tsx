'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()

  const links = [
    {
      label: 'Home',
      href: '/',
    },
    {
      label: 'Pedidos',
      href: '/orders',
    },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-xl font-bold text-zinc-900"
        >
          📱 CaseCellShop
        </Link>

        <nav>
          <ul className="flex items-center gap-2">
            {links.map((link) => {
              const active = pathname === link.href

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}