import { useState, useEffect, useRef } from 'react';
import socket from './socket';
import { getHandDisplay, HAND_EMOJIS } from './hands';

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
      <h3>{label || 'Choose your move'}</h3>
      <div className="finger-grid">
        {[1, 2, 3, 4, 5, 6].map(val => (
          <button
            key={val}
            className="btn btn-secondary finger-btn"
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
          <span key={i} className={`ball-chip ${b.isWicket ? 'wicket' : b.runs === 6 ? 'six' : 'run'}`}>
            {b.isWicket ? 'W' : b.runs}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Full Multiplayer Game Component
 * Handles: Lobby → Toss → Gameplay → Innings → Result → Super Over
 */
export default function MultiplayerGame({ onBack }) {
  // UI state
  const [view, setView] = useState('choice'); // choice, create, join, lobby, toss, game, result
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  // Room state from server
  const [room, setRoom] = useState(null);
  const [myId, setMyId] = useState(socket.id);

  // Toss state
  const [tossPhase, setTossPhase] = useState('waiting'); // waiting, call, move, result, choose
  const [tossCall, setTossCall] = useState(null);
  const [tossResult, setTossResult] = useState(null);
  const [isTossCaller, setIsTossCaller] = useState(false);

  // Game state
  const [gamePhase, setGamePhase] = useState('waiting'); // waiting, playing, reveal, innings-break, super-over
  const [myRole, setMyRole] = useState(null); // 'batter' or 'bowler'
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [totalWickets, setTotalWickets] = useState(1);
  const [balls, setBalls] = useState(0);
  const [innings, setInnings] = useState(1);
  const [target, setTarget] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [ballLog, setBallLog] = useState([]);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [opponentName, setOpponentName] = useState('Opponent');

  // Timer
  const [timeLeft, setTimeLeft] = useState(5);
  const timerRef = useRef(null);

  // Result
  const [matchResult, setMatchResult] = useState(null);
  const [innings1Data, setInnings1Data] = useState(null);
  const [innings2Data, setInnings2Data] = useState(null);

  // Penalty overlay
  const [penalty, setPenalty] = useState(null);

  // Track my socket id
  useEffect(() => {
    setMyId(socket.id);
    const onConnect = () => setMyId(socket.id);
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, []);

  // ===== Timer logic =====
  useEffect(() => {
    if (gamePhase === 'playing' && !waitingForOpponent) {
      setTimeLeft(5);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) { clearInterval(timerRef.current); return 0; }
          return prev - 0.1;
        });
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gamePhase, waitingForOpponent, lastResult]);

  // ===== Socket Event Listeners =====
  useEffect(() => {
    // Room events
    socket.on('room-created', (data) => {
      setRoom(data.room);
      setView('lobby');
      setError('');
    });

    socket.on('room-updated', (roomState) => {
      setRoom(roomState);
    });

    socket.on('error', (data) => {
      setError(data.message);
    });

    // Toss events
    socket.on('toss-started', (roomState) => {
      setRoom(roomState);
      setView('toss');
      // Captain of team A calls the toss
      const amCaptainA = roomState.captains?.A === myId;
      const isTeamA = roomState.teams?.A?.includes(myId);
      // First player in team A (or host) calls the toss
      if (isTeamA) {
        setTossPhase('call');
        setIsTossCaller(true);
      } else {
        setTossPhase('waiting-call');
        setIsTossCaller(false);
      }
    });

    socket.on('toss-call-set', ({ calledBy, call }) => {
      setTossCall(call);
      setTossPhase('move');
    });

    socket.on('toss-result', (result) => {
      setTossResult(result);
      setTossPhase('result');

      // Determine if I won the toss
      const iCalledIt = isTossCaller;
      const callerWon = result.winner === 'caller';
      const iWon = (iCalledIt && callerWon) || (!iCalledIt && !callerWon);

      setTimeout(() => {
        if (iWon) {
          setTossPhase('choose');
        } else {
          setTossPhase('opponent-choosing');
        }
      }, 3000);
    });

    // Match events
    socket.on('match-started', (roomState) => {
      setRoom(roomState);
      setView('game');
      setGamePhase('playing');
      setInnings(1);
      setBalls(0);
      setScore(0);
      setWickets(0);
      setBallLog([]);
      setLastResult(null);
      setWaitingForOpponent(false);

      // Determine my role
      const amBatter = roomState.currentBatter === myId;
      setMyRole(amBatter ? 'batter' : 'bowler');
      setTotalWickets(roomState.matchSummary?.innings1?.totalWickets || 1);

      // Get opponent name
      const otherPlayers = roomState.players?.filter(p => p.id !== myId);
      if (otherPlayers?.length > 0) setOpponentName(otherPlayers[0].name);
    });

    socket.on('move-registered', () => {
      setWaitingForOpponent(true);
    });

    socket.on('move-reveal', ({ result, room: roomState }) => {
      setRoom(roomState);
      setWaitingForOpponent(false);
      setLastResult(result);
      setGamePhase('reveal');
      setScore(result.score);
      setWickets(result.wickets);
      setBalls(result.balls);
      setTarget(result.target);
      setBallLog(prev => [...prev, {
        ball: result.balls,
        runs: result.runs,
        isWicket: result.isWicket,
        batterMove: result.batterMove,
        bowlerMove: result.bowlerMove,
      }]);

      // Update my role from roomState
      if (roomState) {
        setMyRole(roomState.currentBatter === myId ? 'batter' : 'bowler');
      }

      // Reset after reveal animation
      if (!result.inningsOver && !result.matchOver) {
        setTimeout(() => {
          setLastResult(null);
          setGamePhase('playing');
        }, 1800);
      }
    });

    socket.on('innings-transition', ({ target: newTarget, room: roomState }) => {
      setRoom(roomState);
      setInnings1Data({ score, wickets, balls, ballLog: [...ballLog] });
      setGamePhase('innings-break');
      setTarget(newTarget);

      // After 3 seconds, start 2nd innings automatically
      setTimeout(() => {
        setInnings(2);
        setScore(0);
        setWickets(0);
        setBalls(0);
        setBallLog([]);
        setLastResult(null);
        setGamePhase('playing');
        setWaitingForOpponent(false);
        setTarget(newTarget);

        // Role swaps for 2nd innings
        if (roomState) {
          setMyRole(roomState.currentBatter === myId ? 'batter' : 'bowler');
          setTotalWickets(roomState.matchSummary?.innings2?.totalWickets || totalWickets);
        }
      }, 4000);
    });

    socket.on('timeout-penalty', ({ playerId, role, penalty: penaltyData, room: roomState }) => {
      setRoom(roomState);
      setPenalty({
        isMe: playerId === myId,
        role,
        ...penaltyData,
      });
      setScore(penaltyData.newScore);

      setTimeout(() => setPenalty(null), 2500);
    });

    socket.on('match-result', ({ result, room: roomState }) => {
      setRoom(roomState);
      setInnings2Data({ score, wickets, balls, ballLog: [...ballLog] });

      // Determine if I won
      // After switchInnings(), roomState.battingTeam = the CHASING team (2nd innings batter)
      const amInChasingTeam = roomState?.battingTeam && roomState.teams?.[roomState.battingTeam]?.includes(myId);
      let iWon = false;
      if (result.winner === 'chaser') {
        iWon = amInChasingTeam; // chaser won → I win if I'm in the chasing team
      } else if (result.winner === 'first') {
        iWon = !amInChasingTeam; // first batting team won → I win if I'm NOT in the chasing team
      }

      setMatchResult({
        iWon,
        result,
        roomState,
      });
      setView('result');
    });

    socket.on('match-tied', ({ message, room: roomState }) => {
      setRoom(roomState);
      setMatchResult({
        iWon: null,
        result: { winner: 'tie', margin: message },
        roomState,
        isSuperOver: true,
      });
      setView('result');
    });

    socket.on('player-disconnected', ({ playerId }) => {
      setError(`A player disconnected from the game.`);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-updated');
      socket.off('error');
      socket.off('toss-started');
      socket.off('toss-call-set');
      socket.off('toss-result');
      socket.off('match-started');
      socket.off('move-registered');
      socket.off('move-reveal');
      socket.off('innings-transition');
      socket.off('timeout-penalty');
      socket.off('match-result');
      socket.off('match-tied');
      socket.off('player-disconnected');
    };
  }, [myId, isTossCaller, score, wickets, balls, ballLog, totalWickets]);

  // ===== Handlers =====
  const createRoom = () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    socket.emit('create-room', { playerName: name, mode: 'single' });
  };

  const joinRoom = () => {
    if (!roomCode.trim()) { setError('Enter room code'); return; }
    if (!name.trim()) { setError('Enter your name'); return; }
    socket.emit('join-room', { roomId: roomCode.toUpperCase(), playerName: name });
    setView('lobby');
  };

  const handleTossCall = (call) => {
    socket.emit('toss-call', { call });
  };

  const handleTossMove = (move) => {
    socket.emit('toss-move', { move });
  };

  const handleBatBowlChoice = (choice) => {
    socket.emit('choose-bat-bowl', { choice });
  };

  const handleGameMove = (move) => {
    if (waitingForOpponent || gamePhase !== 'playing') return;
    setWaitingForOpponent(true);
    socket.emit('game-move', { move });
  };

  const isHost = room?.hostId === myId;
  const myPlayer = room?.players?.find(p => p.id === myId);
  const myName = myPlayer?.name || name || 'You';

  // ===== RENDER: Choice Screen =====
  if (view === 'choice' || view === 'create' || view === 'join') {
    return (
      <div className="screen setup-screen">
        <button className="btn btn-secondary nav-back" onClick={onBack}>← Back</button>
        <h2 className="title-display title-lg">🌐 Multiplayer</h2>

        {error && <div className="error-banner">{error}</div>}

        <div className="setup-form glass-card">
          <div className="form-group">
            <label>Your Name</label>
            <input className="input" placeholder="Enter your name..." value={name}
              onChange={e => setName(e.target.value)} maxLength={20} />
          </div>

          {view === 'choice' && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={() => { setView('create'); setError(''); }}>
                ➕ Create Room
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => { setView('join'); setError(''); }}>
                🔗 Join Room
              </button>
            </div>
          )}

          {view === 'create' && (
            <button className="btn btn-primary btn-large" onClick={createRoom}>
              🏏 Create Game Room
            </button>
          )}

          {view === 'join' && (
            <>
              <div className="form-group">
                <label>Room Code</label>
                <input className="input" placeholder="Enter room code..." value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={6}
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.2em' }}
                />
              </div>
              <button className="btn btn-primary btn-large" onClick={joinRoom}>
                🔗 Join Room
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ===== RENDER: Lobby =====
  if (view === 'lobby' && room) {
    return (
      <div className="screen lobby-screen">
        <button className="btn btn-secondary nav-back" onClick={onBack}>← Leave</button>
        <h2 className="title-display title-lg">🌐 Game Lobby</h2>

        <div className="room-code" onClick={() => navigator.clipboard?.writeText(room.id)}>
          <div className="code-label">Room Code</div>
          <div className="code-value">{room.id}</div>
          <div className="code-hint">Click to copy</div>
        </div>

        <div className="player-list">
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            Players ({room.players?.length || 0})
          </h3>
          {room.players?.map(p => (
            <div key={p.id} className="player-item">
              <div className="player-tag">
                <span>{p.name} {p.id === myId ? '(You)' : ''}</span>
                {p.isHost && <span className="player-badge badge-host">HOST</span>}
                {p.isCaptain && <span className="player-badge badge-captain">CAPTAIN</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {p.team ? `Team ${p.team}` : 'No team'}
                </span>
                {/* Captain assignment buttons (host only) */}
                {isHost && p.team && !p.isCaptain && (
                  <button className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    onClick={() => socket.emit('set-captain', { team: p.team, playerId: p.id })}>
                    👑 Captain
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Team display */}
        {room.teams?.A?.length > 0 && (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="glass-card" style={{ padding: '1rem', minWidth: '180px', textAlign: 'center' }}>
              <h4 style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }}>Team A</h4>
              {room.teams.A.map(id => {
                const p = room.players?.find(pl => pl.id === id);
                return <div key={id} style={{ fontSize: '0.9rem', padding: '0.25rem' }}>
                  {p?.name || id} {room.captains?.A === id ? '👑' : ''}
                </div>;
              })}
            </div>
            <div className="glass-card" style={{ padding: '1rem', minWidth: '180px', textAlign: 'center' }}>
              <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>Team B</h4>
              {room.teams.B.map(id => {
                const p = room.players?.find(pl => pl.id === id);
                return <div key={id} style={{ fontSize: '0.9rem', padding: '0.25rem' }}>
                  {p?.name || id} {room.captains?.B === id ? '👑' : ''}
                </div>;
              })}
            </div>
          </div>
        )}

        {isHost && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => socket.emit('shuffle-teams')}>
              🔀 Shuffle Teams
            </button>
            <button className="btn btn-primary btn-large"
              disabled={!room.players || room.players.length < 2}
              onClick={() => socket.emit('start-match')}>
              🏏 Start Match {room.players?.length < 2 ? '(Need 2+ players)' : ''}
            </button>
          </div>
        )}

        {!isHost && (
          <p className="subtitle" style={{ textAlign: 'center' }}>
            Waiting for host to start the match
            <span className="waiting-dots"><span></span><span></span><span></span></span>
          </p>
        )}
      </div>
    );
  }

  // ===== RENDER: Toss =====
  if (view === 'toss') {
    return (
      <div className="screen toss-screen">
        <h2 className="title-display title-lg">⚡ THE TOSS</h2>

        {tossPhase === 'call' && (
          <>
            <p className="subtitle">You're calling! Heads or Tails?</p>
            <div className="toss-call-section">
              <button className="btn btn-primary toss-call-btn" onClick={() => handleTossCall('heads')}>
                🪙 Heads
              </button>
              <button className="btn btn-amber toss-call-btn" onClick={() => handleTossCall('tails')}>
                🪙 Tails
              </button>
            </div>
          </>
        )}

        {tossPhase === 'waiting-call' && (
          <>
            <p className="subtitle">
              Opponent is calling the toss
              <span className="waiting-dots"><span></span><span></span><span></span></span>
            </p>
            <div className="toss-hands">
              <HandImage value="fist" className="fist" />
              <span className="vs-badge">VS</span>
              <HandImage value="fist" className="fist" />
            </div>
          </>
        )}

        {tossPhase === 'move' && (
          <>
            <p className="subtitle">
              {isTossCaller ? `You called ${tossCall?.toUpperCase()}.` : `Opponent called ${tossCall?.toUpperCase()}.`} Show your fingers!
            </p>
            <div className="toss-hands">
              <div className="toss-hand">
                <span className="hand-label">{myName}</span>
                <HandImage value="fist" className="fist" />
              </div>
              <span className="vs-badge">VS</span>
              <div className="toss-hand">
                <span className="hand-label">{opponentName}</span>
                <HandImage value="fist" className="fist" />
              </div>
            </div>
            <FingerSelector onSelect={handleTossMove} label="Show your fingers for the toss!" />
          </>
        )}

        {tossPhase === 'result' && tossResult && (
          <>
            <div className="toss-hands">
              <div className="toss-hand">
                <span className="hand-label">Player 1</span>
                <HandImage value={tossResult.player1Move} className="reveal" />
              </div>
              <span className="vs-badge">VS</span>
              <div className="toss-hand">
                <span className="hand-label">Player 2</span>
                <HandImage value={tossResult.player2Move} className="reveal" />
              </div>
            </div>
            <p className="subtitle">
              Sum: {tossResult.sum} → <strong>{tossResult.outcome?.toUpperCase()}</strong>
            </p>
            <h3 className="result-message won">
              {tossResult.winner === 'caller' ? 'Caller wins!' : 'Opponent wins!'}
            </h3>
          </>
        )}

        {tossPhase === 'choose' && (
          <>
            <h3 className="title-md" style={{ color: 'var(--accent-green)' }}>You won the toss! Choose:</h3>
            <div className="choice-section">
              <div className="glass-card choice-card" onClick={() => handleBatBowlChoice('bat')}>
                <div className="choice-icon">🏏</div>
                <div className="choice-text">BAT First</div>
              </div>
              <div className="glass-card choice-card" onClick={() => handleBatBowlChoice('bowl')}>
                <div className="choice-icon">🎯</div>
                <div className="choice-text">BOWL First</div>
              </div>
            </div>
          </>
        )}

        {tossPhase === 'opponent-choosing' && (
          <>
            <h3 className="result-message lost">Opponent won the toss!</h3>
            <p className="subtitle">
              Waiting for their choice
              <span className="waiting-dots"><span></span><span></span><span></span></span>
            </p>
          </>
        )}
      </div>
    );
  }

  // ===== RENDER: Gameplay =====
  if (view === 'game') {
    const isBatter = myRole === 'batter';
    return (
      <div className="screen game-screen screen-enter">
        {/* Scoreboard — clean dark bar with gradient accent */}
        {/* Scoreboard — clean dark bar with gradient accent */}
        <div className="scoreboard">
          <div className="scoreboard-inner">
            <div className="score-team">
              <div className="team-label">{isBatter ? myName : opponentName}</div>
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
        {gamePhase === 'playing' && !waitingForOpponent && (
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
            <span className="hand-label">{myName} <span style={{fontSize: '0.6rem', opacity: 0.8}}>({isBatter ? '🏏 BAT' : '🎯 BOWL'})</span></span>
            {!lastResult ? (
              <HandImage value="fist" className={waitingForOpponent ? '' : 'fist'} />
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
            <span className="hand-label">{opponentName} <span style={{fontSize: '0.6rem', opacity: 0.8}}>({isBatter ? '🎯 BOWL' : '🏏 BAT'})</span></span>
            {!lastResult ? (
              <HandImage value="fist" className={waitingForOpponent ? '' : 'fist'} />
            ) : (
              <HandImage
                value={isBatter ? lastResult.bowlerMove : lastResult.batterMove}
                className={`reveal ${lastResult.isWicket ? 'wicket' : 'scoring'}`}
              />
            )}
          </div>
        </div>

        {/* Finger Controls */}
        {gamePhase === 'playing' && !waitingForOpponent && (
          <FingerSelector
            onSelect={handleGameMove}
            label={isBatter ? '🏏 Pick your runs!' : '🎯 Bowl!'}
          />
        )}

        {waitingForOpponent && gamePhase === 'playing' && (
          <p className="subtitle" style={{ textAlign: 'center' }}>
            Waiting for opponent
            <span className="waiting-dots"><span></span><span></span><span></span></span>
          </p>
        )}

        {gamePhase === 'reveal' && (
          <p className="subtitle" style={{ textAlign: 'center' }}>
            Revealing
            <span className="waiting-dots"><span></span><span></span><span></span></span>
          </p>
        )}

        {/* Innings Break Overlay */}
        {gamePhase === 'innings-break' && (
          <div className="innings-overlay">
            <h2 className="title-display title-lg">🔄 Innings Over!</h2>
            <p className="subtitle">First Innings Score:
              <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-headline)', fontSize: '2rem' }}> {score}</strong>
            </p>
            <p className="subtitle">Target:
              <strong style={{ color: 'var(--tertiary)', fontFamily: 'var(--font-headline)', fontSize: '2rem' }}> {target}</strong>
            </p>
            <p className="subtitle">
              Starting 2nd innings
              <span className="waiting-dots"><span></span><span></span><span></span></span>
            </p>
          </div>
        )}

        <BallLog balls={ballLog} />

        {/* Penalty Overlay */}
        {penalty && (
          <div className="penalty-overlay">
            <div className="penalty-text">
              ⚠️ TIMEOUT PENALTY! {penalty.role === 'bowler' ? '+6 runs' : '-6 runs'}
              {penalty.isMe ? ' (You!)' : ''}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== RENDER: Result =====
  if (view === 'result' && matchResult) {
    const rs = matchResult.roomState;
    return (
      <div className="screen result-screen screen-enter">
        <div className="result-trophy">
          {matchResult.iWon === true ? '🏆' : matchResult.iWon === false ? '😞' : '🤝'}
        </div>
        <h2 className={`result-message ${matchResult.iWon === true ? 'won' : matchResult.iWon === false ? 'lost' : 'tied'}`}>
          {matchResult.iWon === true ? 'YOU WIN!' : matchResult.iWon === false ? 'YOU LOST!' : 'MATCH TIED!'}
        </h2>
        {matchResult.result && <p className="subtitle">{matchResult.result.margin}</p>}

        {rs?.matchSummary && (
          <div className="result-scorecard">
            <div className="glass-card scorecard-team">
              <div className="scorecard-label">1st Innings</div>
              <div className="scorecard-score">{rs.matchSummary.innings1?.score}</div>
              <div className="scorecard-wickets">({rs.matchSummary.innings1?.wickets} wickets)</div>
            </div>
            <div className="glass-card scorecard-team">
              <div className="scorecard-label">2nd Innings</div>
              <div className="scorecard-score">{rs.matchSummary.innings2?.score}</div>
              <div className="scorecard-wickets">({rs.matchSummary.innings2?.wickets} wickets)</div>
            </div>
          </div>
        )}

        <div className="result-actions">
          {matchResult.isSuperOver && (
            <button className="btn btn-amber btn-large"
              onClick={() => { /* Super Over would be triggered here */ }}>
              ⚡ Super Over
            </button>
          )}
          <button className="btn btn-primary btn-large" onClick={() => {
            setView('lobby');
            setGamePhase('waiting');
            setTossPhase('waiting');
            setMatchResult(null);
            setInnings(1);
            setScore(0);
            setWickets(0);
            setBalls(0);
            setBallLog([]);
            setLastResult(null);
          }}>
            🔄 Play Again
          </button>
          <button className="btn btn-secondary btn-large" onClick={onBack}>🏠 Home</button>
        </div>
      </div>
    );
  }

  return <div className="screen"><p>Loading...</p></div>;
}
