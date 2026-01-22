/**
 * Centralized error handling middleware
 * Should be used as the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
    // Log the error
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
        url: req.url,
        method: req.method,
    });

    // Default error values
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';

    // Send appropriate error response based on environment
    res.status(status).json({
        error: process.env.NODE_ENV === 'production'
            ? (status >= 500 ? 'Internal server error' : message)
            : message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
};

/**
 * 404 handler for routes that don't exist
 */
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
