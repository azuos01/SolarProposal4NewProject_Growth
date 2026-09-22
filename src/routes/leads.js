'use strict';

const express = require('express');

function leadsRouter(db) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const { nome, cidade_uf, uc, telefone, email, consumo_medio_kwh, tarifa_kwh, dores, objecoes } = req.body || {};

    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({ erro: 'campo obrigatório: nome' });
    }
    const consumo = Number(consumo_medio_kwh);
    if (!Number.isFinite(consumo) || consumo <= 0) {
      return res.status(400).json({ erro: 'campo obrigatório e numérico > 0: consumo_medio_kwh' });
    }
    const tarifa = tarifa_kwh != null ? Number(tarifa_kwh) : 0.88;
    if (!Number.isFinite(tarifa) || tarifa <= 0) {
      return res.status(400).json({ erro: 'tarifa_kwh deve ser numérico > 0' });
    }

    const stmt = db.prepare(`
      INSERT INTO leads (nome, cidade_uf, uc, telefone, email, consumo_medio_kwh, tarifa_kwh, dores, objecoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      nome.trim(),
      cidade_uf || null,
      uc || null,
      telefone || null,
      email || null,
      consumo,
      tarifa,
      dores ? JSON.stringify(dores) : null,
      objecoes ? JSON.stringify(objecoes) : null
    );

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(lead);
  });

  router.get('/', (_req, res) => {
    const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
    res.json(leads);
  });

  router.get('/:id', (req, res) => {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id));
    if (!lead) return res.status(404).json({ erro: 'lead não encontrado' });
    res.json(lead);
  });

  return router;
}

module.exports = { leadsRouter };
