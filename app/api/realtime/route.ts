import { error } from "console"

export async function POST(req: Request) {
  try {
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

    const text = await response.text()

    console.log("OpenAI Response: ", text)

    let data
    try {
      data = JSON.parse(text)
    } catch (error) {
      console.error("Failed to parse OpenAI response as JSON: ", error)
      return new Response("Invalid response from OpenAI", { status: 502 })
    }

    if (!response.ok) {
      console.error("OpenAI API error: ", data)
      return Response.json( {error: data}, { status: 502 })
    }

    if (data?.answer?.sdp) {
      return Response.json({ sdp: data.answer.sdp })
    }

    if (data?.sdp) {  
      return Response.json({ sdp: data.sdp })
    }

  } catch (error) {
    console.error("Error in /api/realtime: ", error)
    return Response.json("Internal Server Error", { status: 500 })
  }
}