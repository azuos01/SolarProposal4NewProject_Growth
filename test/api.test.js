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

/**
 * Troca o fetch global por um stub do ViaCEP durante o teste e restaura ao
 * final. Só intercepta chamadas que batem no padrão de URL do ViaCEP —
 * qualquer outra chamada (inclusive as do próprio teste contra o servidor
 * local em `${base}/...`) segue para o fetch real, já que ambas usam o
 * mesmo `fetch` global do Node.
 */
function comViaCepStub(respostaPorCep, fn) {
  return async (...args) => {
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      const cepMatch = String(url).match(/viacep\.com\.br\/ws\/([0-9]{8})\/json\/$/);
      if (!cepMatch) return originalFetch(url, options);
      const corpo = respostaPorCep[cepMatch[1]] ?? { erro: true };
      return { ok: true, status: 200, json: async () => corpo };
    };
    try {
      await fn(...args);
    } finally {
      global.fetch = originalFetch;
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

test(
  'GET /api/cep/:cep retorna o endereço para um CEP válido',
  withServer(
    {},
    comViaCepStub(
      {
        '14800000': {
          cep: '14800-000',
          logradouro: 'Rua Voluntários da Pátria',
          bairro: 'Centro',
          localidade: 'Araraquara',
          uf: 'SP',
        },
      },
      async (base) => {
        const res = await fetch(`${base}/api/cep/14800-000`);
        assert.equal(res.status, 200);
        const endereco = await res.json();
        assert.equal(endereco.logradouro, 'Rua Voluntários da Pátria');
        assert.equal(endereco.cidade, 'Araraquara');
        assert.equal(endereco.uf, 'SP');
      }
    )
  )
);

test(
  'GET /api/cep/:cep retorna 404 para CEP inexistente e 400 para CEP mal formatado',
  withServer(
    {},
    comViaCepStub({}, async (base) => {
      const inexistente = await fetch(`${base}/api/cep/99999999`);
      assert.equal(inexistente.status, 404);

      const malFormatado = await fetch(`${base}/api/cep/123`);
      assert.equal(malFormatado.status, 400);
    })
  )
);

test(
  'GET /api/cep/:cep exige API_KEY quando configurada (rota administrativa)',
  withServer(
    { API_KEY: 'segredo-de-teste' },
    comViaCepStub(
      { '14800000': { cep: '14800-000', logradouro: 'Rua X', bairro: 'Centro', localidade: 'Araraquara', uf: 'SP' } },
      async (base) => {
        const semChave = await fetch(`${base}/api/cep/14800000`);
        assert.equal(semChave.status, 401);

        const comChave = await fetch(`${base}/api/cep/14800000`, { headers: { 'x-api-key': 'segredo-de-teste' } });
        assert.equal(comChave.status, 200);
      }
    )
  )
);

test(
  'POST /api/leads com CEP preenche logradouro/bairro/cidade/UF automaticamente',
  withServer(
    {},
    comViaCepStub(
      {
        '14800000': {
          cep: '14800-000',
          logradouro: 'Rua Voluntários da Pátria',
          bairro: 'Centro',
          localidade: 'Araraquara',
          uf: 'SP',
        },
      },
      async (base) => {
        const res = await fetch(`${base}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: 'Lead com CEP',
            consumo_medio_kwh: 500,
            cep: '14800-000',
            numero: '123',
          }),
        });
        assert.equal(res.status, 201);
        const lead = await res.json();
        assert.equal(lead.logradouro, 'Rua Voluntários da Pátria');
        assert.equal(lead.bairro, 'Centro');
        assert.equal(lead.cidade, 'Araraquara');
        assert.equal(lead.uf, 'SP');
        assert.equal(lead.numero, '123');
        assert.equal(lead.cidade_uf, 'Araraquara - SP'); // derivado do CEP quando não informado manualmente
      }
    )
  )
);

test(
  'POST /api/leads com CEP inexistente retorna erro e não cadastra o lead',
  withServer(
    {},
    comViaCepStub({}, async (base) => {
      const res = await fetch(`${base}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Lead CEP inválido', consumo_medio_kwh: 500, cep: '00000000' }),
      });
      assert.equal(res.status, 404);

      const listaRes = await fetch(`${base}/api/leads`);
      const lista = await listaRes.json();
      assert.equal(lista.length, 0);
    })
  )
);
