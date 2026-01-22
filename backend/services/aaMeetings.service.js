const fetch = require('node-fetch');
const logger = require('../middleware/logger');

/**
 * Fetches AA meetings from Meeting Guide API
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object>} Meeting data
 */
const getMeetings = async (latitude, longitude) => {
    try {
        const url = `https://meetingguide.org/api/v2/meetings?latitude=${latitude}&longitude=${longitude}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`AA Meeting Guide API responded with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        logger.error('Error proxying AA Meeting Guide API:', error);
        throw new Error('Failed to fetch AA meetings');
    }
};

module.exports = {
    getMeetings
};
