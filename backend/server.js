const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const http = require('http'); // Explicitly require http module
const server = http.createServer(app); // Create HTTP server from Express app
const fetch = require('node-fetch'); // Import node-fetch
const cheerio = require('cheerio'); // Import cheerio for HTML parsing

const WebSocket = require('ws');
const wss = new WebSocket.Server({ server }); // Attach WebSocket server to HTTP server

const rooms = new Map(); // Map<roomId, Set<WebSocket>> to manage clients in rooms

wss.on('connection', ws => {
    console.log('WebSocket client connected');

    ws.on('message', message => {
        const data = JSON.parse(message);
        const { type, roomId, author, payload } = data;

        if (type === 'joinRoom') {
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId).add(ws);
            ws.roomId = roomId;
            ws.author = author;
            console.log(`User ${author} joined room ${roomId} via WebSocket`);

            // Notify others in the room about the new user (for WebRTC peer setup)
            rooms.get(roomId).forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'userJoined', author: author }));
                }
            });

        } else if (type === 'signal' && ws.roomId && ws.author) {
            // Relay signaling messages (SDP, ICE candidates) to other peers in the same room
            rooms.get(ws.roomId).forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'signal',
                        sender: ws.author,
                        payload: payload // This will contain SDP or ICE candidates
                    }));
                }
            });
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
        if (ws.roomId && rooms.has(ws.roomId)) {
            rooms.get(ws.roomId).delete(ws);
            // Notify others in the room about the user leaving
            rooms.get(ws.roomId).forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'userLeft', author: ws.author }));
                }
            });
            if (rooms.get(ws.roomId).size === 0) {
                rooms.delete(ws.roomId);
            }
        }
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
});

const db = new sqlite3.Database('./sobriety.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the sobriety database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    content TEXT NOT NULL
  )`);

  // Add mood column if it doesn't exist
  db.all("PRAGMA table_info(journal_entries)", (err, rows) => {
    if (rows && !rows.find(row => row.name === 'mood')) {
      db.run('ALTER TABLE journal_entries ADD COLUMN mood TEXT');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS user_data (
    id INTEGER PRIMARY KEY,
    sobriety_start_date TEXT
  )`);

  // Initialize user_data with a default value if it's empty
  db.get('SELECT * FROM user_data WHERE id = 1', (err, row) => {
    if (!row) {
      db.run('INSERT INTO user_data (id, sobriety_start_date) VALUES (?, ?)', [1, new Date('2024-01-01T00:00:00').toISOString()]);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    post_id INTEGER NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts (id)
  )`);

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
    FOREIGN KEY (room_id) REFERENCES meeting_rooms (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sharing_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES meeting_rooms (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS fourth_step_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT NOT NULL,
    description TEXT,
    affects_what TEXT,
    my_part TEXT,
    fear_type TEXT,
    FOREIGN KEY (user_id) REFERENCES user_data (id)
  )`);

  // Initialize some default meeting rooms if they don't exist
  db.get('SELECT COUNT(*) AS count FROM meeting_rooms', (err, row) => {
    if (err) {
      console.error(err.message);
      return;
    }
    if (row.count === 0) {
      db.run('INSERT INTO meeting_rooms (name, description) VALUES (?, ?)', ['General Chat', 'A general chat room for everyone.']);
      db.run('INSERT INTO meeting_rooms (name, description) VALUES (?, ?)', ['Daily Check-in', 'Share your daily progress and thoughts.']);
      db.run('INSERT INTO meeting_rooms (name, description) VALUES (?, ?)', ['Steps & Traditions', 'Discussion about the 12 Steps and 12 Traditions.']);
    }
  });
});

app.get('/api/journal', (req, res) => {
  db.all('SELECT * FROM journal_entries ORDER BY date DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ entries: rows });
  });
});

