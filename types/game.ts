export type GameMode = "bot" | "local" | "online";

export type Difficulty = "easy" | "medium" | "hard";

export interface GameConfig {
  mode: GameMode;
  difficulty?: Difficulty;
  roomCode?: string;
}
