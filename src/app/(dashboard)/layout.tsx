import { redirect }        from 'next/navigation'
import { getSessionUser }  from '@/lib/session'
import { AppShell }        from '@/components/layout/app-shell'

/**
 * Protected layout — wraps all authenticated dashboard routes.
 * The session check here is belt-and-suspenders; middleware already
 * handles the primary redirect. This ensures the layout has the user object.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return <AppShell user={user}>{children}</AppShell>
}
