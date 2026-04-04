import { useState } from "react"
import { initRealTime } from "./client"

export function useRealTime() {
    const [connected, setConnected] = useState(false)
    
    const connect = async () => {
        await initRealTime()
        setConnected(true)
    }

    return { 
        connected,
        connect,
     }
}