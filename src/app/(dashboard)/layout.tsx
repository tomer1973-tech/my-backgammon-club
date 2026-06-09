import { redirect }        from 'next/navigation'
import { getSessionUser }  from '@/lib/session'
import { AppShell }        from '@/components/layout/app-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Suspended accounts cannot access the dashboard
  if (user.isSuspended) {
    redirect('/login?suspended=1')
  }

  return <AppShell user={user}>{children}</AppShell>
}
