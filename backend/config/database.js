const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../middleware/logger');

// Database Setup
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../sobriety.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error('Database connection error:', err.message);
        process.exit(1);
    }
    logger.info('Connected to the sobriety database.');

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) logger.error('Error enabling foreign keys:', err);
    });
});

// Initialize Tables
const initDatabase = () => {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      sobriety_start_date TEXT
    )`);

        // Refresh Tokens Table
        db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

        db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      mood TEXT,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

        // Create indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');

        db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

        db.run('CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)');

        db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      post_id INTEGER NOT NULL,
      user_id INTEGER,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

        db.run('CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)');

        db.run(`CREATE TABLE IF NOT EXISTS meeting_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    )`);

        db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES meeting_rooms (id) ON DELETE CASCADE
    )`);

        db.run('CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id)');

        db.run(`CREATE TABLE IF NOT EXISTS sharing_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES meeting_rooms (id) ON DELETE CASCADE
    )`);

        db.run(`CREATE TABLE IF NOT EXISTS fourth_step_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL,
      description TEXT,
      affects_what TEXT,
      my_part TEXT,
      fear_type TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

        // Initialize default meeting rooms
        db.get('SELECT COUNT(*) AS count FROM meeting_rooms', (err, row) => {
            if (!err && row.count === 0) {
                const rooms = [
                    ['General Chat', 'A general chat room for everyone.'],
                    ['Daily Check-in', 'Share your daily progress and thoughts.'],
                    ['Steps & Traditions', 'Discussion about the 12 Steps and 12 Traditions.']
                ];
                const stmt = db.prepare('INSERT INTO meeting_rooms (name, description) VALUES (?, ?)');
                rooms.forEach(room => stmt.run(room));
                stmt.finalize();
            }
        });
    });
};

module.exports = { db, initDatabase };
