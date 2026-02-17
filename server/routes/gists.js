const express = require('express');
const router = express.Router();
const diagrams = require('../services/diagrams');

/**
 * @openapi
 * components:
 *   schemas:
 *     Diagram:
 *       type: object
 *       properties:
 *         public:
 *           type: boolean
 *         filename:
 *           type: string
 *         description:
 *           type: string
 *         content:
 *           type: string
 */

/**
 * @openapi
 * /gists:
 *   post:
 *     summary: Create a new diagram
 *     tags: [Gists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Diagram'
 *     responses:
 *       201:
 *         description: Diagram created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 */
router.post('/', (req, res) => {
    try {
        const { public, description, filename, content } = req.body;
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

/**
 * @openapi
 * /gists/{id}:
 *   patch:
 *     summary: Update diagram (create new version)
 *     tags: [Gists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.patch('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { filename, content } = req.body;

        diagrams.updateDiagram(id, { filename, content });

        res.json({ deleted: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @openapi
 * /gists/{id}:
 *   delete:
 *     summary: Delete diagram and all versions
 *     tags: [Gists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted successfully
 */
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        diagrams.deleteDiagram(id);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @openapi
 * /gists/{id}:
 *   get:
 *     summary: Get diagram details (latest version)
 *     tags: [Gists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Diagram details
 *       404:
 *         description: Not found
 */
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

/**
 * @openapi
 * /gists/{id}/commits:
 *   get:
 *     summary: Get version history
 *     tags: [Gists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of versions
 */
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

/**
 * @openapi
 * /gists/{id}/{sha}:
 *   get:
 *     summary: Get specific version content
 *     tags: [Gists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sha
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Version details
 */
router.get('/:id/:sha', (req, res) => {
    try {
        const { id, sha } = req.params;

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

/**
 * @openapi
 * /gists/{id}/file-versions/{filename}:
 *   get:
 *     summary: Get file versions with pagination
 *     tags: [Gists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated versions
 */
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

/**
 * @openapi
 * /gists/{id}/file/{filename}/compare/{versionA}/{versionB}:
 *   get:
 *     summary: Compare two versions of a file
 *     tags: [Gists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: versionA
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: versionB
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content of both versions
 */
router.get('/:id/file/:filename/compare/:versionA/:versionB', (req, res) => {
    try {
        const { id, filename, versionA, versionB } = req.params;

        const result = diagrams.compare(id, filename, versionA, versionB);

        res.json({ data: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
