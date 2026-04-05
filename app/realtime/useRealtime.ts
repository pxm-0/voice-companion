import { useState } from "react"
import { initRealTime, stopRealTime } from "./client"

export function useRealTime() {
    const [connected, setConnected] = useState(false)
    const [connecting, setConnecting] = useState(false)

    const connect = async () => {
        if (connected || connecting) return

        setConnecting(true)

        try {
            await initRealTime()
            setConnected(true)
        } finally {
            setConnecting(false)
        }
    }

    const disconnect = () => {
        stopRealTime()
        setConnected(false)
        setConnecting(false)
    }

    return {
        connected,
        connecting,
        connect,
        disconnect
     }
}
