import type { Piece, Position } from "@/components/game/GameProvider"
import { GameLogic } from "./game-logic"

export interface AIMove {
  from: Position
  to: Position
  score: number
}

export class AIEngine {
  private static readonly PIECE_VALUE = 100
  private static readonly KING_VALUE = 400
  private static readonly POSITION_BONUS = 20
  private static readonly CAPTURE_BONUS = 150
  private static readonly PROMOTION_BONUS = 300
  private static readonly MOBILITY_BONUS = 8
  private static readonly THREAT_PENALTY = 60
  private static readonly DIAGONAL_CONTROL_BONUS = 35
  private static readonly SACRIFICE_BONUS = 200
  private static readonly TEMPO_BONUS = 25
  private static readonly ENDGAME_BONUS = 50

  static getBestMove(board: (Piece | null)[][], difficulty: "easy" | "medium" | "hard"): AIMove | null {
    const startTime = Date.now()
    const maxThinkTime = difficulty === "easy" ? 1000 : difficulty === "medium" ? 8000 : 15000

    const depth = this.getDepthForDifficulty(difficulty)
    const randomness = this.getRandomnessForDifficulty(difficulty)

    const allMoves = this.getAllPossibleMoves(board, "black")
    if (allMoves.length === 0) return null

    if (difficulty !== "easy") {
      allMoves.sort((a, b) => {
        const aScore = this.quickMoveEvaluation(board, a, difficulty)
        const bScore = this.quickMoveEvaluation(board, b, difficulty)
        return bScore - aScore
      })
    }

    if (difficulty === "easy" && Math.random() < 0.2) {
      const randomMove = allMoves[Math.floor(Math.random() * Math.min(5, allMoves.length))]
      return { ...randomMove, score: 0 }
    }

    if (difficulty !== "easy") {
      const forcedSequence = this.findForcedSequence(board, "black", depth)
      if (forcedSequence && forcedSequence.score > 500) {
        return forcedSequence
      }
    }

    let bestMove: AIMove | null = null
    let bestScore = Number.NEGATIVE_INFINITY

    for (let currentDepth = 2; currentDepth <= depth; currentDepth += 2) {
      if (Date.now() - startTime > maxThinkTime * 0.8) break

      let tempBestMove: AIMove | null = null
      let tempBestScore = Number.NEGATIVE_INFINITY

      const movesToEvaluate = difficulty === "easy" ? allMoves.slice(0, 10) : allMoves

      for (const move of movesToEvaluate) {
        if (Date.now() - startTime > maxThinkTime) break

        const moveResult = GameLogic.makeMove(board, move.from, move.to)
        if (!moveResult.success || !moveResult.newState) continue

        const score = this.minimax(
          moveResult.newState.board!,
          currentDepth - 1,
          Number.NEGATIVE_INFINITY,
          Number.POSITIVE_INFINITY,
          false,
          difficulty,
          startTime,
          maxThinkTime,
        )

        const finalScore = score + (Math.random() - 0.5) * randomness

        if (finalScore > tempBestScore) {
          tempBestScore = finalScore
          tempBestMove = { from: move.from, to: move.to, score: finalScore }
        }
      }

      if (tempBestMove) {
        bestMove = tempBestMove
        bestScore = tempBestScore
      }
    }

    return bestMove
  }

  private static quickMoveEvaluation(board: (Piece | null)[][], move: AIMove, difficulty: string): number {
    let score = 0

    const rowDiff = Math.abs(move.to.row - move.from.row)
    const colDiff = Math.abs(move.to.col - move.from.col)
    if (rowDiff > 1 || colDiff > 1) {
      score += this.CAPTURE_BONUS
    }

    const piece = board[move.from.row][move.from.col]
    if (piece && piece.type === "regular" && piece.color === "black") {
      if (move.to.row === 7) score += this.PROMOTION_BONUS
      else score += (move.to.row - move.from.row) * 10
    }

    const centerDistance = Math.abs(3.5 - move.to.row) + Math.abs(3.5 - move.to.col)
    score += (8 - centerDistance) * 5

    return score
  }

  private static findForcedSequence(
    board: (Piece | null)[][],
    color: "white" | "black",
    maxDepth: number,
  ): AIMove | null {
    const captureMoves = this.getAllPossibleMoves(board, color).filter((move) => {
      const rowDiff = Math.abs(move.to.row - move.from.row)
      const colDiff = Math.abs(move.to.col - move.from.col)
      return rowDiff > 1 || colDiff > 1
    })

    let bestSequence: AIMove | null = null
    let bestSequenceScore = 0

    for (const move of captureMoves) {
      const moveResult = GameLogic.makeMove(board, move.from, move.to)
      if (!moveResult.success || !moveResult.newState) continue

      const sequenceScore = this.evaluateForcedSequence(moveResult.newState.board!, color, maxDepth - 1, 1)
      if (sequenceScore > bestSequenceScore) {
        bestSequenceScore = sequenceScore
        bestSequence = { ...move, score: sequenceScore }
      }
    }

    return bestSequence
  }

  private static evaluateForcedSequence(
    board: (Piece | null)[][],
    color: "white" | "black",
    depth: number,
    multiplier: number,
  ): number {
    if (depth <= 0) return 0

    const captureMoves = this.getAllPossibleMoves(board, color).filter((move) => {
      const rowDiff = Math.abs(move.to.row - move.from.row)
      const colDiff = Math.abs(move.to.col - move.from.col)
      return rowDiff > 1 || colDiff > 1
    })

    let totalScore = captureMoves.length * this.CAPTURE_BONUS * multiplier

    for (const move of captureMoves.slice(0, 3)) {
      const moveResult = GameLogic.makeMove(board, move.from, move.to)
      if (moveResult.success && moveResult.newState) {
        totalScore += this.evaluateForcedSequence(moveResult.newState.board!, color, depth - 1, multiplier * 0.8)
      }
    }

    return totalScore
  }

