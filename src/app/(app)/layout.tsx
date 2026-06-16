import { BottomNav } from '@/components/layout/BottomNav'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { NotificationNudge } from '@/components/pwa/NotificationNudge'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <main className="flex-1 pb-24">
        {children}
      </main>
      <InstallPrompt />
      <NotificationNudge />
      <BottomNav />
    </div>
  )
}
