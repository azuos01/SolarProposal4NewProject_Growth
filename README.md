# Soluções Solares — Jornada do Lead

Aplicativo full-stack que gera **propostas comerciais de energia solar
fotovoltaica em formato de jornada**: uma página única que conduz o lead da
situação atual (a dor de hoje) até se tornar cliente (a situação futura,
depois de fechar negócio), passando por cada objeção que normalmente trava
essa decisão de compra.

Construído para a **Soluções Solares Ltda** (Araraquara-SP, integradora de
energia solar fotovoltaica desde 2018), a partir da consolidação das
propostas de ampliação já validadas para o cliente André Luiz Martins Mode.

> Uso proprietário e interno — ver [`NOTICE.md`](./NOTICE.md).

## Por que uma "jornada" e não uma proposta comum

Uma proposta tradicional lista potência, equipamentos e preço. Isso resolve
para quem já decidiu comprar — mas a maior parte dos leads de solar trava
antes disso, em dúvidas que a proposta sozinha não responde: "será que
funciona mesmo?", "é caro demais", "quanto tempo demora?", "e depois que
liga, fico sozinho?".

Por isso o modelo aqui é estruturado como **6 etapas de jornada**
(`src/journeyContent.js`), cada uma nomeando a dor real do lead naquele
ponto, a objeção que ela gera e a resposta concreta da Soluções Solares —
terminando com o próprio dimensionamento técnico e financeiro embutido nas
etapas centrais:

| # | Fase | Dor do lead | O que resolve |
|---|------|--------------|----------------|
| 1 | Consciência | "A conta só sobe e não sei até onde vai." | Diagnóstico do consumo real e da tendência de custo se nada mudar. |
| 2 | Confiança | "Será que funciona? E se a empresa sumir depois?" | Histórico da empresa desde 2018 e relatórios reais de desempenho. |
| 3 | Solução | "Todo vendedor promete um sistema genérico." | Dimensionamento a partir do consumo real, com lógica de cálculo aberta. |
| 4 | Decisão — preço | "Solar é caro, não sei se cabe no orçamento." | Preço final transparente, formas de pagamento, payback e economia em 25 anos. |
| 5 | Decisão — processo | "Não sei quanto tempo demora nem o que preciso fazer." | Cronograma claro em 6 passos, da vistoria à conexão. |
| 6 | Advocacia | "Depois que liga, fico sozinho?" | Garantias de fabricante, suporte e relatórios periódicos de desempenho. |

Seis etapas porque é o menor número que cobre, sem lacunas, o funil
consultivo de solar no Brasil (consciência → confiança → solução → preço →
processo → pós-venda), sem fragmentar o preço e o processo numa única etapa
genérica de "decisão" — são objeções diferentes e merecem respostas
diferentes.

## As três frentes de trabalho por trás do projeto

- **Energia solar fotovoltaica** — o motor de cálculo (`src/calcEngine.js`)
  mantém o mesmo padrão já validado nas propostas do André Luiz Martins
  Mode: blocos de **1 microinversor DEYE SUN2250 G3 (4 MPPTs independentes)
  + 4 módulos de 600 Wp = 2,40 kWp por bloco**, escaláveis linearmente,
  interpolação na tabela de referência Greener (jan/26) e projeção
  financeira em 25 anos com inflação de energia de 8% a.a.
- **Marketing / vendas** — o framework de jornada e o conteúdo de cada
  etapa (`src/journeyContent.js`), endereçando objeções reais e recorrentes
  do setor, não genéricas.
- **Programação full-stack** — API REST em Node.js/Express, persistência em
  SQLite (`node:sqlite`, nativo do Node, sem dependência externa de banco),
  frontend administrativo estático, testes automatizados e pipeline de
  CI/CD.

## Arquitetura

```
src/
  calcEngine.js       motor de cálculo puro (sem dependências, roda em Node ou browser)
  journeyContent.js   conteúdo estruturado das 6 etapas da jornada
  db.js               schema e conexão SQLite (node:sqlite)
  middleware/auth.js  autenticação por API key (rotas administrativas)
  routes/leads.js     CRUD de leads (com resolução de endereço por CEP)
  routes/proposals.js geração de propostas + rota pública do link do lead
  routes/cep.js       rota GET /api/cep/:cep
  services/cepService.js  consulta de endereço por CEP (ViaCEP)
  render/renderProposal.js  monta o HTML final a partir do template
  server.js           monta a aplicação Express (createApp)
template/
  proposta-jornada.template.html   template HTML da proposta (com o logo embutido)
public/
  index.html, app.js, styles.css   painel administrativo (cadastro de lead + geração de proposta)
assets/
  logo-solucoes-solares.png        logo oficial
test/
  calcEngine.test.js   testes unitários do motor de cálculo (incl. regressão com números reais)
  cepService.test.js   testes unitários da busca de endereço por CEP (fetch stubado)
  api.test.js          testes de integração da API (fluxo completo, CEP, validações, autenticação)
.github/workflows/ci.yml   pipeline de CI/CD
```

