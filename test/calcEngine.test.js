'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../src/calcEngine');

test('greenerInterp retorna valores exatos nos pontos da tabela', () => {
  assert.equal(calc.greenerInterp(2, 'kit'), 1.68);
  assert.equal(calc.greenerInterp(4, 'kit'), 1.42);
  assert.equal(calc.greenerInterp(500, 'srv'), 1.25);
});

test('greenerInterp interpola linearmente entre pontos', () => {
  // ponto médio entre 2kWp (kit 1.68) e 4kWp (kit 1.42) -> 1.55
  assert.ok(Math.abs(calc.greenerInterp(3, 'kit') - 1.55) < 1e-9);
});

test('greenerInterp satura fora da faixa da tabela', () => {
  assert.equal(calc.greenerInterp(0.5, 'kit'), calc.greenerInterp(2, 'kit'));
  assert.equal(calc.greenerInterp(1000, 'kit'), calc.greenerInterp(500, 'kit'));
});

test('blocoMicroinversor: 1 bloco = 1 microinversor + 4 módulos = 2,40 kWp', () => {
  const b = calc.blocoMicroinversor(1);
  assert.equal(b.microinversores, 1);
  assert.equal(b.modulos, 4);
  assert.equal(b.kwp, 2.4);
});

test('blocoMicroinversor: 2 blocos dobram módulos, microinversores e kWp', () => {
  const b = calc.blocoMicroinversor(2);
  assert.equal(b.microinversores, 2);
  assert.equal(b.modulos, 8);
  assert.equal(b.kwp, 4.8);
});

test('blocoMicroinversor rejeita entrada inválida', () => {
  assert.throws(() => calc.blocoMicroinversor(0));
  assert.throws(() => calc.blocoMicroinversor(1.5));
});

test('calcularGeracaoAnual usa o yield informado', () => {
  const gen = calc.calcularGeracaoAnual(5.5, 5350 / 5.5);
  assert.ok(Math.abs(gen - 5350) < 1e-6);
});

test('calcularCobertura calcula percentual geração/demanda', () => {
  assert.equal(calc.calcularCobertura(5350, 8406), (5350 / 8406) * 100);
  assert.equal(calc.calcularCobertura(100, 0), null);
});

test('regressão: Opção 1 (1 bloco) reproduz os números da proposta real do André Luiz Martins Mode', () => {
  const bloco = calc.blocoMicroinversor(1);
  const geracao = calc.calcularGeracaoAnual(bloco.kwp, 5350 / 5.5); // yield implícito do relatório de desempenho
  const fin = calc.calcularFinanceiro({
    investimentoTotal: 4490 + 3500, // política de preço final vigente
    geracaoAdicionalAnualKwh: geracao,
    tarifaKwh: 0.88,
  });
  assert.ok(Math.abs(geracao - 2334.5) < 1, `geração esperada ~2334.5, obtida ${geracao}`);
  assert.ok(Math.abs(fin.economiaAnual - 2054.4) < 1, `economia esperada ~2054.4, obtida ${fin.economiaAnual}`);
  assert.ok(Math.abs(fin.paybackAnos - 3.89) < 0.02, `payback esperado ~3.89, obtido ${fin.paybackAnos}`);
});

test('regressão: Opção 2 (2 blocos) reproduz os números da proposta real do André Luiz Martins Mode', () => {
  const bloco = calc.blocoMicroinversor(2);
  const geracao = calc.calcularGeracaoAnual(bloco.kwp, 5350 / 5.5);
  const fin = calc.calcularFinanceiro({
    investimentoTotal: 8490 + 4500,
    geracaoAdicionalAnualKwh: geracao,
    tarifaKwh: 0.88,
  });
  assert.ok(Math.abs(geracao - 4669.1) < 1, `geração esperada ~4669.1, obtida ${geracao}`);
  assert.ok(Math.abs(fin.economiaAnual - 4108.8) < 1, `economia esperada ~4108.8, obtida ${fin.economiaAnual}`);
  assert.ok(Math.abs(fin.paybackAnos - 3.16) < 0.02, `payback esperado ~3.16, obtido ${fin.paybackAnos}`);
});

test('formatBRL formata em português brasileiro', () => {
  assert.equal(calc.formatBRL(7990), 'R$ 7.990,00');
});

test('dimensionarPotenciaBase e moduloParaCima produzem um dimensionamento coerente', () => {
  const kwp = calc.dimensionarPotenciaBase(650); // 650 kWh/mês líquidos, irradiação/perdas padrão
  assert.ok(kwp > 4 && kwp < 6, `esperado entre 4 e 6 kWp, obtido ${kwp}`);
  const modulos = calc.moduloParaCima(kwp);
  assert.ok(modulos >= Math.ceil((kwp * 1000) / 600));
});
