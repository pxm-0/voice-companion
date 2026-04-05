import { ProfileMemoryKind, SessionStatus, SessionTurnRole, SessionTurnStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { generateSessionSummary } from "@/lib/session-summary"
import type { FinalizeSessionRequest, FinalizeSessionResponse, SessionTurnInput } from "@/lib/session-types"

const MAX_RETAINED_TRANSCRIPTS = 5

function toSessionTurnRole(role: SessionTurnInput["role"]) {
  return role === "user" ? SessionTurnRole.USER : SessionTurnRole.ASSISTANT
}

function toSessionTurnStatus(status: SessionTurnInput["status"]) {
  return status === "streaming" ? SessionTurnStatus.STREAMING : SessionTurnStatus.FINAL
}

function normalizeTurns(turns: SessionTurnInput[]) {
  return turns
    .filter((turn) => turn.text.trim().length > 0)
    .map((turn, index) => ({
      orderIndex: index,
      role: toSessionTurnRole(turn.role),
      text: turn.text.trim(),
      status: toSessionTurnStatus(turn.status),
    }))
}

function serializeProfileMemories(
  memories: Array<{
    id: string
    kind: ProfileMemoryKind
    content: string
    lastSeenAt: Date
  }>,
) {
  return memories.map((memory) => ({
    id: memory.id,
    kind: memory.kind,
    content: memory.content,
    lastSeenAt: memory.lastSeenAt.toISOString(),
  }))
}

async function pruneOldTranscripts() {
  const sessionsToPrune = await prisma.session.findMany({
    where: {
      transcriptRetained: true,
    },
    orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
    skip: MAX_RETAINED_TRANSCRIPTS,
    select: {
      id: true,
    },
  })

  if (sessionsToPrune.length === 0) {
    return
  }

  const sessionIds = sessionsToPrune.map((session) => session.id)

  await prisma.$transaction([
    prisma.sessionTurn.deleteMany({
      where: {
        sessionId: {
          in: sessionIds,
        },
      },
    }),
    prisma.session.updateMany({
      where: {
        id: {
          in: sessionIds,
        },
      },
      data: {
        transcriptRetained: false,
      },
    }),
  ])
}

function validateFinalizeRequest(body: unknown): FinalizeSessionRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.")
  }

  const payload = body as Record<string, unknown>
  const { startedAt, endedAt, turns } = payload

  if (typeof startedAt !== "string" || Number.isNaN(Date.parse(startedAt))) {
    throw new Error("startedAt must be a valid ISO date string.")
  }

  if (typeof endedAt !== "string" || Number.isNaN(Date.parse(endedAt))) {
    throw new Error("endedAt must be a valid ISO date string.")
  }

  if (!Array.isArray(turns)) {
    throw new Error("turns must be an array.")
  }

  const normalizedTurns = turns.map((turn) => {
    if (!turn || typeof turn !== "object") {
      throw new Error("Each turn must be an object.")
    }

    const item = turn as Record<string, unknown>
    if (typeof item.id !== "string" || item.id.length === 0) {
      throw new Error("Each turn must have an id.")
    }

    if (item.role !== "user" && item.role !== "assistant") {
      throw new Error("Each turn must have a valid role.")
    }

    if (typeof item.text !== "string") {
      throw new Error("Each turn must have text.")
    }

    if (item.status !== "streaming" && item.status !== "final") {
      throw new Error("Each turn must have a valid status.")
    }

    return {
      id: item.id,
      role: item.role,
      text: item.text,
      status: item.status,
    } satisfies SessionTurnInput
  })

  return {
    startedAt,
    endedAt,
    turns: normalizedTurns,
  }
}