### Busca de endereço por CEP

O cadastro de lead aceita um **CEP** e resolve automaticamente logradouro,
bairro, cidade e UF via [ViaCEP](https://viacep.com.br) (API pública,
gratuita, sem autenticação) — `src/services/cepService.js`. Isso evita
digitação manual do endereço e erros na proposta final. Se o CEP não for
informado, os campos de endereço podem continuar sendo preenchidos
manualmente (compatível com o comportamento anterior). O serviço tem timeout
de 5s e erros tipados (`CepInvalidoError`, `CepNaoEncontradoError`,
`CepServiceIndisponivelError`), mapeados para os códigos HTTP corretos
(400/404/502) tanto na rota dedicada quanto no cadastro de lead.

Duas camadas de autenticação, deliberadamente diferentes:

- **`/api/*`** (administrativo — cadastro de lead, geração de proposta):
  protegido por header `x-api-key`, comparado contra a variável de ambiente
  `API_KEY`. Se `API_KEY` não estiver definida, as rotas ficam abertas
  (aceitável só em desenvolvimento local).
- **`/p/:token`** (link público que vai para o lead): **sem login**,
  protegido apenas por um token aleatório de 32 caracteres hexadecimais
  (`crypto.randomBytes(16)`), impossível de adivinhar. É assim que o lead
  abre a proposta dele direto, sem precisar de senha.

## Como rodar localmente

Requer Node.js 22.5+ (usa o módulo nativo `node:sqlite`, ainda
experimental — o aviso `ExperimentalWarning` no console é esperado e
inofensivo).

```bash
npm install
cp .env.example .env   # ajuste API_KEY antes de usar em produção
npm start               # http://localhost:3000
```

Painel administrativo em `http://localhost:3000` (cadastra lead e gera
proposta); o link público de cada proposta gerada aparece na tela e segue o
formato `http://localhost:3000/p/<token>`.

Para desenvolvimento com recarregamento automático: `npm run dev`.

### Testes

```bash
npm test
```

Roda `node --test` sobre `test/calcEngine.test.js` (unitários, incluindo
testes de regressão que reproduzem os números reais da proposta do André
Luiz Martins Mode), `test/cepService.test.js` (unitários do serviço de CEP,
com o `fetch` global substituído por um stub — não depende de rede) e
`test/api.test.js` (integração: fluxo completo de lead → proposta → link
público, busca de CEP, validações, 404s e autenticação), com o banco em
memória — não precisa de nenhum serviço externo nem de acesso à internet.

## Referência da API

Todas as rotas abaixo, exceto a pública, exigem o header `x-api-key`
quando `API_KEY` estiver configurada.

**`POST /api/leads`** — cadastra um lead.
Corpo: `{ nome* , cep, logradouro, numero, complemento, bairro, cidade, uf, cidade_uf, uc, telefone, email, consumo_medio_kwh* , tarifa_kwh (padrão 0.88) }`.
`*` obrigatório. Se `cep` for informado e os campos de endereço não vierem
todos preenchidos, o servidor busca `logradouro`/`bairro`/`cidade`/`uf` no
ViaCEP automaticamente (e, se `cidade_uf` não for informado, monta
`"<cidade> - <uf>"` a partir do resultado). Retorna `201` com o lead
criado; `400` se faltar campo obrigatório ou o CEP estiver mal formatado;
`404` se o CEP não for encontrado; `502` se o serviço de CEP estiver
indisponível.

**`GET /api/leads`** — lista leads (mais recentes primeiro).

**`GET /api/leads/:id`** — um lead. `404` se não existir.

**`GET /api/cep/:cep`** — resolve um CEP em `{ cep, logradouro, bairro, cidade, uf }`
via ViaCEP (usada pelo painel para autopreencher o cadastro de lead).
`400` se o CEP estiver mal formatado (precisa ter 8 dígitos), `404` se não
for encontrado, `502` se o serviço de CEP estiver indisponível.

