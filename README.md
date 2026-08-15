# AI Games Web

AI Games Web is the Angular frontend for a collection of AI-powered, real-time games. Players can create games from a theme, invite others with a shared link, play anonymously, and compete for leaderboard scores.

## Games and features

### Guess the Prompt

The platform generates AI images around an optional theme. Players have a limited amount of time to guess the prompt behind each image and earn points for correct answers. The backend configures the number of rounds and generated images.

### Piece Puzzle

The platform generates an AI image and scrambles it into a configurable grid. Players swap tiles to reconstruct the image before time runs out. Multiple players can join the same board and see moves in real time.

The application also includes:

- A game browser with filtering, sorting, ratings, and pagination
- Global leaderboards
- Optional passwordless accounts using a username and six-digit login code
- Anonymous play
- Friends and game invitations
- Light and dark themes
- Real-time game state, player presence, timers, and results over WebSockets

## Technology

- Angular 20 with standalone components
- TypeScript and RxJS
- Tailwind CSS 4 and DaisyUI
- REST APIs for accounts, games, browsing, friends, and leaderboards
- WebSockets for live Guess the Prompt and Piece Puzzle sessions

## Prerequisites

Install the following before running the project:

- Node.js 20 or later
- npm

## Install dependencies

From the repository root, run:

```bash
npm ci
```

Use `npm install` instead if you intentionally need to update the lock file.

## Run locally

Start the Angular development server:

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200). The development server reloads the application when source files change.

To continuously compile without running the Angular development server:

```bash
npm run watch
```

## Build

Create a production build:

```bash
npm run build
```

The compiled browser application is written to `dist/the-newest-era/browser`.

## Test

Run the unit test suite with Karma:

```bash
npm test
```

## Docker

Build the production image:

```bash
docker build -t ai-games-web .
```

Run the container and expose the Nginx server at [http://localhost:8080](http://localhost:8080):

```bash
docker run --rm -p 8080:8080 ai-games-web
```

## Backend services

The frontend connects to separately deployed services for:

- Accounts
- Guess the Prompt
- Piece Puzzle
- Browse
- Friends
- Leaderboards

Their REST and WebSocket endpoints are configured in `src/app/core/constants/base-urls.constants.ts`. Update that file when targeting a different backend environment.

## Application routes

| Route                         | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `/` or `/games`               | Create a new game                      |
| `/games/guess-prompt/:gameId` | Play Guess the Prompt                  |
| `/games/piece-puzzle/:gameId` | Play Piece Puzzle                      |
| `/browse`                     | Browse generated games                 |
| `/leaderboard`                | View rankings                          |
| `/account`                    | Register, log in, or manage an account |
| `/dashboard`                  | View the dashboard leaderboard         |

## Useful Angular commands

Generate a standalone component:

```bash
npx ng generate component component-name --standalone --skip-tests
```

View the available Angular schematics and command options:

```bash
npx ng generate --help
```
