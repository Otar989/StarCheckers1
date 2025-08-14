import type { Piece, Position } from "@/components/game/GameProvider"
import { GameLogic } from "./game-logic"

export interface AIMove {
  from: Position
  to: Position
  score: number
}

export class AIEngine {
  private static readonly PIECE_VALUE = 100
  private static readonly KING_VALUE = 350
  private static readonly POSITION_BONUS = 15
  private static readonly CAPTURE_BONUS = 80
  private static readonly PROMOTION_BONUS = 200
  private static readonly MOBILITY_BONUS = 5
  private static readonly THREAT_PENALTY = 40
  private static readonly DIAGONAL_CONTROL_BONUS = 25

  static getBestMove(board: (Piece | null)[][], difficulty: "easy" | "medium" | "hard"): AIMove | null {
    const startTime = Date.now()
    const maxThinkTime = difficulty === "easy" ? 1000 : difficulty === "medium" ? 8000 : 20000

    const depth = this.getDepthForDifficulty(difficulty)
    const randomness = this.getRandomnessForDifficulty(difficulty)

    const allMoves = this.getAllPossibleMoves(board, "black")
    if (allMoves.length === 0) return null

    if (difficulty !== "easy") {
      allMoves.sort((a, b) => {
        const aCapture = Math.abs(a.to.row - a.from.row) > 1 || Math.abs(a.to.col - a.from.col) > 1
        const bCapture = Math.abs(b.to.row - b.from.row) > 1 || Math.abs(b.to.col - b.from.col) > 1
        if (aCapture && !bCapture) return -1
        if (!aCapture && bCapture) return 1

        const aCenterDist = Math.abs(3.5 - a.to.row) + Math.abs(3.5 - a.to.col)
        const bCenterDist = Math.abs(3.5 - b.to.row) + Math.abs(3.5 - b.to.col)
        return aCenterDist - bCenterDist
      })
    }

    if (difficulty === "easy" && Math.random() < 0.4) {
      const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)]
      return { ...randomMove, score: 0 }
    }

    if (difficulty !== "easy") {
      const captureMoves = allMoves.filter((move) => {
        const rowDiff = Math.abs(move.to.row - move.from.row)
        const colDiff = Math.abs(move.to.col - move.from.col)
        return rowDiff > 1 || colDiff > 1
      })

      if (captureMoves.length > 0) {
        let bestCaptureMove: AIMove | null = null
        let bestCaptureScore = Number.NEGATIVE_INFINITY

        for (const move of captureMoves) {
          if (Date.now() - startTime > maxThinkTime) break

          const moveResult = GameLogic.makeMove(board, move.from, move.to)
          if (!moveResult.success || !moveResult.newState) continue

          const score =
            this.minimax(
              moveResult.newState.board!,
              Math.min(depth, difficulty === "hard" ? 8 : 6),
              Number.NEGATIVE_INFINITY,
              Number.POSITIVE_INFINITY,
              false,
              difficulty,
              startTime,
              maxThinkTime,
            ) + this.CAPTURE_BONUS

          if (score > bestCaptureScore) {
            bestCaptureScore = score
            bestCaptureMove = { from: move.from, to: move.to, score }
          }
        }

        if (bestCaptureMove && bestCaptureScore > 0) {
          return bestCaptureMove
        }
      }
    }

    let bestMove: AIMove | null = null
    let bestScore = Number.NEGATIVE_INFINITY

    const movesToEvaluate =
      difficulty === "easy" ? allMoves.slice(0, 8) : difficulty === "medium" ? allMoves.slice(0, 20) : allMoves

    for (const move of movesToEvaluate) {
      if (Date.now() - startTime > maxThinkTime) break

      const moveResult = GameLogic.makeMove(board, move.from, move.to)
      if (!moveResult.success || !moveResult.newState) continue

      const score = this.minimax(
        moveResult.newState.board!,
        depth - 1,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        false,
        difficulty,
        startTime,
        maxThinkTime,
      )

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
        return 4
      case "medium":
        return 8
      case "hard":
        return 12
      default:
        return 4
    }
  }

  private static getRandomnessForDifficulty(difficulty: "easy" | "medium" | "hard"): number {
    switch (difficulty) {
      case "easy":
        return 80
      case "medium":
        return 5
      case "hard":
        return 0
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
    startTime: number,
    maxThinkTime: number,
  ): number {
    if (Date.now() - startTime > maxThinkTime) {
      return this.evaluateBoard(board, difficulty)
    }

    if (depth === 0) {
      return this.evaluateBoard(board, difficulty)
    }

    const currentPlayer = isMaximizing ? "black" : "white"
    const moves = this.getAllPossibleMoves(board, currentPlayer)

    if (moves.length === 0) {
      return isMaximizing ? -10000 : 10000
    }

    const maxMovesToEvaluate = difficulty === "easy" ? 8 : difficulty === "medium" ? 15 : moves.length
    const movesToEvaluate = moves.slice(0, maxMovesToEvaluate)

    if (isMaximizing) {
      let maxEval = Number.NEGATIVE_INFINITY
      for (const move of movesToEvaluate) {
        if (Date.now() - startTime > maxThinkTime) break

        const moveResult = GameLogic.makeMove(board, move.from, move.to)
        if (!moveResult.success || !moveResult.newState) continue

        const evaluation = this.minimax(
          moveResult.newState.board!,
          depth - 1,
          alpha,
          beta,
          false,
          difficulty,
          startTime,
          maxThinkTime,
        )
        maxEval = Math.max(maxEval, evaluation)
        alpha = Math.max(alpha, evaluation)

        if (beta <= alpha) break
      }
      return maxEval
    } else {
      let minEval = Number.POSITIVE_INFINITY
      for (const move of movesToEvaluate) {
        if (Date.now() - startTime > maxThinkTime) break

        const moveResult = GameLogic.makeMove(board, move.from, move.to)
        if (!moveResult.success || !moveResult.newState) continue

        const evaluation = this.minimax(
          moveResult.newState.board!,
          depth - 1,
          alpha,
          beta,
          true,
          difficulty,
          startTime,
          maxThinkTime,
        )
        minEval = Math.min(minEval, evaluation)
        beta = Math.min(beta, evaluation)

        if (beta <= alpha) break
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

        const pieceValue = piece.type === "king" ? this.KING_VALUE * 1.2 : this.PIECE_VALUE
        const positionBonus = this.getPositionBonus(piece, row, col, difficulty)

        if (piece.color === "black") {
          score += pieceValue + positionBonus
        } else {
          score -= pieceValue + positionBonus
        }
      }
    }

    if (difficulty !== "easy") {
      const strategicMultiplier = difficulty === "hard" ? 1.5 : 1.2
      score += this.getAdvancedStrategicBonus(board, "black", difficulty) * strategicMultiplier
      score -= this.getAdvancedStrategicBonus(board, "white", difficulty) * strategicMultiplier

      score += (this.evaluateThreats(board, "black") - this.evaluateThreats(board, "white")) * strategicMultiplier

      score +=
        (this.evaluateDiagonalControl(board, "black") - this.evaluateDiagonalControl(board, "white")) *
        strategicMultiplier
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

    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col)
    bonus += (8 - centerDistance) * 4

    if (row === 0 || row === 7 || col === 0 || col === 7) {
      bonus -= piece.type === "king" ? 5 : 15
    }

    if (piece.type === "regular") {
      if (piece.color === "black") {
        bonus += row * 8
        if (row >= 6) bonus += this.PROMOTION_BONUS / 2
      } else {
        bonus += (7 - row) * 8
        if (row <= 1) bonus += this.PROMOTION_BONUS / 2
      }
    }

    if (piece.type === "king") {
      bonus += (4 - centerDistance) * 10
    }

    return bonus
  }

  private static getAdvancedStrategicBonus(
    board: (Piece | null)[][],
    color: "white" | "black",
    difficulty: "easy" | "medium" | "hard",
  ): number {
    let bonus = 0
    const pieces = []
    const opponentColor = color === "white" ? "black" : "white"

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece && piece.color === color) {
          pieces.push({ piece, row, col })
        }
      }
    }

    for (const { piece, row, col } of pieces) {
      const moves = GameLogic.getValidMoves(board, piece)
      bonus += moves.length * this.MOBILITY_BONUS

      for (const move of moves) {
        const rowDiff = Math.abs(move.row - row)
        const colDiff = Math.abs(move.col - col)
        if (rowDiff > 1 || colDiff > 1) {
          bonus += this.CAPTURE_BONUS

          if (difficulty === "hard") {
            const tempBoard = board.map((r) => [...r])
            const moveResult = GameLogic.makeMove(tempBoard, { row, col }, move)
            if (moveResult.success && moveResult.newState?.board) {
              const additionalCaptures = GameLogic.getValidMoves(moveResult.newState.board, piece).filter(
                (m) => Math.abs(m.row - move.row) > 1 || Math.abs(m.col - move.col) > 1,
              )
              bonus += additionalCaptures.length * this.CAPTURE_BONUS
            }
          }
        }
      }
    }

    if (difficulty === "hard") {
      const regularPieces = pieces.filter((p) => p.piece.type === "regular")
      const kings = pieces.filter((p) => p.piece.type === "king")

      for (const piece1 of pieces) {
        for (const piece2 of pieces) {
          if (piece1 === piece2) continue
          const distance = Math.abs(piece1.row - piece2.row) + Math.abs(piece1.col - piece2.col)
          if (distance <= 3) bonus += 5
        }
      }

      if (regularPieces.length >= 3) {
        bonus += 20
      }
    }

    return bonus
  }

  private static evaluateThreats(board: (Piece | null)[][], color: "white" | "black"): number {
    let threatScore = 0
    const opponentColor = color === "white" ? "black" : "white"

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece && piece.color === color) {
          const isUnderThreat = this.isPieceUnderThreat(board, piece, row, col, opponentColor)
          if (isUnderThreat) {
            threatScore -= piece.type === "king" ? this.THREAT_PENALTY * 2 : this.THREAT_PENALTY
          }

          const threatenedPieces = this.getThreatenedPieces(board, piece, row, col, opponentColor)
          threatScore += threatenedPieces * (this.THREAT_PENALTY / 2)
        }
      }
    }

    return threatScore
  }

  private static evaluateDiagonalControl(board: (Piece | null)[][], color: "white" | "black"): number {
    let controlScore = 0

    const mainDiagonals = [
      [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
        [5, 5],
        [6, 6],
        [7, 7],
      ],
      [
        [0, 7],
        [1, 6],
        [2, 5],
        [3, 4],
        [4, 3],
        [5, 2],
        [6, 1],
        [7, 0],
      ],
    ]

    for (const diagonal of mainDiagonals) {
      let controlledSquares = 0
      for (const [row, col] of diagonal) {
        const piece = board[row][col]
        if (piece && piece.color === color) {
          controlledSquares++
          if (piece.type === "king") controlledSquares += 2
        }
      }
      controlScore += controlledSquares * this.DIAGONAL_CONTROL_BONUS
    }

    return controlScore
  }

  private static isPieceUnderThreat(
    board: (Piece | null)[][],
    piece: Piece,
    row: number,
    col: number,
    opponentColor: "white" | "black",
  ): boolean {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const opponentPiece = board[r][c]
        if (opponentPiece && opponentPiece.color === opponentColor) {
          const moves = GameLogic.getValidMoves(board, opponentPiece)
          if (moves.some((move) => move.row === row && move.col === col)) {
            return true
          }
        }
      }
    }
    return false
  }

  private static getThreatenedPieces(
    board: (Piece | null)[][],
    piece: Piece,
    row: number,
    col: number,
    opponentColor: "white" | "black",
  ): number {
    let threatenedCount = 0
    const moves = GameLogic.getValidMoves(board, piece)

    for (const move of moves) {
      const targetPiece = board[move.row][move.col]
      if (targetPiece && targetPiece.color === opponentColor) {
        threatenedCount++
      }
    }

    return threatenedCount
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
