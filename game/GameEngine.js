/**
 * GameEngine — Core Hand Cricket game logic.
 * Handles runs, wickets, innings, and match state.
 */
class GameEngine {
  constructor(config = {}) {
    this.totalWickets = config.wickets || 1;
    this.isSuperOver = config.isSuperOver || false;

    // First Innings
    this.innings1 = this.createInningsState();
    // Second Innings
    this.innings2 = this.createInningsState();

    this.currentInnings = 1; // 1 or 2
    this.matchState = 'NOT_STARTED'; // NOT_STARTED, TOSS, FIRST_INNINGS, SECOND_INNINGS, COMPLETED
    this.tossWinner = null;
    this.battingFirst = null; // player/team id
    this.bowlingFirst = null;

    // Move buffers for simultaneous reveal
    this.pendingMoves = { batter: null, bowler: null };
    this.moveTimers = {};

    // History for AI pattern detection
    this.moveHistory = [];
  }

  createInningsState() {
    return {
      score: 0,
      wickets: 0,
      totalWickets: this.totalWickets,
      balls: 0,
      ballLog: [], // { batterMove, bowlerMove, runs, isWicket }
      isCompleted: false,
    };
  }

  /**
   * Get current innings state
   */
  getCurrentInnings() {
    return this.currentInnings === 1 ? this.innings1 : this.innings2;
  }

  /**
   * Convert a finger move to runs.
   * 1-5 = face value, 6 = thumb (special)
   */
  static fingerToRuns(move) {
    if (move === 6) return 6; // thumb = six
    if (move >= 1 && move <= 5) return move;
    throw new Error(`Invalid move: ${move}. Must be 1-6.`);
  }

  /**
   * Process a ball — both batter and bowler have submitted moves.
   * Returns { runs, isWicket, inningsOver, matchOver, result }
   */
  processBall(batterMove, bowlerMove) {
    const innings = this.getCurrentInnings();
    if (innings.isCompleted) {
      throw new Error('Innings already completed');
    }

    const batterRuns = GameEngine.fingerToRuns(batterMove);
    const bowlerRuns = GameEngine.fingerToRuns(bowlerMove);
    const isWicket = batterRuns === bowlerRuns;

    let runsScored = 0;
    if (!isWicket) {
      runsScored = batterRuns;
      innings.score += runsScored;
    }

    if (isWicket) {
      innings.wickets += 1;
    }

    innings.balls += 1;
    innings.ballLog.push({
      ball: innings.balls,
      batterMove,
      bowlerMove,
      runs: runsScored,
      isWicket,
    });

    // Store in history for AI
    this.moveHistory.push({ batterMove, bowlerMove, innings: this.currentInnings });

    // Check innings completion
    let inningsOver = false;
    let matchOver = false;
    let result = null;

    // Wickets fallen = all out
    if (innings.wickets >= innings.totalWickets) {
      innings.isCompleted = true;
      inningsOver = true;
    }

    // Second innings: check if target chased
    if (this.currentInnings === 2) {
      const target = this.innings1.score + 1;
      if (innings.score >= target) {
        innings.isCompleted = true;
        inningsOver = true;
        matchOver = true;
        result = { winner: 'chaser', margin: `${innings.totalWickets - innings.wickets} wickets` };
      } else if (innings.isCompleted) {
        // All out in second innings
        matchOver = true;
        if (innings.score === this.innings1.score) {
          result = { winner: 'tie', margin: 'Match Tied — Super Over!' };
        } else {
          result = { winner: 'first', margin: `${this.innings1.score - innings.score} runs` };
        }
      }
    }

    // If first innings over, transition to second
    if (inningsOver && this.currentInnings === 1) {
      this.currentInnings = 2;
      this.matchState = 'SECOND_INNINGS';
    }

    if (matchOver) {
      this.matchState = 'COMPLETED';
    }

    return {
      batterMove,
      bowlerMove,
      runs: runsScored,
      isWicket,
      inningsOver,
      matchOver,
      result,
      score: innings.score,
      wickets: innings.wickets,
      balls: innings.balls,
      target: this.currentInnings === 2 ? this.innings1.score + 1 : null,
    };
  }

  /**
   * Submit a move for a player. Returns reveal data when both have moved.
   */
  submitMove(role, move) {
    this.pendingMoves[role] = move;
    if (this.pendingMoves.batter !== null && this.pendingMoves.bowler !== null) {
      const result = this.processBall(this.pendingMoves.batter, this.pendingMoves.bowler);
      this.pendingMoves = { batter: null, bowler: null };
      return result;
    }
    return null; // waiting for other player
  }

  /**
   * Apply 5-second timeout penalty
   */
  applyTimeoutPenalty(role) {
    const innings = this.getCurrentInnings();
    if (role === 'bowler') {
      // 6 runs added to batting team
      innings.score += 6;
      return { penaltyType: 'bowler_timeout', runsAdded: 6, newScore: innings.score };
    } else {
      // 6 runs deducted from batting team
      innings.score = Math.max(0, innings.score - 6);
      return { penaltyType: 'batter_timeout', runsDeducted: 6, newScore: innings.score };
    }
  }

  /**
   * Get match summary
   */
  getMatchSummary() {
    return {
      innings1: { ...this.innings1 },
      innings2: { ...this.innings2 },
      currentInnings: this.currentInnings,
      matchState: this.matchState,
      target: this.currentInnings === 2 ? this.innings1.score + 1 : null,
    };
  }

  /**
   * Create a Super Over engine (1 wicket match)
   */
  static createSuperOver() {
    return new GameEngine({ wickets: 1, isSuperOver: true });
  }
}

export default GameEngine;
