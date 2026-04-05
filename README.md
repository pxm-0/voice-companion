🧠 Voice Companion

Realtime voice-based AI companion with memory, modes, and journaling.

Built for natural, low-latency conversations that evolve over time.

⸻

✨ Features
	•	🎙️ Real-time voice conversation (WebRTC)
	•	⚡ Low-latency streaming (gpt-realtime-mini)
	•	✂️ Interrupt support (barge-in)
	•	🧾 Live transcript (user + assistant)
	•	🧠 Memory system (in progress)
	•	🎭 Modes: reflective / companion / journal

⸻

🏗️ Architecture

Mic → WebRTC → Realtime Model → Audio Out
             ↓
         Event Stream
             ↓
    Transcript Layer
             ↓
      Memory System (WIP)


⸻

🚀 Getting Started

1. Clone

git clone https://github.com/pxm-0/voice-companion.git
cd voice-companion

2. Install

npm install

3. Environment

Create .env.local:

OPENAI_API_KEY=your_api_key_here

4. Run

npm run dev


⸻

🧠 How It Works
	•	Audio is streamed via WebRTC to a realtime model
	•	The model responds with audio + text events
	•	Events are processed through a client-side pipeline
	•	Transcripts are captured and prepared for memory extraction

⸻

🛣️ Roadmap
	•	Realtime voice loop
	•	Interrupt handling
	•	Transcript streaming
	•	Memory extraction
	•	Memory storage
	•	Memory injection
	•	Journal generation
	•	Turn manager

⸻

⚠️ Notes
	•	Requires microphone permissions
	•	Uses OpenAI Realtime API (SDP over WebRTC)
	•	Designed for low-latency conversational UX

⸻

📄 License

MIT
:::

