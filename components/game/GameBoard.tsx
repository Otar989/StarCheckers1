"use client"
import { ArrowLeft, RotateCcw } from "lucide-react"

import { useGame } from "./GameProvider"
import { useAudio } from "./AudioProvider"
import { useTelegram } from "../telegram/TelegramProvider"
import { useTheme } from "@/hooks/use-theme"
import { BoardSquare } from "./BoardSquare"
import { GameLogic } from "@/lib/game-logic"
import { AIEngine } from "@/lib/ai-engine"
import type { GameMode, Difficulty } from "@/app/page"
type Position = { row: number; col: number }
import { useEffect, useState, useCallback, useRef } from "react"
import { useHeadToHead } from "@/hooks/use-head-to-head"
import { RoomCodeToast } from "./RoomCodeToast"

interface GameBoardProps {
  mode: GameMode
  difficulty: Difficulty
  roomCode?: string
  onBackToMenu: () => void
}

export function GameBoard({ mode, difficulty, roomCode, onBackToMenu }: GameBoardProps) {
  const { state, dispatch, sendMove, leaveRoom, requestRematch, tryStartRematch, rematchDeadline, rematchRequested, connectionStatus } = useGame()
  const { playSound, initializeAudio } = useAudio()
  const { hapticFeedback, user, initData } = useTelegram()
  const { theme } = useTheme()
  // Контейнер игрового экрана для блокировки системных свайпов (Telegram iOS)
  const screenRef = useRef<HTMLDivElement | null>(null)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [dragOver, setDragOver] = useState<{ row: number; col: number } | null>(null)
  const [isProcessingMove, setIsProcessingMove] = useState(false)
  const [showRoomCode, setShowRoomCode] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const cleanupRef = useRef(false)
  const [remaining, setRemaining] = useState<number>(60)
  const { score, recordYouWin, recordOppWin, recordDraw } = useHeadToHead(state.roomId)
  const prevPlayerRef = useRef<typeof state.currentPlayer | null>(null)

  // Глобально блокируем скролл/свайпы в пределах игрового экрана, чтобы не мешали ходам чёрных
  useEffect(() => {
    const el = screenRef.current
    if (!el) return
    const onTouchMove = (e: TouchEvent) => e.preventDefault()
    const onWheel = (e: WheelEvent) => e.preventDefault()
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("wheel", onWheel)
    }
  }, [])

  // Онлайн: показываем свою сторону снизу. Если игрок чёрный — визуально переворачиваем поле.
  const isFlipped = state.gameMode === 'online' && state.playerColor === 'black'
  const toModel = useCallback((pos: Position): Position => (
    isFlipped ? { row: 7 - pos.row, col: 7 - pos.col } : pos
  ), [isFlipped])
  const toDisplay = useCallback((pos: Position): Position => (
    isFlipped ? { row: 7 - pos.row, col: 7 - pos.col } : pos
  ), [isFlipped])

  // Таймер для окна рематча
  useEffect(() => {
    if (state.gameMode !== 'online') return;
    if (state.gameStatus === 'playing') return;
    if (!rematchDeadline) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((rematchDeadline - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        onBackToMenu()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [state.gameMode, state.gameStatus, rematchDeadline, onBackToMenu])

  // Подключение к онлайн-игре теперь полностью обрабатывается через GameProvider/use-online-game.

  // Звук смены хода: когда право хода перешло к пользователю
  useEffect(() => {
    const prev = prevPlayerRef.current
    const curr = state.currentPlayer
    prevPlayerRef.current = curr
    if (state.gameStatus !== 'playing') return
    // В онлайне сигналим, только если теперь ход нашего игрока
    if (mode === 'online') {
      if (state.playerColor && curr === state.playerColor) {
        playSound('turn')
      }
    } else {
      // В локальном/боте – после каждого завершения хода (кроме старта)
      if (prev && prev !== curr) {
        playSound('turn')
      }
    }
  }, [state.currentPlayer, state.gameStatus, mode, state.playerColor, playSound])

  // Поп‑ап завершения партии отображается ниже; отдельный баннер «Opponent disconnected» удалён
  // Обновляем H2H после завершения партии
  useEffect(() => {
    if (state.gameMode !== 'online') return
    if (state.gameStatus === 'white-wins') {
      if (state.playerColor === 'white') recordYouWin(); else recordOppWin();
    } else if (state.gameStatus === 'black-wins') {
      if (state.playerColor === 'black') recordYouWin(); else recordOppWin();
    } else if (state.gameStatus === 'draw') {
      recordDraw();
    }
    // player-left считаем победой оставшегося игрока
    if (state.gameStatus === 'player-left') {
      recordYouWin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameStatus])

  const cleanupGame = useCallback(() => {
    if (cleanupRef.current) return
    cleanupRef.current = true

  // Очистку онлайна выполняет GameProvider; здесь ничего не отправляем по сокетам.

    dispatch({
      type: "RESET_GAME",
      gameMode: mode === "online" ? "bot" : mode,
    })
    dispatch({
      type: "SET_GAME_STATE",
      state: { roomId: null, playerColor: null, opponentColor: null },
    })
  }, [dispatch, mode])

  useEffect(() => {
    return () => {
      cleanupGame()
    }
  }, [cleanupGame])

  // При входе на экран игры синхронизируем режим игры в контексте и сбрасываем партию
  useEffect(() => {
    if (mode === 'online') return
    dispatch({ type: 'RESET_GAME', gameMode: mode })
    setIsAIThinking(false)
    setIsProcessingMove(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Не вызываем leaveRoom автоматически, только по кнопке Меню

  useEffect(() => {
    if (
      mode === "bot" &&
      state.currentPlayer === "black" &&
      state.gameStatus === "playing" &&
      !isAIThinking &&
      !isProcessingMove
    ) {
      setTimeout(() => {
        setIsAIThinking(true)

        const thinkingTime = difficulty === "easy" ? 200 : difficulty === "medium" ? 400 : 600

        setTimeout(() => {
          const aiMove = AIEngine.getBestMove(state.board, difficulty)

          if (aiMove) {
            setIsProcessingMove(true)
            const moveResult = GameLogic.makeMove(state.board, aiMove.from, aiMove.to)

            if (moveResult.success && moveResult.newState) {
              dispatch({ type: "SET_GAME_STATE", state: moveResult.newState })
              playSound(moveResult.capturedPieces.length > 0 ? "capture" : "move")
              hapticFeedback(moveResult.capturedPieces.length > 0 ? "medium" : "light")

              if (moveResult.newState.gameStatus !== "playing") {
                playSound("win")
                hapticFeedback("heavy")
              }
            }
            setIsProcessingMove(false)
          }

          setIsAIThinking(false)
        }, thinkingTime)
      }, 400)
    }
  }, [
    state.currentPlayer,
    state.gameStatus,
    mode,
    difficulty,
    state.board,
    dispatch,
    playSound,
    hapticFeedback,
    isAIThinking,
    isProcessingMove,
  ])

  const handleSquareClick = async (row: number, col: number) => {
  const isBot = mode === 'bot'
  const isOnline = mode === 'online'
    const onlineNotReady = isOnline && state.onlineState !== 'playing'
    if (
      isAIThinking ||
      isProcessingMove ||
      state.gameStatus !== "playing" ||
      // В режиме бота блокируем ходы пользователя, когда очередь бота (чёрные)
      (isBot && state.currentPlayer === "black") ||
      onlineNotReady ||
      (isOnline && (!state.playerColor || state.currentPlayer !== state.playerColor))
    ) {
      return
    }

    initializeAudio()

  // Экранные координаты -> модель
  const displayPos: Position = { row, col }
  const position: Position = toModel(displayPos)
  const piece = state.board[position.row][position.col]

    hapticFeedback("light")

    if (!state.selectedPiece) {
      if (piece && piece.color === state.currentPlayer) {
        dispatch({ type: "SELECT_PIECE", piece })
        const validMoves = GameLogic.getValidMoves(state.board, piece)
        dispatch({ type: "SET_VALID_MOVES", moves: validMoves })
        playSound("select")
      }
      return
    }

    if (state.selectedPiece && piece?.id === state.selectedPiece.id) {
      dispatch({ type: "SELECT_PIECE", piece: null })
      dispatch({ type: "SET_VALID_MOVES", moves: [] })
      return
    }

    if (piece && piece.color === state.currentPlayer) {
      dispatch({ type: "SELECT_PIECE", piece })
      const validMoves = GameLogic.getValidMoves(state.board, piece)
      dispatch({ type: "SET_VALID_MOVES", moves: validMoves })
      playSound("select")
      return
    }

  const isValidMove = state.validMoves.some((move) => move.row === position.row && move.col === position.col)

    if (isValidMove && state.selectedPiece) {
      setIsProcessingMove(true)
      const fromPosition = state.selectedPiece.position
      const moveResult = GameLogic.makeMove(state.board, fromPosition, position)

      if (moveResult.success && state.selectedPiece) {
        if (mode === "online") {
          const move = {
            from: fromPosition,
            to: position,
            capturedPieces: moveResult.capturedPieces ?? [],
            timestamp: Date.now(),
          }
          playSound(moveResult.capturedPieces.length > 0 ? "capture" : "move")
          hapticFeedback(moveResult.capturedPieces.length > 0 ? "medium" : "light")
          await sendMove(move)
          dispatch({ type: "SELECT_PIECE", piece: null })
          dispatch({ type: "SET_VALID_MOVES", moves: [] })
        } else {
          // Локальные режимы: применяем ход сразу
          if (moveResult.hasMoreCaptures) {
            dispatch({ type: "SET_GAME_STATE", state: moveResult.newState! })
          } else {
            dispatch({ type: "SELECT_PIECE", piece: null })
            dispatch({ type: "SET_VALID_MOVES", moves: [] })
            dispatch({ type: "SET_GAME_STATE", state: moveResult.newState! })
          }

          playSound(moveResult.capturedPieces.length > 0 ? "capture" : "move")
          hapticFeedback(moveResult.capturedPieces.length > 0 ? "medium" : "light")

          if (
            moveResult.newState &&
            moveResult.newState.board &&
            moveResult.newState.board[position.row][position.col]?.type === "king" &&
            state.selectedPiece &&
            state.selectedPiece.type === "regular"
          ) {
            playSound("promote")
            hapticFeedback("heavy")
          }

          if (moveResult.newState!.gameStatus !== "playing") {
            playSound("win")
            hapticFeedback("heavy")
          }
        }
      }

      setIsProcessingMove(false)
    } else {
      dispatch({ type: "SELECT_PIECE", piece: null })
      dispatch({ type: "SET_VALID_MOVES", moves: [] })
    }
  }

  const handleDragStart = (row: number, col: number) => {
    handleSquareClick(row, col)
  }

  const handleDragOver = (row: number, col: number) => {
    if (row >= 0 && col >= 0) {
      setDragOver({ row, col })
    } else {
      setDragOver(null)
    }
  }

  const handleDrop = (row: number, col: number) => {
    handleSquareClick(row, col)
    setDragOver(null)
  }

  const handleJoinRetry = () => {
    setJoinError(null)
  }

  const handleBackToMenuClick = async () => {
    if (state.gameMode === 'online' && state.roomId) {
      try { await leaveRoom() } catch {}
    }
    cleanupGame()
    onBackToMenu()
  }

  const resetGame = () => {
    dispatch({ type: "RESET_GAME" })
    setIsAIThinking(false)
    setIsProcessingMove(false)
    hapticFeedback("medium")
  }

  const isValidMoveSquare = (row: number, col: number) => {
    const modelPos = toModel({ row, col })
    return state.validMoves.some((move) => move.row === modelPos.row && move.col === modelPos.col)
  }

  const isSelectedSquare = (row: number, col: number) => {
    if (!state.selectedPiece) return false
    const displayPos = toDisplay(state.selectedPiece.position)
    return displayPos.row === row && displayPos.col === col
  }

  return (
    <>
      {joinError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow z-50 flex items-center gap-3">
          <span>{joinError}</span>
          <button onClick={handleJoinRetry} className="underline">
            Retry
          </button>
          <button onClick={handleBackToMenuClick} className="underline">
            Back
          </button>
        </div>
      )}
      {showRoomCode && state.roomId && (
        <RoomCodeToast roomId={state.roomId} onClose={() => setShowRoomCode(false)} />
      )}
      <div
        ref={screenRef}
        className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overscroll-none touch-none select-none"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 60px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          paddingLeft: "max(env(safe-area-inset-left), 12px)",
          paddingRight: "max(env(safe-area-inset-right), 12px)",
          minHeight: "100dvh",
        }}
      >
      <div className="absolute inset-0">
        {/* Floating orbs with different animation speeds */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-500/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />

        {/* Moving gradient overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.1) 50%, transparent 70%)",
            animation: "moveGradient 8s ease-in-out infinite alternate",
          }}
        />

        {/* Floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full blur-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Поп‑ап завершения партии */}
      {state.gameStatus !== 'playing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="liquid-glass-3d w-full max-w-sm rounded-2xl p-5 text-center">
            <h3 className="text-lg font-bold mb-3">
              {state.gameStatus === 'white-wins' && 'Белые победили!'}
              {state.gameStatus === 'black-wins' && 'Чёрные победили!'}
              {state.gameStatus === 'draw' && 'Ничья'}
              {state.gameStatus === 'player-left' && 'Соперник вышел из игры'}
            </h3>
            {state.gameMode === 'online' && state.gameStatus !== 'player-left' ? (
              <>
                <p className="text-sm text-white/70 mb-3">Начнём заново, если оба подтвердят за {remaining}s</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { requestRematch?.(); tryStartRematch?.(); }}
                    className={`liquid-glass-button px-4 py-2 rounded-xl ${rematchRequested ? 'opacity-70' : ''}`}
                  >
                    {rematchRequested ? 'Ожидание соперника…' : 'Играть снова'}
                  </button>
                  <button onClick={handleBackToMenuClick} className="liquid-glass-button px-4 py-2 rounded-xl">
                    Меню
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-3 justify-center">
                {state.gameStatus !== 'player-left' && (
                  <button onClick={resetGame} className="liquid-glass-button px-4 py-2 rounded-xl">Начать сначала</button>
                )}
                <button onClick={handleBackToMenuClick} className="liquid-glass-button px-4 py-2 rounded-xl">Меню</button>
              </div>
            )}
          </div>
        </div>
      )}

  {/* Верхняя панель убрана, чтобы не конфликтовать с системными элементами Telegram. Контролы перенесены вниз. */}

      {/* Инфоблок, как был снизу, теперь над доской */}
      <div className="w-full flex items-center justify-between px-1 md:px-2 mt-1 mb-2 md:mb-3 z-20">
        {/* Кнопка Меню (стрелка) слева, интерактивная */}
        <button
          onClick={handleBackToMenuClick}
          aria-label="Меню"
          title="Меню"
          className="liquid-glass-button flex items-center justify-center p-2 md:p-2.5 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 text-white/90 shadow-black/20"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="liquid-glass text-center rounded-2xl px-3 py-2 md:px-4 md:py-2.5 mx-auto">
          <h2 className="font-bold text-sm bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            StarCheckers
          </h2>
          <p className="text-xs text-white/60">
            {mode === "bot" && `ИИ (${difficulty === "easy" ? "Легко" : difficulty === "medium" ? "Средне" : "Сложно"})`}
            {mode === "local" && "Локальная игра"}
            {mode === "online" && "Онлайн"}
          </p>
        </div>

        {/* Плейсхолдер справа для сохранения центровки инфоблока */}
        <div className="w-[36px] md:w-[40px]" />
      </div>

      <div className="flex-1 flex items-center justify-center px-1 md:px-2">
        <div
          className="relative w-full 
          max-w-[min(90vw,80vh,400px)] 
          sm:max-w-[min(85vw,75vh,450px)]
          md:max-w-[min(80vw,70vh,550px)]
          lg:max-w-[min(75vw,65vh,600px)]
          aspect-square"
        >
          <div className="absolute inset-0 rounded-3xl blur-3xl transform translate-y-12 scale-115 bg-black/20" />
          <div className="absolute inset-0 rounded-2xl blur-2xl transform translate-y-6 scale-110 bg-black/15" />
          <div className="absolute inset-0 rounded-xl blur-xl transform translate-y-3 scale-105 bg-black/10" />

          <div
            className="liquid-glass-3d relative rounded-3xl p-2 md:p-3 transform-gpu"
            style={{
              transform: "perspective(1200px) rotateX(8deg) rotateY(-2deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className="liquid-glass-3d rounded-2xl p-1.5 md:p-2 backdrop-blur-xl bg-white/5 border border-white/10"
              style={{
                transform: "translateZ(15px)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              <div
                className="grid grid-cols-8 gap-0.5 w-full h-full rounded-xl overflow-hidden shadow-inner backdrop-blur-sm"
                style={{
                  transform: "translateZ(10px)",
                  boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                {Array.from({ length: 8 }, (_, r) => r).map((rowIndex) =>
                  Array.from({ length: 8 }, (_, c) => c).map((colIndex) => {
                    const model = toModel({ row: rowIndex, col: colIndex })
                    const piece = state.board[model.row][model.col]
                    return (
                      <BoardSquare
                        key={`${rowIndex}-${colIndex}`}
                        row={rowIndex}
                        col={colIndex}
                        piece={piece}
                        isSelected={isSelectedSquare(rowIndex, colIndex)}
                        isValidMove={isValidMoveSquare(rowIndex, colIndex)}
                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        isDragTarget={dragOver?.row === rowIndex && dragOver?.col === colIndex}
                      />
                    )
                  }),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center space-y-2 md:space-y-3 px-1 md:px-2 pb-1 md:pb-2 relative z-10">
        {/* Панель управления под доской */}
        <div className="flex items-center justify-between gap-2 mb-1 md:mb-2">
          {/* Кнопка меню перенесена вверх — оставляем плейсхолдер для баланса */}
          <div className="w-[36px] md:w-[40px]" />

          <div className="w-[36px] md:w-[40px]" />

          {state.gameStatus !== 'playing' ? (
            <button
              onClick={resetGame}
              className="liquid-glass-button flex items-center justify-center p-2 md:p-2.5 rounded-2xl transition-all duration-300 hover:scale-105 text-white/90"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-[36px] md:w-[40px]" />
          )}
        </div>
        {state.gameMode === 'online' && (
          <div className="liquid-glass rounded-xl px-4 py-2 md:px-5 md:py-3 inline-flex items-center gap-4">
            <div className="text-xs md:text-sm text-white/70">Серия</div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-[10px] md:text-xs text-white/50">Вы</div>
                <div className="text-sm md:text-base font-bold">{score.you}</div>
              </div>
              <div className="text-white/40">:</div>
              <div className="text-center">
                <div className="text-[10px] md:text-xs text-white/50">Соперник</div>
                <div className="text-sm md:text-base font-bold">{score.opp}</div>
              </div>
              <div className="text-white/40">•</div>
              <div className="text-center">
                <div className="text-[10px] md:text-xs text-white/50">Ничьи</div>
                <div className="text-sm md:text-base font-bold">{score.draws}</div>
              </div>
            </div>
          </div>
        )}
        <div className="liquid-glass inline-flex items-center gap-2 md:gap-3 rounded-full px-3 py-2 md:px-4 md:py-3 min-h-[40px] md:min-h-[48px] min-w-[140px] md:min-w-[160px] justify-center">
          <div
            className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0 shadow-lg ${
              state.currentPlayer === "white"
                ? "bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-400"
                : "bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-600"
            }`}
          />
          <p className="text-xs md:text-sm font-semibold whitespace-nowrap text-white/90">
            {isAIThinking ? (
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ИИ думает...
              </span>
            ) : (
              `Ход: ${state.currentPlayer === "white" ? "Белые" : "Черные"}`
            )}
          </p>
        </div>

        {state.gameMode === 'online' && (
          <div className="liquid-glass inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 md:px-3 md:py-2">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'}`} />
            <span className="text-[10px] md:text-xs text-white/70">
              {connectionStatus === 'connected' ? 'Онлайн' : connectionStatus === 'connecting' ? 'Подключение…' : 'Оффлайн'}
            </span>
          </div>
        )}

        {state.gameStatus !== "playing" && state.gameStatus !== "player-left" && (
          <div className="liquid-glass border rounded-full px-3 py-2 md:px-4 md:py-3 animate-pulse min-h-[40px] md:min-h-[48px] flex items-center justify-center">
            <p className="font-bold text-xs md:text-sm whitespace-nowrap text-emerald-400">
              {state.gameStatus === "white-wins" && "Белые победили!"}
              {state.gameStatus === "black-wins" && "Черные победили!"}
              {state.gameStatus === "draw" && "Ничья!"}
            </p>
          </div>
        )}

        <div className="liquid-glass rounded-2xl p-2 md:p-3 max-w-xs md:max-w-sm mx-auto min-h-[50px] md:min-h-[60px]">
          <p className="text-xs mb-1 md:mb-2 text-white/60">Взятые:</p>
          <div className="flex justify-center gap-1 flex-wrap min-h-[16px] md:min-h-[20px] items-center">
            {state.capturedPieces.length > 0 ? (
              state.capturedPieces.map((piece, index) => (
                <div
                  key={`captured-${piece.id}-${index}`}
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border backdrop-blur-xl shadow-lg transition-all duration-200 ease-out animate-in fade-in zoom-in ${
                    piece.color === "white"
                      ? "bg-gradient-to-br from-gray-100/90 to-gray-300/90 border-gray-300"
                      : "bg-gradient-to-br from-gray-700/90 to-gray-900/90 border-gray-600"
                  } ${piece.type === "king" ? "ring-1 md:ring-2 ring-yellow-400/60" : ""}`}
                  style={{ borderRadius: "50%" }}
                />
              ))
            ) : (
              <p className="text-xs italic text-white/40">Пока нет взятых фигур</p>
            )}
          </div>
        </div>
      </div>
    </div>
  </>
  )
}
