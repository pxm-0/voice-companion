export type PersistedTurnRole = "user" | "assistant"

export type PersistedTurnStatus = "streaming" | "final"

export type SessionTurnInput = {
  id: string
  role: PersistedTurnRole
  text: string
  status: PersistedTurnStatus
}

export type FinalizeSessionRequest = {
  startedAt: string
  endedAt: string
  turns: SessionTurnInput[]
}

export type FinalizeSessionResponse = {
  sessionId: string
  status: "completed" | "summary_failed"
  summary: {
    summary: string
    mood: string
    keyThemes: string[]
  } | null
  profile: {
    summary: string | null
    memories: Array<{
      id: string
      kind: string
      content: string
      lastSeenAt: string
    }>
  }
}
