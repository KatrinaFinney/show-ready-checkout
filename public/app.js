// public/app.js — AJAXify actions to prevent page reload/jump
function $(sel){ return document.querySelector(sel); }

async function postJSON(url){
  const res = await fetch(url, { method: 'POST', headers: { 'Accept': 'application/json' }});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderState(db){
  const pre = $('#state pre');
  if (pre) pre.textContent = JSON.stringify(db, null, 2);
}

function renderNotice(notice){
  const box = document.getElementById('notice');
  if (!box) return;
  if (!notice) { box.innerHTML = ''; return; }
  const klass = notice.kind === 'warn' ? 'notice warn' : 'notice ok';
  box.innerHTML = `<div class="${klass}">${notice.text}</div>`;
}

function renderMode(mode){
  const badge = document.getElementById('mode-badge');
  const toggle = document.getElementById('mode-toggle');
  if (badge){
    badge.className = 'badge ' + (mode === 'SAFE' ? 'safe' : 'live');
    badge.textContent = mode === 'SAFE' ? 'SAFE MODE ON' : 'LIVE MODE';
  }
  if (toggle){
    toggle.textContent = mode === 'SAFE' ? 'Switch to LIVE Mode' : 'Switch to SAFE Mode';
  }
}

function wireAjax(formSel, url){
  const form = document.querySelector(formSel);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button'); if (btn) btn.disabled = true;
    try{
      const { ok, db, notice, mode } = await postJSON(url);
      if (db) renderState(db);
      if (notice) renderNotice(notice); else renderNotice(null);
      if (mode) renderMode(mode);
      // keep the state panel in view
      document.getElementById('state')?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }catch(err){
      renderNotice({ kind: 'warn', text: 'Action failed. Please try again.' });
      console.error(err);
    }finally{
      if (btn) btn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  wireAjax('form[action="/checkout"]', '/checkout');
  wireAjax('form[action="/admin/reset"]', '/admin/reset');
  wireAjax('form[action="/admin/replay"]', '/admin/replay');
  wireAjax('form[action="/admin/refund"]', '/admin/refund');
  wireAjax('form[action="/admin/toggle-mode"]', '/admin/toggle-mode');
});
