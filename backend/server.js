const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Imports
const { initDatabase } = require('./config/database');
const routes = require('./routes');
const { initWebSocket } = require('./utils/websocket');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Environment variable validation
const requiredEnvVars = [
  'JWT_SECRET',
  'OPENVIDU_URL',
  'OPENVIDU_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Initialize Database
initDatabase();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4201',
  credentials: true
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));

// Rate Limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Routes
app.use('/api', routes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// Initialize WebSocket
initWebSocket(server);

// Graceful Shutdown
const shutdown = () => {
  logger.info('Shutting down server...');
  server.close(() => {
    logger.info('Server closed');
    // Database closing logic could be added here if exported from config
    logger.info('Database connection closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start Server
server.listen(PORT, () => {
  logger.info(`HTTP and WebSocket server running on port ${PORT}`);
});
