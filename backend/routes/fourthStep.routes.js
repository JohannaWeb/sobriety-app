const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateId } = require('../middleware/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => {
    db.all('SELECT * FROM fourth_step_inventory WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) return next(err);
        res.json(rows);
    });
});

router.post('/', (req, res, next) => {
    const { type, description, affects_what, my_part, fear_type } = req.body;
    // TODO: Add specific validation for this endpoint
    db.run('INSERT INTO fourth_step_inventory (user_id, type, description, affects_what, my_part, fear_type) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, type, description, affects_what, my_part, fear_type], function (err) {
            if (err) return next(err);
            res.json({ id: this.lastID });
        });
});

router.delete('/:id', validateId, (req, res, next) => {
    db.run('DELETE FROM fourth_step_inventory WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id], function (err) {
            if (err) return next(err);
            res.json({ changes: this.changes });
        });
});

module.exports = router;
