'use server'

/**
 * Direct messages — simple 1-on-1 text messages between any two players.
 * No blocking/rate-limiting yet; intentionally minimal.
 */

import { db }                 from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import type { ActionResult }  from '@/types'

const MAX_BODY_LENGTH = 1000

export async function sendMessage(toPlayerId: string, body: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireSessionUser()
  if (user.id === toPlayerId) return { success: false, error: "You can't message yourself." }

  const trimmed = body.trim()
  if (!trimmed) return { success: false, error: 'Message cannot be empty.' }
  if (trimmed.length > MAX_BODY_LENGTH) return { success: false, error: 'Message is too long.' }

  const target = await db.player.findUnique({ where: { id: toPlayerId }, select: { id: true, isSuspended: true } })
  if (!target) return { success: false, error: 'Player not found.' }
  if (target.isSuspended) return { success: false, error: 'This player is suspended.' }

  const message = await db.message.create({
    data: { fromId: user.id, toId: toPlayerId, body: trimmed },
  })
  return { success: true, data: { id: message.id } }
}

export interface ConversationMessage {
  id:        string
  fromId:    string
  body:      string
  createdAt: Date
  mine:      boolean
}

export async function getConversation(otherPlayerId: string): Promise<ConversationMessage[]> {
  const user = await requireSessionUser()

  const rows = await db.message.findMany({
    where: {
      OR: [
        { fromId: user.id, toId: otherPlayerId },
        { fromId: otherPlayerId, toId: user.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })

  // Mark incoming messages as read.
  await db.message.updateMany({
    where: { fromId: otherPlayerId, toId: user.id, readAt: null },
    data:  { readAt: new Date() },
  })

  return rows.map(r => ({
    id:        r.id,
    fromId:    r.fromId,
    body:      r.body,
    createdAt: r.createdAt,
    mine:      r.fromId === user.id,
  }))
}

export interface ConversationSummary {
  playerId:      string
  playerName:    string
  playerAvatar:  string | null
  lastMessage:   string
  lastAt:        Date
  unreadCount:   number
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const user = await requireSessionUser()

  const rows = await db.message.findMany({
    where: { OR: [{ fromId: user.id }, { toId: user.id }] },
    orderBy: { createdAt: 'desc' },
    include: {
      from: { select: { id: true, name: true, avatarUrl: true } },
      to:   { select: { id: true, name: true, avatarUrl: true } },
    },
    take: 500,
  })

  const byOther = new Map<string, ConversationSummary>()
  for (const r of rows) {
    const other = r.fromId === user.id ? r.to : r.from
    const existing = byOther.get(other.id)
    if (!existing) {
      byOther.set(other.id, {
        playerId:     other.id,
        playerName:   other.name,
        playerAvatar: other.avatarUrl,
        lastMessage:  r.body,
        lastAt:       r.createdAt,
        unreadCount:  r.toId === user.id && !r.readAt ? 1 : 0,
      })
    } else if (r.toId === user.id && !r.readAt) {
      existing.unreadCount += 1
    }
  }

  return [...byOther.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
}

export async function getUnreadMessageCount(): Promise<number> {
  const user = await requireSessionUser()
  return db.message.count({ where: { toId: user.id, readAt: null } })
}
