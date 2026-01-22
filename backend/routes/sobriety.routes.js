const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => {
    db.get('SELECT sobriety_start_date FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) return next(err);
        res.json({ sobriety_start_date: row ? row.sobriety_start_date : null });
    });
});

router.put('/', (req, res, next) => {
    const { sobriety_start_date } = req.body;
    // Basic date validation could be added here
    db.run('UPDATE users SET sobriety_start_date = ? WHERE id = ?', [sobriety_start_date, req.user.id], function (err) {
        if (err) return next(err);
        res.json({ changes: this.changes });
    });
});

module.exports = router;
