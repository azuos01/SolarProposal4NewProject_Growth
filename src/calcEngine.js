'use strict';

/**
 * calcEngine.js
 * ---------------------------------------------------------------------------
 * Motor de cálculo de dimensionamento e financeiro para propostas de energia
 * solar fotovoltaica da Soluções Solares Ltda.
 *
 * Regras de negócio validadas em propostas reais (ver /docs no README):
 *   - Bloco padrão de ampliação com microinversor: 1 microinversor DEYE
 *     SUN2250 G3 (4 MPPTs) + 4 módulos de 600 Wp = 2,40 kWp por bloco.
 *   - Yield de referência: ~973 kWh/kWp/ano (derivado de geração anual
 *     observada em campo, ver relatório de desempenho da usina de
 *     5,50 kWp em Araraquara-SP).
 *   - Tabela de referência de mercado: Greener jan/2026 (kit + serviços de
 *     integração, R$/Wp, por faixa de potência). Usada como pano de fundo;
 *     o preço final ao cliente segue a política comercial vigente
 *     (equipamentos + serviço, valores fixos definidos pela empresa).
 *
 * Módulo sem dependências externas — funciona em Node (CommonJS) e pode ser
 * carregado direto no navegador via <script> (expõe `window.CalcEngine`).
 * ---------------------------------------------------------------------------
 */

// Tabela de referência de mercado Greener jan/2026 (Estudo Estratégico SED
// Greener, março/2026) — kit (R$/Wp), srv = serviços de integração (R$/Wp).
const GREENER_JAN26 = [
  { kwp: 2, kit: 1.68, srv: 1.76 },
  { kwp: 4, kit: 1.42, srv: 1.24 },
  { kwp: 8, kit: 1.26, srv: 0.95 },
  { kwp: 12, kit: 1.21, srv: 0.83 },
  { kwp: 30, kit: 1.12, srv: 0.78 },
  { kwp: 50, kit: 1.14, srv: 0.81 },
  { kwp: 75, kit: 1.06, srv: 1.2 },
  { kwp: 150, kit: 1.03, srv: 1.18 },
  { kwp: 300, kit: 1.02, srv: 1.18 },
  { kwp: 500, kit: 1.02, srv: 1.25 },
];

/** Interpola linearmente a tabela Greener jan/26 para uma potência em kWp. */
function greenerInterp(kwp, field) {
  if (!['kit', 'srv'].includes(field)) {
    throw new TypeError(`campo inválido para greenerInterp: ${field}`);
  }
  const t = GREENER_JAN26;
  if (kwp <= t[0].kwp) return t[0][field];
  if (kwp >= t[t.length - 1].kwp) return t[t.length - 1][field];
  for (let i = 0; i < t.length - 1; i++) {
    if (kwp >= t[i].kwp && kwp <= t[i + 1].kwp) {
      const r = (kwp - t[i].kwp) / (t[i + 1].kwp - t[i].kwp);
      return t[i][field] + r * (t[i + 1][field] - t[i][field]);
    }
  }
  return t[t.length - 1][field];
}

/** Retorna referência de mercado (R$/Wp) kit+serviços para uma potência. */
function greenerReferenciaTotal(kwp) {
  return greenerInterp(kwp, 'kit') + greenerInterp(kwp, 'srv');
}

/**
 * Dimensiona a potência necessária (kWp) a partir do consumo líquido mensal.
 * @param {number} consumoLiquidoMensalKwh - consumo médio mensal já descontada a taxa mínima
 * @param {number} irradiacao - HSP médio local (kWh/m²/dia), padrão 5,0
 * @param {number} perdas - fator de perdas do sistema (0-1), padrão 0,8 (20% de perdas)
 */
function dimensionarPotenciaBase(consumoLiquidoMensalKwh, irradiacao = 5.0, perdas = 0.8) {
  if (consumoLiquidoMensalKwh <= 0) return 0;
  return (consumoLiquidoMensalKwh * 12) / (irradiacao * 365 * perdas);
}

/** Arredonda uma potência (kWp) para cima, em número inteiro de módulos. */
function moduloParaCima(kwp, moduloWp = 600) {
  return Math.ceil((kwp * 1000) / moduloWp);
}

/**
 * Desenho em blocos idênticos de ampliação: 1 microinversor DEYE 2250
 * (4 MPPTs) + N módulos (até 4, 1 painel por MPPT). Generaliza a lógica
 * validada nas propostas de ampliação já entregues.
 * @param {number} numBlocos - quantidade de blocos completos desejados
 * @param {number} modulosPorBloco - módulos por microinversor (padrão 4)
 * @param {number} moduloWp - potência do módulo em Wp (padrão 600)
 */
function blocoMicroinversor(numBlocos, modulosPorBloco = 4, moduloWp = 600) {
  if (numBlocos < 1 || !Number.isInteger(numBlocos)) {
    throw new RangeError('numBlocos deve ser um inteiro >= 1');
  }
  const modulos = numBlocos * modulosPorBloco;
  const kwp = (modulos * moduloWp) / 1000;
  return { blocos: numBlocos, microinversores: numBlocos, modulos, kwp };
}

/** Geração anual estimada (kWh) para uma potência (kWp) e yield (kWh/kWp/ano). */
function calcularGeracaoAnual(kwp, yieldKwpAno = 973) {
  return kwp * yieldKwpAno;
}

/** Cobertura da demanda anual (%), geração ÷ demanda. */
function calcularCobertura(geracaoAnualKwh, demandaAnualKwh) {
  if (demandaAnualKwh <= 0) return null;
  return (geracaoAnualKwh / demandaAnualKwh) * 100;
}

/**
 * Financeiro: economia, payback simples e projeção nominal de N anos com
 * inflação energética composta (sem desconto a valor presente — mesma
 * convenção usada nas propostas já entregues à Soluções Solares).
 */
function calcularFinanceiro({
  investimentoTotal,
  geracaoAdicionalAnualKwh,
  tarifaKwh,
  anos = 25,
  inflacaoEnergia = 0.08,
}) {
  const economiaAnual = geracaoAdicionalAnualKwh * tarifaKwh;
  const economiaMensal = economiaAnual / 12;
  const paybackAnos = economiaAnual > 0 ? investimentoTotal / economiaAnual : Infinity;

  let fatorProjecao = 0;
  for (let t = 0; t < anos; t++) fatorProjecao += Math.pow(1 + inflacaoEnergia, t);
  const projecaoNominal = economiaAnual * fatorProjecao;

  return { economiaAnual, economiaMensal, paybackAnos, projecaoNominal };
}

/** Formata um valor numérico como moeda brasileira (R$ 1.234,56). */
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/** Formata um número com separador de milhar no padrão pt-BR. */
function formatNumeroBR(value, casasDecimais = 0) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  }).format(value);
}

const CalcEngine = {
  GREENER_JAN26,
  greenerInterp,
  greenerReferenciaTotal,
  dimensionarPotenciaBase,
  moduloParaCima,
  blocoMicroinversor,
  calcularGeracaoAnual,
  calcularCobertura,
  calcularFinanceiro,
  formatBRL,
  formatNumeroBR,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalcEngine;
}
if (typeof window !== 'undefined') {
  window.CalcEngine = CalcEngine;
}
