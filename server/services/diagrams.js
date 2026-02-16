const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../data');
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}

const db = new Database(path.join(dbPath, 'drawdb.sqlite'));

// Initialize DB
const schemaPath = path.join(__dirname, '../db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

module.exports = {
    createDiagram: ({ public = false, description, filename, content }) => {
        const id = uuidv4();
        const versionId = uuidv4(); // Initial version

        const insertDiagram = db.prepare('INSERT INTO diagrams (id, public_access, description) VALUES (?, ?, ?)');
        const insertVersion = db.prepare('INSERT INTO versions (id, diagram_id, filename, content) VALUES (?, ?, ?, ?)');

        const transaction = db.transaction(() => {
            insertDiagram.run(id, public ? 1 : 0, description);
            insertVersion.run(versionId, id, filename, content);
        });

        transaction();
        return { id };
    },

    updateDiagram: (id, { filename, content }) => {
        const versionId = uuidv4(); // New version ID (SHA equivalent)

        const insertVersion = db.prepare('INSERT INTO versions (id, diagram_id, filename, content) VALUES (?, ?, ?, ?)');
        const updateDiagramTimestamp = db.prepare('UPDATE diagrams SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');

        const transaction = db.transaction(() => {
            insertVersion.run(versionId, id, filename, content);
            updateDiagramTimestamp.run(id);
        });

        transaction();
        return true;
    },

    getDiagram: (id) => {
        const diagram = db.prepare('SELECT * FROM diagrams WHERE id = ?').get(id);
        if (!diagram) return null;

        // Get latest version
        const latestVersion = db.prepare('SELECT * FROM versions WHERE diagram_id = ? ORDER BY created_at DESC LIMIT 1').get(id);

        if (!latestVersion) return null; // Should not happen if created correctly

        return {
            url: "", // Not used by app but part of Gist response
            forks_url: "",
            commits_url: "",
            id: diagram.id,
            node_id: diagram.id,
            git_pull_url: "",
            git_push_url: "",
            html_url: "",
            files: {
                [latestVersion.filename]: {
                    filename: latestVersion.filename,
                    type: "application/json",
                    language: "JSON",
                    raw_url: "",
                    size: latestVersion.content.length,
                    truncated: false,
                    content: latestVersion.content
                }
            },
            public: !!diagram.public_access,
            created_at: diagram.created_at,
            updated_at: diagram.updated_at,
            description: diagram.description,
            comments: 0,
            user: null,
            comments_url: "",
            owner: {
                login: "local-user",
                id: 1,
                // ... other owner fields ignored
            },
            truncated: false
        };
    },

    getCommits: (id, page = 1, limit = 30) => {
        const offset = (page - 1) * limit;
        const versions = db.prepare('SELECT * FROM versions WHERE diagram_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(id, limit, offset);

        // Map to GitHub commit structure
        return versions.map(v => ({
            url: "",
            version: v.id, // The "SHA"
            user: {
                login: "local-user",
                id: 1,
            },
            change_status: {
                total: 0,
                additions: 0,
                deletions: 0
            },
            committed_at: v.created_at
        }));
    },

    // Get file history (similar to commits but specifically for versions list in UI)
    getFileVersions: (id, filename, limit = 30, cursor = 0) => {
        const offset = cursor ? parseInt(cursor) : 0;
        const versions = db.prepare('SELECT * FROM versions WHERE diagram_id = ? AND filename = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(id, limit, offset);

        // Check if there are more
        const count = db.prepare('SELECT COUNT(*) as count FROM versions WHERE diagram_id = ? AND filename = ?').get(id, filename).count;
        const hasMore = (offset + limit) < count;
        const nextCursor = hasMore ? offset + limit : null;

        return {
            data: versions.map(v => ({
                version: v.id,
                committed_at: v.created_at,
                // App seems to expect these fields for the list
            })),
            pagination: {
                hasMore,
                cursor: nextCursor
            }
        };
    },

    getVersion: (id, sha) => {
        const version = db.prepare('SELECT * FROM versions WHERE id = ? AND diagram_id = ?').get(sha, id);
        const diagram = db.prepare('SELECT * FROM diagrams WHERE id = ?').get(id);

        if (!version || !diagram) return null;

        return {
            url: "",
            forks_url: "",
            commits_url: "",
            id: diagram.id,
            node_id: diagram.id,
            git_pull_url: "",
            git_push_url: "",
            html_url: "",
            files: {
                [version.filename]: {
                    filename: version.filename,
                    type: "application/json",
                    language: "JSON",
                    raw_url: "",
                    size: version.content.length,
                    truncated: false,
                    content: version.content
                }
            },
            public: !!diagram.public_access,
            created_at: diagram.created_at,
            updated_at: version.created_at, // Version timestamp
            description: diagram.description,
            comments: 0,
            user: null,
            comments_url: "",
            owner: {
                login: "local-user",
                id: 1,
            },
            truncated: false
        };
    }
};
