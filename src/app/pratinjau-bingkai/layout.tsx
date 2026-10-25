import React from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, background: '#f4f7f9', fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
