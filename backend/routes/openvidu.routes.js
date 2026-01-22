const express = require('express');
const openviduService = require('../services/openvidu.service');
const authMiddleware = require('../middleware/auth');
const logger = require('../middleware/logger');

const router = express.Router();

router.use(authMiddleware);

router.post('/sessions', async (req, res, next) => {
    try {
        const { customSessionId } = req.body;
        const sessionId = await openviduService.createSession(customSessionId);
        res.status(200).send(sessionId);
    } catch (error) {
        if (String(error.message).includes('409')) {
            // Should be handled by service, but failsafe
            next(new Error('Session conflict'));
        } else {
            next(error);
        }
    }
});

router.post('/sessions/:sessionId/connections', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const connectionProperties = req.body;
        const token = await openviduService.createToken(sessionId, connectionProperties);
        res.status(200).send(token);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
