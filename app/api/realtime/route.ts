export async function POST(req: Request) {
    const { sdp } = await req.json()

    const response = await fetch("https://api.openai.com/v1/realtime", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-realtime-mini",
        sdp,
      }),
    })

    const data = await response.json()

    return Response.json(data)
  }