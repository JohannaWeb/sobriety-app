const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { validateRegister, validateLogin } = require('../middleware/validation');
const logger = require('../middleware/logger');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// Register
router.post('/register', validateRegister, async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);

        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username already exists.' });
                }
                return next(err);
            }
            res.status(201).json({ id: this.lastID, username });
        });
    } catch (error) {
        next(error);
    }
});

// Login
router.post('/login', validateLogin, (req, res, next) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return next(err);

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Generate Access Token
        const accessToken = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        // Generate Refresh Token
        const refreshToken = jwt.sign(
            { id: user.id },
            JWT_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRY }
        );

        // Store Refresh Token (expiry roughly calculated, ideal to match JWT)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        db.run('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
            [refreshToken, user.id, expiresAt.toISOString()],
            (err) => {
                if (err) return next(err);
                res.json({ accessToken, refreshToken, username: user.username });
            }
        );
    });
});

// Refresh Token
router.post('/refresh', async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);

        // Check if token exists in DB
        db.get('SELECT * FROM refresh_tokens WHERE token = ?', [refreshToken], (err, row) => {
            if (err) return next(err);
            if (!row) {
                return res.status(403).json({ error: 'Invalid refresh token' });
            }

            // Get user info
            db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (err, user) => {
                if (err) return next(err);
                if (!user) return res.status(404).json({ error: 'User not found' });

                // Generate new access token
                const newAccessToken = jwt.sign(
                    { id: user.id, username: user.username },
                    JWT_SECRET,
                    { expiresIn: JWT_EXPIRY }
                );

                res.json({ accessToken: newAccessToken });
            });
        });
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
});

// Logout
router.post('/logout', (req, res, next) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        db.run('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken], (err) => {
            if (err) logger.error('Error deleting refresh token', err);
        });
    }

    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
