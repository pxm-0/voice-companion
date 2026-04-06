export const COMPANION_MODES = ["think_with_me", "reflect", "journal_quietly"] as const

export type CompanionMode = (typeof COMPANION_MODES)[number]

export const SESSION_INPUT_TYPES = ["voice", "manual"] as const

export type SessionInputType = (typeof SESSION_INPUT_TYPES)[number]

export type PersistedTurnRole = "user" | "assistant"

export type PersistedTurnStatus = "streaming" | "final"

export type SessionTurnInput = {
  id: string
  role: PersistedTurnRole
  text: string
  status: PersistedTurnStatus
}

export type SessionArtifact = {
  title: string
  summary: string
  mood: string
  themes: string[]
  rapidLogBullets: string[]
  patternSummary: string | null
}

export type SessionTask = {
  id: string
  sessionId: string
  sessionTitle?: string | null
  content: string
  completed: boolean
  orderIndex: number
  updatedAt: string
}

export type ProfileMemoryView = {
  id: string
  kind: string
  content: string
  lastSeenAt: string
  pinned: boolean
  active: boolean
  weight?: number
}

export type SessionCard = {
  id: string
  startedAt: string
  endedAt: string
  entryDate: string
  inputType: SessionInputType
  mode: CompanionMode
  status: string
  turnCount: number
  transcriptRetained: boolean
  artifact: SessionArtifact | null
  tasks: SessionTask[]
  processingError: string | null
}

export type SessionDetail = SessionCard & {
  turns: Array<{
    id: string
    orderIndex: number
    role: string
    text: string
    status: string
  }>
}

export type TodayHubData = {
  todayLabel: string
  sessions: SessionCard[]
  openTasks: SessionTask[]
  profile: {
    summary: string | null
    memories: ProfileMemoryView[]
  }
}

export type FinalizeSessionRequest = {
  startedAt: string
  endedAt: string
  turns: SessionTurnInput[]
  mode: CompanionMode
  inputType: SessionInputType
}

export type FinalizeSessionResponse = {
  sessionId: string
  status: "completed" | "summary_failed"
  artifact: SessionArtifact | null
  tasks: SessionTask[]
  profile: {
    summary: string | null
    memories: ProfileMemoryView[]
  }
}

export function isCompanionMode(value: unknown): value is CompanionMode {
  return typeof value === "string" && COMPANION_MODES.includes(value as CompanionMode)
}

export function isSessionInputType(value: unknown): value is SessionInputType {
  return typeof value === "string" && SESSION_INPUT_TYPES.includes(value as SessionInputType)
}
