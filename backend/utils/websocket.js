const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../middleware/logger');

const JWT_SECRET = process.env.JWT_SECRET;

const initWebSocket = (server) => {
    const wss = new WebSocket.Server({ noServer: true });
    const rooms = new Map();

    // Handle Upgrade
    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            wss.handleUpgrade(request, socket, head, (ws) => {
                ws.user = decoded;
                wss.emit('connection', ws, request);
            });
        });
    });

    // Handle Connection
    wss.on('connection', (ws, req) => {
        logger.info(`WebSocket client connected: ${ws.user.username}`);

        ws.on('message', message => {
            try {
                const data = JSON.parse(message);
                const { type, roomId, payload } = data;
                const author = ws.user.username;

                if (type === 'joinRoom') {
                    if (!rooms.has(roomId)) {
                        rooms.set(roomId, new Set());
                    }
                    rooms.get(roomId).add(ws);
                    ws.roomId = roomId;
                    logger.info(`User ${author} joined room ${roomId} via WebSocket`);

                    rooms.get(roomId).forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'userJoined', author: author }));
                        }
                    });

                } else if (type === 'signal' && ws.roomId) {
                    rooms.get(ws.roomId).forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'signal',
                                sender: author,
                                payload: payload
                            }));
                        }
                    });
                }
            } catch (error) {
                logger.error('WebSocket message error:', error);
            }
        });

        ws.on('close', () => {
            logger.info(`WebSocket client disconnected: ${ws.user.username}`);
            if (ws.roomId && rooms.has(ws.roomId)) {
                rooms.get(ws.roomId).delete(ws);
                rooms.get(ws.roomId).forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'userLeft', author: ws.user.username }));
                    }
                });
                if (rooms.get(ws.roomId).size === 0) {
                    rooms.delete(ws.roomId);
                }
            }
        });

        ws.on('error', error => {
            logger.error('WebSocket error:', error);
        });
    });
};

module.exports = { initWebSocket };
