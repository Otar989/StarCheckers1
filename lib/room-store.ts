import { randomBytes } from "crypto"
import type { Piece, PieceType, PieceColor, Position } from "@/types/game-types"

export type Player = {
  id: number
  color: "white" | "black"
  socketId?: string
}

export type GameStatus = "playing" | "white-wins" | "black-wins" | "draw"

export interface Room {
  id: string;
  board: (Piece | null)[][];
  currentPlayer: "white" | "black";
  players: Player[];
  gameStatus: GameStatus;
  lastActivity: number;
}

export const rooms = new Map<string, Room>();
export const waitingPlayers = new Map<number, { roomId: string; timestamp: number }>();

function cleanupOldRooms() {
  const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 минут
  const now = Date.now();
  
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.length === 0 || now - room.lastActivity > ROOM_TIMEOUT) {
      rooms.delete(roomId);
    }
  }
}

export function findMatch(playerId: number): string | null {
  cleanupOldRooms();
  
  // Очистка старых записей (старше 1 минуты)
  const now = Date.now();
  for (const [pid, data] of waitingPlayers.entries()) {
    if (now - data.timestamp > 60000) {
      waitingPlayers.delete(pid);
    }
  }

  // Поиск существующего игрока
  for (const [pid, data] of waitingPlayers.entries()) {
    if (pid !== playerId) {
      const room = rooms.get(data.roomId);
      if (room && room.players.length < 2) {
        waitingPlayers.delete(pid);
        return data.roomId;
      }
    }
  }

  // Если нет подходящего игрока, создаем новую комнату
  const roomId = generateRoomCode();
  waitingPlayers.set(playerId, { roomId, timestamp: now });
  return roomId;
}

function generateRoomCode(length = 6): string {
  // Use random bytes and convert to base36 to produce an uppercase code
  let code = "";
  while (code.length < length) {
    const segment = BigInt("0x" + randomBytes(5).toString("hex"))
      .toString(36)
      .toUpperCase();
    code += segment;
  }
  return code.slice(0, length);
}

function initializeBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  const createPiece = (row: number, col: number, color: PieceColor): Piece => ({
    id: `${color}-${row}-${col}`,
    type: 'regular' as PieceType,
    color,
    position: { row, col } as Position,
  });

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = createPiece(row, col, 'black');
      }
    }
  }

  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = createPiece(row, col, 'white');
      }
    }
  }

  return board
}

export function createRoom(player: Player): Room {
  let id: string
  let attempts = 0
  do {
    if (attempts > 5) throw new Error("Failed to generate unique room code")
    id = generateRoomCode()
    attempts++
  } while (rooms.has(id))

  const room: Room = {
    id,
    board: initializeBoard(),
    currentPlayer: "white",
    players: [player],
    gameStatus: "playing",
    lastActivity: Date.now()
  }
  rooms.set(id, room)
  return room
}

export function joinRoom(id: string, player: Player): Room | null {
  const room = rooms.get(id.toUpperCase());
  if (!room || room.players.length >= 2) return null;
  room.players.push(player);
  room.lastActivity = Date.now();
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id.toUpperCase())
}

export function setPlayerSocket(roomId: string, color: "white" | "black", socketId: string) {
  const room = rooms.get(roomId.toUpperCase())
  if (!room) return
  const player = room.players.find((p) => p.color === color)
  if (player) player.socketId = socketId
}

export function leaveRoom(roomId: string, socketId: string) {
  const room = rooms.get(roomId.toUpperCase())
  if (!room) return
  room.players = room.players.filter((p) => p.socketId !== socketId)
  if (room.players.length === 0) {
    rooms.delete(roomId)
  }
}

export function findRoomsBySocket(socketId: string): string[] {
  const ids: string[] = []
  for (const [id, room] of rooms) {
    if (room.players.some((p) => p.socketId === socketId)) ids.push(id)
  }
  return ids
}
