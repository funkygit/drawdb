const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbFilePath = path.join(dbDir, 'anydb.sqlite');
const schemaPath = path.join(__dirname, '../db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

let db = null;

/**
 * Save the in-memory database to disk.
 * sql.js operates entirely in-memory, so we must explicitly
 * write it out after any mutation.
 */
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbFilePath, buffer);
    }
}

/**
 * Initialize sql.js and load (or create) the database.
 * Must be called (and awaited) before any queries.
 */
async function initDatabase() {
    const SQL = await initSqlJs();

    if (fs.existsSync(dbFilePath)) {
        const fileBuffer = fs.readFileSync(dbFilePath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Ensure schema exists
    db.run(schema);
    saveDatabase();
    return db;
}

/**
 * Get the database instance (must be initialized first).
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Helper to run a SELECT that returns multiple rows.
 * sql.js returns an array of { columns, values } objects.
 */
function queryAll(sql, params = []) {
    const result = getDb().exec(sql, params);
    if (result.length === 0) return [];
    const { columns, values } = result[0];
    return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => {
            obj[col] = row[i];
        });
        return obj;
    });
}

/**
 * Helper to run a SELECT that returns a single row.
 */
function queryOne(sql, params = []) {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

module.exports = {
    initDatabase,

    createDiagram: ({ public: isPublic = false, description, filename, content }) => {
        const id = uuidv4();
        const versionId = uuidv4();

        getDb().run('INSERT INTO diagrams (id, public_access, description) VALUES (?, ?, ?)',
            [id, isPublic ? 1 : 0, description]);
        getDb().run('INSERT INTO versions (id, diagram_id, filename, content) VALUES (?, ?, ?, ?)',
            [versionId, id, filename, content]);

        saveDatabase();
        return { id };
    },

    updateDiagram: (id, { filename, content }) => {
        const versionId = uuidv4();

        // Use null if content is undefined (for deletion)
        const dbContent = (content === undefined || content === null) ? null : content;

        getDb().run('INSERT INTO versions (id, diagram_id, filename, content) VALUES (?, ?, ?, ?)',
            [versionId, id, filename, dbContent]);

        getDb().run('UPDATE diagrams SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]);

        saveDatabase();
        return true;
    },

    getDiagram: (id) => {
        const diagram = queryOne('SELECT * FROM diagrams WHERE id = ?', [id]);
        if (!diagram) return null;

        // Get the latest entry for EACH unique filename in this diagram
        const allFiles = queryAll(`
            SELECT v1.* 
            FROM versions v1
            INNER JOIN (
                SELECT filename, MAX(created_at) as max_created_at
                FROM versions
                WHERE diagram_id = ?
                GROUP BY filename
            ) v2 ON v1.filename = v2.filename AND v1.created_at = v2.max_created_at
            WHERE v1.diagram_id = ?
        `, [id, id]);

        if (allFiles.length === 0) return null;

        const filesObject = {};
        allFiles.forEach(file => {
            // Filter out files that were deleted (last entry has null content)
            if (file.content !== null) {
                filesObject[file.filename] = {
                    filename: file.filename,
                    type: "application/json",
                    language: "JSON",
                    raw_url: "",
                    size: file.content.length,
                    truncated: false,
                    content: file.content
                };
            }
        });

        return {
            url: "",
            forks_url: "",
            commits_url: "",
            id: diagram.id,
            node_id: diagram.id,
            git_pull_url: "",
            git_push_url: "",
            html_url: "",
            files: filesObject,
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
            },
            truncated: false
        };
    },

    getCommits: (id, page = 1, limit = 30) => {
        const offset = (page - 1) * limit;
        const versions = queryAll(
            'SELECT * FROM versions WHERE diagram_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [id, limit, offset]);

        return versions.map(v => ({
            url: "",
            version: v.id,
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

    getFileVersions: (id, filename, limit = 30, cursor = 0) => {
        const offset = cursor ? parseInt(cursor) : 0;
        const versions = queryAll(
            'SELECT * FROM versions WHERE diagram_id = ? AND filename = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [id, filename, limit, offset]);

        const countResult = queryOne(
            'SELECT COUNT(*) as count FROM versions WHERE diagram_id = ? AND filename = ?',
            [id, filename]);
        const count = countResult ? countResult.count : 0;
        const hasMore = (offset + limit) < count;
        const nextCursor = hasMore ? offset + limit : null;

        return {
            data: versions.map(v => ({
                version: v.id,
                committed_at: v.created_at,
            })),
            pagination: {
                hasMore,
                cursor: nextCursor
            }
        };
    },

    getVersion: (id, sha) => {
        const version = queryOne(
            'SELECT * FROM versions WHERE id = ? AND diagram_id = ?', [sha, id]);
        const diagram = queryOne(
            'SELECT * FROM diagrams WHERE id = ?', [id]);

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
            updated_at: version.created_at,
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
    },

    compare: (id, filename, versionA, versionB) => {
        const vA = queryOne(
            'SELECT content FROM versions WHERE id = ? AND diagram_id = ? AND filename = ?',
            [versionA, id, filename]);

        // versionB can be "null" string if it's the first version
        const vB = (versionB && versionB !== 'null') ? queryOne(
            'SELECT content FROM versions WHERE id = ? AND diagram_id = ? AND filename = ?',
            [versionB, id, filename]) : null;

        return {
            contentA: vA ? vA.content : null,
            contentB: vB ? vB.content : null
        };
    },

    deleteDiagram: (id) => {
        getDb().run('DELETE FROM versions WHERE diagram_id = ?', [id]);
        getDb().run('DELETE FROM diagrams WHERE id = ?', [id]);
        saveDatabase();
        return true;
    }
};
