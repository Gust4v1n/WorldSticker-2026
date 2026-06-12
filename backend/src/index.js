require('dotenv').config();
const express = require('express');
const cors = require('cors');

const stickersRouter = require('./routes/stickers');
const userStickersRouter = require('./routes/userStickers');
const tradesRouter = require('./routes/trades');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globais
app.use(cors());
app.use(express.json());

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Álbum de Figurinhas API rodando!' });
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});
