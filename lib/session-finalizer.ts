import {
  CompanionMode as PrismaCompanionMode,
  ProfileMemoryKind,
  SessionInputType as PrismaSessionInputType,
  SessionStatus,
  SessionTurnRole,
  SessionTurnStatus,
} from "@prisma/client"
import { formatDate } from "@/lib/format-date"
import { prisma } from "@/lib/prisma"
import { generateSessionSummary } from "@/lib/session-summary"
import type {
  CompanionMode,
  FinalizeSessionRequest,
  FinalizeSessionResponse,
  ProfileMemoryView,
  SessionArtifact,
  SessionCard,
  SessionDetail,
  SessionInputType,
  SessionTask,
  SessionTurnInput,
  TodayHubData,
} from "@/lib/session-types"
import { isCompanionMode, isSessionInputType } from "@/lib/session-types"

const MAX_RETAINED_TRANSCRIPTS = 5

function toSessionTurnRole(role: SessionTurnInput["role"]) {
  return role === "user" ? SessionTurnRole.USER : SessionTurnRole.ASSISTANT
}

function toSessionTurnStatus(status: SessionTurnInput["status"]) {
  return status === "streaming" ? SessionTurnStatus.STREAMING : SessionTurnStatus.FINAL
}

function toPrismaMode(mode: CompanionMode) {
  switch (mode) {
    case "reflect":
      return PrismaCompanionMode.REFLECT
    case "journal_quietly":
      return PrismaCompanionMode.JOURNAL_QUIETLY
    default:
      return PrismaCompanionMode.THINK_WITH_ME
  }
}

function fromPrismaMode(mode: PrismaCompanionMode): CompanionMode {
  switch (mode) {
    case PrismaCompanionMode.REFLECT:
      return "reflect"
    case PrismaCompanionMode.JOURNAL_QUIETLY:
      return "journal_quietly"
    default:
      return "think_with_me"
  }
}

function toPrismaInputType(inputType: SessionInputType) {
  return inputType === "manual" ? PrismaSessionInputType.MANUAL : PrismaSessionInputType.VOICE
}

function fromPrismaInputType(inputType: PrismaSessionInputType): SessionInputType {
  return inputType === PrismaSessionInputType.MANUAL ? "manual" : "voice"
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

function normalizeStringArray(values: unknown, label: string) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
    throw new Error(`${label} must be an array of strings.`)
  }

  return values.map((value) => value.trim()).filter(Boolean)
}

function serializeProfileMemories(memories: Array<{
  id: string
  kind: ProfileMemoryKind
  content: string
  lastSeenAt: Date
  pinned: boolean
  active: boolean
}>): ProfileMemoryView[] {
  return memories.map((memory) => ({
    id: memory.id,
    kind: memory.kind,
    content: memory.content,
    lastSeenAt: memory.lastSeenAt.toISOString(),
    pinned: memory.pinned,
    active: memory.active,
  }))
}

function parseStoredStringArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is string => typeof item === "string")
  } catch {
    return []
  }
}

function serializeArtifact(summary: {
  title: string
  summary: string
  mood: string
  keyThemesJson: string
  rapidLogBulletsJson: string
} | null): SessionArtifact | null {
  if (!summary) {
    return null
  }

  return {
    title: summary.title,
    summary: summary.summary,
    mood: summary.mood,
    themes: parseStoredStringArray(summary.keyThemesJson),
    rapidLogBullets: parseStoredStringArray(summary.rapidLogBulletsJson),
  }
}

function serializeTask(task: {
  id: string
  sessionId: string
  content: string
  completed: boolean
  orderIndex: number
  updatedAt: Date
  session?: {
    summary: {
      title: string
    } | null
  } | null
}): SessionTask {
  return {
    id: task.id,
    sessionId: task.sessionId,
    sessionTitle: task.session?.summary?.title ?? null,
    content: task.content,
    completed: task.completed,
    orderIndex: task.orderIndex,
    updatedAt: task.updatedAt.toISOString(),
  }
}

function serializeSessionCard(session: {
  id: string
  startedAt: Date
  endedAt: Date
  entryDate: Date
  inputType: PrismaSessionInputType
  mode: PrismaCompanionMode
  status: SessionStatus
  turnCount: number
  transcriptRetained: boolean
  processingError: string | null
  summary: {
    title: string
    summary: string
    mood: string
    keyThemesJson: string
    rapidLogBulletsJson: string
  } | null
  tasks: Array<{
    id: string
    sessionId: string
    content: string
    completed: boolean
    orderIndex: number
    updatedAt: Date
  }>
}): SessionCard {
  return {
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt.toISOString(),
    entryDate: session.entryDate.toISOString(),
    inputType: fromPrismaInputType(session.inputType),
    mode: fromPrismaMode(session.mode),
    status: session.status,
    turnCount: session.turnCount,
    transcriptRetained: session.transcriptRetained,
    artifact: serializeArtifact(session.summary),
    tasks: session.tasks.map((task) => serializeTask(task)),
    processingError: session.processingError,
  }
}

