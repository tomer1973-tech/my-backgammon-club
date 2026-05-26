/**
 * Prisma client singleton.
 *
 * In development, Next.js hot-reload recreates modules on each change.
 * Without this singleton pattern, each reload opens a new DB connection
 * pool and you quickly exhaust Supabase's connection limit.
 *
 * In production, the module is only instantiated once.
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
