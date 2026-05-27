'use server'

import { redirect } from 'next/navigation'
import { headers }  from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'
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
