export type Memory = {
  id: string
  type: "emotion" | "pattern" | "preference"
  value: string
  weight: number
  createdAt: number
  lastUsed: number
}

let memoryStore: Memory[] = []

export function getMemories() {
  return memoryStore
}

export function saveMemories(memories: Memory[]) {
  memoryStore = memories
}

function isSimilar(a: string, b: string) {
  return a.toLowerCase().includes(b.toLowerCase()) ||
         b.toLowerCase().includes(a.toLowerCase())
}

export function addMemory(newMemory: Omit<Memory, "id" | "weight" | "createdAt" | "lastUsed">) {
  const memories = getMemories()

  const existing = memories.find(m => isSimilar(m.value, newMemory.value))

  if (existing) {
    existing.weight += 1
    existing.lastUsed = Date.now()
  } else {
    memories.push({
      id: crypto.randomUUID(),
      ...newMemory,
      weight: 1,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    })
  }

  saveMemories(memories)
}

export function getTopMemories(limit = 5) {
  const memories = getMemories()

  return memories
    .sort((a, b) => {
      const scoreA = a.weight * 2 + (Date.now() - a.lastUsed) * -0.000001
      const scoreB = b.weight * 2 + (Date.now() - b.lastUsed) * -0.000001
      return scoreB - scoreA
    })
    .slice(0, limit)
}