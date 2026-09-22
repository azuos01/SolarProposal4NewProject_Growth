'use strict';

/**
 * Autenticação simples por API key para as rotas administrativas (/api/*).
 * Adequada para uma ferramenta interna de operador único (a Soluções
 * Solares); não é um sistema de contas multiusuário. As rotas públicas de
 * visualização de proposta (/p/:token) NÃO passam por este middleware —
 * são protegidas apenas pelo token aleatório da proposta, para que o lead
 * consiga abrir o link sem precisar de credencial nenhuma.
 */
function apiKeyAuth(req, res, next) {
  const configured = process.env.API_KEY;
  if (!configured) {
    // Sem API_KEY configurada (ex.: ambiente de desenvolvimento local),
    // a autenticação fica desativada — nunca faça isso em produção.
    return next();
  }
  const provided = req.header('x-api-key');
  if (provided && provided === configured) return next();
  return res.status(401).json({ erro: 'não autorizado — informe um header x-api-key válido' });
}

module.exports = { apiKeyAuth };
