"use client"
import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { ReactNode } from 'react'

export default function Modal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title?: string, children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-w-md w-full -translate-x-1/2 -translate-y-1/2 bg-white rounded p-4 shadow z-50 focus:outline-none">
          <div className="relative">
            <Dialog.Close asChild>
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 p-1">✕</button>
            </Dialog.Close>
            {title ? (
              <Dialog.Title className="text-lg font-semibold text-gray-800">{title}</Dialog.Title>
            ) : (
              <Dialog.Title className="sr-only">Dialog</Dialog.Title>
            )}

            <div className="mt-3">
              {children}
            </div>

            <div className="mt-6 flex justify-between">
              <Link href="/" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">Ir para pedidos</Link>
              <Dialog.Close asChild>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">Continuar comprando</button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
