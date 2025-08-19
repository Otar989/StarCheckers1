"use client"
import { Settings, Bot, Users, Wifi, Trophy, Star } from "lucide-react"
import type { GameMode, Difficulty } from "../../types/game"
import { useGameStats } from "@/hooks/use-game-stats"
import { useState, useEffect } from "react"
import { useAudio } from "./AudioProvider"
import { LoadingSpinner } from "./LoadingSpinner"
import { useGame } from "./GameProvider"
import { RoomCodeToast } from "./RoomCodeToast"

interface MainMenuProps {
  onStartGame: (mode: GameMode, difficulty?: Difficulty, roomCode?: string) => void
  onOpenSettings: () => void
}

export function MainMenu({ onStartGame, onOpenSettings }: MainMenuProps) {
  const { stats } = useGameStats()
  const { initializeAudio } = useAudio()
  const { state, createRoom, joinRoom, searchRandomGame } = useGame()
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  const [onlineStep, setOnlineStep] = useState<"none" | "options" | "waiting" | "join" | "searching">("none")
  const [roomCode, setRoomCode] = useState("")
  const [showRoomCode, setShowRoomCode] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Проверяем URL параметры для присоединения к комнате
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (roomId) {
      joinRoom(roomId);
    }
  }, [joinRoom]);

  // Обработчик таймаута поиска игры
  useEffect(() => {
    if (state.gameMode === 'online-random' && state.onlineState === 'searching' && !searchTimeout) {
      const timeout = setTimeout(() => {
        // Если никто не найден за минуту, переключаемся на игру с ботом
        onStartGame('bot', 'medium');
      }, 60000);
      setSearchTimeout(timeout);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [state.gameMode, state.onlineState, searchTimeout]);

  const handleStartGame = async (mode: GameMode, difficulty?: Difficulty, roomCode?: string) => {
    initializeAudio()
    
    if (mode === 'online-random') {
      setOnlineStep('searching');
      await searchRandomGame();
    } else if (mode === 'online-room') {
      if (onlineStep === 'join' && roomCode) {
        await joinRoom(roomCode);
      } else {
        await createRoom();
      }
    } else {
      onStartGame(mode, difficulty);
    }
  }

  const renderOnlineOptions = () => (
    <div className="space-y-4">
      <button
        className="game-button w-full"
        onClick={() => {
          handleStartGame('online-random');
        }}
        onMouseEnter={() => setHoveredButton('online-random')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <Wifi className="w-6 h-6" />
        <span>Найти случайного игрока</span>
      </button>

      <button
        className="game-button w-full"
        onClick={() => setOnlineStep('join')}
        onMouseEnter={() => setHoveredButton('join-room')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <Users className="w-6 h-6" />
        <span>Присоединиться к игре</span>
      </button>

      <button
        className="game-button w-full"
        onClick={() => handleStartGame('online-room')}
        onMouseEnter={() => setHoveredButton('create-room')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <Users className="w-6 h-6" />
        <span>Создать игру</span>
      </button>

      <button
        className="game-button w-full"
        onClick={() => setOnlineStep('none')}
      >
        Назад
      </button>
    </div>
  )

  const renderJoinRoom = () => (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Введите код комнаты"
        className="w-full p-2 rounded bg-gray-700 text-white"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
      />
      <button
        className="game-button w-full"
        onClick={() => handleStartGame('online-room', undefined, roomCode)}
      >
        Присоединиться
      </button>
      <button
        className="game-button w-full"
        onClick={() => setOnlineStep('options')}
      >
        Назад
      </button>
    </div>
  )

  const renderSearching = () => (
    <div className="space-y-4 text-center">
      <LoadingSpinner />
      <p>Поиск игроков...</p>
      <p className="text-sm text-gray-400">
        Если игрок не будет найден в течение 1 минуты,<br/>
        вы начнете игру с ботом
      </p>
      <button
        className="game-button w-full"
        onClick={() => {
          if (searchTimeout) clearTimeout(searchTimeout);
          setOnlineStep('options');
        }}
      >
        Отменить
      </button>
    </div>
  )

  const renderMainMenu = () => (
    <div className="space-y-4">
      <button
        className="game-button w-full"
        onClick={() => handleStartGame('bot', 'medium')}
        onMouseEnter={() => setHoveredButton('bot')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <Bot className="w-6 h-6" />
        <span>Играть с ботом</span>
      </button>

      <button
        className="game-button w-full"
        onClick={() => handleStartGame('local')}
        onMouseEnter={() => setHoveredButton('local')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <Users className="w-6 h-6" />
        <span>Играть на одном устройстве</span>
      </button>

      <button
        className="game-button w-full"
        onClick={() => setOnlineStep('options')}
        onMouseEnter={() => setHoveredButton('online')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <Wifi className="w-6 h-6" />
        <span>Играть онлайн</span>
      </button>

      <button
        className="game-button w-full settings-button"
        onClick={onOpenSettings}
        onMouseEnter={() => setHoveredButton('settings')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <Settings className="w-6 h-6" />
        <span>Настройки</span>
      </button>

      <div className="stats-container">
        <div className="stat">
          <Trophy className="w-4 h-4" />
          <span>Победы: {stats?.wins || 0}</span>
        </div>
        <div className="stat">
          <Star className="w-4 h-4" />
          <span>Рейтинг: {stats?.rating || 1000}</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <style jsx global>{`
        @keyframes moveGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .game-button {
          @apply flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-all duration-200;
          background: linear-gradient(45deg, #2c3e50, #3498db, #2980b9);
          background-size: 200% 200%;
          animation: moveGradient 5s ease infinite;
        }
        .game-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
        }
        .settings-button {
          background: linear-gradient(45deg, #2c3e50, #95a5a6, #7f8c8d);
        }
        .stats-container {
          @apply mt-6 flex justify-between items-center px-4 py-3 bg-gray-800 rounded-lg;
        }
        .stat {
          @apply flex items-center gap-2 text-gray-300;
        }
      `}</style>

      <div className="w-full max-w-md space-y-6 p-6 bg-gray-900 rounded-xl shadow-xl">
        <h1 className="text-3xl font-bold text-center text-white mb-8">
          Звёздные шашки
        </h1>

        {onlineStep === 'none' && renderMainMenu()}
        {onlineStep === 'options' && renderOnlineOptions()}
        {onlineStep === 'join' && renderJoinRoom()}
        {onlineStep === 'searching' && renderSearching()}

        {showRoomCode && state.roomId && (
          <RoomCodeToast
            roomId={state.roomId}
            onClose={() => setShowRoomCode(false)}
          />
        )}
      </div>
    </>
  )
}
