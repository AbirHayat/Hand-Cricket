# 🏏 Hand Cricket — Online

> The classic schoolyard finger cricket game — now a real-time multiplayer web app!

## How It Works

Hand Cricket is played between 2 players using fingers (like Rock-Paper-Scissors):

| Fingers | Runs | Special |
|---------|------|---------|
| 1 finger | 1 run | |
| 2 fingers | 2 runs | |
| 3 fingers | 3 runs | |
| 4 fingers | 4 runs | |
| 5 fingers | 5 runs | |
| Thumb (👍) | **6 runs** | SIX! |
| **Same number** | **WICKET!** | Batter is OUT |

### Toss
Both players show fingers simultaneously. Sum of fingers:
- **Odd** → Heads
- **Even** → Tails

Winner chooses to **Bat** or **Bowl** first.

### Match Flow
1. **1st Innings**: Batter scores runs, bowler tries to match (wicket!)
2. **Innings Break**: Target = 1st innings score + 1
3. **2nd Innings**: Roles swap, chaser tries to beat the target
4. **Tie?** → **Super Over!** (1-wicket decider)

## Features

- 🤖 **Single Player vs AI** — Easy, Medium, Hard difficulty
- 🌐 **Multiplayer Rooms** — Create/join with room codes
- ⚡ **Super Over** — 1-wicket tiebreaker when scores are tied
- 🏆 **Leaderboard** — Persistent stats with SQLite
- 👑 **Captain Controls** — Assign captains, shuffle teams
- 🏟️ **Tournament Brackets** — Elimination-style tournaments
- 🎨 **Dark Gaming UI** — Glassmorphism, hand gesture graphics, animations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8 |
| Backend | Node.js, Express 5, Socket.IO 4 |
| Database | SQLite (better-sqlite3) |
| Styling | Vanilla CSS (Outfit + Orbitron fonts) |

## Quick Start

```bash
# Install dependencies
npm install

# Start both frontend + backend
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## Project Structure

```
Hand Cricket/
├── server.js               # Express + Socket.IO server
├── game/
│   ├── GameEngine.js       # Core batting/bowling/wicket logic
│   ├── TossEngine.js       # Finger-sum toss system
│   ├── AIPlayer.js         # 3-tier AI (random, pattern, probability)
│   ├── Room.js             # Multiplayer room management
│   └── TournamentEngine.js # Bracket tournament system
├── db/
│   └── database.js         # SQLite schema & queries
├── src/
│   ├── App.jsx             # Main SPA (Home, Setup, Toss, Game, Result)
│   ├── MultiplayerGame.jsx # Full multiplayer flow component
│   ├── TournamentBracket.jsx # Bracket visualization
│   ├── socket.js           # Socket.IO client
│   ├── hands.js            # Hand gesture asset mapper
│   └── index.css           # Design system (dark theme + glassmorphism)
├── public/assets/hands/    # Hand gesture images (AI-generated)
└── data/handcricket.db     # SQLite database (auto-created)
```

## AI Difficulty Levels

| Level | Strategy |
|-------|----------|
| **Easy** | Random finger selection |
| **Medium** | Avoids repeating recent moves, pattern detection |
| **Hard** | Probability model + strategic bluffing |

## Scripts

```bash
npm run dev          # Start frontend + backend concurrently
npm run dev:client   # Vite dev server only
npm run dev:server   # Express server only
npm run build        # Production build
```
