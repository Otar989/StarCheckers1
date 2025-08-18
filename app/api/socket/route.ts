import type { NextApiRequest } from "next"
import type { NextApiResponse } from "next"
import type { Server as HTTPServer } from "http"
import type { Socket } from "net"
import { randomUUID } from "crypto"
import { Server as IOServer, type Socket as IOSocket } from "socket.io"
import { GameLogic } from "@/lib/game-logic"
import type { Piece, Position } from "@/components/game/GameProvider"

// Extend Next.js response type to include Socket.io server instance
interface SocketServer extends HTTPServer {
  io?: IOServer
}

interface SocketWithIO extends Socket {
  server: SocketServer
}

interface NextApiResponseServerIO extends NextApiResponse {
  socket: SocketWithIO
}

type GameStatus = "playing" | "white-wins" | "black-wins" | "draw"

interface GameSession {
  id: string
  board: (Piece | null)[][]
  currentPlayer: "white" | "black"
  players: { white?: string; black?: string }
  gameStatus: GameStatus
}

const games: Record<string, GameSession> = {}

function initializeBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null))

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = {
          id: `black-${row}-${col}`,
          type: "regular",
          color: "black",
          position: { row, col },
        }
      }
    }
  }

  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = {
          id: `white-${row}-${col}`,
          type: "regular",
          color: "white",
          position: { row, col },
        }
      }
    }
  }

  return board
}

function leaveGame(socket: IOSocket, gameId: string) {
  const game = games[gameId]
  if (!game) return

  if (game.players.white === socket.id) game.players.white = undefined
  if (game.players.black === socket.id) game.players.black = undefined

  socket.leave(gameId)
  socket.to(gameId).emit("playerLeft")

  if (!game.players.white && !game.players.black) {
    delete games[gameId]
  }
}

function registerHandlers(io: IOServer) {
  io.on("connection", (socket) => {
    socket.on("createGame", () => {
      const id = randomUUID()
      const game: GameSession = {
        id,
        board: initializeBoard(),
        currentPlayer: "white",
        players: { white: socket.id },
        gameStatus: "playing",
      }

      games[id] = game
      socket.join(id)
      socket.emit("gameCreated", { gameId: id, color: "white" })
    })

    socket.on("joinGame", (gameId: string) => {
      const game = games[gameId]
      if (!game || game.players.black) {
        socket.emit("error", "unable to join")
        return
      }

      game.players.black = socket.id
      socket.join(gameId)
      io.to(gameId).emit("playerJoined", { gameId })
    })

    socket.on(
      "move",
      ({ gameId, from, to }: { gameId: string; from: Position; to: Position }) => {
        const game = games[gameId]
        if (!game) return

        const color =
          game.players.white === socket.id
            ? "white"
            : game.players.black === socket.id
              ? "black"
              : null

        if (!color) return
        if (game.currentPlayer !== color) return
        if (game.gameStatus !== "playing") return

        const moveResult = GameLogic.makeMove(game.board, from, to)
        if (!moveResult.success || !moveResult.newState) return

        game.board = moveResult.newState.board
        game.currentPlayer = moveResult.newState.currentPlayer
        game.gameStatus = moveResult.newState.gameStatus

        io.to(gameId).emit("move", {
          from,
          to,
          board: game.board,
          currentPlayer: game.currentPlayer,
          gameStatus: game.gameStatus,
        })

        if (game.gameStatus !== "playing") {
          io.to(gameId).emit("gameOver", { status: game.gameStatus })
        }
      },
    )

    socket.on("leave", (gameId: string) => {
      leaveGame(socket, gameId)
    })

    socket.on("disconnect", () => {
      Object.keys(games).forEach((id) => {
        const g = games[id]
        if (g.players.white === socket.id || g.players.black === socket.id) {
          leaveGame(socket, id)
        }
      })
    })
  })
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server)
    res.socket.server.io = io
    registerHandlers(io)
  }
  res.end()
}

