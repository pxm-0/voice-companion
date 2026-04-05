export type TranscriptRole = "user" | "assistant"

export type TranscriptTurnStatus = "streaming" | "final"

export type TranscriptTurn = {
  id: string
  role: TranscriptRole
  text: string
  status: TranscriptTurnStatus
}