export async function finalizeSession(body: unknown): Promise<FinalizeSessionResponse> {
  const payload = validateFinalizeRequest(body)
  const startedAt = new Date(payload.startedAt)
  const endedAt = new Date(payload.endedAt)
  const turns = normalizeTurns(payload.turns)

  const session = await prisma.session.create({
    data: {
      startedAt,
      endedAt,
      status: SessionStatus.PROCESSING,
      turnCount: turns.length,
      transcriptRetained: true,
      turns: {
        create: turns,
      },
    },
  })

  try {
    const [existingProfile, existingMemories] = await Promise.all([
      prisma.profileSnapshot.findUnique({
        where: {
          id: "singleton",
        },
      }),
      prisma.profileMemory.findMany({
        where: {
          active: true,
        },
        orderBy: {
          lastSeenAt: "desc",
        },
        select: {
          kind: true,
          content: true,
        },
      }),
    ])

    const generated = await generateSessionSummary({
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
      turns: turns.map((turn) => ({
        role: turn.role === SessionTurnRole.USER ? "user" : "assistant",
        text: turn.text,
      })),
      existingProfileSummary: existingProfile?.summary ?? null,
      existingMemories,
    })

    await prisma.$transaction(async (tx) => {
      await tx.sessionSummary.create({
        data: {
          sessionId: session.id,
          summary: generated.sessionSummary,
          keyThemesJson: JSON.stringify(generated.keyThemes),
          mood: generated.mood,
        },
      })

      await tx.profileSnapshot.upsert({
        where: {
          id: "singleton",
        },
        update: {
          summary: generated.profileSummary,
        },
        create: {
          id: "singleton",
          summary: generated.profileSummary,
        },
      })

      for (const memory of generated.memories) {
        await tx.profileMemory.upsert({
          where: {
            kind_content: {
              kind: memory.kind,
              content: memory.content,
            },
          },
          update: {
            sourceSessionId: session.id,
            lastSeenAt: endedAt,
            active: true,
          },
          create: {
            kind: memory.kind,
            content: memory.content,
            sourceSessionId: session.id,
            lastSeenAt: endedAt,
            active: true,
          },
        })
      }

      await tx.session.update({
        where: {
          id: session.id,
        },
        data: {
          status: SessionStatus.COMPLETED,
          processingError: null,
        },
      })
    })

    await pruneOldTranscripts()

    const [profileSnapshot, profileMemories] = await Promise.all([
      prisma.profileSnapshot.findUnique({
        where: {
          id: "singleton",
        },
      }),
      prisma.profileMemory.findMany({
        where: {
          active: true,
        },
        orderBy: [{ kind: "asc" }, { content: "asc" }],
        select: {
          id: true,
          kind: true,
          content: true,
          lastSeenAt: true,
        },
      }),
    ])

    return {
      sessionId: session.id,
      status: "completed",
      summary: {
        summary: generated.sessionSummary,
        mood: generated.mood,
        keyThemes: generated.keyThemes,
      },
      profile: {
        summary: profileSnapshot?.summary ?? null,
        memories: serializeProfileMemories(profileMemories),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown summary generation error."

    await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        status: SessionStatus.SUMMARY_FAILED,
        processingError: message,
      },
    })

    await pruneOldTranscripts()

    const [profileSnapshot, profileMemories] = await Promise.all([
      prisma.profileSnapshot.findUnique({
        where: {
          id: "singleton",
        },
      }),
      prisma.profileMemory.findMany({
        where: {
          active: true,
        },
        orderBy: [{ kind: "asc" }, { content: "asc" }],
        select: {
          id: true,
          kind: true,
          content: true,
          lastSeenAt: true,
        },
      }),
    ])

    return {
      sessionId: session.id,
      status: "summary_failed",
      summary: null,
      profile: {
        summary: profileSnapshot?.summary ?? null,
        memories: serializeProfileMemories(profileMemories),
      },
    }
  }
}

export async function getSessionList() {
  return prisma.session.findMany({
    orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
    include: {
      summary: true,
    },
  })
}

export async function getSessionById(id: string) {
  return prisma.session.findUnique({
    where: {
      id,
    },
    include: {
      summary: true,
      turns: {
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  })
}

export async function getProfileState() {
  const [snapshot, memories] = await Promise.all([
    prisma.profileSnapshot.findUnique({
      where: {
        id: "singleton",
      },
    }),
    prisma.profileMemory.findMany({
      where: {
        active: true,
      },
      orderBy: [{ kind: "asc" }, { content: "asc" }],
    }),
  ])

  return {
    snapshot,
    memories,
  }
}

export function getSummaryPreview(summary: { summary: string } | null) {
  if (!summary) {
    return "Summary unavailable for this session."
  }

  return summary.summary
}

export function parseKeyThemes(summary: { keyThemesJson: string } | null) {
  if (!summary) {
    return []
  }

  try {
    const parsed = JSON.parse(summary.keyThemesJson) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((value): value is string => typeof value === "string")
  } catch {
    return []
  }
}
