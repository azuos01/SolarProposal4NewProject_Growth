'use strict';

function apiKey() {
  return document.getElementById('apiKey').value.trim();
}

async function apiFetch(url, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const key = apiKey();
  if (key) headers['x-api-key'] = key;
  const res = await fetch(url, Object.assign({}, options, { headers }));
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.erro) || `erro HTTP ${res.status}`);
  return data;
}

function setMsg(id, text, ok) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'err');
}

async function criarLead() {
  try {
    const body = {
      nome: document.getElementById('leadNome').value,
      cidade_uf: document.getElementById('leadCidade').value,
      uc: document.getElementById('leadUc').value,
      consumo_medio_kwh: Number(document.getElementById('leadConsumo').value),
      tarifa_kwh: Number(document.getElementById('leadTarifa').value) || 0.88,
    };
    const lead = await apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(body) });
    setMsg('leadMsg', `Lead #${lead.id} cadastrado com sucesso.`, true);
    await carregarLeads();
  } catch (e) {
    setMsg('leadMsg', e.message, false);
  }
}

async function gerarProposta() {
  try {
    const leadId = document.getElementById('propLead').value;
    if (!leadId) throw new Error('selecione um lead');
    const body = {
      blocos: Number(document.getElementById('propBlocos').value) || 1,
      opcao_label: document.getElementById('propLabel').value || undefined,
      equipamentos: document.getElementById('propEquip').value ? Number(document.getElementById('propEquip').value) : undefined,
      servico: document.getElementById('propServ').value ? Number(document.getElementById('propServ').value) : undefined,
      demanda_anual_kwh: document.getElementById('propDemanda').value ? Number(document.getElementById('propDemanda').value) : undefined,
    };
    const proposal = await apiFetch(`/api/leads/${leadId}/proposals`, { method: 'POST', body: JSON.stringify(body) });
    setMsg('propMsg', `Proposta gerada: ${proposal.opcao_label} — link público: ${location.origin}${proposal.url_publica}`, true);
    await carregarLeads();
  } catch (e) {
    setMsg('propMsg', e.message, false);
  }
}

async function carregarLeads() {
  const leads = await apiFetch('/api/leads');
  const select = document.getElementById('propLead');
  select.innerHTML = leads.map((l) => `<option value="${l.id}">#${l.id} — ${l.nome}</option>`).join('');

  const list = document.getElementById('leadsList');
  list.innerHTML = '';
  for (const lead of leads) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>#${lead.id} ${lead.nome}</strong> <span class="pill">${lead.consumo_medio_kwh} kWh/mês</span> <span class="pill">${lead.cidade_uf || '—'}</span>`;
    try {
      const proposals = await apiFetch(`/api/leads/${lead.id}/proposals`);
      if (proposals.length) {
        const links = proposals
          .map((p) => `<a class="linklike" href="/p/${p.public_token}" target="_blank">${p.opcao_label}</a>`)
          .join(' · ');
        li.innerHTML += `<br><small>${links}</small>`;
      }
    } catch (_e) {
      /* silencioso — lista continua sem os links de proposta */
    }
    list.appendChild(li);
  }
}

carregarLeads().catch(() => {});
