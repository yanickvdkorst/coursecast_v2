import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'MatchPlay',
  description: 'Golf matchplay scoring — real-time, mobile-first',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#040d1a',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read theme preference from DB for SSR (avoids flash)
  let initialTheme: 'dark' | 'light' = 'dark'
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .single()
      if (profile?.theme === 'dark' || profile?.theme === 'light') initialTheme = profile.theme
    }
  } catch {
    // Not authenticated — use default dark
  }

  return (
    <html
      lang="en"
      className={`${geist.variable} h-full ${initialTheme}`}
      suppressHydrationWarning
    >
      <body className="h-full antialiased">
        <ThemeProvider initialTheme={initialTheme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
