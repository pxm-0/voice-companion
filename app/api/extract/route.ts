import OpenAI from "openai"
import { addMemory } from "@/lib/memory"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  const { user, assistant } = await req.json()

  const prompt = `
Extract 1 meaningful memory from this conversation.

Focus on:
- emotion
- pattern
- preference

Return JSON:
{ "type": "...", "value": "..." }

User: ${user}
Assistant: ${assistant}
`

  const res = await openai.responses.create({
    model: "gpt-5.4-nano",
    input: prompt,
  })

  try {
    const text = res.output[0].content[0].text
    const memory = JSON.parse(text)

    if (memory?.value) {
      addMemory(memory)
      console.log("Saved memory:", memory)
    }
  } catch (err) {
    console.error("Memory extraction failed", err)
  }

  return new Response("ok")
}