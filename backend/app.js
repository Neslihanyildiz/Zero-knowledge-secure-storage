require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();

const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.get('/', (req, res) => res.json({ message: 'SecureShare API running' }));

app.use('/api/auth',  authLimiter, require('./routes/authRoutes'));
app.use('/api/files', apiLimiter,  require('./routes/fileRoutes'));
app.use('/api/admin', apiLimiter,  require('./routes/adminRoutes'));
app.use('/api/users', apiLimiter,  require('./routes/userRoutes'));

module.exports = app;