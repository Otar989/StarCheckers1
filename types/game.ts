export type GameMode = 'bot' | 'local' | 'online-random' | 'online-room';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type OnlineGameState = 'idle' | 'searching' | 'waiting' | 'playing' | 'finished';

export interface GameConfig {
  mode: GameMode;
  difficulty?: Difficulty;
  roomCode?: string;
}
