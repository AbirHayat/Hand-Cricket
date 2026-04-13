import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

import Room from './game/Room.js';
import GameEngine from './game/GameEngine.js';
import TossEngine from './game/TossEngine.js';
import AIPlayer from './game/AIPlayer.js';
import TournamentEngine from './game/TournamentEngine.js';
import * as db from './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// API routes
app.get('/api/leaderboard', (req, res) => {
  res.json(db.getLeaderboard());
});

// ---- State ----
const rooms = new Map();
const playerRooms = new Map();
const aiGames = new Map();

// ---- Socket.IO Event Handlers ----
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // ============ SINGLE PLAYER (vs AI) ============

  socket.on('start-ai-game', ({ playerName, difficulty, wickets }) => {
    const ai = new AIPlayer(difficulty || 'easy');
    const engine = new GameEngine({ wickets: wickets || 1 });
    const toss = new TossEngine();

    aiGames.set(socket.id, {
      engine,
      ai,
      toss,
      state: 'TOSS_CALL',
      playerName: playerName || 'Player',
      difficulty: difficulty || 'easy',
      playerRole: null,
      wickets: wickets || 1,
    });

    socket.emit('ai-game-started', { state: 'TOSS_CALL' });
  });

  socket.on('ai-toss-call', ({ call }) => {
    const game = aiGames.get(socket.id);
    if (!game || game.state !== 'TOSS_CALL') return;

    game.toss.setCall(socket.id, call);
    game.state = 'TOSS_MOVE';
    socket.emit('ai-toss-call-set', { call });
  });

  socket.on('ai-toss-move', ({ move }) => {
    const game = aiGames.get(socket.id);
    if (!game || game.state !== 'TOSS_MOVE') return;

    const aiMove = game.ai.getTossMove();
    game.toss.submitMove(1, move);
    const result = game.toss.submitMove(2, aiMove);

    if (result) {
      const playerWon = result.winner === 'caller';
      game.tossResult = {
        ...result,
        playerWon,
        playerMove: move,
        aiMove,
      };
      game.state = playerWon ? 'CHOOSE_BAT_BOWL' : 'AI_CHOOSING';

      socket.emit('ai-toss-result', game.tossResult);

      if (!playerWon) {
        const aiChoice = game.ai.chooseBatOrBowl();
        game.playerRole = aiChoice === 'bat' ? 'bowler' : 'batter';
        game.state = 'FIRST_INNINGS';
        game.engine.matchState = 'FIRST_INNINGS';
        setTimeout(() => {
          socket.emit('ai-bat-bowl-chosen', {
            aiChoice,
            playerRole: game.playerRole,
          });
        }, 1500);
      }
    }
  });

  socket.on('ai-choose-bat-bowl', ({ choice }) => {
    const game = aiGames.get(socket.id);
    if (!game || game.state !== 'CHOOSE_BAT_BOWL') return;

    game.playerRole = choice;
    game.state = 'FIRST_INNINGS';
    game.engine.matchState = 'FIRST_INNINGS';

    socket.emit('ai-innings-start', {
      playerRole: game.playerRole === 'bat' ? 'batter' : 'bowler',
      innings: 1,
    });
  });

  socket.on('ai-play-move', ({ move }) => {
    const game = aiGames.get(socket.id);
    if (!game || (game.state !== 'FIRST_INNINGS' && game.state !== 'SECOND_INNINGS')) return;

    const currentInnings = game.engine.currentInnings;
    let playerIsBatter;

    if (currentInnings === 1) {
      playerIsBatter = game.playerRole === 'bat';
    } else {
      playerIsBatter = game.playerRole !== 'bat';
    }

    const role = playerIsBatter ? 'batter' : 'bowler';
    const aiRole = playerIsBatter ? 'bowler' : 'batter';

    game.ai.recordOpponentMove(move);
    const aiMove = game.ai.getMove(aiRole);

    const batterMove = playerIsBatter ? move : aiMove;
    const bowlerMove = playerIsBatter ? aiMove : move;

    const result = game.engine.processBall(batterMove, bowlerMove);

    socket.emit('ai-move-reveal', {
      playerMove: move,
      aiMove,
      playerRole: role,
      result,
      matchSummary: game.engine.getMatchSummary(),
    });

    if (result.inningsOver && !result.matchOver) {
      game.state = 'SECOND_INNINGS';
      game.engine.matchState = 'SECOND_INNINGS';

      setTimeout(() => {
        const newPlayerRole = playerIsBatter ? 'bowler' : 'batter';
        socket.emit('ai-innings-transition', {
          innings: 2,
          target: game.engine.innings1.score + 1,
          playerRole: newPlayerRole,
          firstInningsScore: game.engine.innings1.score,
        });
      }, 2000);
    }

    if (result.matchOver) {
      if (result.result.winner === 'tie') {
        // Super Over — create a new 1-wicket game engine
        game.state = 'SUPER_OVER';
        game.superOverEngine = GameEngine.createSuperOver();
        game.superOverEngine.matchState = 'FIRST_INNINGS';
        // Roles stay the same: original batter bats first in super over

        setTimeout(() => {
          socket.emit('ai-super-over', {
            message: 'Match Tied! Super Over!',
            innings1: game.engine.innings1,
            innings2: game.engine.innings2,
            playerRole: game.playerRole === 'bat' ? 'batter' : 'bowler',
          });
        }, 2000);
        return;
      }

      game.state = 'COMPLETED';

      let playerWon = false;
      if (result.result.winner === 'chaser') {
        playerWon = game.playerRole !== 'bat';
      } else if (result.result.winner === 'first') {
        playerWon = game.playerRole === 'bat';
      }

      const pScore = game.playerRole === 'bat' ? game.engine.innings1.score : game.engine.innings2.score;
      db.updateLeaderboard(game.playerName, playerWon === true, pScore);
      const aiDiff = game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1);
      db.updateLeaderboard(`AI (${aiDiff})`, playerWon === false,
        game.playerRole === 'bat' ? game.engine.innings2.score : game.engine.innings1.score);

      setTimeout(() => {
        socket.emit('ai-match-result', {
          result: result.result,
          playerWon,
          innings1: game.engine.innings1,
          innings2: game.engine.innings2,
          playerBattedFirst: game.playerRole === 'bat',
          playerName: game.playerName,
        });
      }, 2000);
    }
  });

  // Super Over moves
  socket.on('ai-super-over-move', ({ move }) => {
    const game = aiGames.get(socket.id);
    if (!game || game.state !== 'SUPER_OVER' || !game.superOverEngine) return;

    const soEngine = game.superOverEngine;
    const currentInnings = soEngine.currentInnings;
    let playerIsBatter = currentInnings === 1
      ? game.playerRole === 'bat'
      : game.playerRole !== 'bat';

    const aiRole = playerIsBatter ? 'bowler' : 'batter';
    game.ai.recordOpponentMove(move);
    const aiMove = game.ai.getMove(aiRole);

    const batterMove = playerIsBatter ? move : aiMove;
    const bowlerMove = playerIsBatter ? aiMove : move;

    const result = soEngine.processBall(batterMove, bowlerMove);

    socket.emit('ai-move-reveal', {
      playerMove: move,
      aiMove,
      playerRole: playerIsBatter ? 'batter' : 'bowler',
      result,
      matchSummary: soEngine.getMatchSummary(),
      isSuperOver: true,
    });

    if (result.inningsOver && !result.matchOver) {
      soEngine.matchState = 'SECOND_INNINGS';
      setTimeout(() => {
        socket.emit('ai-innings-transition', {
          innings: 2,
          target: soEngine.innings1.score + 1,
          playerRole: playerIsBatter ? 'bowler' : 'batter',
          firstInningsScore: soEngine.innings1.score,
          isSuperOver: true,
        });
      }, 2000);
    }

    if (result.matchOver) {
      game.state = 'COMPLETED';

      let playerWon;
      if (result.result.winner === 'tie') {
        // Even super over tied — random coin flip
        playerWon = Math.random() > 0.5;
        result.result.margin = 'Super Over tied — decided by lot!';
      } else if (result.result.winner === 'chaser') {
        playerWon = game.playerRole !== 'bat';
      } else {
        playerWon = game.playerRole === 'bat';
      }

      const pScore = game.playerRole === 'bat' ? soEngine.innings1.score : soEngine.innings2.score;
      db.updateLeaderboard(game.playerName, playerWon === true, pScore);
      const aiDiff = game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1);
      db.updateLeaderboard(`AI (${aiDiff})`, playerWon === false,
        game.playerRole === 'bat' ? soEngine.innings2.score : soEngine.innings1.score);

      setTimeout(() => {
        socket.emit('ai-match-result', {
          result: result.result,
          playerWon,
          innings1: soEngine.innings1,
          innings2: soEngine.innings2,
          playerBattedFirst: game.playerRole === 'bat',
          playerName: game.playerName,
          isSuperOver: true,
        });
      }, 2000);
    }
  });

  // ============ MULTIPLAYER ROOMS ============

  socket.on('create-room', ({ playerName, mode, maxPlayers }) => {
    const room = new Room(socket.id, playerName, { mode, maxPlayers });
    rooms.set(room.id, room);
    playerRooms.set(socket.id, room.id);
    socket.join(room.id);
    socket.emit('room-created', { roomId: room.id, room: room.getState() });
  });

  socket.on('join-room', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    if (room.state !== 'LOBBY') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    room.addPlayer(socket.id, playerName);
    playerRooms.set(socket.id, roomId);
    socket.join(roomId);
    io.to(roomId).emit('room-updated', room.getState());
  });

  socket.on('shuffle-teams', () => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || room.hostId !== socket.id) return;
    room.shuffleTeams();
    io.to(roomId).emit('room-updated', room.getState());
  });

  socket.on('set-captain', ({ team, playerId }) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || room.hostId !== socket.id) return;
    room.setCaptain(team, playerId);
    io.to(roomId).emit('room-updated', room.getState());
  });

  socket.on('start-match', () => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || room.hostId !== socket.id) return;
    room.startToss();
    io.to(roomId).emit('toss-started', room.getState());
  });

  socket.on('toss-call', ({ call }) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || !room.tossEngine) return;
    room.tossEngine.setCall(socket.id, call);
    io.to(roomId).emit('toss-call-set', { calledBy: socket.id, call });
  });

  socket.on('toss-move', ({ move }) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || !room.tossEngine) return;
    const isTeamA = room.teams.A.includes(socket.id);
    const playerIndex = isTeamA ? 1 : 2;
    const result = room.tossEngine.submitMove(playerIndex, move);
    if (result) {
      io.to(roomId).emit('toss-result', { ...result, callerTeam: isTeamA ? 'A' : 'B' });
    }
  });

  socket.on('choose-bat-bowl', ({ choice }) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    const battingTeam = choice === 'bat'
      ? (room.teams.A.includes(socket.id) ? 'A' : 'B')
      : (room.teams.A.includes(socket.id) ? 'B' : 'A');
    room.startMatch(battingTeam);
    io.to(roomId).emit('match-started', room.getState());
  });

  socket.on('game-move', ({ move }) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || !room.gameEngine) return;

    room.clearMoveTimer(socket.id);
    const result = room.submitMove(socket.id, move);

    if (result) {
      room.clearAllTimers();
      io.to(roomId).emit('move-reveal', { result, room: room.getState() });

      if (result.inningsOver && !result.matchOver) {
        room.switchInnings();
        const wickets = room.getTeamWickets();
        const newBattingWickets = room.battingTeam === 'A' ? wickets.A : wickets.B;
        room.gameEngine.innings2.totalWickets = newBattingWickets;
        setTimeout(() => {
          io.to(roomId).emit('innings-transition', { target: room.gameEngine.innings1.score + 1, room: room.getState() });
          // Start move timers after giving players time to see the transition (4s client-side + 2s buffer)
          setTimeout(() => {
            if (room.state !== 'RESULT') {
              const batter = room.currentBatter;
              const bowler = room.currentBowler;
              room.startMoveTimer(batter, (id, role, penalty) => {
                io.to(roomId).emit('timeout-penalty', { playerId: id, role, penalty, room: room.getState() });
              });
              room.startMoveTimer(bowler, (id, role, penalty) => {
                io.to(roomId).emit('timeout-penalty', { playerId: id, role, penalty, room: room.getState() });
              });
            }
          }, 6000);
        }, 2000);
      }

      if (result.matchOver) {
        room.state = 'RESULT';
        if (result.result.winner === 'tie') {
          setTimeout(() => {
            io.to(roomId).emit('match-tied', { message: 'Match Tied! Super Over!', room: room.getState() });
          }, 2000);
        } else {
          setTimeout(() => {
            io.to(roomId).emit('match-result', { result: result.result, room: room.getState() });
          }, 2000);
        }
      } else if (!result.inningsOver) {
        // Only start timers if game is actively continuing (not during innings break)
        const batter = room.currentBatter;
        const bowler = room.currentBowler;
        room.startMoveTimer(batter, (id, role, penalty) => {
          io.to(roomId).emit('timeout-penalty', { playerId: id, role, penalty, room: room.getState() });
        });
        room.startMoveTimer(bowler, (id, role, penalty) => {
          io.to(roomId).emit('timeout-penalty', { playerId: id, role, penalty, room: room.getState() });
        });
      }
    } else {
      socket.emit('move-registered', { waiting: true });
    }
  });

  // ============ DISCONNECTION ============
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    aiGames.delete(socket.id);

    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.removePlayer(socket.id);
        room.clearAllTimers();
        if (room.players.size === 0) {
          rooms.delete(roomId);
        } else {
          if (socket.id === room.hostId) {
            const newHost = room.players.keys().next().value;
            room.hostId = newHost;
            room.players.get(newHost).isHost = true;
          }
          io.to(roomId).emit('room-updated', room.getState());
          io.to(roomId).emit('player-disconnected', { playerId: socket.id });
        }
      }
      playerRooms.delete(socket.id);
    }
  });
});

// Serve static files in production
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA routing
app.use((req, res, next) => {
  // Don't intercept API routes or socket.io
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ---- Start Server ----
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🏏 Hand Cricket server running on http://localhost:${PORT}`);
});
