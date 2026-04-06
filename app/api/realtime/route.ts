import { auth } from "@/lib/auth"

const REALTIME_MODEL = "gpt-realtime-mini"

export async function POST(req: Request) {
  const sessionAuth = await auth()
  if (!sessionAuth?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { sdp, instructions } = await req.json()

    if (typeof sdp !== "string" || !sdp.trim()) {
      return Response.json({ error: "Missing SDP offer" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Server is missing OPENAI_API_KEY" }, { status: 500 })
    }

    const sessionConfig = {
      type: "realtime",
      model: REALTIME_MODEL,
      ...(typeof instructions === "string" && instructions.trim() ? { instructions: instructions.trim() } : {}),
      audio: {
        input: {
          transcription: {
            model: "gpt-4o-mini-transcribe",
          },
        },
        output: {
          voice: "marin",
        },
      },
    }

    const form = new FormData()
    form.set("sdp", sdp)
    form.set("session", JSON.stringify(sessionConfig))

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
    })

    const text = await response.text()

    if (!response.ok) {
      console.error("OpenAI Realtime API error:", text)
      return Response.json({ error: text || "OpenAI API request failed" }, { status: 502 })
    }

    let normalizedSdp = text.trim().replace(/\r?\n/g, "\r\n")
    if (!normalizedSdp.endsWith("\r\n")) {
      normalizedSdp += "\r\n"
    }

    return Response.json({ sdp: normalizedSdp })
  } catch (error) {
    console.error("Error in /api/realtime:", error)
    return Response.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
