/**
 * /settings — Account Settings
 *
 * Profile info + password change for the logged-in player.
 */

import type { Metadata }   from 'next'
import { redirect }        from 'next/navigation'
import { Settings, Lock, LogOut, ShieldCheck, ImageIcon, Palette } from 'lucide-react'
import { getSessionUser }  from '@/lib/session'
import { ProfileForm }     from '@/components/settings/profile-form'
import { PasswordSection } from '@/components/settings/password-section'
import { LogoutButton }    from '@/components/settings/logout-button'
import { AvatarPicker }    from '@/components/settings/avatar-picker'
import { ThemeToggle }     from '@/components/ui/theme-toggle'

export const metadata: Metadata = { title: 'Settings — My Backgammon Club' }
export const dynamic = 'force-dynamic'

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title:       string
  description?: string
  icon:        React.ElementType
  children:    React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Icon className="h-4 w-4 text-gold" />
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-5">
        {children}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SettingsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Settings className="h-6 w-6 text-gold" />
          Settings
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">Manage your profile and account</p>
      </div>

      {/* Appearance */}
      <Section title="Appearance" description="Choose your preferred color theme" icon={Palette}>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink-muted">Select Dark, Light, or Auto (follows your device setting).</p>
          <ThemeToggle />
        </div>
      </Section>

      {/* Avatar */}
      <Section
        title="Avatar"
        description="Your profile photo, flag, or icon"
        icon={ImageIcon}
      >
        <AvatarPicker userName={user.name} currentAvatar={user.avatarUrl} />
      </Section>

      {/* Profile */}
      <Section
        title="Profile"
        description="Your public display name"
        icon={ShieldCheck}
      >
        <ProfileForm user={user} />
      </Section>

      {/* Password */}
      <Section
        title="Change password"
        description="Update your login password"
        icon={Lock}
      >
        <PasswordSection />
      </Section>

      {/* Sign out */}
      <Section title="Sign out" icon={LogOut}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">
            Signed in as <span className="font-medium text-ink">{user.email}</span>
          </p>
          <LogoutButton />
        </div>
      </Section>
    </div>
  )
}
