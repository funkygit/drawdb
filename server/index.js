const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const { initDatabase } = require('./services/diagrams');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Swagger UI convenience if needed, or configure properly
}));
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*'
}));
app.use(bodyParser.json({ limit: '10mb' }));

// Static files (for local swagger assets)
app.use(express.static(path.join(__dirname, 'public')));

// Swagger JSDoc Configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'AnyDB Studio Backend API',
            version: '1.0.0',
            description: 'Automated API documentation for AnyDB Studio',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Local Development Server',
            },
        ],
    },
    apis: ['./routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI with local assets
const swaggerUiOptions = {
    customCssUrl: '/swagger/swagger-ui.css',
    customJs: [
        '/swagger/swagger-ui-bundle.js',
        '/swagger/swagger-ui-standalone-preset.js'
    ],
    customfavIcon: '/swagger/favicon-32x32.png'
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Routes
const gistsRoutes = require('./routes/gists');
app.use('/gists', gistsRoutes);

app.get('/', (req, res) => {
    res.send('AnyDB Studio Backend is running');
});

// Initialize database (async for sql.js WASM loading) then start server
async function start() {
    try {
        await initDatabase();
        console.log('Database initialized successfully');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
}

start();
