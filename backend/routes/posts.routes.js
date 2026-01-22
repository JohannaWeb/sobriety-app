const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validatePost, validateComment, validateId } = require('../middleware/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => {
    const query = `
    SELECT 
      p.id, p.title, p.content, p.user_id,
      u.username as author,
      c.id as comment_id,
      c.content as comment_content,
      cu.username as comment_author
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN comments c ON c.post_id = p.id
    LEFT JOIN users cu ON c.user_id = cu.id
    ORDER BY p.id DESC, c.id ASC
  `;

    db.all(query, [], (err, rows) => {
        if (err) return next(err);

        // Reduce rows into nested structure
        const postsMap = new Map();

        rows.forEach(row => {
            if (!postsMap.has(row.id)) {
                postsMap.set(row.id, {
                    id: row.id,
                    title: row.title,
                    content: row.content,
                    author: row.author,
                    user_id: row.user_id,
                    comments: []
                });
            }

            if (row.comment_id) {
                postsMap.get(row.id).comments.push({
                    id: row.comment_id,
                    content: row.comment_content,
                    author: row.comment_author
                });
            }
        });

        res.json(Array.from(postsMap.values()));
    });
});

router.post('/', validatePost, (req, res, next) => {
    const { title, content } = req.body;
    db.run('INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)', [title, content, req.user.id], function (err) {
        if (err) return next(err);
        res.json({ id: this.lastID });
    });
});

router.post('/:id/comments', validateId, validateComment, (req, res, next) => {
    const { content } = req.body;
    db.run('INSERT INTO comments (content, post_id, user_id) VALUES (?, ?, ?)',
        [content, req.params.id, req.user.id], function (err) {
            if (err) return next(err);
            res.json({ id: this.lastID });
        });
});

module.exports = router;
