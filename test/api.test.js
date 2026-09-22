'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/server');

/** Sobe um servidor de teste em porta efêmera com banco em memória. */
function withServer(envOverrides, fn) {
  return async () => {
    const prevApiKey = process.env.API_KEY;
    if (Object.prototype.hasOwnProperty.call(envOverrides, 'API_KEY')) {
      process.env.API_KEY = envOverrides.API_KEY;
    } else {
      delete process.env.API_KEY;
    }

    const { app } = createApp(':memory:');
    const server = app.listen(0);
    const base = `http://localhost:${server.address().port}`;
    try {
      await fn(base);
    } finally {
      server.close();
      if (prevApiKey === undefined) delete process.env.API_KEY;
      else process.env.API_KEY = prevApiKey;
    }
  };
}

test(
  'fluxo completo: criar lead -> gerar proposta -> abrir link público',
  withServer({}, async (base) => {
    const leadRes = await fetch(`${base}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Lead de Teste',
        cidade_uf: 'Araraquara - SP',
        consumo_medio_kwh: 700,
        tarifa_kwh: 0.88,
      }),
    });
    assert.equal(leadRes.status, 201);
    const lead = await leadRes.json();
    assert.ok(lead.id);

    const propRes = await fetch(`${base}/api/leads/${lead.id}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocos: 2, opcao_label: 'Opção 2', equipamentos: 8490, servico: 4500 }),
    });
    assert.equal(propRes.status, 201);
    const proposal = await propRes.json();
    assert.equal(proposal.modulos, 8);
    assert.equal(proposal.kwp, 4.8);
    assert.ok(proposal.url_publica.startsWith('/p/'));

    const htmlRes = await fetch(`${base}${proposal.url_publica}`);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.match(html, /Lead de Teste/);
    assert.match(html, /Opção 2/);
    assert.match(html, /Onde você está hoje/); // etapa 1 da jornada
    assert.match(html, /Depois de ligada/); // etapa 6 da jornada
  })
);

test(
  'validação: lead sem nome é rejeitado com 400',
  withServer({}, async (base) => {
    const res = await fetch(`${base}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consumo_medio_kwh: 500 }),
    });
    assert.equal(res.status, 400);
  })
);

test(
  'proposta para lead inexistente retorna 404',
  withServer({}, async (base) => {
    const res = await fetch(`${base}/api/leads/999/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocos: 1 }),
    });
    assert.equal(res.status, 404);
  })
);

test(
  'link público de proposta inexistente retorna 404',
  withServer({}, async (base) => {
    const res = await fetch(`${base}/p/token-que-nao-existe`);
    assert.equal(res.status, 404);
  })
);

test(
  'API_KEY configurada bloqueia rotas /api sem o header correto, mas não bloqueia /p',
  withServer({ API_KEY: 'segredo-de-teste' }, async (base) => {
    const semChave = await fetch(`${base}/api/leads`);
    assert.equal(semChave.status, 401);

    const chaveErrada = await fetch(`${base}/api/leads`, { headers: { 'x-api-key': 'errada' } });
    assert.equal(chaveErrada.status, 401);

    const comChave = await fetch(`${base}/api/leads`, { headers: { 'x-api-key': 'segredo-de-teste' } });
    assert.equal(comChave.status, 200);

    const publico = await fetch(`${base}/p/qualquer-token`);
    assert.equal(publico.status, 404); // não encontrado, mas não 401 — rota pública não exige a chave
  })
);
