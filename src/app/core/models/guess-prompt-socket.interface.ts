import { GameResult, GameStatus, Participant, Round, RoundStatus } from '@thenewestera/guess-ng';

export interface GuessPromptStateMessage {
  type: 'state';
  id: string;
  theme: string | null;
  status: GameStatus;
  error?: string;
  rounds: Round[];
  currentRound: number | null;
  lobbyRemainingMs: number | null;
  connectedPlayers: number;
  participants: Participant[];
  results: GameResult[];
}

export interface GuessPromptStatusMessage {
  type: 'status';
  status: GameStatus;
  error?: string;
}

export interface GuessPromptPromptsReadyMessage {
  type: 'prompts_ready';
  count: number;
}

export interface GuessPromptRoundStatusMessage {
  type: 'round_status';
  index: number;
  status: RoundStatus;
  remainingMs?: number;
}

export interface GuessPromptRoundReadyMessage {
  type: 'round_ready';
  index: number;
  remainingMs: number;
}

export interface GuessPromptGuessMessage {
  type: 'guess';
  index: number;
  player: string;
  color: string;
  correct: boolean;
  score: number | null;
}

export interface GuessPromptRevealedMessage {
  type: 'revealed';
  index: number;
  prompt: string;
  player: string;
  color: string;
}

export interface GuessPromptPlayerJoinedMessage {
  type: 'player_joined';
  name: string;
  color: string;
}

export interface GuessPromptPlayerTypingMessage {
  type: 'player_typing';
  index: number;
  player: string;
  color: string;
}

export interface GuessPromptPresenceMessage {
  type: 'presence';
  connectedPlayers: number;
}

export type GuessPromptSocketMessage =
  | GuessPromptStateMessage
  | GuessPromptStatusMessage
  | GuessPromptPromptsReadyMessage
  | GuessPromptRoundStatusMessage
  | GuessPromptRoundReadyMessage
  | GuessPromptGuessMessage
  | GuessPromptRevealedMessage
  | GuessPromptPlayerJoinedMessage
  | GuessPromptPlayerTypingMessage
  | GuessPromptPresenceMessage;
