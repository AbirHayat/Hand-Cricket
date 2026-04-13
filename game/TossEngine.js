/**
 * TossEngine — Handles the coin toss using finger counts.
 * Both players show fingers → sum → odd = Heads, even = Tails.
 */
class TossEngine {
  constructor() {
    this.player1Move = null;
    this.player2Move = null;
    this.player1Call = null; // 'heads' or 'tails'
    this.state = 'WAITING_CALL'; // WAITING_CALL, WAITING_MOVES, RESOLVED
    this.result = null;
  }

  /**
   * Player calls heads or tails
   */
  setCall(playerId, call) {
    if (call !== 'heads' && call !== 'tails') {
      throw new Error('Call must be "heads" or "tails"');
    }
    this.player1Call = call;
    this.callingPlayer = playerId;
    this.state = 'WAITING_MOVES';
  }

  /**
   * Submit a toss move (finger count 1-6)
   */
  submitMove(playerIndex, move) {
    if (move < 1 || move > 6) throw new Error('Move must be 1-6');

    if (playerIndex === 1) {
      this.player1Move = move;
    } else {
      this.player2Move = move;
    }

    // Check if both have played
    if (this.player1Move !== null && this.player2Move !== null) {
      return this.resolve();
    }
    return null;
  }

  /**
   * Resolve the toss
   */
  resolve() {
    const sum = this.player1Move + this.player2Move;
    const outcome = sum % 2 === 0 ? 'tails' : 'heads';
    const callerWins = outcome === this.player1Call;

    this.result = {
      player1Move: this.player1Move,
      player2Move: this.player2Move,
      sum,
      outcome, // 'heads' or 'tails'
      calledBy: this.callingPlayer,
      call: this.player1Call,
      winner: callerWins ? 'caller' : 'opponent',
    };

    this.state = 'RESOLVED';
    return this.result;
  }

  /**
   * Reset for a new toss
   */
  reset() {
    this.player1Move = null;
    this.player2Move = null;
    this.player1Call = null;
    this.state = 'WAITING_CALL';
    this.result = null;
  }
}

export default TossEngine;
