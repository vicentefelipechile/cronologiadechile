/**
 * Imports
 */
const { createProxyMiddleware } = require('http-proxy-middleware');
const session = require('express-session');
const express = require('express');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');


/**
 * Configuration
 */

dotenv.config(); // Load environment variables from .env file


/**
 * Express Application Setup
 */

const app = express();
const api = express();
const port = 3000;

const MIDDLEWARE_CONFIG = {
    target: 'http://127.0.0.1:8787',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '',
    },
}


/**
 * Authentication Middleware
 */

/**
 * Middleware to check if the user is authenticated.
 * If authenticated, proceeds to the next middleware or route handler.
 * Otherwise, redirects the user to the login page.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 */

const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.redirect('/login.html');
};


/**
 * Session Management
 */

app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey', // Use a strong, random secret from .env
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded



/**
 * API Routes
 */

api.use('/', createProxyMiddleware(MIDDLEWARE_CONFIG));
api.get('/articles', isAuthenticated, createProxyMiddleware(MIDDLEWARE_CONFIG));
api.post('articles/:key', isAuthenticated, createProxyMiddleware(MIDDLEWARE_CONFIG));
api.delete('articles/:key', isAuthenticated, createProxyMiddleware(MIDDLEWARE_CONFIG));

app.use('/api', api);


/**
 * Routes
 */

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

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

