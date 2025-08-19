import type { NextApiRequest } from "next"
import type { NextApiResponse } from "next"
import type { Server as HTTPServer } from "http"
import type { Socket } from "net"
import { Server as IOServer, type Socket as IOSocket } from "socket.io"
import { GameLogic } from "@/lib/game-logic"
import type { Position } from "@/components/game/GameProvider"
import { getRoom, rooms } from "@/lib/room-store"

interface SocketServer extends HTTPServer {
  io?: IOServer
}

interface SocketWithIO extends Socket {
  server: SocketServer
}

interface NextApiResponseServerIO extends NextApiResponse {
  socket: SocketWithIO
}

function leaveGame(socket: IOSocket, gameId: string) {
  const game = getRoom(gameId)
  if (!game) return

  game.players.forEach((p) => {
    if (p.socketId === socket.id) p.socketId = undefined
  })

  socket.leave(gameId)
  socket.to(gameId).emit("playerLeft")

  if (game.players.every((p) => !p.socketId)) {
    rooms.delete(gameId)
  }
}

function registerHandlers(io: IOServer) {
  io.on("connection", (socket) => {
    socket.on("createGame", (gameId: string) => {
      const game = getRoom(gameId)
      if (!game) {
        socket.emit("error", "invalid room")
        return
      }
      const player = game.players[0]
      player.socketId = socket.id
      socket.join(gameId)
      socket.emit("gameCreated", { roomId: gameId, player: player.color })
    })

    socket.on("joinGame", (gameId: string) => {
      const game = getRoom(gameId)
      if (!game) {
        socket.emit("error", "unable to join")
        return
      }
      const player = game.players.find((p) => !p.socketId)
      if (!player) {
        socket.emit("error", "unable to join")
        return
      }
      player.socketId = socket.id
      socket.join(gameId)
      io.to(gameId).emit("playerJoined", { player: player.color })
    })

    socket.on(
      "move",
      ({ gameId, from, to }: { gameId: string; from: Position; to: Position }) => {
        const game = getRoom(gameId)
        if (!game) return

        const color = game.players.find((p) => p.socketId === socket.id)?.color
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
          const winner =
            game.gameStatus === "white-wins"
              ? "white"
              : game.gameStatus === "black-wins"
                ? "black"
                : "draw"
          io.to(gameId).emit("gameOver", { winner })
        }
      },
    )

    socket.on("leave", (gameId: string) => {
      leaveGame(socket, gameId)
    })

    socket.on("disconnect", () => {
      for (const [id, g] of rooms) {
        if (g.players.some((p) => p.socketId === socket.id)) {
          leaveGame(socket, id)
        }
      }
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
