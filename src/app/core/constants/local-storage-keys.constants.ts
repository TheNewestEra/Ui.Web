export const LOCAL_STORAGE_KEYS = {
  USER: 'user',
  COLOUR: 'userColour',
  USERNAME: 'username',
  THEME: 'theme',

  // Piece Puzzle (post-session, keyed per gameId via `${key_prefix}:${gameId}`)
  PIECE_PUZZLE_PARTICIPANT_ID: 'piecePuzzleParticipantId',
  PIECE_PUZZLE_TOKEN: 'piecePuzzleToken',
  PIECE_PUZZLE_HOST_TOKEN: 'piecePuzzleHostToken',
  PIECE_PUZZLE_RATED: 'piecePuzzleRated',

  // Guess (post-session, keyed per gameId via `${key_prefix}:${gameId}`)
  GUESS_PARTICIPANT_ID: 'guessParticipantId',
  GUESS_TOKEN: 'guessToken',
  GUESS_HOST_TOKEN: 'guessHostToken',
  GUESS_ANSWERED_ROUND: 'guessAnsweredRound',
  GUESS_RATED_GAME: 'guessRated',
};
