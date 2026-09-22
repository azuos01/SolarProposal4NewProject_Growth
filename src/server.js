'use strict';

const express = require('express');
const path = require('node:path');
const { openDb } = require('./db');
const { apiKeyAuth } = require('./middleware/auth');
const { leadsRouter } = require('./routes/leads');
const { proposalsRouter, publicProposalRouter } = require('./routes/proposals');

/**
 * Monta a aplicação Express. Recebe o caminho do banco (permite ':memory:'
 * em testes) para não depender de estado global — importante para os
 * testes de integração conseguirem rodar isolados.
 */
function createApp(dbPath) {
  const db = openDb(dbPath);
  const app = express();

  app.use(express.json());

  // Rotas administrativas — protegidas por API key (ver src/middleware/auth.js)
  const adminRouter = express.Router();
  adminRouter.use('/leads', leadsRouter(db));
  adminRouter.use('/', proposalsRouter(db));
  app.use('/api', apiKeyAuth, adminRouter);

  // Rota pública — link que vai para o lead, sem autenticação
  app.use('/p', publicProposalRouter(db));

  // Frontend administrativo estático (cadastro de lead + geração de proposta)
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ erro: 'erro interno' });
  });

  return { app, db };
}

if (require.main === module) {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
  const port = process.env.PORT || 3000;
  const { app } = createApp(dbPath);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Soluções Solares — app de propostas rodando em http://localhost:${port}`);
    if (!process.env.API_KEY) {
      // eslint-disable-next-line no-console
      console.warn('AVISO: API_KEY não configurada — rotas /api/* estão sem autenticação.');
    }
  });
}

module.exports = { createApp };