function serializeSessionDetail(session: {
  id: string
  startedAt: Date
  endedAt: Date
  entryDate: Date
  inputType: PrismaSessionInputType
  mode: PrismaCompanionMode
  status: SessionStatus
  turnCount: number
  transcriptRetained: boolean
  processingError: string | null
  summary: {
    title: string
    summary: string
    mood: string
    keyThemesJson: string
    rapidLogBulletsJson: string
  } | null
  tasks: Array<{
    id: string
    sessionId: string
    content: string
    completed: boolean
    orderIndex: number
    updatedAt: Date
  }>
  turns: Array<{
    id: string
    orderIndex: number
    role: SessionTurnRole
    text: string
    status: SessionTurnStatus
  }>
}): SessionDetail {
  const card = serializeSessionCard(session)

  return {
    ...card,
    turns: session.turns.map((turn) => ({
      id: turn.id,
      orderIndex: turn.orderIndex,
      role: turn.role,
      text: turn.text,
      status: turn.status,
    })),
  }
}

function toEntryDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getTodayRange(now = new Date()) {
  const start = toEntryDate(now)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
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
  const { startedAt, endedAt, turns, mode, inputType } = payload

  if (typeof startedAt !== "string" || Number.isNaN(Date.parse(startedAt))) {
    throw new Error("startedAt must be a valid ISO date string.")
  }

  if (typeof endedAt !== "string" || Number.isNaN(Date.parse(endedAt))) {
    throw new Error("endedAt must be a valid ISO date string.")
  }

  if (!Array.isArray(turns)) {
    throw new Error("turns must be an array.")
  }

  if (!isCompanionMode(mode)) {
    throw new Error("mode must be a valid companion mode.")
  }

  if (!isSessionInputType(inputType)) {
    throw new Error("inputType must be a valid session input type.")
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
    mode,
    inputType,
  }
}

async function loadProfileStateForMutation() {
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
      orderBy: [{ pinned: "desc" }, { lastSeenAt: "desc" }, { content: "asc" }],
      select: {
        id: true,
        kind: true,
        content: true,
        lastSeenAt: true,
        pinned: true,
        active: true,
      },
    }),
  ])

  return {
    summary: snapshot?.summary ?? null,
    memories: serializeProfileMemories(memories),
  }
}

export async function finalizeSession(body: unknown): Promise<FinalizeSessionResponse> {
  const payload = validateFinalizeRequest(body)
  const startedAt = new Date(payload.startedAt)
  const endedAt = new Date(payload.endedAt)
  const turns = normalizeTurns(payload.turns)

  if (turns.length === 0) {
    throw new Error("At least one non-empty turn is required.")
  }

  const session = await prisma.session.create({
    data: {
      startedAt,
      endedAt,
      entryDate: toEntryDate(startedAt),
      inputType: toPrismaInputType(payload.inputType),
      mode: toPrismaMode(payload.mode),
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
        orderBy: [{ pinned: "desc" }, { lastSeenAt: "desc" }],
        select: {
          kind: true,
          content: true,
        },
      }),
    ])

    const generated = await generateSessionSummary({
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
      mode: payload.mode,
      inputType: payload.inputType,
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
          title: generated.title,
          summary: generated.sessionSummary,
          keyThemesJson: JSON.stringify(generated.keyThemes),
          rapidLogBulletsJson: JSON.stringify(generated.rapidLogBullets),
          mood: generated.mood,
        },
      })

      if (generated.actionItems.length > 0) {
        await tx.task.createMany({
          data: generated.actionItems.map((content, index) => ({
            sessionId: session.id,
            content,
            orderIndex: index,
          })),
        })
      }

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
            pinned: false,
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

    const [tasks, profile] = await Promise.all([
      prisma.task.findMany({
        where: {
          sessionId: session.id,
        },
        orderBy: {
          orderIndex: "asc",
        },
      }),
      loadProfileStateForMutation(),
    ])

    return {
      sessionId: session.id,
      status: "completed",
      artifact: {
        title: generated.title,
        summary: generated.sessionSummary,
        mood: generated.mood,
        themes: generated.keyThemes,
        rapidLogBullets: generated.rapidLogBullets,
      },
      tasks: tasks.map((task) => serializeTask(task)),
      profile,
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

    return {
      sessionId: session.id,
      status: "summary_failed",
      artifact: null,
      tasks: [],
      profile: await loadProfileStateForMutation(),
    }
  }
}

export async function getSessionList() {
  const sessions = await prisma.session.findMany({
    orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
    include: {
      summary: true,
      tasks: {
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  })

  return sessions.map((session) => serializeSessionCard(session))
}

export async function getSessionById(id: string) {
  const session = await prisma.session.findUnique({
    where: {
      id,
    },
    include: {
      summary: true,
      tasks: {
        orderBy: {
          orderIndex: "asc",
        },
      },
      turns: {
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  })

  if (!session) {
    return null
  }

  return serializeSessionDetail(session)
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
      orderBy: [{ pinned: "desc" }, { lastSeenAt: "desc" }, { content: "asc" }],
    }),
  ])

  return {
    snapshot: snapshot
      ? {
          summary: snapshot.summary,
        }
      : null,
    memories: serializeProfileMemories(memories),
  }
}

