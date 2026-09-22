'use strict';

/**
 * cepService.js
 * ---------------------------------------------------------------------------
 * Consulta de endereço a partir do CEP (Código de Endereçamento Postal),
 * usada para preencher automaticamente os dados do lead/cliente no
 * cadastro (logradouro, bairro, cidade, UF), evitando digitação manual e
 * erros de endereço na proposta.
 *
 * Usa a API pública ViaCEP (https://viacep.com.br) — gratuita, sem
 * autenticação, mantida pela comunidade e amplamente usada no mercado
 * brasileiro. Implementado com o `fetch` nativo do Node (>=18), sem
 * dependência externa.
 * ---------------------------------------------------------------------------
 */

const VIACEP_BASE_URL = process.env.VIACEP_BASE_URL || 'https://viacep.com.br/ws';
const TIMEOUT_MS = 5000;

class CepInvalidoError extends Error {
  constructor(cep) {
    super(`CEP inválido: "${cep}" — informe 8 dígitos numéricos`);
    this.name = 'CepInvalidoError';
    this.status = 400;
  }
}

class CepNaoEncontradoError extends Error {
  constructor(cep) {
    super(`CEP não encontrado: ${cep}`);
    this.name = 'CepNaoEncontradoError';
    this.status = 404;
  }
}

class CepServiceIndisponivelError extends Error {
  constructor(causa) {
    super(`Serviço de consulta de CEP indisponível: ${causa}`);
    this.name = 'CepServiceIndisponivelError';
    this.status = 502;
  }
}

/** Remove tudo que não é dígito e valida que restam exatamente 8 dígitos. */
function normalizarCep(cepBruto) {
  const digitos = String(cepBruto ?? '').replace(/\D/g, '');
  if (digitos.length !== 8) {
    throw new CepInvalidoError(cepBruto);
  }
  return digitos;
}

/**
 * Busca o endereço correspondente a um CEP.
 * @param {string} cepBruto - CEP em qualquer formato (com ou sem traço).
 * @returns {Promise<{cep:string, logradouro:string, bairro:string, cidade:string, uf:string}>}
 */
async function buscarEnderecoPorCep(cepBruto) {
  const cep = normalizarCep(cepBruto);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta;
  try {
    resposta = await fetch(`${VIACEP_BASE_URL}/${cep}/json/`, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new CepServiceIndisponivelError('tempo limite excedido ao consultar o CEP');
    }
    throw new CepServiceIndisponivelError(err.message);
  } finally {
    clearTimeout(timeout);
  }

  if (!resposta.ok) {
    throw new CepServiceIndisponivelError(`resposta HTTP ${resposta.status} do provedor de CEP`);
  }

  const dados = await resposta.json();

  // ViaCEP retorna 200 OK com { erro: true } quando o CEP não existe.
  if (dados.erro) {
    throw new CepNaoEncontradoError(cep);
  }

  return {
    cep: dados.cep || `${cep.slice(0, 5)}-${cep.slice(5)}`,
    logradouro: dados.logradouro || '',
    bairro: dados.bairro || '',
    cidade: dados.localidade || '',
    uf: dados.uf || '',
  };
}

module.exports = {
  buscarEnderecoPorCep,
  normalizarCep,
  CepInvalidoError,
  CepNaoEncontradoError,
  CepServiceIndisponivelError,
};
