import './globals.css'
import Nav from '../components/Nav'

export const metadata = {
  title: 'Nova Growth OS · Peoplebox.ai',
  description: 'AI-powered growth platform for Nova',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>
        <Nav />
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
