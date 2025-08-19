export type GameMode = "bot" | "local" | "online";

export type OnlineGameState = 'idle' | 'searching' | 'waiting' | 'playing' | 'finished';

export interface GameConfig {
  mode: GameMode;
  difficulty?: Difficulty;
  roomCode?: string;
}
