import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import auth from './routes/auth.js';
import catalog from './routes/catalog.js';
import orders from './routes/orders.js';
import admin from './routes/admin.js';

for (const k of ['MONGODB_URI', 'JWT_SECRET']) if (!process.env[k]) throw new Error(`Missing ${k} in .env`);

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/orders', orders);
app.use('/api/admin', admin);
app.use('/api', catalog);

app.use((req, res) => res.status(404).json({ error: 'Route introuvable' }));
app.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Erreur serveur' });
});

await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected');
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API on http://localhost:${port}`));
