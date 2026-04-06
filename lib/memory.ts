/**
 * lib/memory.ts — Memory evolution engine
 *
 * Atomic memory layer: fast-changing, weighted, decays over time.
 * This module owns all read/write/decay logic for ProfileMemory.
 * Session finalization routes through here instead of writing directly.
 */

import { ProfileMemoryKind } from "@prisma/client"
import { prisma } from "@/lib/prisma"

// --- Constants ---

/** Weight boost applied each time the same memory is seen again. */
const WEIGHT_BOOST = 0.5

/** Maximum weight a memory can reach regardless of repetition. */
const WEIGHT_CAP = 5.0

/** Decay multiplier applied per week of inactivity. e.g. 0.85^2 after 2 weeks. */
const DECAY_RATE_PER_WEEK = 0.85

/** Memories below this weight threshold are deactivated (not deleted). */
const DEACTIVATE_THRESHOLD = 0.15

/** Milliseconds in one week. */
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

/** How many weeks of inactivity before decay starts being applied. */
const DECAY_GRACE_WEEKS = 1

// --- Types ---

export type MemoryInput = {
  kind: ProfileMemoryKind
  content: string
}

export type MemoryForBrain = {
  kind: string
  content: string
  weight: number
  pinned: boolean
}

// --- Core: Upsert with weight evolution ---

/**
 * Write a batch of memories from a session.
 * - New memory: created with weight=1.0, seenCount=1
 * - Existing memory: weight boosted, seenCount incremented, lastSeenAt updated
 * - Pinned memories are never modified by this function
 */
export async function upsertMemories(
  sessionId: string | null,
  seenAt: Date,
  memories: MemoryInput[],
): Promise<void> {
  for (const memory of memories) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.profileMemory.findUnique({
        where: {
          kind_content: {
            kind: memory.kind,
            content: memory.content,
          },
        },
        select: {
          id: true,
          weight: true,
          seenCount: true,
          pinned: true,
        },
      })

      if (existing) {
        // Pinned memories are preserved as-is — update recency only
        const newWeight = existing.pinned
          ? existing.weight
          : Math.min(existing.weight + WEIGHT_BOOST, WEIGHT_CAP)

        await tx.profileMemory.update({
          where: { id: existing.id },
          data: {
            ...(sessionId ? { sourceSessionId: sessionId } : {}),
            lastSeenAt: seenAt,
            active: true,
            weight: newWeight,
            seenCount: existing.seenCount + 1,
          },
        })
      } else {
        await tx.profileMemory.create({
          data: {
            kind: memory.kind,
            content: memory.content,
            sourceSessionId: sessionId,
            lastSeenAt: seenAt,
            active: true,
            pinned: false,
            weight: 1.0,
            seenCount: 1,
          },
        })
      }
    })
  }
}

// --- Core: Decay ---

/**
 * Apply time-based decay to all non-pinned active memories.
 * Called as a background step after each session finalize.
 *
 * Decay formula: newWeight = weight * DECAY_RATE_PER_WEEK ^ weeksSinceLastSeen
 * Memories below DEACTIVATE_THRESHOLD are set active=false (soft-deleted).
 */
export async function decayMemories(): Promise<{
  decayed: number
  deactivated: number
}> {
  const now = Date.now()
  let decayed = 0
  let deactivated = 0

  const candidates = await prisma.profileMemory.findMany({
    where: { active: true, pinned: false },
    select: { id: true, weight: true, lastSeenAt: true },
  })

  for (const memory of candidates) {
    const weeksSinceLastSeen =
      (now - memory.lastSeenAt.getTime()) / MS_PER_WEEK

    // Skip memories seen within the grace period
    if (weeksSinceLastSeen < DECAY_GRACE_WEEKS) continue

    const weeksAfterGrace = weeksSinceLastSeen - DECAY_GRACE_WEEKS
    const newWeight = memory.weight * Math.pow(DECAY_RATE_PER_WEEK, weeksAfterGrace)

    if (newWeight < DEACTIVATE_THRESHOLD) {
      await prisma.profileMemory.update({
        where: { id: memory.id },
        data: { active: false, weight: newWeight },
      })
      deactivated++
    } else {
      await prisma.profileMemory.update({
        where: { id: memory.id },
        data: { weight: newWeight },
      })
      decayed++
    }
  }

  return { decayed, deactivated }
}

// --- Read: For brain injection ---

/**
 * Returns the top N memories ranked by: pinned > weight > recency.
 * This is what gets injected into the companion's system instructions.
 */
export async function getMemoriesForBrain(limit = 5): Promise<MemoryForBrain[]> {
  const memories = await prisma.profileMemory.findMany({
    where: { active: true },
    orderBy: [
      { pinned: "desc" },
      { weight: "desc" },
      { lastSeenAt: "desc" },
    ],
    take: limit,
    select: {
      kind: true,
      content: true,
      weight: true,
      pinned: true,
    },
  })

  return memories
}

/**
 * Returns all active memories ordered for profile page display.
 * Includes full view data (id, lastSeenAt, active).
 */
export async function getActiveMemories() {
  return prisma.profileMemory.findMany({
    where: { active: true },
    orderBy: [
      { pinned: "desc" },
      { weight: "desc" },
      { lastSeenAt: "desc" },
    ],
  })
}
