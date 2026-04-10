/**
 * app.js - Main application controller
 */

// ──────────────────────────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────────────────────────
let currentMode = 'cfg-to-pda';
let currentPDA  = null;
let currentCFG  = null;

// Simulation state removed

// ──────────────────────────────────────────────────────────────────────────────
// EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────
const EXAMPLES = {
  balanced: {
    text: 'S -> aSb | ε',
    name: 'aⁿbⁿ (n≥0)'
  },
  palindrome: {
    text: 'S -> aSa | bSb | ε',
    name: 'Palindromes over {a,b}'
  },
  arithmetic: {
    text: 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | a | b',
    name: 'Arithmetic Expressions'
  },
  nested: {
    text: 'S -> aSb | AB\nA -> aA | a\nB -> bB | b',
    name: 'Nested CFG'
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Initialize PDA Visualizer
  const svgEl = document.getElementById('pdaSvg');
  if (svgEl) PDAVisualizer.init(svgEl);

  // Restore theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');

  // Live CFG parsing
  const cfgInput = document.getElementById('cfgInput');
  if (cfgInput) {
    cfgInput.addEventListener('input', debounce(onCFGInput, 350));
    cfgInput.value = 'S -> aSb | ε';
    onCFGInput();
  }

  setTimeout(() => showToast('Enter a CFG and click Convert to PDA', 'info', 3000), 600);
});

