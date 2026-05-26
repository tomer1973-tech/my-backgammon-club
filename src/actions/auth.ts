'use server'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'
import { loginSchema, registerSchema } from '@/validations'
import type { ActionResult } from '@/types'

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

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email:    parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Don't leak internal Supabase error messages
    const message =
      error.message.toLowerCase().includes('invalid')
        ? 'Incorrect email or password'
        : 'Sign in failed. Please try again.'
    return { success: false, error: message }
  }

  redirect('/')
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────

export async function register(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
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

  // Check for existing profile (belt-and-suspenders; Supabase also enforces unique email)
  const existing = await db.player.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  })
  if (existing) {
    return { success: false, error: 'An account with this email already exists.' }
  }

  const supabase = createClient()

  // Create Supabase auth user
  const { data, error } = await supabase.auth.signUp({
    email:    parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data.user) {
    return { success: false, error: 'Account creation failed. Please try again.' }
  }

  // Create the player profile in our DB
  await db.player.create({
    data: {
      supabaseUid: data.user.id,
      email:       parsed.data.email,
      name:        parsed.data.name,
      role:        'PLAYER',
    },
  })

  redirect('/')
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
