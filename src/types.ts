export interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

export interface Move {
  r: number; // Row index (0-14)
  c: number; // Column index (0-14)
  p: number; // Player who made the move (1: Black, 2: White)
  t: number; // Timestamp of the move
}

export interface Message {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  time: number;
}

export interface Room {
  code: string;
  player1: Player | null; // Black (Creator)
  player2: Player | null; // White (Opponent)
  spectators: Player[];
  currentTurn: number; // 1: Black, 2: White
  winner: number; // 0: Ongoing, 1: Player 1, 2: Player 2, 3: Draw
  winningLine: [number, number][]; // Line coordinates [[r, c], ...]
  moves: Move[];
  chat: Message[];
  rematchRequests: string[]; // User IDs who voted for rematch
  createdAt: number;
  lastActive: number;
}

export interface UserStat {
  nickname: string;
  wins: number;
  losses: number;
  draws: number;
  lastPlayed: number;
}
