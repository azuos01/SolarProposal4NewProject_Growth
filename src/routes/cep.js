'use strict';

const express = require('express');
const { buscarEnderecoPorCep } = require('../services/cepService');

/**
 * Rota administrativa para consulta de endereço por CEP — usada pelo
 * painel para autopreencher o cadastro do lead/cliente.
 */
function cepRouter() {
  const router = express.Router();

  router.get('/:cep', async (req, res) => {
    try {
      const endereco = await buscarEnderecoPorCep(req.params.cep);
      res.json(endereco);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.message });
    }
  });

  return router;
}

module.exports = { cepRouter };
