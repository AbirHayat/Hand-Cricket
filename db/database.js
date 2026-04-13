import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'handcricket.db'));

// Enable WAL for better concurrent read performance
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      matches_played INTEGER DEFAULT 0,
      matches_won INTEGER DEFAULT 0,
      total_runs_scored INTEGER DEFAULT 0,
      total_wickets_taken INTEGER DEFAULT 0,
      highest_score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      player1_id TEXT,
      player2_id TEXT,
      player1_score INTEGER,
      player2_score INTEGER,
      player1_wickets INTEGER,
      player2_wickets INTEGER,
      winner_id TEXT,
      result_text TEXT,
      toss_winner TEXT,
      is_super_over INTEGER DEFAULT 0,
      tournament_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS match_balls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT NOT NULL,
      innings INTEGER NOT NULL,
      ball_number INTEGER NOT NULL,
      batter_move INTEGER NOT NULL,
      bowler_move INTEGER NOT NULL,
      runs INTEGER NOT NULL,
      is_wicket INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      state TEXT DEFAULT 'SETUP',
      bracket_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      player_name TEXT PRIMARY KEY,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      total_runs INTEGER DEFAULT 0,
      highest_score INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Update leaderboard
 */
export function updateLeaderboard(playerName, won, runs) {
  const stmt = db.prepare(`
    INSERT INTO leaderboard (player_name, wins, losses, total_runs, highest_score)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(player_name) DO UPDATE SET
      wins = wins + ?,
      losses = losses + ?,
      total_runs = total_runs + ?,
      highest_score = CASE WHEN ? > highest_score THEN ? ELSE highest_score END,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(
    playerName, won ? 1 : 0, won ? 0 : 1, runs, runs,
    won ? 1 : 0, won ? 0 : 1, runs, runs, runs
  );
}

/**
 * Get leaderboard (top 20)
 */
export function getLeaderboard() {
  return db.prepare(`
    SELECT * FROM leaderboard ORDER BY wins DESC, total_runs DESC LIMIT 20
  `).all();
}

/**
 * Save a completed match
 */
export function saveMatch(matchData) {
  const stmt = db.prepare(`
    INSERT INTO matches (id, mode, player1_id, player2_id, player1_score, player2_score,
      player1_wickets, player2_wickets, winner_id, result_text, toss_winner, is_super_over, tournament_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    matchData.id, matchData.mode, matchData.player1Id, matchData.player2Id,
    matchData.player1Score, matchData.player2Score, matchData.player1Wickets,
    matchData.player2Wickets, matchData.winnerId, matchData.resultText,
    matchData.tossWinner, matchData.isSuperOver ? 1 : 0, matchData.tournamentId || null
  );
}

/**
 * Save ball-by-ball data
 */
export function saveBalls(matchId, innings, balls) {
  const stmt = db.prepare(`
    INSERT INTO match_balls (match_id, innings, ball_number, batter_move, bowler_move, runs, is_wicket)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((ballsData) => {
    for (const ball of ballsData) {
      stmt.run(matchId, innings, ball.ball, ball.batterMove, ball.bowlerMove, ball.runs, ball.isWicket ? 1 : 0);
    }
  });
  insertMany(balls);
}

// Initialize on load
initDatabase();

export { db };
