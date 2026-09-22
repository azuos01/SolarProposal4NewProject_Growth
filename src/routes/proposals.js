'use strict';

const express = require('express');
const calc = require('../calcEngine');
const { novoTokenPublico } = require('../db');
const { renderProposalHtml } = require('../render/renderProposal');

function proposalsRouter(db) {
  const router = express.Router();

  // POST /api/leads/:leadId/proposals
  // body: { blocos: number (>=1, default 1), opcao_label?: string, demanda_anual_kwh?: number, yield_kwp_ano?: number }
  router.post('/leads/:leadId/proposals', (req, res) => {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.leadId));
    if (!lead) return res.status(404).json({ erro: 'lead não encontrado' });

    const blocos = Number.isInteger(req.body?.blocos) ? req.body.blocos : 1;
    if (blocos < 1) return res.status(400).json({ erro: 'blocos deve ser um inteiro >= 1' });

    const yieldKwpAno = Number.isFinite(req.body?.yield_kwp_ano) ? req.body.yield_kwp_ano : 973;
    const demandaAnual = Number.isFinite(req.body?.demanda_anual_kwh) ? req.body.demanda_anual_kwh : null;

    // preço final ao cliente: se não vier no corpo, usa a referência de
    // mercado Greener jan/26 como fallback (ver README — a política
    // comercial fixa deve ser informada explicitamente pelo operador).
    const bloco = calc.blocoMicroinversor(blocos);
    const geracaoAnual = calc.calcularGeracaoAnual(bloco.kwp, yieldKwpAno);
    const coberturaPct = demandaAnual ? calc.calcularCobertura(geracaoAnual, demandaAnual) : null;

    let equipamentos = Number(req.body?.equipamentos);
    let servico = Number(req.body?.servico);
    if (!Number.isFinite(equipamentos) || !Number.isFinite(servico)) {
      const refTotal = calc.greenerReferenciaTotal(bloco.kwp) * bloco.kwp * 1000;
      equipamentos = req.body?.equipamentos ?? refTotal * 0.6;
      servico = req.body?.servico ?? refTotal * 0.4;
    }
    const investimentoTotal = equipamentos + servico;

    const financeiro = calc.calcularFinanceiro({
      investimentoTotal,
      geracaoAdicionalAnualKwh: geracaoAnual,
      tarifaKwh: lead.tarifa_kwh,
    });

    const opcaoLabel = req.body?.opcao_label || `Opção ${blocos} bloco${blocos > 1 ? 's' : ''}`;
    const publicToken = novoTokenPublico();

    const stmt = db.prepare(`
      INSERT INTO proposals (
        lead_id, versao, opcao_label, blocos, modulos, kwp, geracao_anual_kwh, cobertura_pct,
        equipamentos, servico, investimento_total, economia_mensal, economia_anual, payback_anos, public_token
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const versaoRow = db
      .prepare('SELECT COALESCE(MAX(versao), 0) + 1 AS v FROM proposals WHERE lead_id = ?')
      .get(lead.id);

    const info = stmt.run(
      lead.id,
      versaoRow.v,
      opcaoLabel,
      bloco.blocos,
      bloco.modulos,
      bloco.kwp,
      geracaoAnual,
      coberturaPct,
      equipamentos,
      servico,
      investimentoTotal,
      financeiro.economiaMensal,
      financeiro.economiaAnual,
      financeiro.paybackAnos,
      publicToken
    );

    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ ...proposal, url_publica: `/p/${publicToken}` });
  });

  // GET /api/proposals/:id — dados brutos (rota administrativa)
  router.get('/proposals/:id', (req, res) => {
    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(Number(req.params.id));
    if (!proposal) return res.status(404).json({ erro: 'proposta não encontrada' });
    res.json(proposal);
  });

  // GET /api/leads/:leadId/proposals — lista propostas de um lead
  router.get('/leads/:leadId/proposals', (req, res) => {
    const proposals = db
      .prepare('SELECT * FROM proposals WHERE lead_id = ? ORDER BY versao DESC')
      .all(Number(req.params.leadId));
    res.json(proposals);
  });

  return router;
}

/**
 * Router público (sem autenticação): serve o HTML renderizado da proposta
 * pelo token aleatório — este é o link que o lead recebe.
 */
function publicProposalRouter(db) {
  const router = express.Router();

  router.get('/:token', (req, res) => {
    const proposal = db.prepare('SELECT * FROM proposals WHERE public_token = ?').get(req.params.token);
    if (!proposal) return res.status(404).send('Proposta não encontrada.');
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(proposal.lead_id);

    const html = renderProposalHtml({
      lead,
      calc: {
        kwp: proposal.kwp,
        modulos: proposal.modulos,
        blocos: proposal.blocos,
        geracaoAnual: proposal.geracao_anual_kwh,
        coberturaPct: proposal.cobertura_pct,
        equipamentos: proposal.equipamentos,
        servico: proposal.servico,
        investimentoTotal: proposal.investimento_total,
        economiaMensal: proposal.economia_mensal,
        economiaAnual: proposal.economia_anual,
        paybackAnos: proposal.payback_anos,
        projecaoNominal:
          proposal.economia_anual *
          Array.from({ length: 25 }, (_, t) => Math.pow(1.08, t)).reduce((a, b) => a + b, 0),
      },
      propostaId: `${proposal.lead_id}.${proposal.versao}`,
      opcaoLabel: proposal.opcao_label,
      dataEmissao: new Date(proposal.created_at + 'Z').toLocaleDateString('pt-BR'),
    });

    res.type('html').send(html);
  });

  return router;
}

module.exports = { proposalsRouter, publicProposalRouter };
