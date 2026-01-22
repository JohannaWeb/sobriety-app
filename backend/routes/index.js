const express = require('express');
const authRoutes = require('./auth.routes');
const journalRoutes = require('./journal.routes');
const postsRoutes = require('./posts.routes');
const meetingsRoutes = require('./meetings.routes');
const openviduRoutes = require('./openvidu.routes');
const fourthStepRoutes = require('./fourthStep.routes');
const sobrietyRoutes = require('./sobriety.routes');
const externalRoutes = require('./external.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/journal', journalRoutes);
router.use('/posts', postsRoutes);
router.use('/meeting-rooms', meetingsRoutes);
router.use('/openvidu', openviduRoutes);
router.use('/fourth-step', fourthStepRoutes);
router.use('/sobriety-date', sobrietyRoutes);
router.use('/', externalRoutes); // Mounts aa-meetings and aa-daily-reflection at root of /api

module.exports = router;
