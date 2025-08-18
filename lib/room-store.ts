export type Player = {
  id: number
  color: "white" | "black"
}

export interface Room {
  id: string
  players: Player[]
}

const rooms = new Map<string, Room>()

export function createRoom(player: Player): Room {
  const id = Math.random().toString(36).slice(2, 8)
  const room: Room = { id, players: [player] }
  rooms.set(id, room)
  return room
}

export function joinRoom(id: string, player: Player): Room | null {
  const room = rooms.get(id)
  if (!room || room.players.length >= 2) return null
  room.players.push(player)
  return room
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id)
}
