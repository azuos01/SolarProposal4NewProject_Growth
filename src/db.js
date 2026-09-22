'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cidade_uf TEXT,
  uc TEXT,
  telefone TEXT,
  email TEXT,
  consumo_medio_kwh REAL NOT NULL,
  tarifa_kwh REAL NOT NULL DEFAULT 0.88,
  dores TEXT,
  objecoes TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL DEFAULT 1,
  opcao_label TEXT NOT NULL,
  blocos INTEGER NOT NULL,
  modulos INTEGER NOT NULL,
  kwp REAL NOT NULL,
  geracao_anual_kwh REAL NOT NULL,
  cobertura_pct REAL,
  equipamentos REAL NOT NULL,
  servico REAL NOT NULL,
  investimento_total REAL NOT NULL,
  economia_mensal REAL NOT NULL,
  economia_anual REAL NOT NULL,
  payback_anos REAL NOT NULL,
  public_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_token ON proposals(public_token);
`;

/**
 * Abre (ou cria) o banco SQLite e garante o schema.
 * @param {string} dbPath - caminho do arquivo, ou ':memory:' para testes.
 */
function openDb(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

function novoTokenPublico() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { openDb, novoTokenPublico };
