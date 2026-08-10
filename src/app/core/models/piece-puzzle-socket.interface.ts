import { PuzzleStatus } from '@thenewestera/puzzle-ng';

export interface PuzzleStateMessage {
  type: 'state';
  id: string;
  theme: string | null;
  prompt: string | null;
  status: PuzzleStatus;
  error?: string;
  gridSize: number;
  board: number[];
  timeLimitMs: number;
  startedAt: number | null;
  remainingMs: number | null;
  lobbyRemainingMs: number | null;
  endedAt: number | null;
  score: number | null;
  solvedBy: string | null;
  connectedPlayers: number;
}

export interface PuzzleStatusMessage {
  type: 'status';
  status: PuzzleStatus;
  error?: string;
}

export interface PuzzleMoveMessage {
  type: 'move';
  cellA: number;
  cellB: number;
  by: string;
}

export interface PuzzleSolvedMessage {
  type: 'solved';
  board: number[];
  score: number;
  solvedBy: string;
  remainingMs: number;
}

export interface PuzzleTimeoutMessage {
  type: 'timeout';
}

export interface PuzzlePresenceMessage {
  type: 'presence';
  connectedPlayers: number;
}

export type PuzzleSocketMessage =
  | PuzzleStateMessage
  | PuzzleStatusMessage
  | PuzzleMoveMessage
  | PuzzleSolvedMessage
  | PuzzleTimeoutMessage
  | PuzzlePresenceMessage;
