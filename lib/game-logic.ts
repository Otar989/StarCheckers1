import type { Piece, Position, GameState } from "@/components/game/GameProvider"

export class GameLogic {
  static getValidMoves(board: (Piece | null)[][], piece: Piece): Position[] {
    // First check if there are any mandatory captures for this player
    const allCaptures = this.getAllCaptures(board, piece.color)

    // If there are captures available, only return capture moves for this piece
    if (allCaptures.length > 0) {
      return this.getCaptureMovesForPiece(board, piece)
    }

    // Otherwise return regular moves
    return this.getRegularMovesForPiece(board, piece)
  }

  static getAllCaptures(board: (Piece | null)[][], color: "white" | "black"): Position[] {
    const captures: Position[] = []

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece && piece.color === color) {
          const pieceCaptures = this.getCaptureMovesForPiece(board, piece)
          captures.push(...pieceCaptures)
        }
      }
    }

    return captures
  }

  static getCaptureMovesForPiece(board: (Piece | null)[][], piece: Piece): Position[] {
    const captures: Position[] = []
    const { row, col } = piece.position

    if (piece.type === "regular") {
      // Regular piece can capture in all 4 diagonal directions (Russian checkers rule)
      const directions = [
        { row: -1, col: -1 },
        { row: -1, col: 1 },
        { row: 1, col: -1 },
        { row: 1, col: 1 },
      ]

      for (const dir of directions) {
        const enemyPos = { row: row + dir.row, col: col + dir.col }
        const landingPos = { row: row + dir.row * 2, col: col + dir.col * 2 }

        if (this.isValidPosition(enemyPos) && this.isValidPosition(landingPos) && this.isDarkSquare(landingPos)) {
          const enemyPiece = board[enemyPos.row][enemyPos.col]
          const landingSquare = board[landingPos.row][landingPos.col]

          if (enemyPiece && enemyPiece.color !== piece.color && !landingSquare) {
            captures.push(landingPos)
          }
        }
      }
    } else {
      // King can capture along diagonals at any distance
      const directions = [
        { row: -1, col: -1 },
        { row: -1, col: 1 },
        { row: 1, col: -1 },
        { row: 1, col: 1 },
      ]

      for (const dir of directions) {
        let enemyFound = false
        let enemyPos: Position | null = null

        for (let distance = 1; distance < 8; distance++) {
          const checkPos = { row: row + dir.row * distance, col: col + dir.col * distance }

          if (!this.isValidPosition(checkPos) || !this.isDarkSquare(checkPos)) break

          const checkPiece = board[checkPos.row][checkPos.col]

          if (checkPiece) {
            if (checkPiece.color !== piece.color && !enemyFound) {
              enemyFound = true
              enemyPos = checkPos
            } else {
              break // Hit another piece
            }
          } else if (enemyFound) {
            // Empty square after enemy - valid capture landing
            captures.push(checkPos)
          }
        }
      }
    }

    return captures
  }

  static getRegularMovesForPiece(board: (Piece | null)[][], piece: Piece): Position[] {
    const moves: Position[] = []
    const { row, col } = piece.position

    if (piece.type === "regular") {
      // Regular piece moves only forward
      const direction = piece.color === "white" ? -1 : 1
      const movePositions = [
        { row: row + direction, col: col - 1 },
        { row: row + direction, col: col + 1 },
      ]

      for (const pos of movePositions) {
        if (this.isValidPosition(pos) && this.isDarkSquare(pos) && !board[pos.row][pos.col]) {
          moves.push(pos)
        }
      }
    } else {
      // King can move diagonally in all directions
      const directions = [
        { row: -1, col: -1 },
        { row: -1, col: 1 },
        { row: 1, col: -1 },
        { row: 1, col: 1 },
      ]

      for (const dir of directions) {
        for (let distance = 1; distance < 8; distance++) {
          const newPos = { row: row + dir.row * distance, col: col + dir.col * distance }

          if (!this.isValidPosition(newPos) || !this.isDarkSquare(newPos)) break

          const targetSquare = board[newPos.row][newPos.col]
          if (!targetSquare) {
            moves.push(newPos)
          } else {
            break // Hit a piece
          }
        }
      }
    }

    return moves
  }

  static makeMove(
    board: (Piece | null)[][],
    from: Position,
    to: Position,
  ): { success: boolean; newState?: Partial<GameState>; capturedPieces: Piece[]; hasMoreCaptures?: boolean } {
    const newBoard = board.map((row) => [...row])
    const piece = newBoard[from.row][from.col]

    if (!piece || !this.isDarkSquare(to)) {
      return { success: false, capturedPieces: [] }
    }

    const capturedPieces: Piece[] = []
    const isCapture = Math.abs(to.row - from.row) > 1

    // Move the piece
    const movedPiece = {
      ...piece,
      position: to,
      type: this.shouldPromoteToKing(piece, to) ? "king" : piece.type,
    }

    newBoard[to.row][to.col] = movedPiece
    newBoard[from.row][from.col] = null

    if (isCapture) {
      // Handle capture
      if (piece.type === "regular") {
        // Regular piece capture - remove the jumped piece
        const capturedRow = from.row + Math.sign(to.row - from.row)
        const capturedCol = from.col + Math.sign(to.col - from.col)
        const capturedPiece = newBoard[capturedRow][capturedCol]

        if (capturedPiece) {
          capturedPieces.push(capturedPiece)
          newBoard[capturedRow][capturedCol] = null
        }
      } else {
        // King capture - remove all pieces along the diagonal
        const stepRow = Math.sign(to.row - from.row)
        const stepCol = Math.sign(to.col - from.col)

        for (let i = 1; i < Math.abs(to.row - from.row); i++) {
          const checkRow = from.row + stepRow * i
          const checkCol = from.col + stepCol * i
          const capturedPiece = newBoard[checkRow][checkCol]

          if (capturedPiece && capturedPiece.color !== piece.color) {
            capturedPieces.push(capturedPiece)
            newBoard[checkRow][checkCol] = null
          }
        }
      }

      // Check for additional captures with the moved piece
      const additionalCaptures = this.getCaptureMovesForPiece(newBoard, movedPiece)

      if (additionalCaptures.length > 0) {
        // More captures available - don't switch turns yet
        return {
          success: true,
          newState: {
            board: newBoard,
            currentPlayer: piece.color, // Keep same player
            capturedPieces: [...capturedPieces],
            gameStatus: "playing",
            selectedPiece: movedPiece, // Keep piece selected
            validMoves: additionalCaptures,
          },
          capturedPieces,
          hasMoreCaptures: true,
        }
      }
    }

    // Switch turns
    const nextPlayer = piece.color === "white" ? "black" : "white"
    const gameStatus = this.checkGameStatus(newBoard, nextPlayer)

    return {
      success: true,
      newState: {
        board: newBoard,
        currentPlayer: nextPlayer,
        capturedPieces: [...capturedPieces],
        gameStatus,
        selectedPiece: null,
        validMoves: [],
      },
      capturedPieces,
      hasMoreCaptures: false,
    }
  }

  private static isValidPosition(pos: Position): boolean {
    return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8
  }

  private static isDarkSquare(pos: Position): boolean {
    return (pos.row + pos.col) % 2 === 1
  }

  private static shouldPromoteToKing(piece: Piece, position: Position): boolean {
    if (piece.type === "king") return true
    return (piece.color === "white" && position.row === 0) || (piece.color === "black" && position.row === 7)
  }

  private static checkGameStatus(
    board: (Piece | null)[][],
    currentPlayer: "white" | "black",
  ): "playing" | "white-wins" | "black-wins" | "draw" {
    const whitePieces = []
    const blackPieces = []

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece) {
          if (piece.color === "white") whitePieces.push(piece)
          else blackPieces.push(piece)
        }
      }
    }

    if (currentPlayer === "white" && whitePieces.length === 0) return "black-wins"
    if (currentPlayer === "black" && blackPieces.length === 0) return "white-wins"

    // Check if current player has any valid moves (captures or regular moves)
    const currentPlayerPieces = currentPlayer === "white" ? whitePieces : blackPieces
    const hasCaptures = this.getAllCaptures(board, currentPlayer).length > 0

    if (hasCaptures) return "playing" // Always can play if captures available

    const hasRegularMoves = currentPlayerPieces.some((piece) => this.getRegularMovesForPiece(board, piece).length > 0)

    if (!hasRegularMoves) {
      return currentPlayer === "white" ? "black-wins" : "white-wins"
    }

    return "playing"
  }
}
