# The Newest Era — AI Games Web

The Newest Era is an Angular frontend for multiplayer, AI-generated party games. Players can create a game, invite friends, join anonymously or with an account, watch activity in real time, and compete on shared leaderboards.

---

## Implemented games

### Guess the Prompt

AI-generated images are presented over multiple timed rounds. Players submit guesses for the hidden prompt and earn time-weighted points for correct answers.

- Real-time lobby, participant list, presence, and countdown
- Live guesses with player names and colours; only the latest five remain visible temporarily
- Private feedback for correct and incorrect guesses
- Live scores for players and spectators
- Round transitions, reveal countdowns, solved and timeout states
- Paginated access to every generated image after the game, without exposing answers
- Final leaderboard, rating, replay, and fresh-image regeneration

### Piece Puzzle

An AI-generated image is divided into a configurable grid and shuffled. Players collaboratively swap tiles to reconstruct it before time expires.

- Generated-image preview in the waiting lobby
- Real-time participants, tile selections, player colours, and move activity
- Collaborative board updates over WebSockets
- Time-weighted scoring for correct moves and a live leaderboard
- Player and spectator views with synchronized timers
- Final standings for solved and timed-out games
- Circular timeout viewer for the completed image and the last unfinished board
- Rating, replay with the same image, and regeneration with a new image

---

## Platform features

- Anonymous guest play with generated names and colours
- Passwordless accounts using a username and six-digit login code
- Per-game participant credentials with one-hour session expiry
- Friends, friend requests, groups, and game invitations
- Live notification centre and actionable invitation toasts
- Browse catalog with game type, status, creator scope, sorting, ratings, and pagination
- Creator identity and colour on catalog cards
- Global and friends leaderboards with game and time-period filters
- Current-player highlighting and friend requests directly from leaderboards
- Responsive layouts and skeleton loading states
- Shared UI components for buttons, inputs, selects, cards, alerts, tables, leaderboards, and participant lists
- System light/dark preference on first visit, followed by persistent Light, Dark, or Forest selection
- License-free Web Audio cues for timers, game events, scores, notifications, ratings, invitations, and social actions

---

## Technology

- Angular 20 standalone components
- TypeScript 5.9 and RxJS 7
- Angular reactive forms and signals
- Tailwind CSS 4 and DaisyUI 5
- Lucide icons
- Generated Angular API clients for the backend services
- REST for commands and catalog/account data
- WebSockets for games, presence, and notifications
- Cloudflare Workers static-asset deployment

---

## Backend services

The frontend connects to separately deployed services for Accounts, Guess the Prompt, Piece Puzzle, Browse/catalog and ratings, Friends/groups/invitations, Leaderboards, and Notifications.

REST and WebSocket base URLs are configured in [`src/app/core/constants/base-urls.constants.ts`](src/app/core/constants/base-urls.constants.ts).

---

## Prerequisites

- Node.js 20 or later (the Cloudflare workflow uses Node.js 22)
- npm

---

## Local development

Install the locked dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200). The application reloads when source files change.

To continuously compile without starting the development server:

```bash
npm run watch
```

---

## Build and verification

Create a production build:

```bash
npm run build
```

The browser output is written to `dist/the-newest-era/browser`.

Run the unit test suite:

```bash
npm test
```

Run focused compiler checks:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx ngc -p tsconfig.app.json
```

---

## Application routes

| Route                         | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `/` or `/games`               | Create a Guess the Prompt or Piece Puzzle game   |
| `/games/guess-prompt/:gameId` | Play or spectate Guess the Prompt                |
| `/games/piece-puzzle/:gameId` | Play or spectate Piece Puzzle                    |
| `/browse`                     | Browse, filter, rate, replay, or spectate games  |
| `/friends`                    | Manage friends, requests, and groups             |
| `/leaderboard`                | View global or friends rankings                  |
| `/account`                    | Register, log in, view, or log out of an account |
