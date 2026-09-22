'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JOURNEY_STAGES } = require('../journeyContent');
const { formatBRL, formatNumeroBR } = require('../calcEngine');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'template', 'proposta-jornada.template.html');
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'logo-solucoes-solares.png');

let _logoDataUriCache = null;
function logoDataUri() {
  if (!_logoDataUriCache) {
    const buf = fs.readFileSync(LOGO_PATH);
    _logoDataUriCache = `data:image/png;base64,${buf.toString('base64')}`;
  }
  return _logoDataUriCache;
}

/**
 * Conteúdo dinâmico específico de cada etapa da jornada — combina a
 * dor/objeção/resposta (estática, de journeyContent.js) com os números
 * reais do lead e da proposta calculada.
 */
const STAGE_EXTRA = {
  hoje: (lead, calc) => `
    <div class="stats">
      <div class="stat"><div class="n">${formatNumeroBR(lead.consumo_medio_kwh)} kWh/mês</div><div class="l">consumo médio informado</div></div>
      <div class="stat"><div class="n">${formatBRL(lead.tarifa_kwh)}</div><div class="l">tarifa de referência (R$/kWh)</div></div>
      <div class="stat"><div class="n">${formatBRL(lead.consumo_medio_kwh * lead.tarifa_kwh * 12)}</div><div class="l">gasto estimado com energia em 12 meses, sem usina</div></div>
    </div>`,
  solucao: (lead, calc) => `
    <table class="data">
      <tr><th>Item</th><th>Valor</th></tr>
      <tr><td>Potência da usina proposta</td><td>${formatNumeroBR(calc.kwp, 2)} kWp</td></tr>
      <tr><td>Módulos</td><td>${calc.modulos} × 600 Wp</td></tr>
      <tr><td>Microinversores DEYE SUN2250 G3</td><td>${calc.blocos} unidade(s)</td></tr>
      <tr><td>Geração anual estimada</td><td>${formatNumeroBR(calc.geracaoAnual)} kWh/ano</td></tr>
      <tr><td>Cobertura estimada da demanda</td><td>${calc.coberturaPct != null ? formatNumeroBR(calc.coberturaPct, 1) + '%' : '—'}</td></tr>
    </table>`,
  investimento: (lead, calc) => `
    <table class="data">
      <tr><th>Item</th><th>Valor</th></tr>
      <tr><td>Equipamentos</td><td>${formatBRL(calc.equipamentos)}</td></tr>
      <tr><td>Serviço de instalação</td><td>${formatBRL(calc.servico)}</td></tr>
      <tr><td><strong>Investimento total</strong></td><td><strong>${formatBRL(calc.investimentoTotal)}</strong></td></tr>
      <tr><td>Economia mensal estimada</td><td>${formatBRL(calc.economiaMensal)}</td></tr>
      <tr><td>Economia anual estimada</td><td>${formatBRL(calc.economiaAnual)}</td></tr>
      <tr><td>Payback simples</td><td>${formatNumeroBR(calc.paybackAnos, 1)} anos</td></tr>
      <tr><td>Projeção nominal de economia em 25 anos*</td><td>${formatBRL(calc.projecaoNominal)}</td></tr>
    </table>
    <p style="font-size:0.78em;color:var(--muted);margin-top:8px;">*Projeção nominal (sem desconto a valor presente), considerando inflação energética média histórica de 8% a.a. sobre a tarifa informada — valor ilustrativo, não é garantia de retorno.</p>`,
  processo: () => `
    <ol style="padding-left:20px;font-size:0.9em;line-height:2;">
      <li>Aprovação da proposta e assinatura do contrato</li>
      <li>Vistoria técnica local</li>
      <li>Projeto elétrico e solicitação de homologação junto à concessionária</li>
      <li>Aprovação da concessionária</li>
      <li>Instalação dos módulos e do microinversor</li>
      <li>Comissionamento e conexão à rede — usina ligada</li>
    </ol>`,
  confianca: () => '',
  cliente: () => '',
};

function stageSectionHtml(stage, lead, calc) {
  const extraFn = STAGE_EXTRA[stage.id];
  const extraHtml = extraFn ? extraFn(lead, calc) : '';
  return `
  <section class="stage" id="etapa-${stage.id}">
    <div class="stage-head">
      <div class="stage-num">${stage.numero}</div>
      <div>
        <div class="stage-fase">${stage.fase}</div>
        <h2>${stage.titulo}</h2>
      </div>
    </div>
    <div class="card">
      <div class="dor">${stage.dor}</div>
      <div class="detalhe">${stage.detalhe}</div>
      <div class="resposta"><strong class="label">Como a Soluções Solares responde:</strong> ${stage.resposta}</div>
      ${extraHtml ? `<div class="stage-extra">${extraHtml}</div>` : ''}
      <div class="cta-row"><span class="cta">${stage.cta} →</span></div>
    </div>
  </section>`;
}

function journeyNavHtml() {
  return JOURNEY_STAGES.map(
    (s) => `<a href="#etapa-${s.id}">${s.numero}. ${s.titulo}</a>`
  ).join('\n');
}

/**
 * Renderiza a proposta completa (HTML autocontido) a partir do lead e do
 * cálculo já resolvido (ver src/routes/proposals.js para como `calc` é
 * montado a partir do calcEngine).
 */
function renderProposalHtml({ lead, calc, propostaId, opcaoLabel, dataEmissao }) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const sections = JOURNEY_STAGES.map((s) => stageSectionHtml(s, lead, calc)).join('\n');

  return template
    .replaceAll('{{LOGO_DATA_URI}}', logoDataUri())
    .replaceAll('{{PROPOSTA_ID}}', String(propostaId))
    .replaceAll('{{OPCAO_LABEL}}', opcaoLabel)
    .replaceAll('{{DATA_EMISSAO}}', dataEmissao)
    .replaceAll('{{LEAD_NOME}}', escapeHtml(lead.nome))
    .replaceAll('{{LEAD_CIDADE}}', escapeHtml(lead.cidade_uf || '—'))
    .replaceAll('{{CONSUMO_MEDIO}}', formatNumeroBR(lead.consumo_medio_kwh))
    .replaceAll('{{JOURNEY_NAV}}', journeyNavHtml())
    .replaceAll('{{JOURNEY_SECTIONS}}', sections);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

module.exports = { renderProposalHtml, logoDataUri };
