import type { Piece, Position } from "@/components/game/GameProvider"
import { GameLogic } from "./game-logic"

export interface AIMove {
  from: Position
  to: Position
  score: number
}

export class AIEngine {
  private static readonly PIECE_VALUE = 100
  private static readonly KING_VALUE = 300
  private static readonly POSITION_BONUS = 10
  private static readonly CAPTURE_BONUS = 50

  static getBestMove(board: (Piece | null)[][], difficulty: "easy" | "medium" | "hard"): AIMove | null {
    const depth = this.getDepthForDifficulty(difficulty)
    const randomness = this.getRandomnessForDifficulty(difficulty)

    const allMoves = this.getAllPossibleMoves(board, "black")
    if (allMoves.length === 0) return null

    // For easy difficulty, sometimes make random moves
    if (difficulty === "easy" && Math.random() < 0.3) {
      const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)]
      return { ...randomMove, score: 0 }
    }

    let bestMove: AIMove | null = null
    let bestScore = Number.NEGATIVE_INFINITY

    for (const move of allMoves) {
      const moveResult = GameLogic.makeMove(board, move.from, move.to)
      if (!moveResult.success || !moveResult.newState) continue

      const score = this.minimax(
        moveResult.newState.board!,
        depth - 1,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        false, // Next turn is human (white)
        difficulty,
      )

      // Add some randomness for lower difficulties
      const finalScore = score + (Math.random() - 0.5) * randomness

      if (finalScore > bestScore) {
        bestScore = finalScore
        bestMove = { from: move.from, to: move.to, score: finalScore }
      }
    }

    return bestMove
  }

  private static getDepthForDifficulty(difficulty: "easy" | "medium" | "hard"): number {
    switch (difficulty) {
      case "easy":
        return 2
      case "medium":
        return 4
      case "hard":
        return 6
      default:
        return 4
    }
  }

  private static getRandomnessForDifficulty(difficulty: "easy" | "medium" | "hard"): number {
    switch (difficulty) {
      case "easy":
        return 100 // High randomness
      case "medium":
        return 30 // Medium randomness
      case "hard":
        return 5 // Low randomness
      default:
        return 30
    }
  }

  private static minimax(
    board: (Piece | null)[][],
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    difficulty: "easy" | "medium" | "hard",
  ): number {
    if (depth === 0) {
      return this.evaluateBoard(board, difficulty)
    }

    const currentPlayer = isMaximizing ? "black" : "white"
    const moves = this.getAllPossibleMoves(board, currentPlayer)

    if (moves.length === 0) {
      // No moves available - game over
      return isMaximizing ? -10000 : 10000
    }

    if (isMaximizing) {
      let maxEval = Number.NEGATIVE_INFINITY
      for (const move of moves) {
        const moveResult = GameLogic.makeMove(board, move.from, move.to)
        if (!moveResult.success || !moveResult.newState) continue

        const evaluation = this.minimax(moveResult.newState.board!, depth - 1, alpha, beta, false, difficulty)
        maxEval = Math.max(maxEval, evaluation)
        alpha = Math.max(alpha, evaluation)

        if (beta <= alpha) break // Alpha-beta pruning
      }
      return maxEval
    } else {
      let minEval = Number.POSITIVE_INFINITY
      for (const move of moves) {
        const moveResult = GameLogic.makeMove(board, move.from, move.to)
        if (!moveResult.success || !moveResult.newState) continue

        const evaluation = this.minimax(moveResult.newState.board!, depth - 1, alpha, beta, true, difficulty)
        minEval = Math.min(minEval, evaluation)
        beta = Math.min(beta, evaluation)

        if (beta <= alpha) break // Alpha-beta pruning
      }
      return minEval
    }
  }

  private static evaluateBoard(board: (Piece | null)[][], difficulty: "easy" | "medium" | "hard"): number {
    let score = 0

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (!piece) continue

        const pieceValue = piece.type === "king" ? this.KING_VALUE : this.PIECE_VALUE
        const positionBonus = this.getPositionBonus(piece, row, col, difficulty)

        if (piece.color === "black") {
          score += pieceValue + positionBonus
        } else {
          score -= pieceValue + positionBonus
        }
      }
    }

    // Add strategic bonuses for higher difficulties
    if (difficulty !== "easy") {
      score += this.getStrategicBonus(board, "black") - this.getStrategicBonus(board, "white")
    }

    return score
  }

  private static getPositionBonus(
    piece: Piece,
    row: number,
    col: number,
    difficulty: "easy" | "medium" | "hard",
  ): number {
    if (difficulty === "easy") return 0

    let bonus = 0

    // Center control bonus
    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col)
    bonus += (7 - centerDistance) * 2

    // Edge penalty
    if (row === 0 || row === 7 || col === 0 || col === 7) {
      bonus -= 5
    }

    // Advancement bonus for regular pieces
    if (piece.type === "regular") {
      if (piece.color === "black") {
        bonus += row * 3 // Black pieces advance downward
      } else {
        bonus += (7 - row) * 3 // White pieces advance upward
      }
    }

    return bonus
  }

  private static getStrategicBonus(board: (Piece | null)[][], color: "white" | "black"): number {
    let bonus = 0
    const pieces = []

    // Collect all pieces of the color
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece && piece.color === color) {
          pieces.push(piece)
        }
      }
    }

    // Mobility bonus - more possible moves is better
    for (const piece of pieces) {
      const moves = GameLogic.getValidMoves(board, piece)
      bonus += moves.length * 2

      // Capture opportunity bonus
      for (const move of moves) {
        const rowDiff = Math.abs(move.row - piece.position.row)
        const colDiff = Math.abs(move.col - piece.position.col)
        if (rowDiff > 1 || colDiff > 1) {
          bonus += this.CAPTURE_BONUS
        }
      }
    }

    // King safety bonus
    const kings = pieces.filter((p) => p.type === "king")
    for (const king of kings) {
      // Kings near edges are safer
      const edgeDistance = Math.min(king.position.row, 7 - king.position.row, king.position.col, 7 - king.position.col)
      if (edgeDistance <= 1) bonus += 20
    }

    return bonus
  }

  private static getAllPossibleMoves(board: (Piece | null)[][], color: "white" | "black"): AIMove[] {
    const moves: AIMove[] = []

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece && piece.color === color) {
          const validMoves = GameLogic.getValidMoves(board, piece)
          for (const move of validMoves) {
            moves.push({
              from: { row, col },
              to: move,
              score: 0,
            })
          }
        }
      }
    }

    return moves
  }
}
