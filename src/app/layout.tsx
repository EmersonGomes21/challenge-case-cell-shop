import '../styles/globals.css'
import { ReactNode } from 'react'
import Providers from '../providers/Providers'

export const metadata = {
  title: 'CaseCellShop',
  description: 'Mini checkout demo'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
