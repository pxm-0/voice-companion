import { error } from "console"

export async function POST(req: Request) {
  try {
     const { sdp } = await req.json()

    const response = await fetch("https://api.openai.com/v1/realtime?model=gpt-realtime-mini", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/sdp",
      },
      body: sdp,
    })

    let text = await response.text()

    // Clean and normalize SDP
    text = text.trim()

    // Normalize line endings to strict \r\n
    let normalizedSdp = text.replace(/\r?\n/g, "\r\n")

    // Ensure it ends with a final newline (required by some browsers)
    if (!normalizedSdp.endsWith("\r\n")) {
      normalizedSdp += "\r\n"
    }

    console.log("OpenAI Response (SDP):", text)

    if (!response.ok) {
      console.error("OpenAI API error:", text)
      return new Response(text, { status: 502 })
    }

    // OpenAI returns raw SDP, not JSON
    return Response.json({ sdp: normalizedSdp })

  } catch (error) {
    console.error("Error in /api/realtime: ", error)
    return Response.json("Internal Server Error", { status: 500 })
  }
}