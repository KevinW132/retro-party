# Retro Party

A real-time 1v1 party-game platform: two players, one private room, a handful of retro-arcade minigames. Built as a small "console" — private rooms, live lobby, chat, server-authoritative scoring/turns/timers, and a pluggable game-module architecture so new minigames can be added without touching the core.

## Status

- **Fully playable end-to-end**: landing → create/join room → lobby (chat, ready-up) → game selection → per-game config → gameplay → per-game results → final result → downloadable summary card.
- **Four fully built minigames**: 🎨 Dibuja y Adivina (turn-based, live canvas sync), ⚡ Preguntas Rápidas (simultaneous, speed-scored), ✉️ Carta Secreta (simultaneous, non-competitive — both players write a letter and only see each other's once both finish), and 👗 Cambio de Look (each player uploads their own photo, gets the *other* player's photo to dress up with draggable emoji accessories + freehand drawing, and both reveal at once). These exercise all the core interaction patterns the engine supports.
- **Four scaffolded-but-playable minigames**: 🧩 Adivinanzas, 🎬 Adivina la Película, 🧠 Trivia, 🎵 Adivina la Canción. Each has a real server module, a real dataset, and a working (simpler) UI — nothing is a dead stub, they're just less visually polished than the flagship games.

## Features

- Real private rooms with a 6-character code + shareable link, exactly 2 players per room.
- Real-time sync via Socket.IO: lobby state, chat, gameplay, scores, timers, disconnect/reconnect.
- Server-authoritative Game Engine: the server owns turns, timers, scoring and correctness — the client only renders.
- Reconnection: a disconnected player gets a 60s grace period; the room shows a banner and resumes automatically if they come back.
- Downloadable end-of-match summary card, generated entirely client-side on a `<canvas>` — nothing is uploaded or stored.
- Retro arcade visual system (scanlines, CRT vignette, pixel borders, glow) built with Tailwind + Framer Motion, mobile-first.
- Generated (not sampled) sound effects via the Web Audio API — no bundled audio assets, no licensing questions.
- AI-backed trivia question generation with an automatic local-dataset fallback when no API key is configured.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS + Framer Motion + Lucide + Zustand |
| Backend | Node.js + Express + TypeScript + Socket.IO |
| Shared | A `shared` workspace with the types/interfaces/socket-event constants both sides import |
| Persistence | **None.** Rooms and games live entirely in server memory (see "Why no Supabase" below) |
| AI | OpenAI (optional) behind a provider-swappable `AIService` abstraction, local JSON fallback always available |

Everything runs on free tiers: frontend → Vercel/Netlify, backend → Render/Railway, and there's no database to provision at all.

## Architecture

```
GameRoom/
  shared/            # types, Room/Player/Game interfaces, socket event name constants, scoring constants
  server/
    src/rooms/       # Room + RoomManager (in-memory room lifecycle, disconnect grace, idle sweep)
    src/engine/      # GameEngine (per-room, per-game instance), TimerService, ScoreService, TurnManager
    src/games/       # one folder per game module, all implementing the same GameModule interface
    src/socket/      # Socket.IO connection + event handlers (room, chat, game, drawing relay)
    src/services/ai/ # AIService interface + OpenAIProvider + LocalProvider + QuestionGenerator
    src/data/        # local JSON datasets (movies, riddles, quickQuestions, trivia, songs, drawingWords)
  client/
    src/pages/       # one component per app screen (Landing, Lobby, GameSelection, GameActive, …)
    src/games/       # one folder per game, each exporting a screen component registered in games/registry.tsx
    src/state/       # Zustand stores (room/game state, sound preference)
    src/components/  # retro visual primitives + shared UI (ScoreBoard, GameTimer, ChatPanel, …)
```

**Socket ↔ REST split**: gameplay is 100% Socket.IO (`shared/src/constants/socketEvents.ts` is the single source of truth for event names). The only REST routes are `GET /health` (uptime/monitoring) and `GET /api/rooms/:code/exists` (a cheap existence check available for future use); nothing about actual gameplay goes over HTTP.

