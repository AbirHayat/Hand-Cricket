import { useState, useEffect, useCallback, useRef } from 'react';
import socket from './socket';
import { getHandDisplay, HAND_EMOJIS, FINGER_LABELS } from './hands';
import MultiplayerGame from './MultiplayerGame';
import './index.css';

// ===== HAND DISPLAY COMPONENT =====
function HandImage({ value, className = '' }) {
  const display = getHandDisplay(value);
  if (display.type === 'image') {
    return (
      <div className={`hand-display ${className}`}>
        <img src={display.src} alt={`Hand showing ${value}`} />
      </div>
    );
  }
  return (
    <div className={`hand-display ${className}`}>
      <span className="hand-emoji">{display.emoji}</span>
    </div>
  );
}

// ===== FINGER SELECTOR =====
function FingerSelector({ onSelect, disabled, label }) {
  return (
    <div className="finger-controls">
      <h3>🏏 {label || 'Choose your move'}</h3>
      <div className="finger-grid">
        {[1, 2, 3, 4, 5, 6].map(val => (
          <button
            key={val}
            className={`finger-btn ${val === 6 ? 'six-btn' : ''}`}
            onClick={() => onSelect(val)}
            disabled={disabled}
          >
            <span>{HAND_EMOJIS[val]}</span>
            <span className="finger-value">{val === 6 ? 'SIX' : val}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== BALL LOG =====
function BallLog({ balls }) {
  if (!balls || balls.length === 0) return null;
  return (
    <div className="ball-log">
      <h4>This Innings</h4>
      <div className="ball-log-items">
        {balls.map((b, i) => (
          <span
            key={i}
            className={`ball-chip ${b.isWicket ? 'wicket' : b.runs === 6 ? 'six' : 'run'}`}
          >
            {b.isWicket ? 'W' : b.runs}
          </span>
        ))}
      </div>
    </div>
  );
}

// ===== HOME SCREEN =====
function HomeScreen({ onSelectMode }) {
  return (
    <div className="screen home-screen screen-enter">
      <div className="home-header">
        <div className="home-logo">
          <div className="home-logo-inner">🏏</div>
        </div>
        <h1 className="title-display title-xl">HAND CRICKET</h1>
        <p className="subtitle">The classic schoolyard game — <span className="highlight">now online!</span></p>
      </div>
      <div className="home-modes">
        <div className="glass-card mode-card mode-single" onClick={() => onSelectMode('single')}>
          <div className="mode-icon">🤖</div>
          <div className="mode-info">
            <h3>Single Player</h3>
            <p>Challenge AI with 3 difficulty levels</p>
          </div>
          <span className="mode-chevron">›</span>
        </div>
        <div className="glass-card mode-card mode-multi" onClick={() => onSelectMode('multiplayer')}>
          <div className="mode-icon">🌐</div>
          <div className="mode-info">
            <h3>Multiplayer</h3>
            <p>Create or join rooms with friends</p>
          </div>
          <span className="mode-chevron">›</span>
        </div>
        <div className="glass-card mode-card mode-lb" onClick={() => onSelectMode('leaderboard')}>
          <div className="mode-icon">🏆</div>
          <div className="mode-info">
            <h3>Leaderboard</h3>
            <p>View top players and stats</p>
          </div>
          <span className="mode-chevron">›</span>
        </div>
      </div>
      <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <div className="glow-line" />
        <span className="version-tag">v1.0 • Global Build</span>
      </footer>
    </div>
  );
}

// ===== AI SETUP SCREEN =====
function AISetupScreen({ onStart, onBack }) {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [wickets, setWickets] = useState(3);

  const difficulties = [
    { id: 'easy', emoji: '😊', name: 'Easy', desc: 'Random moves' },
    { id: 'medium', emoji: '🧠', name: 'Medium', desc: 'Pattern detection' },
    { id: 'hard', emoji: '🔥', name: 'Hard', desc: 'Probability + bluff' },
  ];

  return (
    <div className="screen setup-screen screen-enter">
      <button className="btn btn-secondary nav-back" onClick={onBack}>← Back</button>
      <h2 className="title-display title-lg">Single Player Setup</h2>
      <div className="setup-form glass-card">
        <div className="form-group">
          <label>Your Name</label>
          <input
            className="input"
            placeholder="Enter your name..."
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
          />
        </div>
        <div className="form-group">
          <label>Difficulty</label>
          <div className="difficulty-grid">
            {difficulties.map(d => (
              <div
                key={d.id}
                className={`difficulty-option ${difficulty === d.id ? 'selected' : ''}`}
                onClick={() => setDifficulty(d.id)}
              >
                <span className="diff-emoji">{d.emoji}</span>
                <span className="diff-name">{d.name}</span>
                <span className="diff-desc">{d.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Wickets</label>
          <div className="wicket-selector">
            <button className="btn btn-icon" onClick={() => setWickets(Math.max(1, wickets - 1))}>−</button>
            <span className="wicket-count">{wickets}</span>
            <button className="btn btn-icon" onClick={() => setWickets(Math.min(10, wickets + 1))}>+</button>
          </div>
        </div>
        <button
          className="btn btn-primary btn-large"
          onClick={() => onStart({ name: name || 'Player', difficulty, wickets })}
        >
          🏏 Start Match
        </button>
      </div>
    </div>
  );
}

// ===== TOSS SCREEN =====
function TossScreen({ gameState, onTossCall, onTossMove, onChoose }) {
  const { tossPhase, tossCall, tossResult, playerName } = gameState;

  return (
    <div className="screen toss-screen screen-enter">
      <h2 className="title-display title-lg">⚡ THE TOSS</h2>

      {tossPhase === 'call' && (
        <>
          <p className="subtitle">Call it! Heads or Tails?</p>
          <div className="toss-call-section">
            <button className="btn btn-primary toss-call-btn" onClick={() => onTossCall('heads')}>
              🪙 Heads
            </button>
            <button className="btn btn-amber toss-call-btn" onClick={() => onTossCall('tails')}>
              🪙 Tails
            </button>
          </div>
        </>
      )}

      {tossPhase === 'move' && (
        <>
          <p className="subtitle">You called <strong>{tossCall?.toUpperCase()}</strong>. Now show your fingers!</p>
          <div className="toss-hands">
            <div className="toss-hand">
              <span className="hand-label">{playerName || 'You'}</span>
              <HandImage value="fist" className="fist" />
            </div>
            <span className="vs-badge">VS</span>
            <div className="toss-hand">
              <span className="hand-label">AI</span>
              <HandImage value="fist" className="fist" />
            </div>
          </div>
          <FingerSelector onSelect={onTossMove} label="Show your fingers for the toss!" />
        </>
      )}

      {tossPhase === 'result' && tossResult && (
        <>
          <div className="toss-hands">
            <div className="toss-hand">
              <span className="hand-label">{playerName || 'You'}</span>
              <HandImage value={tossResult.playerMove} className="reveal" />
              <span style={{ color: 'var(--text-secondary)' }}>{tossResult.playerMove}</span>
            </div>
            <span className="vs-badge">VS</span>
            <div className="toss-hand">
              <span className="hand-label">AI</span>
              <HandImage value={tossResult.aiMove} className="reveal" />
              <span style={{ color: 'var(--text-secondary)' }}>{tossResult.aiMove}</span>
            </div>
          </div>
          <p className="subtitle">
            Sum: {tossResult.playerMove + tossResult.aiMove} → <strong>{(tossResult.playerMove + tossResult.aiMove) % 2 === 1 ? 'HEADS' : 'TAILS'}</strong>
          </p>
          <h3 className={`result-message ${tossResult.playerWon ? 'won' : 'lost'}`}>
            {tossResult.playerWon ? '🎉 You won the toss!' : '😤 AI won the toss!'}
          </h3>
        </>
      )}

      {tossPhase === 'choose' && (
        <>
          <h3 className="title-md" style={{ color: 'var(--primary)' }}>You won the toss! Choose wisely:</h3>
          <div className="choice-section">
            <div className="glass-card choice-card" onClick={() => onChoose('bat')}>
              <div className="choice-icon">🏏</div>
              <div className="choice-text">BAT First</div>
            </div>
            <div className="glass-card choice-card" onClick={() => onChoose('bowl')}>
              <div className="choice-icon">🎯</div>
              <div className="choice-text">BOWL First</div>
            </div>
          </div>
        </>
      )}

      {tossPhase === 'ai-choosing' && (
        <>
          <h3 className="result-message lost">AI won the toss!</h3>
          <p className="subtitle">
            AI is choosing
            <span className="waiting-dots"><span></span><span></span><span></span></span>
          </p>
        </>
      )}
    </div>
  );
}

// ===== GAMEPLAY SCREEN =====
function GameplayScreen({ gameState, onMove }) {
  const { playerRole, score, wickets, totalWickets, balls, innings, target,
    lastResult, waitingForReveal, playerName, ballLog } = gameState;
  const [timeLeft, setTimeLeft] = useState(5);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!waitingForReveal) {
      setTimeLeft(5);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [waitingForReveal, lastResult]);

  const isBatter = playerRole === 'batter';

  return (
    <div className="screen game-screen screen-enter">
      {/* Scoreboard — gradient-bordered pill */}
      <div className="scoreboard">
        <div className="scoreboard-inner">
          <div className="score-team">
            <div className="team-label">{isBatter ? (playerName || 'You') : 'AI'}</div>
            <span className="role-badge">🏏 BAT</span>
          </div>
          <div className="score-divider">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
              <span className="score-value">{score}</span>
              <span className="wickets-value">{wickets}/{totalWickets} wkts</span>
            </div>
          </div>
          <div className="score-team" style={{ alignItems: 'flex-end' }}>
            <span className="innings-badge">{innings === 1 ? '1st Innings' : '2nd Innings'}</span>
            {target ? <span className="target-badge">Target: {target}</span> : <span className="team-label">Ball: {balls}</span>}
            {target && <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-headline)', fontSize: '0.65rem', fontWeight: 700 }}>Need: {Math.max(0, target - score)}</span>}
          </div>
        </div>
      </div>

      {/* Timer */}
      {!waitingForReveal && (
        <div className="timer-section">
          <div className="timer-labels">
            <span className="timer-turn-label">Your Turn</span>
            <span className="timer-text">{timeLeft.toFixed(1)}s</span>
          </div>
          <div className="timer-bar">
            <div className="timer-fill" style={{ width: `${(timeLeft / 5) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Game Arena */}
      <div className="game-arena">
        <div className="player-hand player-side">
          <span className="hand-label">{playerName || 'You'} <span style={{fontSize: '0.6rem', opacity: 0.8}}>({isBatter ? '🏏 BAT' : '🎯 BOWL'})</span></span>
          {!lastResult ? (
            <HandImage value="fist" className="fist" />
          ) : (
            <HandImage
              value={isBatter ? lastResult.batterMove : lastResult.bowlerMove}
              className={`reveal ${lastResult.isWicket ? 'wicket' : 'scoring'}`}
            />
          )}
        </div>

        <div className="ball-result">
          {lastResult ? (
            <>
              {lastResult.isWicket ? (
                <span className="run-display wicket-text">OUT! 🔴</span>
              ) : (
                <span className={`run-display ${lastResult.runs === 6 ? 'run-six' : lastResult.runs >= 4 ? 'run-four' : ''}`}>
                  {lastResult.runs === 6 ? '🔥 SIX!' : `+${lastResult.runs}`}
                </span>
              )}
            </>
          ) : (
            <div className="vs-badge-container">
              <span className="vs-badge">VS</span>
            </div>
          )}
        </div>

        <div className="player-hand ai-side">
          <span className="hand-label">AI <span style={{fontSize: '0.6rem', opacity: 0.8}}>({isBatter ? '🎯 BOWL' : '🏏 BAT'})</span></span>
          {!lastResult ? (
            <HandImage value="fist" className="fist" />
          ) : (
            <HandImage
              value={isBatter ? lastResult.bowlerMove : lastResult.batterMove}
              className={`reveal ${lastResult.isWicket ? 'wicket' : 'scoring'}`}
            />
          )}
        </div>
      </div>

      {/* Finger Controls */}
      {!waitingForReveal && (
        <FingerSelector
          onSelect={onMove}
          label={isBatter ? 'Pick your runs!' : 'Bowl!'}
        />
      )}

      {waitingForReveal && (
        <p className="subtitle" style={{ textAlign: 'center' }}>
          Revealing
          <span className="waiting-dots"><span></span><span></span><span></span></span>
        </p>
      )}

      {/* Ball Log */}
      <BallLog balls={ballLog} />
    </div>
  );
}

// ===== INNINGS TRANSITION =====
function InningsTransition({ score, target, onContinue, isSuperOver, message }) {
  return (
    <div className="innings-overlay">
      {isSuperOver ? (
        <>
          <div style={{ fontSize: '4rem' }}>⚡</div>
          <h2 className="title-display title-lg" style={{ color: 'var(--tertiary)' }}>
            SUPER OVER!
          </h2>
          <div className="super-over-badge">⚡ 1 Wicket · Winner Takes All</div>
          <p className="subtitle">{message || 'Match tied! Time for a Super Over!'}</p>
          <p className="subtitle">Both teams scored: <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-headline)', fontSize: '2rem' }}>{score}</strong></p>
          <button className="btn btn-amber btn-large" onClick={onContinue}>
            ⚡ Start Super Over
          </button>
        </>
      ) : (
        <>
          <h2 className="title-display title-lg">🔄 Innings Over!</h2>
          <p className="subtitle">First Innings Score: <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-headline)', fontSize: '2rem' }}>{score}</strong></p>
          <p className="subtitle">Target: <strong style={{ color: 'var(--tertiary)', fontFamily: 'var(--font-headline)', fontSize: '2rem' }}>{target}</strong></p>
          <button className="btn btn-primary btn-large" onClick={onContinue}>
            Start 2nd Innings →
          </button>
        </>
      )}
    </div>
  );
}

// ===== RESULT SCREEN =====
function ResultScreen({ result, onPlayAgain, onHome }) {
  const { playerWon, innings1, innings2, playerBattedFirst, playerName, resultObj } = result;

  const playerScore = playerBattedFirst ? innings1.score : innings2.score;
  const playerWkts = playerBattedFirst ? innings1.wickets : innings2.wickets;
  const aiScore = playerBattedFirst ? innings2.score : innings1.score;
  const aiWkts = playerBattedFirst ? innings2.wickets : innings1.wickets;

  return (
    <div className="screen result-screen screen-enter">
      <div className="result-trophy">
        {playerWon === true ? '🏆' : playerWon === false ? '😞' : '🤝'}
      </div>
      <h2 className={`result-message ${playerWon === true ? 'won' : playerWon === false ? 'lost' : 'tied'}`}>
        {playerWon === true ? 'YOU WIN!' : playerWon === false ? 'YOU LOST!' : 'MATCH TIED!'}
      </h2>
      {resultObj && <p className="subtitle">{resultObj.margin}</p>}

      <div className="result-scorecard">
        <div className="glass-card scorecard-team">
          <div className="scorecard-label">{playerName || 'You'}</div>
          <div className="scorecard-score">{playerScore}</div>
          <div className="scorecard-wickets">({playerWkts} wickets)</div>
        </div>
        <div className="glass-card scorecard-team">
          <div className="scorecard-label">AI</div>
          <div className="scorecard-score">{aiScore}</div>
          <div className="scorecard-wickets">({aiWkts} wickets)</div>
        </div>
      </div>

      <div className="result-actions">
        <button className="btn btn-primary btn-large" onClick={onPlayAgain}>🔄 Play Again</button>
        <button className="btn btn-secondary btn-large" onClick={onHome}>🏠 Home</button>
      </div>
    </div>
  );
}

// ===== LEADERBOARD SCREEN =====
function LeaderboardScreen({ onBack }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData([]));
  }, []);

  const getRankClass = (i) => {
    if (i === 0) return 'top-1';
    if (i === 1) return 'top-2';
    if (i === 2) return 'top-3';
    return '';
  };

  const getMedal = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return i + 1;
  };

  return (
    <div className="screen leaderboard-screen">
      <button className="btn btn-secondary nav-back" onClick={onBack}>← Back</button>
      <h2 className="title-display title-lg">🏆 Leaderboard</h2>

      {data.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="subtitle">No matches played yet. Be the first!</p>
        </div>
      ) : (
        <div className="leaderboard-table">
          {data.map((row, i) => (
            <div key={row.player_name} className={`leaderboard-row ${getRankClass(i)}`}>
              <div className="rank-badge">{getMedal(i)}</div>
              <div className="player-name-lb">{row.player_name}</div>
              <div className="player-stats-lb">
                <div className="stat-item">
                  <span className="stat-value">{row.wins}</span>
                  <span>Wins</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{row.losses}</span>
                  <span>Losses</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{row.total_runs}</span>
                  <span>Runs</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{row.highest_score}</span>
                  <span>Best</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



// ===== MAIN APP =====
export default function App() {
  const [screen, setScreen] = useState('home');
  const [gameConfig, setGameConfig] = useState(null);

  // AI game state
  const [gameState, setGameState] = useState({
    tossPhase: 'call',
    tossCall: null,
    tossResult: null,
    playerRole: null,
    playerName: '',
    score: 0,
    wickets: 0,
    totalWickets: 1,
    balls: 0,
    innings: 1,
    target: null,
    lastResult: null,
    waitingForReveal: false,
    ballLog: [],
  });

  const [matchResult, setMatchResult] = useState(null);
  const [inningsTransition, setInningsTransition] = useState(null);

  // ---- Socket listeners for AI game ----
  useEffect(() => {
    socket.on('ai-game-started', () => {
      setScreen('toss');
      setGameState(prev => ({ ...prev, tossPhase: 'call' }));
    });

    socket.on('ai-toss-call-set', ({ call }) => {
      setGameState(prev => ({ ...prev, tossPhase: 'move', tossCall: call }));
    });

    socket.on('ai-toss-result', (result) => {
      setGameState(prev => ({
        ...prev,
        tossPhase: 'result',
        tossResult: result,
      }));

      setTimeout(() => {
        if (result.playerWon) {
          setGameState(prev => ({ ...prev, tossPhase: 'choose' }));
        } else {
          setGameState(prev => ({ ...prev, tossPhase: 'ai-choosing' }));
        }
      }, 2500);
    });

    socket.on('ai-bat-bowl-chosen', ({ aiChoice, playerRole }) => {
      setGameState(prev => ({
        ...prev,
        playerRole,
        tossPhase: null,
      }));
      setScreen('game');
    });

    socket.on('ai-innings-start', ({ playerRole, innings }) => {
      setGameState(prev => ({
        ...prev,
        playerRole,
        innings,
        score: 0,
        wickets: 0,
        balls: 0,
        lastResult: null,
        ballLog: [],
      }));
      setScreen('game');
    });

    socket.on('ai-move-reveal', ({ playerMove, aiMove, playerRole, result, matchSummary }) => {
      const currentInnings = matchSummary.currentInnings;
      const inningsData = currentInnings === 1 ? matchSummary.innings1 : matchSummary.innings2;

      setGameState(prev => ({
        ...prev,
        waitingForReveal: true,
        lastResult: result,
        score: inningsData.score,
        wickets: inningsData.wickets,
        balls: inningsData.balls,
        target: matchSummary.target,
        ballLog: inningsData.ballLog,
      }));

      // Reset after reveal animation
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          waitingForReveal: false,
          lastResult: null,
        }));
      }, 1800);
    });

    socket.on('ai-innings-transition', ({ innings, target, playerRole, firstInningsScore }) => {
      setInningsTransition({ score: firstInningsScore, target });
    });

    socket.on('ai-match-result', (result) => {
      setMatchResult({
        playerWon: result.playerWon,
        innings1: result.innings1,
        innings2: result.innings2,
        playerBattedFirst: result.playerBattedFirst,
        playerName: result.playerName,
        resultObj: result.result,
      });
      setScreen('result');
    });

    socket.on('ai-super-over', ({ message, innings1, innings2, playerRole }) => {
      // Show super over transition then go to gameplay
      setInningsTransition({ score: innings1.score, target: innings2.score, isSuperOver: true, message });
    });

    return () => {
      socket.off('ai-game-started');
      socket.off('ai-toss-call-set');
      socket.off('ai-toss-result');
      socket.off('ai-bat-bowl-chosen');
      socket.off('ai-innings-start');
      socket.off('ai-move-reveal');
      socket.off('ai-innings-transition');
      socket.off('ai-match-result');
      socket.off('ai-super-over');
    };
  }, []);

  // ---- Handlers ----
  const handleModeSelect = (mode) => {
    if (mode === 'leaderboard') {
      setScreen('leaderboard');
    } else if (mode === 'single') {
      setScreen('ai-setup');
    } else if (mode === 'multiplayer') {
      setScreen('multiplayer');
    }
  };

  const handleAIStart = (config) => {
    setGameConfig(config);
    setGameState(prev => ({
      ...prev,
      playerName: config.name,
      totalWickets: config.wickets,
    }));
    socket.emit('start-ai-game', {
      playerName: config.name,
      difficulty: config.difficulty,
      wickets: config.wickets,
    });
  };

  const handleTossCall = (call) => {
    socket.emit('ai-toss-call', { call });
  };

  const handleTossMove = (move) => {
    socket.emit('ai-toss-move', { move });
  };

  const handleBatBowlChoice = (choice) => {
    const role = choice === 'bat' ? 'batter' : 'bowler';
    setGameState(prev => ({ ...prev, playerRole: role }));
    socket.emit('ai-choose-bat-bowl', { choice });
  };

  const handleGameMove = (move) => {
    if (gameState.waitingForReveal) return;
    setGameState(prev => ({ ...prev, waitingForReveal: true }));
    // Check if we're in a super over
    if (gameState.isSuperOver) {
      socket.emit('ai-super-over-move', { move });
    } else {
      socket.emit('ai-play-move', { move });
    }
  };

  const handleInningsContinue = () => {
    const isSuperOver = inningsTransition?.isSuperOver;
    setInningsTransition(null);
    const newRole = gameState.playerRole === 'batter' ? 'bowler' : 'batter';
    setGameState(prev => ({
      ...prev,
      playerRole: newRole,
      innings: isSuperOver ? 1 : 2,
      score: 0,
      wickets: 0,
      totalWickets: isSuperOver ? 1 : prev.totalWickets,
      balls: 0,
      lastResult: null,
      waitingForReveal: false,
      ballLog: [],
      target: inningsTransition?.target,
      isSuperOver: isSuperOver || false,
    }));
    setScreen('game');
  };

  const handlePlayAgain = () => {
    setMatchResult(null);
    setInningsTransition(null);
    setGameState({
      tossPhase: 'call',
      tossCall: null,
      tossResult: null,
      playerRole: null,
      playerName: gameConfig?.name || '',
      score: 0,
      wickets: 0,
      totalWickets: gameConfig?.wickets || 3,
      balls: 0,
      innings: 1,
      target: null,
      lastResult: null,
      waitingForReveal: false,
      ballLog: [],
    });
    if (gameConfig) {
      socket.emit('start-ai-game', {
        playerName: gameConfig.name,
        difficulty: gameConfig.difficulty,
        wickets: gameConfig.wickets,
      });
    }
  };

  const handleHome = () => {
    setScreen('home');
    setMatchResult(null);
    setInningsTransition(null);
    setGameConfig(null);
  };

  // ---- Render ----
  return (
    <div className="app-container">
      {screen === 'home' && <HomeScreen onSelectMode={handleModeSelect} />}
      {screen === 'ai-setup' && <AISetupScreen onStart={handleAIStart} onBack={handleHome} />}
      {screen === 'toss' && (
        <TossScreen
          gameState={gameState}
          onTossCall={handleTossCall}
          onTossMove={handleTossMove}
          onChoose={handleBatBowlChoice}
        />
      )}
      {screen === 'game' && (
        <GameplayScreen gameState={gameState} onMove={handleGameMove} />
      )}
      {screen === 'result' && matchResult && (
        <ResultScreen result={matchResult} onPlayAgain={handlePlayAgain} onHome={handleHome} />
      )}
      {screen === 'leaderboard' && <LeaderboardScreen onBack={handleHome} />}
      {screen === 'multiplayer' && <MultiplayerGame onBack={handleHome} />}

      {/* Innings Transition Overlay */}
      {inningsTransition && (
        <InningsTransition
          score={inningsTransition.score}
          target={inningsTransition.target}
          onContinue={handleInningsContinue}
          isSuperOver={inningsTransition.isSuperOver}
          message={inningsTransition.message}
        />
      )}
    </div>
  );
}
