const express = require('express');
const router = express.Router();
const diagrams = require('../services/diagrams');

// Create a new gist (diagram)
router.post('/', (req, res) => {
    try {
        const { public, description, filename, content } = req.body;
        // Frontend sends: { public: false, filename, description, content }
        const result = diagrams.createDiagram({ public, description, filename, content });

        res.status(201).json({
            data: {
                id: result.id
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update a gist (create new version)
router.patch('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { filename, content } = req.body;

        diagrams.updateDiagram(id, { filename, content });

        res.json({ deleted: false }); // Frontend expects { deleted } property, though logic is update
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get gist details (latest version)
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const diagram = diagrams.getDiagram(id);

        if (!diagram) {
            return res.status(404).json({ error: 'Not Found' });
        }

        res.json({ data: diagram });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get commits (history)
router.get('/:id/commits', (req, res) => {
    try {
        const { id } = req.params;
        const { page, per_page } = req.query;

        const commits = diagrams.getCommits(id, parseInt(page) || 1, parseInt(per_page) || 30);

        res.json({ data: commits });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get specific version
router.get('/:id/:sha', (req, res) => {
    try {
        const { id, sha } = req.params;

        // "commits" endpoint also matches /:id/commits, so we need to handle that first or separate
        // Express matches routes in order. If I define /:id/commits above /:id/:sha it works.
        // Wait, "commits" IS the sha in /:id/:sha pattern if not careful.
        // But "commits" is a specific literal string path in other endpoint.
        // Let's rely on router order.

        const version = diagrams.getVersion(id, sha);
        if (!version) {
            return res.status(404).json({ error: 'Not Found' });
        }

        res.json({ data: version });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get file versions (history list)
router.get('/:id/file-versions/:filename', (req, res) => {
    try {
        const { id, filename } = req.params;
        const { limit, cursor } = req.query;

        const result = diagrams.getFileVersions(id, filename, parseInt(limit) || 10, cursor);

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
