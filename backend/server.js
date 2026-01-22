const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { OpenVidu } = require('openvidu-node-client');
const WebSocket = require('ws');

// Environment variables for OpenVidu
// IMPORTANT: You need an OpenVidu server running.
// Set these environment variables or replace the values below.
const OPENVIDU_URL = process.env.OPENVIDU_URL || 'https://localhost:4443';
const OPENVIDU_SECRET = process.env.OPENVIDU_SECRET || 'MY_SECRET';

// Initialize OpenVidu
const openvidu = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);

const app = express();
app.use(cors());
app.use(express.json());

const http = require('http'); // Explicitly require http module
const server = http.createServer(app); // Create HTTP server from Express app
const fetch = require('node-fetch'); // Import node-fetch
const cheerio = require('cheerio'); // Import cheerio for HTML parsing
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-in-env-vars';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid token format.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    console.log('Decoded token:', decoded);
    req.user = decoded;
    next();
  });
};

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  // Extract token from query parameter
  const url = new URL(request.url, `http://${request.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.user = decoded; // Attach user info to the WebSocket connection
      wss.emit('connection', ws, request);
    });
  });
});

const rooms = new Map(); // Map<roomId, Set<WebSocket>> to manage clients in rooms

wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected:', ws.user.username);

    ws.on('message', message => {
        const data = JSON.parse(message);
        const { type, roomId, payload } = data;
        const author = ws.user.username; // Use username from authenticated connection

        if (type === 'joinRoom') {
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId).add(ws);
            ws.roomId = roomId;
            console.log(`User ${author} joined room ${roomId} via WebSocket`);

            // Notify others in the room about the new user
            rooms.get(roomId).forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'userJoined', author: author }));
                }
            });

        } else if (type === 'signal' && ws.roomId) {
            // Relay signaling messages (SDP, ICE candidates) to other peers in the same room
            rooms.get(ws.roomId).forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'signal',
                        sender: author,
                        payload: payload
                    }));
                }
            });
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected:', ws.user.username);
        if (ws.roomId && rooms.has(ws.roomId)) {
            rooms.get(ws.roomId).delete(ws);
            // Notify others in the room about the user leaving
            rooms.get(ws.roomId).forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'userLeft', author: ws.user.username }));
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

const db = new sqlite3.Database(path.join(__dirname, 'sobriety.db'), (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the sobriety database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    sobriety_start_date TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Add mood column if it doesn't exist
  db.all("PRAGMA table_info(journal_entries)", (err, rows) => {
    if (rows && !rows.find(row => row.name === 'mood')) {
      db.run('ALTER TABLE journal_entries ADD COLUMN mood TEXT');
    }
    // Add user_id column if it doesn't exist
    if (rows && !rows.find(row => row.name === 'user_id')) {
      db.run('ALTER TABLE journal_entries ADD COLUMN user_id INTEGER REFERENCES users(id)');
    }
  });



  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    post_id INTEGER NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (post_id) REFERENCES posts (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
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

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Username already exists.' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, username });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error hashing password.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
});


app.get('/api/journal', authMiddleware, (req, res) => {
  console.log('Fetching journal for user ID:', req.user.id);
  db.all('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC', [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ entries: rows });
  });
});

app.post('/api/journal', authMiddleware, (req, res) => {
  const { date, content, mood } = req.body;
  db.run('INSERT INTO journal_entries (date, content, mood, user_id) VALUES (?, ?, ?, ?)', [date, content, mood, req.user.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

app.put('/api/journal/:id', authMiddleware, (req, res) => {
  const { content, mood } = req.body;
  db.run('UPDATE journal_entries SET content = ?, mood = ? WHERE id = ? AND user_id = ?', [content, mood, req.params.id, req.user.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

app.delete('/api/journal/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM journal_entries WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

app.get('/api/sobriety-date', authMiddleware, (req, res) => {
  db.get('SELECT sobriety_start_date FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ sobriety_start_date: row.sobriety_start_date });
  });
});

app.put('/api/sobriety-date', authMiddleware, (req, res) => {
  const { sobriety_start_date } = req.body;
  db.run('UPDATE users SET sobriety_start_date = ? WHERE id = ?', [sobriety_start_date, req.user.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

app.get('/api/posts', authMiddleware, (req, res) => {
  db.all('SELECT p.*, u.username as author FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.id DESC', [], (err, posts) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const promises = posts.map(post => {
      return new Promise((resolve, reject) => {
        db.all('SELECT c.*, u.username as author FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ?', [post.id], (err, comments) => {
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
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
  });
});

app.post('/api/posts', authMiddleware, (req, res) => {
  const { title, content } = req.body;
  db.run('INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)', [title, content, req.user.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});


app.post('/api/posts/:id/comments', authMiddleware, (req, res) => {
  const { content } = req.body;
  db.run('INSERT INTO comments (content, post_id, user_id) VALUES (?, ?, ?)', [content, req.params.id, req.user.id], function(err) {
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
app.post('/api/meeting-rooms/:roomId/messages', authMiddleware, (req, res) => {
  const { roomId } = req.params;
  const { content } = req.body;
  const author = req.user.username; // Use username from authenticated user
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
app.post('/api/meeting-rooms/:roomId/queue', authMiddleware, (req, res) => {
  const { roomId } = req.params;
  const author = req.user.username; // Use username from authenticated user
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
app.get('/api/meeting-rooms/:roomId/queue', authMiddleware, (req, res) => {
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
app.delete('/api/meeting-rooms/:roomId/queue/:author', authMiddleware, (req, res) => {
  const { roomId, author } = req.params;
  // Future improvement: only the user themselves or a moderator should be able to do this.
  // For now, any authenticated user can remove anyone.
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
    const externalApiResponse = await fetch(`https://meetingguide.org/api/v2/meetings?latitude=${latitude}&longitude=${longitude}`);
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
    // First try to scrape from AA website
    const response = await fetch('https://www.aa.org/daily-reflections');
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title and content from the page
    const title = $('span.field--name-title').first().text().trim();
    const bodyContent = $('div.field--name-body').first().text().trim();
    const dateText = $('div').first().text().match(/[A-Za-z]+ \d+/)?.[0] || 'Today';

    if (title && bodyContent) {
      res.json({ 
        title: title.replace(/^"|"$/g, ''),
        date: dateText,
        content: bodyContent 
      });
      return;
    }
    
    throw new Error('Could not extract reflection from website');
  } catch (scrapingError) {
    console.log('Web scraping failed, falling back to local JSON file:', scrapingError.message);
    
    // Fallback to local JSON file
    try {
      const filePath = path.join(__dirname, 'daily_reflections.json');
      console.log(`Reading daily reflections from: ${filePath}`);
      
      const data = await fs.readFile(filePath, 'utf8');
      const reflections = JSON.parse(data);
      
      if (!Array.isArray(reflections) || reflections.length === 0) {
        return res.status(500).json({ error: 'No reflections available' });
      }
      
      const today = new Date();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      const formattedDate = `${month}-${day}`;

      let reflection = reflections.find(r => r.date === formattedDate);

      if (!reflection) {
        console.log(`No reflection found for ${formattedDate}, returning random reflection`);
        reflection = reflections[Math.floor(Math.random() * reflections.length)];
      }

      res.json(reflection);
    } catch (error) {
      console.error('Error serving AA Daily Reflection:', error);
      res.status(500).json({ error: `Failed to serve AA Daily Reflection: ${error.message}` });
    }
  }
});
// Fourth Step API
app.get('/api/fourth-step', authMiddleware, (req, res) => {
  db.all('SELECT * FROM fourth_step_inventory WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/fourth-step', authMiddleware, (req, res) => {
  const { type, description, affects_what, my_part, fear_type } = req.body;
  db.run('INSERT INTO fourth_step_inventory (user_id, type, description, affects_what, my_part, fear_type) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, type, description, affects_what, my_part, fear_type], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

app.delete('/api/fourth-step/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM fourth_step_inventory WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// OpenVidu API Endpoints
app.post('/api/openvidu/sessions', async (req, res) => {
    const customSessionId = req.body.customSessionId;
    // Try to find the session first
    const session = openvidu.activeSessions.find(s => s.properties.customSessionId === customSessionId);

    if (session) {
        res.status(200).send(session.sessionId);
        return;
    }

    // If not found, create a new one
    try {
        const newSession = await openvidu.createSession({ customSessionId });
        res.status(200).send(newSession.sessionId);
    } catch (error) {
        // Handle race condition: another process/request created the session in the meantime
        if (String(error.message).includes('409')) {
            const runningSession = openvidu.activeSessions.find(s => s.properties.customSessionId === customSessionId);
            if(runningSession) {
                res.status(200).send(runningSession.sessionId);
            } else {
                res.status(500).send('Session creation failed with 409, but session not found.');
            }
        } else {
            console.error('Error creating OpenVidu session:', error);
            res.status(500).send('Error creating OpenVidu session: ' + error.message);
        }
    }
});

app.post('/api/openvidu/sessions/:sessionId/connections', async (req, res) => {
    const { sessionId } = req.params;
    var connectionProperties = req.body;
    try {
        const session = openvidu.activeSessions.find(s => s.sessionId === sessionId);
        if (!session) {
            return res.status(404).send(`Session not found: ${sessionId}`);
        }
        const connection = await session.createConnection(connectionProperties);
        res.status(200).send(connection.token);
    } catch (error) {
        console.error(`Error creating OpenVidu connection for session ${sessionId}:`, error);
        res.status(500).send('Error creating OpenVidu connection: ' + error.message);
    }
});


server.listen(3001, () => {
  console.log('HTTP and WebSocket server running on port 3001');
});
