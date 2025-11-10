const sqlite3 = require('sqlite3').verbose();
const util = require('util');

const db = new sqlite3.Database('./database_sql.db');

// Promisify db methods
db.run = util.promisify(db.run);
db.get = util.promisify(db.get);
db.all = util.promisify(db.all);

async function _INIT_DB() {
  // Create tables
  await db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      secret_totp VARCHAR(255) DEFAULT NULL,
      sub_google VARCHAR(255) DEFAULT NULL,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      avatar_url TEXT DEFAULT NULL,
      elo INTEGER DEFAULT 1000,            -- ✅ elo starts at 1000
      last_online DATETIME DEFAULT (datetime('now')),
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        p1_name TEXT,
        p2_name TEXT,
        winner_id INTEGER NOT NULL,
        player1_score INTEGER NOT NULL,
        player2_score INTEGER NOT NULL,
        replay_data TEXT DEFAULT NULL, -- (optional) for storing game states or positions
        played_at DATETIME DEFAULT (datetime('now')),

        FOREIGN KEY(player1_id) REFERENCES users(id),
        FOREIGN KEY(player2_id) REFERENCES users(id),
        FOREIGN KEY(winner_id) REFERENCES users(id)
    )
  `);


  // Add columns if missing (catch errors silently)
  await db.run(`ALTER TABLE users ADD COLUMN elo INTEGER DEFAULT 1000`).catch(() => {});
  await db.run(`ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0`).catch(() => {});
  await db.run(`ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 0`).catch(() => {});

  await db.run(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(user_id, friend_id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      blocked_user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(user_id, blocked_user_id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(sender_id, receiver_id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS private_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  console.log("✅ SQLite database initialized");
}


async function _add_message(content) {
  await db.run('INSERT INTO messages (content) VALUES (?)', [content]);
}

async function _get_messages(limit = 50) {
  const rows = await db.all('SELECT * FROM messages ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.reverse();
}

// async function updateLastOnline(userId) {
// 	await db.run("UPDATE users SET last_online = datetime('now') WHERE id = ?", [userId]);
// }

async function _add_friend(userId, friendId) {
  await db.run('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', [userId, friendId]);
  await db.run('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', [friendId, userId]);
}

async function _remove_friend(userId, friendId) {
  await db.run('DELETE FROM friends WHERE user_id = ? AND friend_id = ?', [userId, friendId]);
}

async function blockUser(userId, blockedUserId) {
  await db.run('INSERT INTO blocked_users (user_id, blocked_user_id) VALUES (?, ?)', [userId, blockedUserId]);
}

async function unblockUser(userId, blockedUserId) {
  await db.run('DELETE FROM blocked_users WHERE user_id = ? AND blocked_user_id = ?', [userId, blockedUserId]);
}

module.exports = {
  db,
  _INIT_DB,
  _add_message, 
  _get_messages, 
  _add_friend, 
  _remove_friend, 
  blockUser, 
  unblockUser 
};