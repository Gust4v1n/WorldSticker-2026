// =============================================
// Serverless Function Handler para Vercel
// Exporta o app Express como handler de Serverless Function
// =============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const stickersRouter = require('../backend/src/routes/stickers');
const userStickersRouter = require('../backend/src/routes/userStickers');
const tradesRouter = require('../backend/src/routes/trades');

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json());

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Álbum de Figurinhas API rodando na Vercel!' });
});

// Rotas
app.use('/api/stickers', stickersRouter);
app.use('/api/user-stickers', userStickersRouter);
app.use('/api/trades', tradesRouter);

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Exportar como handler de serverless function da Vercel
module.exports = app;
