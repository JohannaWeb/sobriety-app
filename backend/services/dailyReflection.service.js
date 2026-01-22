const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../middleware/logger');

/**
 * Validates reflection object structure
 */
const isValidReflection = (reflection) => {
    return reflection &&
        typeof reflection.title === 'string' &&
        typeof reflection.content === 'string' &&
        reflection.title.length > 0 &&
        reflection.content.length > 0;
};

/**
 * Scrapes daily reflection from AA website
 */
const scrapeDailyReflection = async () => {
    try {
        const response = await fetch('https://www.aa.org/daily-reflections');
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('span.field--name-title').first().text().trim();
        const bodyContent = $('div.field--name-body').first().text().trim();
        const dateText = $('div').first().text().match(/[A-Za-z]+ \d+/)?.[0] || 'Today';

        if (title && bodyContent) {
            return {
                title: title.replace(/^"|"$/g, ''),
                date: dateText,
                content: bodyContent,
                source: 'aa.org'
            };
        }
        throw new Error('Could not extract reflection from website');
    } catch (error) {
        throw error;
    }
};

/**
 * Gets daily reflection from local JSON file fallback
 */
const getLocalReflection = async () => {
    try {
        const filePath = path.join(__dirname, '../daily_reflections.json');
        const data = await fs.readFile(filePath, 'utf8');
        const reflections = JSON.parse(data);

        if (!Array.isArray(reflections) || reflections.length === 0) {
            throw new Error('No reflections available in local file');
        }

        const today = new Date();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const formattedDate = `${month}-${day}`;

        let reflection = reflections.find(r => r.date === formattedDate);

        if (!reflection) {
            reflection = reflections[Math.floor(Math.random() * reflections.length)];
        }

        return { ...reflection, source: 'local' };
    } catch (error) {
        throw error;
    }
};

/**
 * Main service method to get daily reflection
 */
const getDailyReflection = async () => {
    try {
        // Try scraping first
        return await scrapeDailyReflection();
    } catch (scrapingError) {
        logger.warn('Web scraping failed, falling back to local JSON file:', scrapingError.message);
        try {
            // Fallback to local
            return await getLocalReflection();
        } catch (localError) {
            logger.error('Failed to get local reflection:', localError);
            throw new Error('Unable to retrieve daily reflection');
        }
    }
};

module.exports = {
    getDailyReflection
};
