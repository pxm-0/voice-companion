export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return Response.json({ error: "No text provided" }, { status: 400 });
        }

        const res = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "qwen3.5:2b",
            prompt: `You are a real-time voice companion.

Speak naturally like a human in conversation.
Keep responses short (1–2 sentences).
Be casual, direct, and engaging.

Do NOT explain your thinking.
Do NOT include reasoning or meta commentary.

User: ${text}
Assistant:`,
            stream: false,
            options: {
              temperature: 0.4,
              top_p: 0.9,
              top_k: 40,
              num_predict: 80,
              stop: ["User:", "Thinking Process:"],
            }
          }),
        });
        const data = await res.json();

        console.log("OLLAMA RAW:", data);

        const reply = (data?.response || "").trim() || "Sorry, I didn’t catch that.";

        return Response.json({ reply }, {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error(err);
        return Response.json({ error: "Failed to generate response" }, { 
            status: 500,
            headers: { "Content-Type": "application/json" }, 
        });
    }
}