const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const logger = require('../middleware/logger');

const router = express.Router();

// List rooms
router.get('/', (req, res, next) => {
    db.all('SELECT * FROM meeting_rooms', [], (err, rows) => {
        if (err) return next(err);
        res.json({ rooms: rows });
    });
});

// Send message
router.post('/:roomId/messages', authMiddleware, (req, res, next) => {
    const { roomId } = req.params;
    const { content } = req.body;
    const author = req.user.username;
    const timestamp = new Date().toISOString();

    if (!content) return res.status(400).json({ error: 'Content is required' });

    db.run('INSERT INTO messages (room_id, author, content, timestamp) VALUES (?, ?, ?, ?)',
        [roomId, author, content, timestamp], function (err) {
            if (err) return next(err);
            res.json({ id: this.lastID, roomId, author, content, timestamp });
        });
});

// Get messages
router.get('/:roomId/messages', (req, res, next) => {
    const { roomId } = req.params;
    db.all('SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC', [roomId], (err, rows) => {
        if (err) return next(err);
        res.json({ messages: rows });
    });
});

// Join queue
router.post('/:roomId/queue', authMiddleware, (req, res, next) => {
    const { roomId } = req.params;
    const author = req.user.username;
    const timestamp = new Date().toISOString();

    db.get('SELECT id FROM sharing_queue WHERE room_id = ? AND author = ?', [roomId, author], (err, row) => {
        if (err) return next(err);
        if (row) {
            return res.status(409).json({ error: 'Author already in queue for this room.' });
        }

        db.run('INSERT INTO sharing_queue (room_id, author, timestamp) VALUES (?, ?, ?)',
            [roomId, author, timestamp], function (err) {
                if (err) return next(err);
                res.json({ id: this.lastID, roomId, author, timestamp });
            });
    });
});

// Get queue
router.get('/:roomId/queue', authMiddleware, (req, res, next) => {
    const { roomId } = req.params;
    db.all('SELECT id, room_id, author, timestamp FROM sharing_queue WHERE room_id = ? ORDER BY timestamp ASC',
        [roomId], (err, rows) => {
            if (err) return next(err);
            res.json({ queue: rows });
        });
});

// Leave queue
router.delete('/:roomId/queue/:author', authMiddleware, (req, res, next) => {
    const { roomId, author } = req.params;
    db.run('DELETE FROM sharing_queue WHERE room_id = ? AND author = ?', [roomId, author], function (err) {
        if (err) return next(err);
        res.json({ changes: this.changes });
    });
});

// Join voice call
router.post('/:roomId/voice-call/join', (req, res) => {
    const { roomId } = req.params;
    const { author } = req.body;
    logger.info(`User ${author} is attempting to join voice call in room ${roomId}`);
    res.json({ status: 'joining_voice_call', roomId, author });
});

module.exports = router;
