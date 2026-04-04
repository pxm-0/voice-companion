"use client";

import { useState } from "react";

export default function Home() {
  const [ listening, setListening ] = useState(false);
  const [ transcript, setTranscript ] = useState("");
  const [ loading, setLoading ] = useState(false);

  const startListening = () => {
    const recognition = new ( window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      
      setTranscript(text);
      setLoading(true);

      try {

      const res = await fetch("/api/ollama", {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      const data = await res.json();      
      speak(data.reply);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    recognition.onend = () => setListening(false);

    recognition.start();
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 360,
          padding: 24,
          borderRadius: 16,
          background: "#1e293b",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ marginBottom: 20 }}>Voice Companion</h1>

        <button
          onClick={startListening}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 12,
            border: "none",
            background: loading ? "#475569" : "#3b82f6",
            color: "white",
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 16,
          }}
        >
          {listening ? "Listening..." : loading ? "Thinking..." : "Talk"}
        </button>

        <div
          style={{
            minHeight: 60,
            padding: 12,
            borderRadius: 10,
            background: "#0f172a",
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          <strong style={{ opacity: 0.6 }}>You:</strong>{" "}
          {transcript || "Say something..."}
        </div>
      </div>
    </div>
  );
}