**`POST /api/leads/:leadId/proposals`** — gera uma nova versão de proposta
para o lead.
Corpo: `{ blocos (inteiro >=1, padrão 1), opcao_label, equipamentos, servico, demanda_anual_kwh, yield_kwp_ano (padrão 973) }`.
`equipamentos` e `servico` devem refletir a **política de preço final
vigente** (ex.: R$ 4.490 + R$ 3.500 para 1 bloco, R$ 8.490 + R$ 4.500 para
2 blocos) — se omitidos, o sistema cai para uma referência de mercado
(tabela Greener), que deve ser tratada como fallback e não como preço
final. Retorna `201` com a proposta calculada e `url_publica`. `404` se o
lead não existir.

**`GET /api/proposals/:id`** — dados brutos de uma proposta. `404` se não existir.

**`GET /api/leads/:leadId/proposals`** — lista propostas de um lead (mais recente primeiro).

**`GET /p/:token`** — **rota pública, sem autenticação.** Serve o HTML
renderizado da proposta (o link que vai para o lead). `404` se o token não
existir.

**`GET /healthz`** — checagem de disponibilidade, `{ ok: true }`.

## Docker

```bash
docker build -t solucoes-solares-jornada .
docker run -p 3000:3000 -e API_KEY=troque-esta-chave -v $(pwd)/data:/app/data solucoes-solares-jornada
```

## Produção local com Docker

Para deixar o app rodando de forma persistente na sua própria máquina
(reiniciando sozinho se o computador ou o Docker reiniciarem), use o
`docker-compose.yml` incluído no repositório:

1. Copie `.env.production.example` para `.env.production` e troque
   `API_KEY` por uma chave forte de verdade (nunca use o valor de
   exemplo). `DB_PATH` e `PORT` já vêm definidos no `Dockerfile` e não
   precisam ser repetidos.
2. Suba o app:
   ```bash
   docker compose up -d
   ```
   Isso builda a imagem, cria o container com `restart: unless-stopped`
   (volta sozinho após reinício do Windows/Docker) e monta a pasta
   `./data` do projeto como o volume persistente do banco SQLite — os
   leads e propostas sobrevivem a atualizações do container.
3. Confirme que subiu: `http://localhost:3000` no navegador, ou
   `curl http://localhost:3000/healthz` (deve responder `{"ok":true}`).
4. **Atualizar** para uma nova versão do código: `docker compose up -d --build`
   — rebuilda a imagem e recria o container, sem tocar no volume de dados.
5. **Backup**: o banco é um único arquivo, `data/app.db`. Copiá-lo
   periodicamente (ex. tarefa agendada do Windows) já é um backup
   suficiente para o volume de uso deste app.
6. **Parar**: `docker compose down` (os dados em `./data` continuam no
   disco; um `docker compose up -d` novo retoma de onde parou).

Se for acessar de outros computadores da mesma rede (não só da própria
máquina), libere a porta 3000 no firewall e acesse pelo IP local da
máquina em vez de `localhost`.

## CI/CD

`.github/workflows/ci.yml` roda em todo push/PR para `main`:

1. **Testes** — `npm ci` + `npm test` (Node 22.x). PRs param aqui.
2. **Build e publicação da imagem** — apenas em push para `main` e só se os
   testes passarem: build da imagem Docker e publicação no GitHub Container
   Registry (`ghcr.io/<seu-usuário>/<repositório>`), usando o
   `GITHUB_TOKEN` automático do Actions (nenhum secret adicional a
   configurar).

## Colocando este repositório no GitHub

Este projeto foi montado localmente (sem acesso a uma conta do GitHub
nesta sessão). Para publicá-lo:

```bash
# dentro da pasta do projeto, já com o git inicializado e o histórico de commits:
git remote add origin https://github.com/<seu-usuário>/<nome-do-repositorio>.git
git branch -M main
git push -u origin main
```

Depois do primeiro push, o pipeline de CI/CD em `.github/workflows/ci.yml`
já roda automaticamente — não é preciso configurar nenhum secret: o job de
testes usa apenas dependências públicas do npm, e o job de build/publicação
da imagem usa o `GITHUB_TOKEN` que o próprio GitHub Actions fornece.
Se preferir não publicar a imagem Docker publicamente, ajuste a
visibilidade do pacote em Settings → Packages depois do primeiro push, ou
remova o job `docker` do workflow.

## Roadmap sugerido (fora do escopo desta versão)

- Autenticação multiusuário no painel administrativo (hoje é uma única
  `API_KEY` compartilhada).
- Edição/reenvio de proposta e acompanhamento de status do lead
  (`status` já existe na tabela, mas ainda não tem rotas/UI dedicadas).
- Emissão da proposta também em PDF, reaproveitando `journeyContent.js`.
- Deploy contínuo para um provedor de hospedagem (o pipeline atual publica
  a imagem no GHCR, mas não faz deploy automático — nenhum provedor foi
  definido ainda).