  private static getDepthForDifficulty(difficulty: "easy" | "medium" | "hard"): number {
    switch (difficulty) {
      case "easy":
        return 6
      case "medium":
        return 10
      case "hard":
        return 14
      default:
        return 6
    }
  }

  private static getRandomnessForDifficulty(difficulty: "easy" | "medium" | "hard"): number {
    switch (difficulty) {
      case "easy":
        return 40
      case "medium":
        return 2
      case "hard":
        return 0
      default:
        return 20
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
      return isMaximizing ? -10000 - depth * 100 : 10000 + depth * 100
    }

    const movesToEvaluate = difficulty === "easy" ? moves.slice(0, 12) : moves

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
    let blackPieces = 0
    let whitePieces = 0
    let blackKings = 0
    let whiteKings = 0

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (!piece) continue

        const pieceValue = piece.type === "king" ? this.KING_VALUE : this.PIECE_VALUE
        const positionBonus = this.getPositionBonus(piece, row, col, difficulty)

        if (piece.color === "black") {
          score += pieceValue + positionBonus
          blackPieces++
          if (piece.type === "king") blackKings++
        } else {
          score -= pieceValue + positionBonus
          whitePieces++
          if (piece.type === "king") whiteKings++
        }
      }
    }

    if (difficulty !== "easy") {
      const strategicMultiplier = difficulty === "hard" ? 2.0 : 1.5

      const totalPieces = blackPieces + whitePieces
      const isEndgame = totalPieces <= 8
      const endgameMultiplier = isEndgame ? 1.5 : 1.0

      score += this.getAdvancedStrategicBonus(board, "black", difficulty) * strategicMultiplier * endgameMultiplier
      score -= this.getAdvancedStrategicBonus(board, "white", difficulty) * strategicMultiplier * endgameMultiplier

      score += (this.evaluateThreats(board, "black") - this.evaluateThreats(board, "white")) * strategicMultiplier

      score +=
        (this.evaluateDiagonalControl(board, "black") - this.evaluateDiagonalControl(board, "white")) *
        strategicMultiplier

      if (difficulty === "hard") {
        score += this.evaluateTempo(board, "black") - this.evaluateTempo(board, "white")
        score +=
          this.evaluateSacrificeOpportunities(board, "black") - this.evaluateSacrificeOpportunities(board, "white")

        if (isEndgame) {
          score += this.evaluateEndgame(board, "black", blackPieces, whitePieces) * this.ENDGAME_BONUS
        }
      }
    }

    return score
  }

  private static evaluateTempo(board: (Piece | null)[][], color: "white" | "black"): number {
    let tempoScore = 0
    const opponentColor = color === "white" ? "black" : "white"

    const myMoves = this.getAllPossibleMoves(board, color).length
    const opponentMoves = this.getAllPossibleMoves(board, opponentColor).length

    tempoScore += (myMoves - opponentMoves) * this.TEMPO_BONUS

    return tempoScore
  }

  private static evaluateSacrificeOpportunities(board: (Piece | null)[][], color: "white" | "black"): number {
    let sacrificeScore = 0

    const moves = this.getAllPossibleMoves(board, color)
    for (const move of moves) {
      const moveResult = GameLogic.makeMove(board, move.from, move.to)
      if (moveResult.success && moveResult.newState) {
        const followUpCaptures = this.getAllPossibleMoves(moveResult.newState.board!, color).filter((m) => {
          const rowDiff = Math.abs(m.to.row - m.from.row)
          const colDiff = Math.abs(m.to.col - m.from.col)
          return rowDiff > 1 || colDiff > 1
        })

        if (followUpCaptures.length > 1) {
          sacrificeScore += this.SACRIFICE_BONUS
        }
      }
    }

    return sacrificeScore
  }

  private static evaluateEndgame(
    board: (Piece | null)[][],
    color: "white" | "black",
    myPieces: number,
    opponentPieces: number,
  ): number {
    let endgameScore = 0

    if (myPieces > opponentPieces) {
      endgameScore += (myPieces - opponentPieces) * 100
    }

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece && piece.color === color && piece.type === "king") {
          const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col)
          endgameScore += (8 - centerDistance) * 15
        }
      }
    }

    return endgameScore
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
    bonus += (8 - centerDistance) * 6

    if (row === 0 || row === 7 || col === 0 || col === 7) {
      bonus -= piece.type === "king" ? 8 : 25
    }

    if (piece.type === "regular") {
      if (piece.color === "black") {
        bonus += row * 12
        if (row >= 6) bonus += this.PROMOTION_BONUS / 1.5
      } else {
        bonus += (7 - row) * 12
        if (row <= 1) bonus += this.PROMOTION_BONUS / 1.5
      }
    }

    if (piece.type === "king") {
      bonus += (4 - centerDistance) * 15
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
              bonus += additionalCaptures.length * this.CAPTURE_BONUS * 1.5
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
          if (distance <= 2) bonus += 8
          if (distance === 1) bonus += 15
        }
      }

      if (regularPieces.length >= 4) bonus += 30
      if (kings.length >= 2) bonus += 40
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
            threatScore -= piece.type === "king" ? this.THREAT_PENALTY * 2.5 : this.THREAT_PENALTY
          }

          const threatenedPieces = this.getThreatenedPieces(board, piece, row, col, opponentColor)
          threatScore += threatenedPieces * (this.THREAT_PENALTY / 1.5)
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
          if (piece.type === "king") controlledSquares += 3
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
