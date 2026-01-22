const { OpenVidu } = require('openvidu-node-client');
const logger = require('../middleware/logger');

const OPENVIDU_URL = process.env.OPENVIDU_URL;
const OPENVIDU_SECRET = process.env.OPENVIDU_SECRET;

if (!OPENVIDU_URL || !OPENVIDU_SECRET) {
    logger.warn('OpenVidu environment variables not set. Video calls will not work.');
}

const openvidu = new OpenVidu(OPENVIDU_URL || 'https://localhost:4443', OPENVIDU_SECRET || 'MY_SECRET');

/**
 * Creates a new OpenVidu session or returns existing one
 * @param {string} customSessionId 
 * @returns {Promise<string>} sessionId
 */
const createSession = async (customSessionId) => {
    try {
        // Check if session exists
        const existingSession = openvidu.activeSessions.find(s => s.properties.customSessionId === customSessionId);
        if (existingSession) {
            return existingSession.sessionId;
        }

        // Create new session
        const newSession = await openvidu.createSession({ customSessionId });
        return newSession.sessionId;
    } catch (error) {
        // Handle race condition
        if (String(error.message).includes('409')) {
            const runningSession = openvidu.activeSessions.find(s => s.properties.customSessionId === customSessionId);
            if (runningSession) {
                return runningSession.sessionId;
            }
        }
        throw error;
    }
};

/**
 * Creates a connection token for a session
 * @param {string} sessionId 
 * @param {Object} connectionProperties 
 * @returns {Promise<string>} token
 */
const createToken = async (sessionId, connectionProperties = {}) => {
    const session = openvidu.activeSessions.find(s => s.sessionId === sessionId);
    if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
    }
    const connection = await session.createConnection(connectionProperties);
    return connection.token;
};

module.exports = {
    createSession,
    createToken
};
