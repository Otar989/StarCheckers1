'use client';

import { useState } from 'react';
import { useGameStats } from '@/hooks/use-game-stats';
import type { GameState, GameDispatch } from './GameProvider';
import { nanoid } from 'nanoid';
import '@/styles/components.css';

export function MainMenu({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const stats = useGameStats();
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRandomGame = async () => {
    try {
      setIsLoading(true);
      console.log('Starting random game search');
      const response = await fetch('/api/create-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'matchmaking' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to find game');
      }
      
      const { roomId, color } = await response.json();
      dispatch({ type: 'SET_GAME_MODE', payload: 'matchmaking' });
      dispatch({ type: 'SET_ROOM_ID', payload: roomId });
      dispatch({ type: 'SET_PLAYER_COLOR', payload: color });
      dispatch({ type: 'SET_LOBBY_STATUS', payload: 'waiting' });
    } catch (error) {
      console.error('Error finding game:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Ошибка при поиске игры' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGame = async () => {
    try {
      setIsLoading(true);
      console.log('Creating new game');
      const response = await fetch('/api/create-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'online' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create game');
      }
      
      const { roomId, color } = await response.json();
      dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
      dispatch({ type: 'SET_ROOM_ID', payload: roomId });
      dispatch({ type: 'SET_PLAYER_COLOR', payload: color });
      dispatch({ type: 'SET_LOBBY_STATUS', payload: 'waiting' });
    } catch (error) {
      console.error('Error creating game:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Ошибка при создании игры' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!roomCode) return;
    
    try {
      setIsLoading(true);
      console.log('Joining game:', roomCode);
      const response = await fetch('/api/join-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomCode })
      });
      
      if (!response.ok) {
        throw new Error('Failed to join game');
      }
      
      const { color } = await response.json();
      dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
      dispatch({ type: 'SET_ROOM_ID', payload: roomCode });
      dispatch({ type: 'SET_PLAYER_COLOR', payload: color });
      dispatch({ type: 'SET_LOBBY_STATUS', payload: 'waiting' });
    } catch (error) {
      console.error('Error joining game:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Ошибка при подключении к игре' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md space-y-6 p-6 rounded-xl shadow-xl main-container">
        <h1 className="text-3xl font-bold text-center text-white mb-8">
          Звёздные шашки
        </h1>

        <div className="space-y-4">
          <button
            onClick={handleCreateGame}
            className="game-button w-full"
            disabled={isLoading}
          >
            <i className="fas fa-plus mr-2"></i>
            Создать игру
          </button>

          <div className="flex space-x-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Код комнаты"
              className="input-field flex-grow"
              disabled={isLoading}
            />
            <button
              onClick={handleJoinGame}
              className="game-button px-6"
              disabled={!roomCode || isLoading}
            >
              <i className="fas fa-sign-in-alt"></i>
            </button>
          </div>

          <button
            onClick={handleRandomGame}
            className="game-button w-full"
            disabled={isLoading}
          >
            <i className="fas fa-random mr-2"></i>
            Найти случайного игрока
          </button>

          <button
            onClick={() => dispatch({ type: 'SET_GAME_MODE', payload: 'bot' })}
            className="game-button w-full"
            disabled={isLoading}
          >
            <i className="fas fa-robot mr-2"></i>
            Играть с ботом
          </button>
        </div>

        <div className="stats-container mt-6">
          {stats.isLoaded ? (
            <>
              <div className="stat">
                <i className="fas fa-trophy text-yellow-500"></i>
                <span>Рейтинг: {stats.stats.rating}</span>
              </div>
              <div className="stat">
                <i className="fas fa-gamepad"></i>
                <span>Игр: {stats.stats.gamesPlayed}</span>
              </div>
              <div className="stat">
                <i className="fas fa-star text-yellow-500"></i>
                <span>Побед: {stats.stats.wins}</span>
              </div>
            </>
          ) : (
            <div className="stat">
              <span>Загрузка статистики...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
