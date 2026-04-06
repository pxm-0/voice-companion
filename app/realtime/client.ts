/**
 * app/realtime/client.ts — Pure WebRTC transport layer
 *
 * Responsibilities: peer connection, SDP exchange, audio tracks, data channel.
 * All event handling and behavior logic lives in handlers.ts.
 */

import { handleServerEvent, resetAssistantState, setCurrentMode } from "./handlers"
import type { CompanionMode } from "@/lib/session-types"

let pc: RTCPeerConnection | null = null
let dc: RTCDataChannel | null = null
let localStream: MediaStream | null = null
let audioEl: HTMLAudioElement | null = null
let pendingRealtimeEvents: string[] = []
let sessionVersion = 0

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
  if (!instructions.trim()) return

  sendRealtimeEvent({
    type: "session.update",
    session: { instructions },
  })
}

export function updateRealtimeMode(mode: CompanionMode) {
  setCurrentMode(mode)
}

export async function initRealTime(options?: {
  instructions?: string
  mode?: CompanionMode
}) {
  const initVersion = ++sessionVersion

  if (pc || localStream || dc) {
    stopRealTime()
  }

  const peerConnection = new RTCPeerConnection()
  pc = peerConnection
  resetAssistantState()

  if (options?.mode) {
    setCurrentMode(options.mode)
  }

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
      const data: unknown = JSON.parse(event.data as string)
      if (data && typeof data === "object") {
        handleServerEvent(data as Record<string, unknown>)
      }
    } catch {
      // Silently ignore malformed messages
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sdp: offer.sdp,
        instructions: options?.instructions,
      }),
    })

    const data = await res.json()

    if (!res.ok || !data?.sdp) {
      console.error("Invalid SDP response", data)
      throw new Error((data?.error as string) || "No SDP returned from server")
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
      new RTCSessionDescription({ type: "answer", sdp: data.sdp as string }),
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
}
