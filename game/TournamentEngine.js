/**
 * TournamentEngine — Manages brackets, round-robin, semis & finals.
 */
class TournamentEngine {
  constructor(config = {}) {
    this.type = config.type || 'individual'; // 'individual' or 'team'
    this.participants = []; // players or teams
    this.bracket = [];
    this.currentRound = 0;
    this.results = [];
    this.state = 'SETUP'; // SETUP, IN_PROGRESS, COMPLETED
  }

  /**
   * Add participant (player for individual, team object for team tournament)
   */
  addParticipant(participant) {
    this.participants.push({
      id: participant.id || participant,
      name: participant.name || participant,
      wins: 0,
      losses: 0,
      runRate: 0,
      totalRuns: 0,
      totalBalls: 0,
    });
  }

  /**
   * Generate bracket from participants.
   * Pads to nearest power of 2 with byes.
   */
  generateBracket() {
    const n = this.participants.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));

    // Shuffle participants
    const shuffled = [...this.participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Pad with BYEs
    while (shuffled.length < bracketSize) {
      shuffled.push({ id: 'BYE', name: 'BYE', isBye: true });
    }

    // Create first round matches
    const firstRound = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      firstRound.push({
        id: `R1_M${firstRound.length + 1}`,
        round: 1,
        player1: shuffled[i],
        player2: shuffled[i + 1],
        winner: null,
        score1: null,
        score2: null,
        state: 'PENDING',
      });
    }

    // Auto-advance BYE matches
    firstRound.forEach(match => {
      if (match.player1.isBye) {
        match.winner = match.player2;
        match.state = 'BYE';
      } else if (match.player2.isBye) {
        match.winner = match.player1;
        match.state = 'BYE';
      }
    });

    this.bracket = [firstRound];
    this.generateNextRounds(firstRound.length / 2);
    this.state = 'IN_PROGRESS';
    return this.bracket;
  }

  /**
   * Pre-generate empty rounds up to the final
   */
  generateNextRounds(matchCount) {
    let round = 2;
    let count = matchCount;
    while (count >= 1) {
      const roundMatches = [];
      for (let i = 0; i < count; i++) {
        const roundName = count === 1 ? 'Final' : count === 2 ? 'Semi-Final' : `Round ${round}`;
        roundMatches.push({
          id: `R${round}_M${i + 1}`,
          round,
          roundName,
          player1: null,
          player2: null,
          winner: null,
          score1: null,
          score2: null,
          state: 'WAITING', // Waiting for previous round
        });
      }
      this.bracket.push(roundMatches);
      round++;
      count = Math.floor(count / 2);
    }
  }

  /**
   * Record a match result and advance the winner
   */
  recordResult(matchId, winnerId, score1, score2) {
    for (let r = 0; r < this.bracket.length; r++) {
      const match = this.bracket[r].find(m => m.id === matchId);
      if (match) {
        match.score1 = score1;
        match.score2 = score2;
        match.winner = match.player1.id === winnerId ? match.player1 : match.player2;
        match.state = 'COMPLETED';

        // Update participant stats
        const winner = this.participants.find(p => p.id === winnerId);
        if (winner) winner.wins += 1;
        const loserId = match.player1.id === winnerId ? match.player2.id : match.player1.id;
        const loser = this.participants.find(p => p.id === loserId);
        if (loser) loser.losses += 1;

        // Advance winner to next round
        this.advanceWinner(r, match);

        // Check if tournament is complete
        const lastRound = this.bracket[this.bracket.length - 1];
        if (lastRound[0].winner) {
          this.state = 'COMPLETED';
        }

        return match;
      }
    }
    return null;
  }

  /**
   * Advance winner to the next round
   */
  advanceWinner(roundIndex, match) {
    if (roundIndex + 1 >= this.bracket.length) return;

    const nextRound = this.bracket[roundIndex + 1];
    const matchIndex = this.bracket[roundIndex].indexOf(match);
    const nextMatchIndex = Math.floor(matchIndex / 2);

    if (nextMatchIndex < nextRound.length) {
      const nextMatch = nextRound[nextMatchIndex];
      if (matchIndex % 2 === 0) {
        nextMatch.player1 = match.winner;
      } else {
        nextMatch.player2 = match.winner;
      }

      // If both players are set, mark as PENDING
      if (nextMatch.player1 && nextMatch.player2) {
        nextMatch.state = 'PENDING';

        // Auto-advance BYE matches
        if (nextMatch.player1.isBye) {
          nextMatch.winner = nextMatch.player2;
          nextMatch.state = 'BYE';
          this.advanceWinner(roundIndex + 1, nextMatch);
        } else if (nextMatch.player2.isBye) {
          nextMatch.winner = nextMatch.player1;
          nextMatch.state = 'BYE';
          this.advanceWinner(roundIndex + 1, nextMatch);
        }
      }
    }
  }

  /**
   * Get next match to be played
   */
  getNextMatch() {
    for (const round of this.bracket) {
      for (const match of round) {
        if (match.state === 'PENDING') return match;
      }
    }
    return null;
  }

  /**
   * Get tournament standings
   */
  getStandings() {
    return [...this.participants]
      .filter(p => !p.isBye)
      .sort((a, b) => b.wins - a.wins || b.totalRuns - a.totalRuns);
  }

  /**
   * Get full bracket state
   */
  getBracketState() {
    return {
      type: this.type,
      state: this.state,
      bracket: this.bracket,
      currentRound: this.currentRound,
      standings: this.getStandings(),
    };
  }
}

export default TournamentEngine;
