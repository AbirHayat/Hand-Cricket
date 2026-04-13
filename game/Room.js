import GameEngine from './GameEngine.js';
import TossEngine from './TossEngine.js';

/**
 * Room — Manages a game room with players, teams, and match state.
 */
class Room {
  constructor(hostId, hostName, config = {}) {
    this.id = this.generateRoomId();
    this.hostId = hostId;
    this.players = new Map(); // socketId -> { id, name, team, isCaptain, isHost }
    this.teams = { A: [], B: [] };
    this.captains = { A: null, B: null };

    // Room config
    this.mode = config.mode || 'single'; // 'single', 'individual_tournament', 'team_tournament'
    this.maxPlayers = config.maxPlayers || 2;
    this.state = 'LOBBY'; // LOBBY, TOSS, PLAYING, RESULT

    // Game engines
    this.tossEngine = null;
    this.gameEngine = null;

    // Current match roles
    this.currentBatter = null;
    this.currentBowler = null;
    this.battingTeam = null;
    this.bowlingTeam = null;

    // Move timers
    this.moveTimers = {};
    this.MOVE_TIMEOUT = 5000; // 5 seconds

    // Add host
    this.addPlayer(hostId, hostName, true);
  }

  generateRoomId() {
    // Short 6-character room code
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  addPlayer(socketId, name, isHost = false) {
    this.players.set(socketId, {
      id: socketId,
      name,
      team: null,
      isCaptain: false,
      isHost,
      score: 0,
      wicketsTaken: 0,
    });
    return this.players.get(socketId);
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    // Remove from teams
    this.teams.A = this.teams.A.filter(id => id !== socketId);
    this.teams.B = this.teams.B.filter(id => id !== socketId);
  }

  getPlayerList() {
    return Array.from(this.players.values());
  }

  /**
   * Shuffle players into two teams randomly & equally
   */
  shuffleTeams() {
    const playerIds = Array.from(this.players.keys());
    // Fisher-Yates shuffle
    for (let i = playerIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
    }

    const mid = Math.ceil(playerIds.length / 2);
    this.teams.A = playerIds.slice(0, mid);
    this.teams.B = playerIds.slice(mid);

    // Update player team assignments
    this.teams.A.forEach(id => {
      const p = this.players.get(id);
      if (p) p.team = 'A';
    });
    this.teams.B.forEach(id => {
      const p = this.players.get(id);
      if (p) p.team = 'B';
    });

    return { teamA: this.teams.A, teamB: this.teams.B };
  }

  /**
   * Set captain for a team
   */
  setCaptain(teamId, playerId) {
    // Remove old captain
    if (this.captains[teamId]) {
      const old = this.players.get(this.captains[teamId]);
      if (old) old.isCaptain = false;
    }
    this.captains[teamId] = playerId;
    const p = this.players.get(playerId);
    if (p) p.isCaptain = true;
  }

  /**
   * Calculate wickets for each team (based on team size)
   */
  getTeamWickets() {
    const sizeA = this.teams.A.length;
    const sizeB = this.teams.B.length;

    if (this.mode === 'single') {
      return { A: 1, B: 1 };
    }

    // For team mode: wickets = team size
    // Smaller team gets extra wickets = difference
    const maxSize = Math.max(sizeA, sizeB);
    return {
      A: maxSize,
      B: maxSize,
      extraWicketsA: maxSize - sizeA,
      extraWicketsB: maxSize - sizeB,
    };
  }

  /**
   * Start the toss
   */
  startToss() {
    this.tossEngine = new TossEngine();
    this.state = 'TOSS';
    return true;
  }

  /**
   * Start the match after toss
   */
  startMatch(battingTeamId) {
    const wickets = this.getTeamWickets();
    const teamWickets = battingTeamId === 'A' ? wickets.A : wickets.B;

    this.gameEngine = new GameEngine({ wickets: teamWickets });
    this.gameEngine.matchState = 'FIRST_INNINGS';
    this.battingTeam = battingTeamId;
    this.bowlingTeam = battingTeamId === 'A' ? 'B' : 'A';

    // Set initial batter & bowler
    this.currentBatter = this.teams[this.battingTeam][0];
    this.currentBowler = this.teams[this.bowlingTeam][0];

    this.state = 'PLAYING';
    return this.gameEngine.getMatchSummary();
  }

  /**
   * Submit a move — returns result if both players have moved
   */
  submitMove(socketId, move) {
    if (!this.gameEngine) return null;

    const role = socketId === this.currentBatter ? 'batter' : 'bowler';
    return this.gameEngine.submitMove(role, move);
  }

  /**
   * Start move timeout for a player
   */
  startMoveTimer(socketId, onTimeout) {
    this.clearMoveTimer(socketId);
    this.moveTimers[socketId] = setTimeout(() => {
      const role = socketId === this.currentBatter ? 'batter' : 'bowler';
      const penalty = this.gameEngine.applyTimeoutPenalty(role);
      onTimeout(socketId, role, penalty);
    }, this.MOVE_TIMEOUT);
  }

  clearMoveTimer(socketId) {
    if (this.moveTimers[socketId]) {
      clearTimeout(this.moveTimers[socketId]);
      delete this.moveTimers[socketId];
    }
  }

  clearAllTimers() {
    Object.values(this.moveTimers).forEach(t => clearTimeout(t));
    this.moveTimers = {};
  }

  /**
   * Handle innings transition
   */
  switchInnings() {
    // Swap batting/bowling teams
    const temp = this.battingTeam;
    this.battingTeam = this.bowlingTeam;
    this.bowlingTeam = temp;

    // Reset batters & bowlers
    this.currentBatter = this.teams[this.battingTeam][0];
    this.currentBowler = this.teams[this.bowlingTeam][0];
  }

  /**
   * Get room state for clients
   */
  getState() {
    return {
      id: this.id,
      hostId: this.hostId,
      players: this.getPlayerList(),
      teams: this.teams,
      captains: this.captains,
      state: this.state,
      mode: this.mode,
      currentBatter: this.currentBatter,
      currentBowler: this.currentBowler,
      battingTeam: this.battingTeam,
      bowlingTeam: this.bowlingTeam,
      matchSummary: this.gameEngine ? this.gameEngine.getMatchSummary() : null,
    };
  }
}

export default Room;
