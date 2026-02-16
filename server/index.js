const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*'
}));
app.use(bodyParser.json({ limit: '10mb' }));

// Routes
const gistsRoutes = require('./routes/gists');
app.use('/gists', gistsRoutes);

// Fix for /gists/:id/commits route conflict with /gists/:id/:sha
// Actually, in gists.js I missed adding the commits route.
// Let's add it here or update gists.js. 
// I should update gists.js to include the commits route.
// But for now, let's verify if I can just add it to gists.js before /:id/:sha

app.get('/', (req, res) => {
    res.send('AnyDB Studio Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
