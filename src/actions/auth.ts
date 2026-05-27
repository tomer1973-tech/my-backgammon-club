'use server'

import { redirect }       from 'next/navigation'
import { revalidatePath }  from 'next/cache'
import { headers }         from 'next/headers'
import { createClient }    from '@/lib/supabase/server'
import { db }              from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
} from '@/validations'
import type { ActionResult } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Derive the request origin for Supabase redirect URLs. */
function getOrigin(): string {
  const headersList = headers()
  const host        = headersList.get('host') ?? 'localhost:3001'
  const proto       = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

export async function login(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    email:    formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  let supabase
  try {
    supabase = createClient()
  } catch (err) {
    console.error('[auth/login] createClient error:', err)
    return { success: false, error: 'Authentication service unavailable. Please try again.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email:    parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    const isInvalid = error.message.toLowerCase().includes('invalid') ||
                      error.message.toLowerCase().includes('credentials')
    return {
      success: false,
      error: isInvalid
        ? 'Incorrect email or password.'
        : 'Sign in failed. Please try again.',
    }
  }

  redirect('/')
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────

export type RegisterResult = ActionResult<{ requiresConfirmation: boolean } | undefined>

export async function register(
  _prev: RegisterResult,
  formData: FormData,
): Promise<RegisterResult> {
  const raw = {
    name:            formData.get('name'),
    email:           formData.get('email'),
    password:        formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  // Check for existing profile (belt-and-suspenders; Supabase also enforces uniqueness)
  let existing
  try {
    existing = await db.player.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    })
  } catch (err) {
    console.error('[auth/register] DB lookup error:', err)
    return { success: false, error: 'Service temporarily unavailable. Please try again.' }
  }

  if (existing) {
    return { success: false, error: 'An account with this email already exists.' }
  }

  let supabase
  try {
    supabase = createClient()
  } catch (err) {
    console.error('[auth/register] createClient error:', err)
    return { success: false, error: 'Authentication service unavailable. Please try again.' }
  }

  // Create Supabase auth user
  const { data, error } = await supabase.auth.signUp({
    email:    parsed.data.email,
    password: parsed.data.password,
    options:  {
      data:       { name: parsed.data.name },
      emailRedirectTo: `${getOrigin()}/auth/callback`,
    },
  })

  if (error) {
    console.error('[auth/register] signUp error:', error.message)
    return { success: false, error: error.message }
  }

  if (!data.user) {
    return { success: false, error: 'Account creation failed. Please try again.' }
  }

  // Create the player profile in our DB (idempotent — skip on unique conflict)
  try {
    await db.player.upsert({
      where:  { supabaseUid: data.user.id },
      update: {},  // do nothing if already exists
      create: {
        supabaseUid: data.user.id,
        email:       parsed.data.email,
        name:        parsed.data.name,
        role:        'PLAYER',
      },
    })
  } catch (err) {
    console.error('[auth/register] player.create error:', err)
    // Don't fail the registration — the callback route will create the profile
  }

  // If Supabase returned a session, the user is immediately logged in
  // (email confirmation is disabled in the project settings).
  if (data.session) {
    redirect('/')
  }

  // Email confirmation is required — tell the client to show the check-your-email UI.
  return { success: true, data: { requiresConfirmation: true } }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('[auth/logout] error:', err)
  }
  redirect('/login')
}

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

export async function forgotPassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = { email: formData.get('email') }

  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  let supabase
  try {
    supabase = createClient()
  } catch (err) {
    console.error('[auth/forgotPassword] createClient error:', err)
    return { success: false, error: 'Service temporarily unavailable. Please try again.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getOrigin()}/auth/callback?next=/reset-password`,
  })

  if (error) {
    console.error('[auth/forgotPassword] error:', error.message)
    // Don't reveal whether the email exists — always succeed.
  }

  // Always return success to avoid email enumeration
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PASSWORD  (called from /reset-password after OAuth callback)
// ─────────────────────────────────────────────────────────────────────────────

export async function updatePassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    password:        formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = updatePasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  let supabase
  try {
    supabase = createClient()
  } catch (err) {
    console.error('[auth/updatePassword] createClient error:', err)
    return { success: false, error: 'Service temporarily unavailable. Please try again.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    console.error('[auth/updatePassword] error:', error.message)
    const isExpired = error.message.toLowerCase().includes('expired') ||
                      error.message.toLowerCase().includes('invalid')
    return {
      success: false,
      error: isExpired
        ? 'This password reset link has expired. Please request a new one.'
        : 'Failed to update password. Please try again.',
    }
  }

  redirect('/')
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE  (name update from /settings)
// ─────────────────────────────────────────────────────────────────────────────

export type UpdateProfileResult = ActionResult<{ saved: boolean } | undefined>

export async function updateProfile(
  _prev: UpdateProfileResult,
  formData: FormData,
): Promise<UpdateProfileResult> {
  const user = await requireSessionUser()

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  if (!name)           return { success: false, error: 'Name is required.' }
  if (name.length < 2) return { success: false, error: 'Name must be at least 2 characters.' }
  if (name.length > 60) return { success: false, error: 'Name must be 60 characters or fewer.' }

  await db.player.update({
    where: { id: user.id },
    data:  { name },
  })

  // Keep Supabase user metadata in sync
  try {
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { name } })
  } catch {
    // Non-fatal — DB is the source of truth
  }

  revalidatePath('/settings')
  return { success: true, data: { saved: true } }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE AUTH HELPERS  (called client-side after Supabase OTP verification)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether the current session user already has a player profile.
 * Called immediately after phone OTP verification succeeds on the client.
 *
 * Returns { isNew: true }  → user just registered, needs to pick a name
 * Returns { isNew: false } → returning user, safe to redirect to dashboard
 */
export async function checkPhoneUserProfile(): Promise<ActionResult<{ isNew: boolean }>> {
  let supabase
  try {
    supabase = createClient()
  } catch (err) {
    console.error('[auth/checkPhoneUserProfile] createClient error:', err)
    return { success: false, error: 'Service temporarily unavailable. Please try again.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const existing = await db.player.findUnique({
    where:  { supabaseUid: user.id },
    select: { id: true },
  })

  return { success: true, data: { isNew: !existing } }
}

/**
 * Creates the player profile for a phone-auth user who just registered.
 * Must be called after checkPhoneUserProfile returns { isNew: true }.
 */
export async function createPhoneUserProfile(
  name: string,
): Promise<ActionResult> {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length < 2) return { success: false, error: 'Name must be at least 2 characters.' }
  if (trimmed.length > 60)            return { success: false, error: 'Name must be 60 characters or fewer.' }

  let supabase
  try {
    supabase = createClient()
  } catch (err) {
    console.error('[auth/createPhoneUserProfile] createClient error:', err)
    return { success: false, error: 'Service temporarily unavailable. Please try again.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  try {
    await db.player.upsert({
      where:  { supabaseUid: user.id },
      update: { name: trimmed },   // idempotent — update name if called again
      create: {
        supabaseUid: user.id,
        // Phone-only users have no email → use a stable unique placeholder
        email: user.email ?? `${user.id}@phone.user`,
        name:  trimmed,
        role:  'PLAYER',
      },
    })
  } catch (err) {
    console.error('[auth/createPhoneUserProfile] DB error:', err)
    return { success: false, error: 'Failed to create profile. Please try again.' }
  }

  // Keep Supabase user metadata in sync
  try {
    await supabase.auth.updateUser({ data: { name: trimmed } })
  } catch {
    // Non-fatal
  }

  revalidatePath('/')
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE AVATAR  (emoji, flag, or base64 photo from /settings)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateAvatar(
  avatarValue: string | null,
): Promise<UpdateProfileResult> {
  const user = await requireSessionUser()

  if (avatarValue !== null) {
    const isDataUrl = avatarValue.startsWith('data:image/')
    const isFlag    = /^flag:[a-z]{2}$/.test(avatarValue)          // e.g. "flag:us"
    const isEmoji   = !isFlag && avatarValue.length <= 8 &&
                      !avatarValue.startsWith('http') &&
                      !avatarValue.startsWith('/')
    if (!isDataUrl && !isFlag && !isEmoji) {
      return { success: false, error: 'Invalid avatar format.' }
    }
    if (isDataUrl && avatarValue.length > 210_000) {
      return { success: false, error: 'Image is too large. Please choose a smaller photo.' }
    }
  }

  await db.player.update({
    where: { id: user.id },
    data:  { avatarUrl: avatarValue },
  })

  revalidatePath('/settings')
  revalidatePath('/players')
  return { success: true, data: { saved: true } }
}
