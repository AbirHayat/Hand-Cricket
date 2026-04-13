/**
 * AIPlayer — Computer opponent with three difficulty levels.
 * Easy: Random
 * Medium: Pattern detection
 * Hard: Probability + bluff
 */
class AIPlayer {
  constructor(difficulty = 'easy') {
    this.difficulty = difficulty;
    this.opponentHistory = [];
  }

  /**
   * Record opponent's move for pattern analysis
   */
  recordOpponentMove(move) {
    this.opponentHistory.push(move);
  }

  /**
   * Get AI's next move (1-6)
   */
  getMove(role = 'bowler') {
    switch (this.difficulty) {
      case 'easy':
        return this.easyMove();
      case 'medium':
        return this.mediumMove(role);
      case 'hard':
        return this.hardMove(role);
      default:
        return this.easyMove();
    }
  }

  /**
   * Easy: Purely random
   */
  easyMove() {
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * Medium: Pattern detection — avoid repeating opponent's last few moves
   */
  mediumMove(role) {
    if (this.opponentHistory.length < 3) {
      return this.easyMove();
    }

    // Count recent move frequencies (last 5 moves)
    const recent = this.opponentHistory.slice(-5);
    const freq = {};
    recent.forEach(m => { freq[m] = (freq[m] || 0) + 1; });

    // Find the most frequent move
    const mostFrequent = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])[0][0];

    if (role === 'bowler') {
      // As bowler, try to match batter's most likely move (to get wicket)
      // Add some randomness — 60% target their pattern, 40% random
      return Math.random() < 0.6 ? parseInt(mostFrequent) : this.easyMove();
    } else {
      // As batter, avoid bowler's most likely move (avoid wicket)
      let move;
      do {
        move = this.easyMove();
      } while (move === parseInt(mostFrequent) && Math.random() < 0.6);
      return move;
    }
  }

  /**
   * Hard: Probability model + deliberate bluffing
   */
  hardMove(role) {
    if (this.opponentHistory.length < 2) {
      return this.easyMove();
    }

    // Build probability distribution from all history
    const freq = {};
    for (let i = 1; i <= 6; i++) freq[i] = 0;
    this.opponentHistory.forEach(m => { freq[m] += 1; });
    const total = this.opponentHistory.length;

    // Convert to probabilities
    const probs = {};
    for (let i = 1; i <= 6; i++) {
      probs[i] = freq[i] / total;
    }

    if (role === 'bowler') {
      // As bowler: pick the opponent's most probable move (try for wicket)
      // But occasionally bluff with a random move (30% chance)
      if (Math.random() < 0.3) {
        return this.easyMove();
      }

      // Weighted selection toward opponent's likely moves
      const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]);
      // Pick from top 2 most likely
      const topMoves = sorted.slice(0, 2).map(e => parseInt(e[0]));
      return topMoves[Math.floor(Math.random() * topMoves.length)];
    } else {
      // As batter: pick moves the opponent LEAST expects
      // Avoid opponent's most predicted moves, go for high-value moves
      const sorted = Object.entries(probs).sort((a, b) => a[1] - b[1]);
      const leastExpected = sorted.slice(0, 3).map(e => parseInt(e[0]));

      // Prefer higher-value moves among the least expected
      leastExpected.sort((a, b) => b - a);
      return leastExpected[0];
    }
  }

  /**
   * Get AI's toss move (random for all difficulties)
   */
  getTossMove() {
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * AI decides whether to bat or bowl after winning toss
   */
  chooseBatOrBowl() {
    // Hard AI prefers to bowl first (chase), others random
    if (this.difficulty === 'hard') {
      return Math.random() < 0.7 ? 'bowl' : 'bat';
    }
    return Math.random() < 0.5 ? 'bat' : 'bowl';
  }
}

export default AIPlayer;
