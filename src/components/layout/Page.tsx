import type { ReactNode } from 'react'

export function Page({ children, wide = false, className = '' }: { children: ReactNode; wide?: boolean; className?: string }) {
  return <main className={`mx-auto w-full ${wide ? 'max-w-7xl' : 'max-w-5xl'} px-4 py-8 ${className}`}>{children}</main>
}
