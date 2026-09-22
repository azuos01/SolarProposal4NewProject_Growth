'use strict';

const express = require('express');
const { buscarEnderecoPorCep } = require('../services/cepService');

function leadsRouter(db) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const {
      nome,
      cidade_uf,
      uc,
      telefone,
      email,
      consumo_medio_kwh,
      tarifa_kwh,
      dores,
      objecoes,
      cep,
      numero,
      complemento,
    } = req.body || {};

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

    // Endereço: se um CEP for informado, ele é a fonte da verdade — busca
    // via ViaCEP e preenche logradouro/bairro/cidade/UF automaticamente
    // (evita digitação manual e erros de endereço na proposta). Os campos
    // de endereço podem, alternativamente, vir prontos no corpo da
    // requisição (ex.: importação de dados já validados) sem informar cep.
    let endereco = {
      logradouro: req.body?.logradouro || null,
      bairro: req.body?.bairro || null,
      cidade: req.body?.cidade || null,
      uf: req.body?.uf || null,
    };
    let cepNormalizado = null;
    const enderecoJaCompleto = endereco.logradouro && endereco.bairro && endereco.cidade && endereco.uf;
    if (cep && !enderecoJaCompleto) {
      try {
        const resultado = await buscarEnderecoPorCep(cep);
        cepNormalizado = resultado.cep;
        endereco = {
          logradouro: endereco.logradouro || resultado.logradouro || null,
          bairro: endereco.bairro || resultado.bairro || null,
          cidade: endereco.cidade || resultado.cidade || null,
          uf: endereco.uf || resultado.uf || null,
        };
      } catch (err) {
        const status = err.status || 502;
        return res.status(status).json({ erro: `não foi possível resolver o endereço pelo CEP: ${err.message}` });
      }
    }

    const cidadeUfFinal = cidade_uf || (endereco.cidade && endereco.uf ? `${endereco.cidade} - ${endereco.uf}` : null);

    const stmt = db.prepare(`
      INSERT INTO leads (
        nome, cidade_uf, uc, telefone, email, consumo_medio_kwh, tarifa_kwh, dores, objecoes,
        cep, logradouro, numero, complemento, bairro, cidade, uf
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      nome.trim(),
      cidadeUfFinal,
      uc || null,
      telefone || null,
      email || null,
      consumo,
      tarifa,
      dores ? JSON.stringify(dores) : null,
      objecoes ? JSON.stringify(objecoes) : null,
      cepNormalizado || cep || null,
      endereco.logradouro,
      numero || null,
      complemento || null,
      endereco.bairro,
      endereco.cidade,
      endereco.uf
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
