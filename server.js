
const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = 3000;

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.redirect('/login.html');
};

// Session middleware configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey', // Use a strong, random secret from .env
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Proxy middleware for requests to /api
// Protect POST /api/articles
app.post('/api/articles', isAuthenticated, createProxyMiddleware({
    target: 'http://127.0.0.1:8787',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // rewrite path
    },
}));

// Protect PUT /api/articles/:key
app.put('/api/articles/:key', isAuthenticated, createProxyMiddleware({
    target: 'http://127.0.0.1:8787',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // rewrite path
    },
}));

// Protect DELETE /api/articles/:key
app.delete('/api/articles/:key', isAuthenticated, createProxyMiddleware({
    target: 'http://127.0.0.1:8787',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // rewrite path
    },
}));

// General proxy middleware for other /api requests (e.g., GET /api/articles)
app.use('/api', createProxyMiddleware({
    target: 'http://127.0.0.1:8787',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // rewrite path
    },
}));

// Endpoint to check authentication status
app.get('/check-auth', (req, res) => {
    if (req.session.isAuthenticated) {
        res.json({ isAuthenticated: true });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (username === adminUsername && await bcrypt.compare(password, adminPasswordHash)) {
        req.session.isAuthenticated = true;
        res.status(200).send('Login successful');
    } else {
        res.status(401).send('Invalid credentials');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.redirect('/login.html');
    });
});

// Protect admin.html
app.get('/admin.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve static files from the 'src' directory
app.use('/src', express.static(path.join(__dirname, 'src')));

// Serve other static files from the root directory
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});



// AI Article Generation Endpoint (DISABLED)
/*
app.post('/api/generate-article', isAuthenticated, async (req, res) => {
    const { topic } = req.body;
    if (!topic) {
        return res.status(400).send('Topic is required.');
    }

    try {
        // Simulate AI generation using google_web_search
        const searchResults = await default_api.google_web_search({ query: topic });
        
        let generatedTitle = `Artículo sobre ${topic}`;
        let generatedDescription = `![M]Este es un artículo generado automáticamente sobre el tema: **${topic}**.`;
        const generatedSources = [];
        const generatedTags = topic.toLowerCase().split(' ');
        const generatedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const generatedAuthor = 'Gemini AI';

        if (searchResults && searchResults.output && searchResults.output.web_search_results) {
            const results = searchResults.output.web_search_results;
            if (results.length > 0) {
                generatedTitle = results[0].title || generatedTitle;
                generatedDescription += '\n\nBasado en la siguiente información:\n';
                results.slice(0, 3).forEach(result => { // Take top 3 results as sources
                    generatedSources.push(result.url);
                    generatedDescription += `- [${result.title}](${result.url})\n`;
                });
            }
        }

        const generatedArticle = {
            title: generatedTitle,
            date: generatedDate,
            author: generatedAuthor,
            description: generatedDescription,
            source: generatedSources,
            tags: generatedTags,
        };

        res.json(generatedArticle);

    } catch (error) {
        console.error('Error generating article:', error);
        res.status(500).send('Failed to generate article.');
    }
});
*/

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

