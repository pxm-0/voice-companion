import type { SessionCard } from "@/lib/session-types"

type OpenAIResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

async function callOpenAI(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const model = process.env.OPENAI_SUMMARY_MODEL || "gpt-5.4-nano"

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You write warm, specific journal summaries. Be honest and human. No filler. No therapy-speak.",
          },
          { role: "user", content: prompt },
        ],
      }),
    })

    if (!response.ok) return null

    const data = (await response.json()) as OpenAIResponse
    return data.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}

export async function generateDailySummary(sessions: SessionCard[]): Promise<string | null> {
  const sessionsWithArtifacts = sessions.filter((s) => s.artifact !== null)
  if (sessionsWithArtifacts.length === 0) return null

  const sessionLines = sessionsWithArtifacts
    .map((s) => {
      const a = s.artifact!
      const parts = [
        `Title: ${a.title}`,
        `Summary: ${a.summary}`,
        `Mood: ${a.mood}`,
      ]
      if (a.rapidLogBullets.length > 0) {
        parts.push(`Bullets: ${a.rapidLogBullets.join("; ")}`)
      }
      return parts.join("\n")
    })
    .join("\n\n")

  const prompt = [
    `The user had ${sessionsWithArtifacts.length} voice journal session${sessionsWithArtifacts.length > 1 ? "s" : ""} today.`,
    "Write a 1–2 sentence daily synthesis in second person. Warm, specific, honest.",
    'Format loosely: "You focused on X, struggled with Y, and progressed in Z." — adapt to actual content.',
    "Do not say 'you had a session'. Do not use therapy-speak.",
    "",
    "Sessions:",
    sessionLines,
  ].join("\n")

  return callOpenAI(prompt)
}

export async function generateWeeklySummary(sessions: SessionCard[]): Promise<string | null> {
  const sessionsWithArtifacts = sessions.filter((s) => s.artifact !== null)
  if (sessionsWithArtifacts.length === 0) return null

  const allThemes = sessionsWithArtifacts.flatMap((s) => s.artifact!.themes)
  const uniqueThemes = [...new Set(allThemes)]
  if (uniqueThemes.length === 0) return null

  const moods = sessionsWithArtifacts.map((s) => s.artifact!.mood)

  const prompt = [
    `The user had ${sessionsWithArtifacts.length} journal sessions this week.`,
    `Themes: ${uniqueThemes.join(", ")}`,
    `Moods across sessions: ${moods.join(", ")}`,
    "",
    "Write 1–2 sentences identifying patterns and achievements from this week.",
    'Example: "You showed consistency in X, but struggled repeatedly with Y. Your attention shifted toward Z."',
    "Be specific, second-person, honest. No filler.",
  ].join("\n")

  return callOpenAI(prompt)
}
