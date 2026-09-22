'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buscarEnderecoPorCep,
  normalizarCep,
  CepInvalidoError,
  CepNaoEncontradoError,
  CepServiceIndisponivelError,
} = require('../src/services/cepService');

/** Troca o fetch global por um stub durante o teste e restaura ao final. */
function comFetchStub(stub, fn) {
  return async () => {
    const originalFetch = global.fetch;
    global.fetch = stub;
    try {
      await fn();
    } finally {
      global.fetch = originalFetch;
    }
  };
}

function respostaJson(corpo, ok = true, status = 200) {
  return { ok, status, json: async () => corpo };
}

test('normalizarCep aceita CEP com traço e remove caracteres não numéricos', () => {
  assert.equal(normalizarCep('14800-000'), '14800000');
  assert.equal(normalizarCep('14800000'), '14800000');
});

test('normalizarCep rejeita CEP com quantidade errada de dígitos', () => {
  assert.throws(() => normalizarCep('123'), CepInvalidoError);
  assert.throws(() => normalizarCep(''), CepInvalidoError);
  assert.throws(() => normalizarCep('148000001'), CepInvalidoError);
});

test(
  'buscarEnderecoPorCep retorna o endereço para um CEP válido',
  comFetchStub(
    async (url) => {
      assert.match(url, /\/14800000\/json\/$/);
      return respostaJson({
        cep: '14800-000',
        logradouro: 'Rua Voluntários da Pátria',
        bairro: 'Centro',
        localidade: 'Araraquara',
        uf: 'SP',
      });
    },
    async () => {
      const endereco = await buscarEnderecoPorCep('14800-000');
      assert.deepEqual(endereco, {
        cep: '14800-000',
        logradouro: 'Rua Voluntários da Pátria',
        bairro: 'Centro',
        cidade: 'Araraquara',
        uf: 'SP',
      });
    }
  )
);

test(
  'buscarEnderecoPorCep lança CepNaoEncontradoError quando o ViaCEP responde { erro: true }',
  comFetchStub(
    async () => respostaJson({ erro: true }),
    async () => {
      await assert.rejects(() => buscarEnderecoPorCep('99999999'), CepNaoEncontradoError);
    }
  )
);

test(
  'buscarEnderecoPorCep lança CepServiceIndisponivelError em falha de rede',
  comFetchStub(
    async () => {
      throw new Error('conexão recusada');
    },
    async () => {
      await assert.rejects(() => buscarEnderecoPorCep('14800000'), CepServiceIndisponivelError);
    }
  )
);

test(
  'buscarEnderecoPorCep lança CepServiceIndisponivelError em resposta HTTP não-OK',
  comFetchStub(
    async () => respostaJson({}, false, 503),
    async () => {
      await assert.rejects(() => buscarEnderecoPorCep('14800000'), CepServiceIndisponivelError);
    }
  )
);

test('buscarEnderecoPorCep rejeita CEP mal formatado antes de chamar a rede', async () => {
  const originalFetch = global.fetch;
  let chamou = false;
  global.fetch = async () => {
    chamou = true;
    return respostaJson({});
  };
  try {
    await assert.rejects(() => buscarEnderecoPorCep('abc'), CepInvalidoError);
    assert.equal(chamou, false, 'não deveria chamar a rede para CEP inválido');
  } finally {
    global.fetch = originalFetch;
  }
});
