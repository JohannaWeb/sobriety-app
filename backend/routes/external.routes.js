const express = require('express');
const aaMeetingsService = require('../services/aaMeetings.service');
const dailyReflectionService = require('../services/dailyReflection.service');

const router = express.Router();

router.get('/aa-meetings', async (req, res, next) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    try {
        const data = await aaMeetingsService.getMeetings(latitude, longitude);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

router.get('/aa-daily-reflection', async (req, res, next) => {
    try {
        const reflection = await dailyReflectionService.getDailyReflection();
        res.json(reflection);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
