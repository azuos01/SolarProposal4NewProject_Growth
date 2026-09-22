'use strict';

/**
 * journeyContent.js
 * ---------------------------------------------------------------------------
 * Conteúdo estruturado da "Jornada do Lead" — do primeiro contato até virar
 * cliente e defensor da marca. Cada etapa nomeia a dor/objeção real do lead
 * e a resposta da Soluções Solares a ela. Mantido como dados (não como HTML
 * solto) para poder ser reutilizado por qualquer motor de renderização
 * (template atual em HTML, ou futuramente PDF, e-mail, WhatsApp etc.).
 *
 * Framework: 6 etapas, cobrindo o funil clássico de vendas consultivas de
 * energia solar no Brasil (consciência -> confiança -> solução -> preço ->
 * processo -> pós-venda/advocacia). Cada etapa resolve uma objeção
 * documentada como recorrente no setor (fonte: prática comercial da
 * Soluções Solares + benchmarks de mercado, ex. Greener).
 * ---------------------------------------------------------------------------
 */

const JOURNEY_STAGES = [
  {
    id: 'hoje',
    numero: 1,
    fase: 'Consciência',
    titulo: 'Onde você está hoje',
    dor: 'A conta de luz só sobe — e parece que vai continuar assim.',
    detalhe:
      'Reajustes tarifários anuais, bandeiras vermelhas e o aumento progressivo do Fio B/TUSD sobre a energia da rede (Lei 14.300/2022) fazem o custo da eletricidade crescer todo ano, mesmo sem mudar o consumo.',
    resposta:
      'Mostramos, com os dados reais de consumo do cliente (fatura ou histórico), quanto essa conta tende a custar nos próximos anos se nada mudar — e qual seria o impacto de gerar a própria energia.',
    cta: 'Ver diagnóstico do seu consumo',
  },
  {
    id: 'confianca',
    numero: 2,
    fase: 'Confiança',
    titulo: 'A dúvida que trava a decisão',
    dor: '"Será que funciona mesmo? E se a empresa desaparecer depois da venda?"',
    detalhe:
      'Energia solar ainda é vista com desconfiança por parte de quem nunca contratou: medo de golpe, de empresa que só aparece na instalação e some no pós-venda, ou de um sistema que não entrega o que promete.',
    resposta:
      'Somos uma empresa estabelecida em Araraquara-SP desde 2018, com uma base de clientes ativa e um diferencial concreto: relatórios de desempenho reais, cruzando geração monitorada com fatura da concessionária e histórico climático — o mesmo rigor técnico que aplicamos para clientes atuais também é usado para provar, com dados, que o sistema proposto entrega o que promete.',
    cta: 'Conhecer nosso histórico e metodologia',
  },
  {
    id: 'solucao',
    numero: 3,
    fase: 'Solução',
    titulo: 'Sua usina, dimensionada com dados reais',
    dor: '"Todo vendedor de solar promete um sistema genérico — o meu caso é diferente."',
    detalhe:
      'Propostas genéricas (potência "redonda", sem relação clara com o consumo real do cliente) geram desconfiança e, pior, sistemas mal dimensionados — que sobram ou faltam.',
    resposta:
      'Dimensionamos a partir do consumo real informado (fatura ou histórico de 12-13 meses), da irradiação local e das restrições do telhado — apresentando a potência, os módulos e o microinversor exatos para o caso, com a lógica de cálculo aberta e auditável.',
    cta: 'Ver minha proposta técnica',
  },
  {
    id: 'investimento',
    numero: 4,
    fase: 'Decisão — preço',
    titulo: 'O investimento que cabe no orçamento',
    dor: '"Solar é caro, não sei se consigo pagar."',
    detalhe:
      'O valor total de uma usina assusta à primeira vista, especialmente sem comparação com o custo de não agir (a conta de luz que seguirá subindo pelos próximos 25 anos).',
    resposta:
      'Preço final transparente (equipamento + serviço, sem letras miúdas), múltiplas formas de pagamento (à vista com desconto, parcelamento do serviço, financiamento em até 96x) e o cálculo de payback e economia acumulada em 25 anos, lado a lado com o que seria gasto sem o sistema.',
    cta: 'Ver formas de pagamento',
  },
  {
    id: 'processo',
    numero: 5,
    fase: 'Decisão — processo',
    titulo: 'Da assinatura à usina ligada',
    dor: '"Não sei quanto tempo demora, nem o que precisa de mim nesse processo."',
    detalhe:
      'Incerteza sobre prazos e etapas é uma das maiores fontes de ansiedade pós-venda — o cliente assina e não sabe o que esperar nas semanas seguintes.',
    resposta:
      'Cronograma claro em 6 passos (vistoria, projeto elétrico, homologação junto à concessionária, instalação, comissionamento, conexão), com prazos estimados e pontos de contato em cada etapa.',
    cta: 'Ver o passo a passo completo',
  },
  {
    id: 'cliente',
    numero: 6,
    fase: 'Advocacia',
    titulo: 'Depois de ligada: você é cliente, não só comprador',
    dor: '"E depois que a usina liga, quem cuida disso? Fico sozinho?"',
    detalhe:
      'O medo de ficar sem suporte após a instalação é recorrente — e justificado, dado o histórico do setor com empresas que não fazem acompanhamento.',
    resposta:
      'Garantias de fabricante (até 25 anos nos módulos, até 15 nos microinversores), suporte técnico remoto no primeiro ano, e — nosso maior diferencial — relatórios periódicos de desempenho real da usina, cruzando geração com fatura, para o cliente enxergar a economia acontecendo e para identificarmos qualquer queda de produção antes que vire problema.',
    cta: 'Falar com a Soluções Solares',
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { JOURNEY_STAGES };
}
if (typeof window !== 'undefined') {
  window.JourneyContent = { JOURNEY_STAGES };
}