**The Game Engine never knows game-specific rules.** `GameEngine` (`server/src/engine/GameEngine.ts`) owns timers, scores, round/phase bookkeeping, and broadcasting. Each game only implements `start`, `onAction`, and optionally `onPlayerDisconnect` (`server/src/games/GameModule.ts`), and calls back into a small `EngineApi` (`emitState`, `startTimer`, `addScore`, `whisper`, `finish`). The server is the only thing that ever decides whether an answer was correct or how many points it's worth — the client only sends *intent* (`answer:submit`, `drawing:stroke`, …) and renders whatever the server broadcasts back.

**Secrets vs. broadcasts**: most state is broadcast to the whole room via `game:state`. When one player must not see something the other can (e.g. the word to draw), the engine uses `EngineApi.whisper(playerId, data)`, which sends a private `game:private` patch to just that player's socket — the secret never touches the other player's payload at all.

## Install

Requires Node 18+ (tested on Node 25) and npm 10+.

```bash
git clone <this repo>
cd GameRoom
npm install        # installs all three workspaces (shared, server, client)
```

## Environment variables

Two `.env` files, one per runnable workspace:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

`server/.env`:

```
SERVER_PORT=4000
CLIENT_ORIGIN=http://localhost:5173
OPENAI_API_KEY=            # optional — see "Configuring AI" below
```

`client/.env`:

```
VITE_SOCKET_URL=http://localhost:4000
```

## Running it

```bash
npm run dev           # runs server + client together (root script)
```

Or individually:

```bash
npm run dev -w server   # http://localhost:4000
npm run dev -w client   # http://localhost:5173
```

Open two browser windows/devices at the client URL to play as both players. Type-check everything with `npm run typecheck` (runs it in all three workspaces).

## Deploying (free tiers)

- **Client** → Vercel or Netlify. Build command `npm run build -w client` (or set the project root to `client/` and use its own `vite build`). Set `VITE_SOCKET_URL` to your deployed backend URL.
- **Server** → Render or Railway. Build command `npm run build -w server`, start command `npm run start -w server`. Set `CLIENT_ORIGIN` to your deployed frontend URL and (optionally) `OPENAI_API_KEY`.
- **Database** → none needed, see below.

### Why no Supabase / database

Rooms are intentionally ephemeral: they live in the server's memory for the duration of a match and are discarded (or swept after ~30 minutes idle) once the match ends — the spec explicitly asks not to persist finished games. Adding Postgres/Supabase would mean provisioning and paying for a stateful service to store data nobody wants kept. If you later want match history or accounts, the natural seam is `RoomManager`/`GameEngine` (`server/src/rooms`, `server/src/engine`) — persist a `GameResult` there instead of just pushing it into `room.gameHistory`.

### Configuring AI (Trivia)

Trivia questions go through `questionGenerator` (`server/src/services/ai/QuestionGenerator.ts`), which is just an `AIService`:

```ts
export interface AIService {
  generateTrivia(category, difficulty, count): Promise<GeneratedTriviaQuestion[]>;
  generateRiddles(difficulty, count): Promise<GeneratedRiddle[]>;
  generateDrawingWords(count): Promise<string[]>;
  generateMovieClues(title): Promise<GeneratedMovieClues | null>;
}
```

- If `OPENAI_API_KEY` is set, `OpenAIProvider` calls the OpenAI Chat Completions API for `generateTrivia` (model `gpt-4o-mini`, JSON-mode response). Any network/parse failure — or simply not setting the key — falls back to `LocalProvider`, which serves from `server/src/data/trivia.json`.
- The other three methods currently proxy straight to `LocalProvider` in both providers; wire real prompts for them the same way `generateTrivia` is wired if you want AI-generated riddles/drawing words/movie clues too.
- **The API key never reaches the browser.** The client never talks to OpenAI directly — it only ever emits `game:select` / `game:start` over the room's socket, and the server calls out to OpenAI on its behalf.
- To swap providers entirely (e.g. Anthropic), implement `AIService` in a new file next to `OpenAIProvider.ts` and change the one line in `QuestionGenerator.ts` that picks a provider.