export async function getTodayHubData(): Promise<TodayHubData> {
  const { start, end } = getTodayRange()

  const [sessions, openTasks, profile] = await Promise.all([
    prisma.session.findMany({
      where: {
        entryDate: {
          gte: start,
          lt: end,
        },
      },
      orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
      include: {
        summary: true,
        tasks: {
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
    }),
    prisma.task.findMany({
      where: {
        completed: false,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        session: {
          include: {
            summary: true,
          },
        },
      },
      take: 8,
    }),
    getProfileState(),
  ])

  return {
    todayLabel: formatDate(start),
    sessions: sessions.map((session) => serializeSessionCard(session)),
    openTasks: openTasks.map((task) => serializeTask(task)),
    profile: {
      summary: profile.snapshot?.summary ?? null,
      memories: profile.memories.slice(0, 4),
    },
  }
}

export async function updateSessionArtifact(
  sessionId: string,
  input: {
    title?: string
    summary?: string
    rapidLogBullets?: string[]
  },
) {
  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      summary: true,
    },
  })

  if (!session || !session.summary) {
    return null
  }

  const data: {
    title?: string
    summary?: string
    rapidLogBulletsJson?: string
  } = {}

  if (typeof input.title === "string") {
    const title = input.title.trim()
    if (!title) {
      throw new Error("title cannot be empty.")
    }
    data.title = title
  }

  if (typeof input.summary === "string") {
    const summary = input.summary.trim()
    if (!summary) {
      throw new Error("summary cannot be empty.")
    }
    data.summary = summary
  }

  if (input.rapidLogBullets) {
    data.rapidLogBulletsJson = JSON.stringify(
      input.rapidLogBullets.map((bullet) => bullet.trim()).filter(Boolean),
    )
  }

  await prisma.sessionSummary.update({
    where: {
      sessionId,
    },
    data,
  })

  return getSessionById(sessionId)
}

export async function updateTask(
  taskId: string,
  input: {
    content?: string
    completed?: boolean
  },
) {
  const data: {
    content?: string
    completed?: boolean
  } = {}

  if (typeof input.content === "string") {
    const content = input.content.trim()
    if (!content) {
      throw new Error("content cannot be empty.")
    }
    data.content = content
  }

  if (typeof input.completed === "boolean") {
    data.completed = input.completed
  }

  const task = await prisma.task.update({
    where: {
      id: taskId,
    },
    data,
    include: {
      session: {
        include: {
          summary: true,
        },
      },
    },
  })

  return serializeTask(task)
}

export async function updateProfileMemory(
  memoryId: string,
  input: {
    content?: string
    pinned?: boolean
    active?: boolean
  },
) {
  const data: {
    content?: string
    pinned?: boolean
    active?: boolean
  } = {}

  if (typeof input.content === "string") {
    const content = input.content.trim()
    if (!content) {
      throw new Error("content cannot be empty.")
    }
    data.content = content
  }

  if (typeof input.pinned === "boolean") {
    data.pinned = input.pinned
  }

  if (typeof input.active === "boolean") {
    data.active = input.active
  }

  const memory = await prisma.profileMemory.update({
    where: {
      id: memoryId,
    },
    data,
    select: {
      id: true,
      kind: true,
      content: true,
      lastSeenAt: true,
      pinned: true,
      active: true,
    },
  })

  return serializeProfileMemories([memory])[0]
}

export function getSummaryPreview(artifact: SessionArtifact | null) {
  if (!artifact) {
    return "Summary unavailable for this session."
  }

  return artifact.summary
}

export function parseKeyThemes(artifact: SessionArtifact | null) {
  return artifact?.themes ?? []
}

export function parseRapidLogBullets(artifact: SessionArtifact | null) {
  return artifact?.rapidLogBullets ?? []
}

export function validateSessionArtifactPatch(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.")
  }

  const payload = body as Record<string, unknown>

  return {
    title: typeof payload.title === "string" ? payload.title : undefined,
    summary: typeof payload.summary === "string" ? payload.summary : undefined,
    rapidLogBullets:
      payload.rapidLogBullets !== undefined
        ? normalizeStringArray(payload.rapidLogBullets, "rapidLogBullets")
        : undefined,
  }
}

export function validateTaskPatch(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.")
  }

  const payload = body as Record<string, unknown>

  return {
    content: typeof payload.content === "string" ? payload.content : undefined,
    completed: typeof payload.completed === "boolean" ? payload.completed : undefined,
  }
}

export function validateMemoryPatch(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.")
  }

  const payload = body as Record<string, unknown>

  return {
    content: typeof payload.content === "string" ? payload.content : undefined,
    pinned: typeof payload.pinned === "boolean" ? payload.pinned : undefined,
    active: typeof payload.active === "boolean" ? payload.active : undefined,
  }
}
