import { useState, useEffect } from 'react';

/**
 * Tournament Bracket Component
 * Displays a visual elimination bracket for tournaments.
 */
export default function TournamentBracket({ bracket, onBack }) {
  if (!bracket || !bracket.rounds) {
    return (
      <div className="screen tournament-screen">
        <button className="btn btn-secondary nav-back" onClick={onBack}>← Back</button>
        <h2 className="title-display title-lg">🏆 Tournament</h2>
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="subtitle">No tournament data available.</p>
        </div>
      </div>
    );
  }

  const { rounds, players, currentRound, status } = bracket;

  const getRoundName = (roundIndex, totalRounds) => {
    const fromEnd = totalRounds - roundIndex;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semis';
    if (fromEnd === 3) return 'Quarters';
    return `Round ${roundIndex + 1}`;
  };

  return (
    <div className="screen tournament-screen">
      <button className="btn btn-secondary nav-back" onClick={onBack}>← Back</button>

      <div className="tournament-header">
        <h2 className="title-display title-lg">🏆 Tournament Bracket</h2>
        <div className="tournament-status">
          <div className="tournament-stat">
            <div className="stat-value">{players?.length || 0}</div>
            <div className="stat-label">Players</div>
          </div>
          <div className="tournament-stat">
            <div className="stat-value">{currentRound + 1 || 1}</div>
            <div className="stat-label">Current Round</div>
          </div>
          <div className="tournament-stat">
            <div className="stat-value">{status || 'Ongoing'}</div>
            <div className="stat-label">Status</div>
          </div>
        </div>
      </div>

      <div className="bracket-container">
        <div className="bracket">
          {rounds.map((round, roundIdx) => (
            <div key={roundIdx} className="bracket-round">
              <div className="bracket-round-title">
                {getRoundName(roundIdx, rounds.length)}
              </div>
              {round.map((match, matchIdx) => {
                const isActive = roundIdx === currentRound && match.status === 'pending';
                const isCompleted = match.status === 'completed';
                return (
                  <div key={matchIdx}
                    className={`bracket-match ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div
                      className={`bracket-player 
                        ${isCompleted && match.winner === match.player1 ? 'winner' : ''} 
                        ${isCompleted && match.winner !== match.player1 ? 'loser' : ''}
                        ${match.player1 === 'BYE' ? 'bye' : ''}`}
                    >
                      <span>{match.player1 || 'TBD'}</span>
                      {isCompleted && match.score1 !== undefined && (
                        <span className="bracket-score">{match.score1}</span>
                      )}
                    </div>
                    <div
                      className={`bracket-player 
                        ${isCompleted && match.winner === match.player2 ? 'winner' : ''} 
                        ${isCompleted && match.winner !== match.player2 ? 'loser' : ''}
                        ${match.player2 === 'BYE' ? 'bye' : ''}`}
                    >
                      <span>{match.player2 || 'TBD'}</span>
                      {isCompleted && match.score2 !== undefined && (
                        <span className="bracket-score">{match.score2}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