## How to add a new game

The whole point of the module system is that this never touches `GameEngine`, the socket layer, or any other game. Using Riddles as the simplest real example to copy:

1. **Add a dataset** (if needed) in `server/src/data/yourGame.json`.
2. **Create `server/src/games/yourGame/index.ts`** exporting a `GameModule`:
   ```ts
   export const yourGame: GameModule<YourConfig> = {
     meta: { id: 'yourGame', name: '…', icon: '🕹️', description: '…', minPlayers: 2, maxPlayers: 2, turnBased: false, playable: true },
     defaultConfig: { /* … */ },
     start(api, config) { /* pick first round, api.emitState(...), api.startTimer(...) */ },
     onAction(api, playerId, action, payload) { /* validate + api.addScore(...) + api.emitState(...) */ },
   };
   ```
   Use `api.startTimer`/`api.clearTimer` for the authoritative round clock, `api.addScore` for all scoring (never trust a client-sent score), and `api.finish(stats)` when the game ends. If part of the state must stay hidden from one player, send it via `api.whisper(playerId, data)` instead of `api.emitState`.
3. **Register it** in `server/src/games/registry.ts` (add the import + one map entry). That's the entire server-side integration — `GameId` in `shared/src/types/game.ts` needs the new id added to the union too.
4. **Add a client screen** in `client/src/games/yourGame/YourGameScreen.tsx` that reads `useRoomStore(s => s.gameState)`, casts `.data` to whatever shape your module emits, and calls `socket.emit(EVENTS.ANSWER_SUBMIT, …)` (or a bespoke event, following the `drawing:*` pattern if you need something higher-frequency than full-state broadcasts).
5. **Register the screen** in `client/src/games/registry.tsx` (`gameScreens[yourGame.id] = YourGameScreen`).
6. Done — it now shows up automatically in `GameSelection` (server sends the catalog from the registry) and flows through `GameConfig` → `GameActive` → `GameResult` like every other game, no other file changes needed.

If your game is simultaneous-answer + speed-scored (like Quick Questions/Trivia/Riddles) or clue-reveal (like Movie/Music), you likely don't need to write the round-management logic from scratch — copy the closest existing module, or extend `createClueGuessGame` in `server/src/games/clueGameFactory.ts` the way `movie`/`music` do.

## Notes on scope

- ✉️ Carta Secreta (`server/src/games/letter`, `client/src/games/letter`) and 👗 Cambio de Look (`server/src/games/outfit`, `client/src/games/outfit`) are the two non-competitive modules: both follow the same write/edit-in-secret → reveal-once-both-are-done → confirm-to-continue shape, and neither ever calls `addScore`. `GameResult`/`FinalResult` still render them through the normal win/tie chrome — since no score is ever added, both players just tie 0–0, which is good enough without a bespoke result screen for two activities.
- Cambio de Look never persists or uploads a photo anywhere outside the room's Socket.IO connection: the client downsizes/compresses the picked photo to a JPEG data URL (`client/src/utils/imageCompress.ts`, capped ~720px) before it ever leaves the browser, the server only holds it in memory for the lifetime of that game (`server/src/games/outfit/index.ts`), and the accessory "stickers" are plain emoji (no bundled/licensed art) composited onto a `<canvas>` client-side, the same technique the downloadable summary card already uses.
- No automated test suite was requested; verification is functional (manual two-client playtesting, described above) plus `npm run typecheck` as a type-safety gate.
- Drawing/Movie use progressively-revealed hints and locally-authored clue text rather than any copyrighted images, per the "don't depend on an external API/licensed media" requirement. Music is the exception: it plays real 30s preview clips resolved at server startup from Apple's public iTunes Search API (`server/src/services/music/previewService.ts`, no key required) and rendered via a real `<audio>` element in `client/src/games/music/MusicScreen.tsx`; songs without a resolvable preview fall back to clue-only play.
