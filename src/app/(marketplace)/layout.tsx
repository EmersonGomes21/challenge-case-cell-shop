import '@/styles/globals.css'
import { ReactNode } from 'react'
import Providers from '../../providers/Providers'
import { Header } from '@/components/header'

export const metadata = {
  title: 'CaseCellShop',
  description: 'Mini checkout demo'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