// ──────────────────────────────────────────────────────────────────────────────
// LIVE CFG PARSING
// ──────────────────────────────────────────────────────────────────────────────
function onCFGInput() {
  const text = document.getElementById('cfgInput').value.trim();
  const errorEl = document.getElementById('grammarError');
  const infoEl  = document.getElementById('cfgInfo');

  if (!text) {
    errorEl.textContent = '';
    infoEl.style.display = 'none';
    return;
  }

  try {
    const cfg = CFGParser.parse(text);
    errorEl.textContent = '';
    document.getElementById('infoVariables').textContent = cfg.variables.join(', ') || '—';
    document.getElementById('infoTerminals').textContent = cfg.terminals.join(', ') || '—';
    document.getElementById('infoStart').textContent     = cfg.start;
    document.getElementById('infoProds').textContent     = cfg.productions.length;
    infoEl.style.display = 'flex';

    const warns = CFGParser.validate(cfg);
    if (warns.length > 0) {
      errorEl.textContent = '⚠ ' + warns[0];
      errorEl.style.color = 'var(--warning)';
    }
  } catch (err) {
    errorEl.textContent = '✗ ' + err.message;
    errorEl.style.color = 'var(--error)';
    document.getElementById('cfgInfo').style.display = 'none';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CONVERSION: CFG → PDA
// ──────────────────────────────────────────────────────────────────────────────
function convertCFGtoPDA() {
  const text = document.getElementById('cfgInput').value.trim();
  const errorEl = document.getElementById('grammarError');

  if (!text) { showToast('Please enter a grammar first.', 'error'); return; }

  let cfg;
  try {
    cfg = CFGParser.parse(text);
  } catch (err) {
    errorEl.textContent = '✗ ' + err.message;
    return;
  }

  currentCFG = cfg;
  const pda  = CFGtoPDA.convert(cfg);
  currentPDA = pda;
  // Simulation set removed

  const btn = document.getElementById('btnConvert');
  btn.textContent = 'Converting…';
  btn.disabled = true;

  setTimeout(() => {
    try {
      showPDAOutput(pda);
      buildTransitionTable(pda.transitions);
      buildFormalDef(pda, cfg);
      buildSteps(pda.steps);
      
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg> Convert to PDA`;
      btn.disabled = false;
      showToast(`✓ PDA generated — ${pda.transitions.length} transitions`, 'success');
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg> Convert to PDA`;
      showToast('Conversion error: ' + err.message, 'error');
    }
  }, 280);
}

// ──────────────────────────────────────────────────────────────────────────────
// SHOW PDA OUTPUT
// ──────────────────────────────────────────────────────────────────────────────
function showPDAOutput(pda) {
  document.getElementById('pdaEmptyState').style.display = 'none';
  document.getElementById('pdaGraphContainer').style.display = 'block';
  document.getElementById('pdaFormal').style.display = 'block';
  document.getElementById('transitionTableContainer').style.display = 'block';
  document.getElementById('pdaControls').style.display = 'flex';

  requestAnimationFrame(() => {
    const svgEl = document.getElementById('pdaSvg');
    PDAVisualizer.init(svgEl);
    PDAVisualizer.render(pda);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// FORMAL DEFINITION
// ──────────────────────────────────────────────────────────────────────────────
function buildFormalDef(pda, cfg) {
  document.getElementById('formalStates').textContent = pda.states.join(', ');
  document.getElementById('formalSigma').textContent  = cfg.terminals.join(', ') || '∅';
  document.getElementById('formalGamma').textContent  = pda.gamma.join(', ');
  document.getElementById('formalStart').textContent  = pda.start;
  document.getElementById('formalStackStart').textContent = pda.stackStart;
  document.getElementById('formalAccept').textContent = pda.accept.join(', ');
}

// Unified accordion toggle — Formal Def, Transition Table, Conversion Steps
function toggleAcc(bodyId, btn) {
  const body     = document.getElementById(bodyId);
  const isOpen   = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  btn.setAttribute('aria-expanded', String(!isOpen));
}

// ──────────────────────────────────────────────────────────────────────────────
// TRANSITION TABLE
// ──────────────────────────────────────────────────────────────────────────────
function buildTransitionTable(transitions, tableBodyId = 'transitionTableBody', countId = 'transCount') {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  const countEl = document.getElementById(countId);
  if (countEl) countEl.textContent = `${transitions.length} transitions`;

  for (let idx = 0; idx < transitions.length; idx++) {
    const t = transitions[idx];
    const tr = document.createElement('tr');
    if (t.id != null) tr.setAttribute('data-trans-id', t.id);
    const pushDisplay = t.pushRaw !== undefined ? t.pushRaw : (t.push || 'ε');
    tr.innerHTML = `
      <td class="td-state">${t.from}</td>
      <td class="td-input">${t.input}</td>
      <td class="td-stack">${t.stackTop}</td>
      <td class="td-arrow">→</td>
      <td class="td-next">${t.to}</td>
      <td class="td-push">${pushDisplay}</td>
    `;
    tbody.appendChild(tr);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CONVERSION STEPS — show all at once
// ──────────────────────────────────────────────────────────────────────────────
function buildSteps(steps) {
  const panel = document.getElementById('stepsPanel');
  panel.style.display = 'block';

  // Use stepsBodyInner if accordion layout, fallback to stepsBody
  const body = document.getElementById('stepsBodyInner') || document.getElementById('stepsBody');
  body.innerHTML = '';

  document.getElementById('stepCounter').textContent = `${steps.length} steps`;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const item = document.createElement('div');
    item.className = 'step-item active';
    item.style.animationDelay = `${i * 45}ms`;
    item.innerHTML = `
      <div class="step-num">${i + 1}</div>
      <div class="step-content">
        <div class="step-title">${s.title}</div>
        <div class="step-desc">${s.desc}</div>
        ${s.code ? `<div class="step-code">${escHtml(s.code)}</div>` : ''}
      </div>
    `;
    body.appendChild(item);
  }
}

function convertPDAtoCFG() {
  const statesStr  = document.getElementById('pdaStates').value.trim();
  const sigmaStr   = document.getElementById('pdaSigmaIn').value.trim();
  const gammaStr   = document.getElementById('pdaGammaIn').value.trim();
  const startState = document.getElementById('pdaStartState').value.trim();
  const stackSym   = document.getElementById('pdaStackSymbol').value.trim();
  const acceptStr  = document.getElementById('pdaAcceptStates').value.trim();
  const transStr   = document.getElementById('pdaTransInput').value.trim();

  if (!statesStr || !startState || !stackSym || !transStr) {
    showToast('Fill in states, start state, stack symbol, and transitions.', 'error');
    return;
  }

  let pda, result;
  try {
    pda    = PDAtoCFG.parsePDA(statesStr, sigmaStr, gammaStr, startState, stackSym, acceptStr, transStr);
    result = PDAtoCFG.convert(pda);
  } catch (err) {
    console.error('[PDA→CFG]', err);
    showToast('Error: ' + err.message, 'error');
    return;
  }

  // Show output section
  document.getElementById('cfgEmptyState').style.display  = 'none';
  document.getElementById('cfgOutput').style.display      = 'block';
  document.getElementById('pdaFormalIn').style.display    = 'block';
  document.getElementById('pdaTransIn').style.display     = 'block';

  // Populate PDA summary
  document.getElementById('formalStatesIn').textContent    = pda.states.join(', ');
  document.getElementById('formalSigmaIn').textContent     = pda.sigma.join(', ') || '—';
  document.getElementById('formalGammaIn').textContent     = pda.gamma.join(', ') || '—';
  document.getElementById('formalStartIn').textContent     = pda.start;
  document.getElementById('formalStackStartIn').textContent = pda.stackStart;
  document.getElementById('formalAcceptIn').textContent    = pda.accept.join(', ') || '(empty stack)';

  buildTransitionTable(pda.transitions, 'pdaTransBodyTableIn', 'pdaTransInCount');

  renderCFGOutput(result.productions);
  buildPDASteps(result.steps);
  showToast(`✓ CFG generated — ${result.productions.length} productions`, 'success');
}

function renderCFGOutput(productions) {
  const container = document.getElementById('cfgOutputBlock');
  container.innerHTML = '';

  if (!productions || productions.length === 0) {
    container.innerHTML = '<p style="color:var(--error);padding:1rem">No productions generated. Check your PDA inputs.</p>';
    return;
  }

  // Group RHS alternatives by LHS
  const grouped = {};
  for (const p of productions) {
    if (!grouped[p.lhs]) grouped[p.lhs] = new Set();
    grouped[p.lhs].add((p.rhs || []).join(' '));
  }

  // Render: S first, then others sorted
  const vars = Object.keys(grouped).sort((a, b) => {
    if (a === 'S') return -1;
    if (b === 'S') return  1;
    return a.localeCompare(b);
  });

  for (const lhs of vars) {
    const alts = [...grouped[lhs]].sort();
    const row = document.createElement('div');
    row.className = 'cfg-production';
    row.innerHTML = `
      <span class="cfg-prod-lhs">${lhs}</span>
      <span class="cfg-prod-arrow"> → </span>
      <span class="cfg-prod-rhs">${alts.join(' | ')}</span>
    `;
    container.appendChild(row);
  }
}

function buildPDASteps(steps) {
  const body = document.getElementById('stepsBodyPDA');
  body.innerHTML = '';
  document.getElementById('stepCounterPDA').textContent = `${steps.length} steps`;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const item = document.createElement('div');
    item.className = 'step-item active';
    item.style.animationDelay = `${i * 45}ms`;
    item.innerHTML = `
      <div class="step-num">${i + 1}</div>
      <div class="step-content">
        <div class="step-title">${s.title}</div>
        <div class="step-desc">${s.desc}</div>
        ${s.code ? `<div class="step-code">${escHtml(s.code)}</div>` : ''}
      </div>
    `;
    body.appendChild(item);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────
function loadExample() { useExample('balanced'); }

function useExample(key) {
  const ex = EXAMPLES[key];
  if (!ex) return;
  const input = document.getElementById('cfgInput');
  input.value = ex.text;
  input.dispatchEvent(new Event('input'));
  showToast(`Loaded: ${ex.name}`, 'info');
  input.focus();
}

function loadPDAExample() {
  document.getElementById('pdaStates').value       = 'q0, q1, q2';
  document.getElementById('pdaSigmaIn').value      = 'a, b';
  document.getElementById('pdaGammaIn').value      = 'A, Z';
  document.getElementById('pdaStartState').value   = 'q0';
  document.getElementById('pdaStackSymbol').value  = 'Z';
  document.getElementById('pdaAcceptStates').value = 'q2';
  document.getElementById('pdaTransInput').value   =
`(q0, a, Z) -> (q1, AZ)
(q1, a, A) -> (q1, AA)
(q1, b, A) -> (q2, ε)
(q2, b, A) -> (q2, ε)
(q2, ε, Z) -> (q2, ε)`;
  showToast('Loaded PDA for aⁿbⁿ (n≥1)', 'info');
}

function clearCFG() {
  document.getElementById('cfgInput').value = '';
  document.getElementById('grammarError').textContent = '';
  document.getElementById('cfgInfo').style.display = 'none';
  document.getElementById('pdaEmptyState').style.display = 'flex';
  document.getElementById('pdaGraphContainer').style.display = 'none';
  document.getElementById('pdaFormal').style.display = 'none';
  document.getElementById('transitionTableContainer').style.display = 'none';
  document.getElementById('stepsPanel').style.display = 'none';
  // simPanel display removal
  document.getElementById('pdaControls').style.display = 'none';
  currentPDA = null; currentCFG = null;
  // clearSimulation removed
}

function clearPDA() {
  ['pdaStates','pdaSigmaIn','pdaGammaIn','pdaStartState','pdaStackSymbol','pdaAcceptStates','pdaTransInput']
    .forEach(id => { document.getElementById(id).value = ''; });
}

// ──────────────────────────────────────────────────────────────────────────────
// GRAPH CONTROLS
// ──────────────────────────────────────────────────────────────────────────────
function zoomIn()  { PDAVisualizer.zoomIn(); }
function zoomOut() { PDAVisualizer.zoomOut(); }
function fitView() { PDAVisualizer.fitView(); }

function setTool(tool) {
  PDAVisualizer.setActiveTool(tool);
  document.querySelectorAll('.graph-tool').forEach(b => b.classList.remove('active'));
  document.getElementById(tool === 'select' ? 'toolSelect' : 'toolPan').classList.add('active');
}

function resetPDAView() {
  PDAVisualizer.fitView();
  PDAVisualizer.clearHighlights();
}

function downloadPDA() {
  if (!currentPDA) return;
  const data = {
    states: currentPDA.states, sigma: currentPDA.sigma, gamma: currentPDA.gamma,
    start: currentPDA.start, stackStart: currentPDA.stackStart, accept: currentPDA.accept,
    transitions: currentPDA.transitions.map(t => ({
      from: t.from, input: t.input, stackTop: t.stackTop, to: t.to, push: t.push
    }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pda.json';
  a.click();
  showToast('PDA exported as JSON', 'success');
}

// ──────────────────────────────────────────────────────────────────────────────
// MODE SWITCHING
// ──────────────────────────────────────────────────────────────────────────────
function switchMode(mode) {
  currentMode = mode;
  document.getElementById('panelCfgToPda').style.display = mode === 'cfg-to-pda' ? 'block' : 'none';
  document.getElementById('panelPdaToCfg').style.display = mode === 'pda-to-cfg' ? 'block' : 'none';
  document.getElementById('navCfgToPda').classList.toggle('active', mode === 'cfg-to-pda');
  document.getElementById('navPdaToCfg').classList.toggle('active', mode === 'pda-to-cfg');
}

// ──────────────────────────────────────────────────────────────────────────────
// THEME
// ──────────────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  html.setAttribute('data-theme', isLight ? 'dark' : 'light');
  localStorage.setItem('theme', isLight ? 'dark' : 'light');
  // Re-render PDA graph with new colors if visible
  if (currentPDA && document.getElementById('pdaGraphContainer').style.display !== 'none') {
    setTimeout(() => {
      const svgEl = document.getElementById('pdaSvg');
      PDAVisualizer.init(svgEl);
      PDAVisualizer.render(currentPDA);
    }, 50);
  }
  showToast(`${isLight ? 'Dark' : 'Light'} theme`, 'info', 1500);
}

// ──────────────────────────────────────────────────────────────────────────────
// SYMBOL INSERT
// ──────────────────────────────────────────────────────────────────────────────
function insertSymbol(sym) {
  const textarea = document.getElementById('cfgInput');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end   = textarea.selectionEnd;
  const insertSym = sym === '→' ? '->' : sym;
  textarea.value = textarea.value.slice(0, start) + insertSym + textarea.value.slice(end);
  textarea.selectionStart = textarea.selectionEnd = start + insertSym.length;
  textarea.focus();
  textarea.dispatchEvent(new Event('input'));
}

// ──────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.classList.remove('show'); }, duration);
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
