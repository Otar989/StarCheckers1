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
  private static readonly MOBILITY_BONUS = 5
  private static readonly KING_SAFETY_BONUS = 25
  private static readonly CENTER_CONTROL_BONUS = 15
  private static readonly ADVANCEMENT_BONUS = 8
  private static readonly TEMPO_BONUS = 20

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

    const sortedMoves = this.sortMovesByPriority(board, allMoves)

    for (const move of sortedMoves) {
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
        return 3
      case "medium":
        return 7 // Увеличено с 4 до 7
      case "hard":
        return 10 // Увеличено с 6 до 10
      default:
        return 4
    }
  }

  private static getRandomnessForDifficulty(difficulty: "easy" | "medium" | "hard"): number {
    switch (difficulty) {
      case "easy":
        return 80 // Уменьшено со 100
      case "medium":
        return 10 // Уменьшено с 30
      case "hard":
        return 2 // Уменьшено с 5
      default:
        return 30
    }
  }

  private static sortMovesByPriority(board: (Piece | null)[][], moves: AIMove[]): AIMove[] {
    return moves.sort((a, b) => {
      // Приоритет захватам
      const aIsCapture = Math.abs(a.to.row - a.from.row) > 1
      const bIsCapture = Math.abs(b.to.row - b.from.row) > 1

      if (aIsCapture && !bIsCapture) return -1
      if (!aIsCapture && bIsCapture) return 1

      // Приоритет ходам к центру
      const aCenterDistance = Math.abs(3.5 - a.to.row) + Math.abs(3.5 - a.to.col)
      const bCenterDistance = Math.abs(3.5 - b.to.row) + Math.abs(3.5 - b.to.col)

      return aCenterDistance - bCenterDistance
    })
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

    const sortedMoves = this.sortMovesByPriority(board, moves)

    if (isMaximizing) {
      let maxEval = Number.NEGATIVE_INFINITY
      for (const move of sortedMoves) {
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
      for (const move of sortedMoves) {
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

    // Базовая оценка материала
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

    // Стратегические бонусы для средней и сложной сложности
    if (difficulty !== "easy") {
      score += this.getAdvancedStrategicBonus(board, "black", difficulty)
      score -= this.getAdvancedStrategicBonus(board, "white", difficulty)
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

    // Контроль центра (более важен для сложных уровней)
    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col)
    const centerBonus = difficulty === "hard" ? this.CENTER_CONTROL_BONUS : this.CENTER_CONTROL_BONUS / 2
    bonus += ((7 - centerDistance) * centerBonus) / 7

    // Штраф за края (короли исключение)
    if ((row === 0 || row === 7 || col === 0 || col === 7) && piece.type !== "king") {
      bonus -= difficulty === "hard" ? 15 : 8
    }

    // Бонус за продвижение обычных шашек
    if (piece.type === "regular") {
      const advancementBonus = difficulty === "hard" ? this.ADVANCEMENT_BONUS : this.ADVANCEMENT_BONUS / 2
      if (piece.color === "black") {
        bonus += row * advancementBonus // Черные продвигаются вниз
      } else {
        bonus += (7 - row) * advancementBonus // Белые продвигаются вверх
      }
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
    const enemyPieces = []

    // Собираем все фигуры
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece) {
          if (piece.color === color) {
            pieces.push(piece)
          } else {
            enemyPieces.push(piece)
          }
        }
      }
    }

    // Бонус за мобильность
    let totalMobility = 0
    for (const piece of pieces) {
      const moves = GameLogic.getValidMoves(board, piece)
      totalMobility += moves.length

      // Дополнительный бонус за возможности захвата
      for (const move of moves) {
        const rowDiff = Math.abs(move.row - piece.position.row)
        const colDiff = Math.abs(move.col - piece.position.col)
        if (rowDiff > 1 || colDiff > 1) {
          bonus += this.CAPTURE_BONUS * (difficulty === "hard" ? 1.5 : 1)
        }
      }
    }
    bonus += totalMobility * this.MOBILITY_BONUS

    // Безопасность королей
    const kings = pieces.filter((p) => p.type === "king")
    for (const king of kings) {
      // Короли у краев более безопасны
      const edgeDistance = Math.min(king.position.row, 7 - king.position.row, king.position.col, 7 - king.position.col)
      if (edgeDistance <= 1) {
        bonus += this.KING_SAFETY_BONUS * (difficulty === "hard" ? 1.5 : 1)
      }

      // Бонус за поддержку других фигур
      const supportingPieces = pieces.filter((p) => {
        const rowDiff = Math.abs(p.position.row - king.position.row)
        const colDiff = Math.abs(p.position.col - king.position.col)
        return rowDiff <= 2 && colDiff <= 2 && p.id !== king.id
      })
      bonus += supportingPieces.length * 10
    }

    // Темповый бонус (количество фигур на доске)
    const materialAdvantage = pieces.length - enemyPieces.length
    bonus += materialAdvantage * this.TEMPO_BONUS

    // Бонус за контроль важных клеток (для сложного уровня)
    if (difficulty === "hard") {
      const controlledSquares = this.getControlledSquares(board, pieces)
      bonus += controlledSquares * 3
    }

    return bonus
  }

  private static getControlledSquares(board: (Piece | null)[][], pieces: Piece[]): number {
    const controlled = new Set<string>()

    for (const piece of pieces) {
      const moves = GameLogic.getValidMoves(board, piece)
      for (const move of moves) {
        controlled.add(`${move.row}-${move.col}`)
      }
    }

    return controlled.size
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
