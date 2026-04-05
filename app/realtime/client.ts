import type { TranscriptTurn } from "./types"

const DEBUG_REALTIME_EVENTS = false

let pc: RTCPeerConnection | null = null
let dc: RTCDataChannel | null = null
let localStream: MediaStream | null = null
let audioEl: HTMLAudioElement | null = null
let pendingRealtimeEvents: string[] = []

let turnCounter = 0
let activeAssistantTurnId: string | null = null
let assistantTextBuffer = ""
let assistantHasAudioTranscript = false
let assistantTurnFinalized = false
let sessionVersion = 0

let lastUserText = ""
let finalText = ""

let turnCountSinceUpdate = 0

function nextTurnId(role: "user" | "assistant") {
  turnCounter += 1
  return `${role}-${Date.now()}-${turnCounter}`
}

function emitTranscriptEvent(type: "transcript:update" | "transcript:final", detail: TranscriptTurn) {
  window.dispatchEvent(new CustomEvent<TranscriptTurn>(type, { detail }))
}

function flushPendingRealtimeEvents() {
  if (!dc || dc.readyState !== "open" || pendingRealtimeEvents.length === 0) {
    return
  }

  for (const payload of pendingRealtimeEvents) {
    dc.send(payload)
  }

  pendingRealtimeEvents = []
}

export function sendRealtimeEvent(event: Record<string, unknown>) {
  const payload = JSON.stringify(event)

  if (dc && dc.readyState === "open") {
    dc.send(payload)
    return
  }

  pendingRealtimeEvents.push(payload)
}

export function updateRealtimeSessionInstructions(instructions: string) {
  if (!instructions.trim()) {
    return
  }

  sendRealtimeEvent({
    type: "session.update",
    session: {
      instructions,
    },
  })
}

function ensureAssistantTurn() {
  if (activeAssistantTurnId) return activeAssistantTurnId

  activeAssistantTurnId = nextTurnId("assistant")
  assistantTextBuffer = ""
  assistantHasAudioTranscript = false
  assistantTurnFinalized = false

  return activeAssistantTurnId
}

function emitAssistantUpdate() {
  const id = ensureAssistantTurn()
  emitTranscriptEvent("transcript:update", {
    id,
    role: "assistant",
    text: assistantTextBuffer,
    status: "streaming",
  })
}

function finalizeAssistantTurn(finalText?: string) {
  if (!activeAssistantTurnId || assistantTurnFinalized) return

  if (typeof finalText === "string" && finalText.trim().length > 0) {
    assistantTextBuffer = finalText
  }

  emitTranscriptEvent("transcript:final", {
    id: activeAssistantTurnId,
    role: "assistant",
    text: assistantTextBuffer,
    status: "final",
  })

  assistantTurnFinalized = true
  activeAssistantTurnId = null
  assistantTextBuffer = ""
  assistantHasAudioTranscript = false
}

function resetAssistantState() {
  activeAssistantTurnId = null
  assistantTextBuffer = ""
  assistantHasAudioTranscript = false
  assistantTurnFinalized = false
}

function handleServerEvent(data: Record<string, unknown>) {
  const eventType = typeof data.type === "string" ? data.type : ""

  if (DEBUG_REALTIME_EVENTS) {
    console.log("Realtime event:", eventType, data)
  }

  if (eventType === "conversation.item.input_audio_transcription.completed") {
    const text =
      typeof data.transcript === "string"
        ? data.transcript
        : typeof data.text === "string"
          ? data.text
          : ""
    if (!text || !text.trim()) return

    lastUserText = text

    emitTranscriptEvent("transcript:final", {
      id: nextTurnId("user"),
      role: "user",
      text,
      status: "final",
    })
    return
  }

  if (eventType === "response.output_audio_transcript.delta") {
    const delta = typeof data.delta === "string" ? data.delta : ""
    if (!delta) return

    ensureAssistantTurn()
    assistantHasAudioTranscript = true
    assistantTurnFinalized = false
    assistantTextBuffer += delta
    emitAssistantUpdate()
    return
  }

  if (eventType === "response.output_text.delta") {
    if (assistantHasAudioTranscript) return

    const delta = typeof data.delta === "string" ? data.delta : ""
    if (!delta) return

    ensureAssistantTurn()
    assistantTurnFinalized = false
    assistantTextBuffer += delta
    emitAssistantUpdate()
    return
  }

  if (eventType === "response.output_audio_transcript.done") {
    const transcript = typeof data.transcript === "string" ? data.transcript : undefined
    finalizeAssistantTurn(transcript)
    return
  }

  if (eventType === "response.done") {
    finalizeAssistantTurn()
    
    //memory extraction
    try {
    fetch("/api/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: lastUserText,
        assistant: finalText,
      }),
    })
  } catch (err) {
    console.error("Memory extraction failed", err)
  }

    

  }
}

export async function initRealTime(options?: { instructions?: string }) {
  const initVersion = ++sessionVersion

  if (pc || localStream || dc) {
    stopRealTime()
  }

  const peerConnection = new RTCPeerConnection()
  pc = peerConnection
  resetAssistantState()

  const nextAudioEl = document.createElement("audio")
  nextAudioEl.autoplay = true
  nextAudioEl.style.display = "none"
  document.body.appendChild(nextAudioEl)
  audioEl = nextAudioEl

  peerConnection.ontrack = (e) => {
    if (audioEl !== nextAudioEl) return
    nextAudioEl.srcObject = e.streams[0]
  }

  const dataChannel = peerConnection.createDataChannel("oai-events")
  dc = dataChannel
  dataChannel.onopen = () => {
    flushPendingRealtimeEvents()

    if (options?.instructions?.trim()) {
      updateRealtimeSessionInstructions(options.instructions)
    }
  }
  dataChannel.onmessage = (event) => {
    try {
      const data: unknown = JSON.parse(event.data)
      if (data && typeof data === "object") {
        handleServerEvent(data as Record<string, unknown>)
      }
    } catch (error) {
      if (DEBUG_REALTIME_EVENTS) {
        console.error("Failed to parse data channel message:", error)
      }
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    if (sessionVersion !== initVersion || pc !== peerConnection) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    localStream = stream
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream)
    })

    const offer = await peerConnection.createOffer({ offerToReceiveAudio: true })
    await peerConnection.setLocalDescription(offer)

    const res = await fetch("/api/realtime", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sdp: offer.sdp,
        instructions: options?.instructions,
      }),
    })

    const data = await res.json()

    if (!res.ok || !data?.sdp) {
      console.error("Invalid SDP response", data)
      throw new Error(data?.error || "No SDP returned from server")
    }

    if (sessionVersion !== initVersion || pc !== peerConnection) {
      return
    }

    if (peerConnection.signalingState !== "have-local-offer") {
      throw new Error(
        `Peer connection was not ready for remote SDP. Current signaling state: ${peerConnection.signalingState}`,
      )
    }

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription({
        type: "answer",
        sdp: data.sdp,
      }),
    )
  } catch (error) {
    if (sessionVersion === initVersion) {
      stopRealTime()
    }
    throw error
  }
}

export function stopRealTime() {
  sessionVersion += 1

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop())
    localStream = null
  }

  if (audioEl) {
    audioEl.pause()
    audioEl.srcObject = null
    audioEl.remove()
    audioEl = null
  }

  if (dc) {
    dc.close()
    dc = null
  }

  if (pc) {
    pc.close()
    pc = null
  }

  resetAssistantState()
  pendingRealtimeEvents = []
  console.log("Real-time connection stopped")
}
