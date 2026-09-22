# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [1.1.0] - 2026-09-22

### Adicionado
- Busca de endereço por CEP (`src/services/cepService.js`), via API pública
  ViaCEP: resolve logradouro, bairro, cidade e UF a partir do CEP, com
  timeout de 5s e erros tipados (`CepInvalidoError`, `CepNaoEncontradoError`,
  `CepServiceIndisponivelError`).
- Rota `GET /api/cep/:cep` (administrativa, mesma autenticação por
  `x-api-key` das demais rotas de `/api/*`).
- `POST /api/leads` passa a aceitar `cep` (e `numero`/`complemento`) e, se
  os campos de endereço não vierem todos preenchidos, resolve
  logradouro/bairro/cidade/UF automaticamente a partir do CEP; `cidade_uf`
  é derivado do resultado quando não informado manualmente.
- Novas colunas de endereço em `leads` (`cep`, `logradouro`, `numero`,
  `complemento`, `bairro`, `cidade`, `uf`), com migração idempotente em
  `src/db.js` para bancos criados antes desta versão.
- Painel administrativo: campo de CEP com botão "Buscar endereço" que
  autopreenche logradouro/bairro/cidade-UF antes do cadastro do lead.
- Testes: `test/cepService.test.js` (unitários, `fetch` global stubado —
  sem dependência de rede) e novos casos em `test/api.test.js` cobrindo a
  rota `/api/cep/:cep` e o cadastro de lead com CEP (sucesso, CEP
  inexistente, autenticação).

## [1.0.0] - 2026-09-22

### Adicionado
- Motor de cálculo (`src/calcEngine.js`): dimensionamento por blocos
  (1 microinversor DEYE SUN2250 G3 + 4 módulos de 600 Wp = 2,40 kWp/bloco),
  interpolação na tabela de referência Greener (jan/26), geração anual
  estimada, cobertura de demanda e análise financeira (payback simples e
  projeção nominal de 25 anos com inflação de energia de 8% a.a.).
- Conteúdo da jornada do lead (`src/journeyContent.js`): 6 etapas — da
  consciência do problema até a advocacia do cliente já convertido — com
  dor, objeção, resposta e chamada para ação de cada etapa.
- API REST (Express + `node:sqlite`): cadastro e listagem de leads, geração
  de propostas versionadas por lead, link público por token
  (`/p/:token`, sem autenticação) e rotas administrativas protegidas por
  `x-api-key` (`/api/*`).
- Frontend administrativo estático (`public/`) para cadastro de leads e
  geração de propostas.
- Template de proposta em jornada (`template/proposta-jornada.template.html`)
  com identidade visual da Soluções Solares (logo oficial embutido).
- Suíte de testes (`node --test`): unitários do motor de cálculo — incluindo
  testes de regressão que reproduzem os números reais da proposta do cliente
  André Luiz Martins Mode — e testes de integração da API (fluxo completo,
  validações, 404s e autenticação).
- Pipeline de CI/CD (GitHub Actions): testes em todo push/PR para `main`;
  build e publicação da imagem Docker no GitHub Container Registry (GHCR)
  em push para `main`.
- Dockerfile e `.dockerignore` para execução em contêiner.
- `NOTICE.md` (uso proprietário/interno), `.env.example` e `.gitignore`.

### Origem
Este projeto nasceu da consolidação das propostas de ampliação geradas para
o cliente André Luiz Martins Mode (Araraquara-SP) em um modelo reutilizável,
por meio de três frentes de trabalho: dimensionamento e viabilidade
técnico-financeira (especialista em energia solar fotovoltaica), desenho da
jornada de vendas endereçando dores e objeções reais do lead (especialista
em marketing/vendas) e arquitetura full-stack da aplicação (especialista em
programação full-stack).
