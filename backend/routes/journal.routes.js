const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateJournalEntry, validateId } = require('../middleware/validation');
const logger = require('../middleware/logger');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => {
    logger.debug(`Fetching journal for user ID: ${req.user.id}`);
    db.all('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC', [req.user.id], (err, rows) => {
        if (err) return next(err);
        res.json({ entries: rows });
    });
});

router.post('/', validateJournalEntry, (req, res, next) => {
    const { date, content, mood } = req.body;
    db.run('INSERT INTO journal_entries (date, content, mood, user_id) VALUES (?, ?, ?, ?)',
        [date, content, mood, req.user.id], function (err) {
            if (err) return next(err);
            res.json({ id: this.lastID });
        });
});

router.put('/:id', validateId, validateJournalEntry, (req, res, next) => {
    const { content, mood } = req.body;
    db.run('UPDATE journal_entries SET content = ?, mood = ? WHERE id = ? AND user_id = ?',
        [content, mood, req.params.id, req.user.id], function (err) {
            if (err) return next(err);
            if (this.changes === 0) return res.status(404).json({ error: 'Entry not found or unauthorized' });
            res.json({ changes: this.changes });
        });
});

router.delete('/:id', validateId, (req, res, next) => {
    db.run('DELETE FROM journal_entries WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id], function (err) {
            if (err) return next(err);
            res.json({ changes: this.changes });
        });
});

module.exports = router;