app.post('/api/journal', (req, res) => {
  const { date, content, mood } = req.body;
  db.run('INSERT INTO journal_entries (date, content, mood) VALUES (?, ?, ?)', [date, content, mood], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

app.put('/api/journal/:id', (req, res) => {
  const { content, mood } = req.body;
  db.run('UPDATE journal_entries SET content = ?, mood = ? WHERE id = ?', [content, mood, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

app.delete('/api/journal/:id', (req, res) => {
  db.run('DELETE FROM journal_entries WHERE id = ?', req.params.id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

app.get('/api/sobriety-date', (req, res) => {
  db.get('SELECT sobriety_start_date FROM user_data WHERE id = 1', (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ sobriety_start_date: row.sobriety_start_date });
  });
});

app.put('/api/sobriety-date', (req, res) => {
  const { sobriety_start_date } = req.body;
  db.run('UPDATE user_data SET sobriety_start_date = ? WHERE id = 1', [sobriety_start_date], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

app.get('/api/posts', (req, res) => {
  db.all('SELECT * FROM posts ORDER BY id DESC', [], (err, posts) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const promises = posts.map(post => {
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM comments WHERE post_id = ?', [post.id], (err, comments) => {
          if (err) {
            reject(err);
          } else {
            post.comments = comments;
            resolve(post);
          }
        });
      });
    });
    Promise.all(promises).then(results => {
      res.json(results);
    });
  });
});

app.post('/api/posts', (req, res) => {
  const { title, content } = req.body;
  // For now, author is hardcoded
  const author = 'Anonymous';
  db.run('INSERT INTO posts (title, content, author) VALUES (?, ?, ?)', [title, content, author], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});


app.post('/api/posts/:id/comments', (req, res) => {
  const { content } = req.body;
  // For now, author is hardcoded
  const author = 'Anonymous';
  db.run('INSERT INTO comments (content, author, post_id) VALUES (?, ?, ?)', [content, author, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

// API for meeting rooms
app.get('/api/meeting-rooms', (req, res) => {
  db.all('SELECT * FROM meeting_rooms', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ rooms: rows });
  });
});

// API for sending messages to a room
app.post('/api/meeting-rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const { content, author } = req.body;
  const timestamp = new Date().toISOString();
  db.run('INSERT INTO messages (room_id, author, content, timestamp) VALUES (?, ?, ?, ?)', [roomId, author, content, timestamp], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, roomId, author, content, timestamp });
  });
});

// API for fetching messages from a room
app.get('/api/meeting-rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  db.all('SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC', [roomId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ messages: rows });
  });
});

// API for joining the sharing queue
app.post('/api/meeting-rooms/:roomId/queue', (req, res) => {
  const { roomId } = req.params;
  const { author } = req.body;
  const timestamp = new Date().toISOString();

  // Prevent duplicate entries for the same author in the same room
  db.get('SELECT id FROM sharing_queue WHERE room_id = ? AND author = ?', [roomId, author], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      res.status(409).json({ error: 'Author already in queue for this room.' });
      return;
    }

    db.run('INSERT INTO sharing_queue (room_id, author, timestamp) VALUES (?, ?, ?)', [roomId, author, timestamp], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, roomId, author, timestamp });
    });
  });
});

// API for fetching the sharing queue
app.get('/api/meeting-rooms/:roomId/queue', (req, res) => {
  const { roomId } = req.params;
  db.all('SELECT id, room_id, author, timestamp FROM sharing_queue WHERE room_id = ? ORDER BY timestamp ASC', [roomId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ queue: rows });
  });
});

// API for removing a user from the sharing queue
app.delete('/api/meeting-rooms/:roomId/queue/:author', (req, res) => {
  const { roomId, author } = req.params;
  db.run('DELETE FROM sharing_queue WHERE room_id = ? AND author = ?', [roomId, author], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// API for a conceptual voice call join (placeholder)
app.post('/api/meeting-rooms/:roomId/voice-call/join', (req, res) => {
  const { roomId } = req.params;
  const { author } = req.body;
  console.log(`User ${author} is attempting to join voice call in room ${roomId}`);
  // In a real application, this would integrate with a WebRTC signaling server
  // and manage actual voice connections. For now, it's a conceptual placeholder.
  res.json({ status: 'joining_voice_call', roomId, author });
});

// Proxy for AA Meeting Guide API
app.get('/api/aa-meetings', async (req, res) => {
  const { latitude, longitude } = req.query;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required.' });
  }

  try {
    const externalApiResponse = await fetch(`https://meeting-guide.aa.org/api/v2/meetings?latitude=${latitude}&longitude=${longitude}`);
    if (!externalApiResponse.ok) {
      throw new Error(`AA Meeting Guide API responded with status ${externalApiResponse.status}`);
    }
    const data = await externalApiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying AA Meeting Guide API:', error);
    res.status(500).json({ error: 'Failed to fetch AA meetings.' });
  }
});

// Proxy for AA Daily Reflection
app.get('/api/aa-daily-reflection', async (req, res) => {
  try {
    const reflections = require('./daily_reflections.json');
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const formattedDate = `${month}-${day}`;

    let reflection = reflections.find(r => r.date === formattedDate);

    // If today's reflection is not found, return a random one or a default
    if (!reflection) {
      reflection = reflections[Math.floor(Math.random() * reflections.length)];
      // If there are no reflections, provide a hardcoded fallback
      if (!reflection) {
        return res.json({ title: "No Reflection Today", content: "Stay strong and focused on your journey one day at a time." });
      }
    }

    res.json(reflection);
  } catch (error) {
    console.error('Error serving AA Daily Reflection from local file:', error);
    res.status(500).json({ error: 'Failed to serve AA Daily Reflection.' });
  }
});

// Fourth Step API
app.get('/api/fourth-step', (req, res) => {
  db.all('SELECT * FROM fourth_step_inventory', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/fourth-step', (req, res) => {
  const { type, description, affects_what, my_part, fear_type } = req.body;
  db.run('INSERT INTO fourth_step_inventory (user_id, type, description, affects_what, my_part, fear_type) VALUES (?, ?, ?, ?, ?, ?)', [1, type, description, affects_what, my_part, fear_type], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

app.delete('/api/fourth-step/:id', (req, res) => {
  db.run('DELETE FROM fourth_step_inventory WHERE id = ?', req.params.id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

server.listen(3000, () => {
  console.log('HTTP and WebSocket server running on port 3000');
});
