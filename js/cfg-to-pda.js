/**
 * cfg-to-pda.js
 * Converts a parsed CFG into a PDA using the standard 3-state construction.
 *
 * Algorithm (Sipser, "Introduction to the Theory of Computation"):
 *  Given CFG G = (V, Σ, R, S), construct PDA P = (Q, Σ, Γ, δ, q_start, Z, {q_accept}):
 *
 *  Q = {q_start, q_loop, q_accept}
 *  Γ = V ∪ Σ ∪ {Z}          (Z = bottom-of-stack marker)
 *
 *  δ transitions:
 *    (q_start, ε, ε) → (q_loop, SZ)              Initialize
 *    (q_loop,  ε, A) → (q_loop, α)   for each A→α ∈ R   [expand]
 *    (q_loop,  a, a) → (q_loop, ε)   for each a ∈ Σ      [match]
 *    (q_loop,  ε, Z) → (q_accept, ε)             Accept
 */

const CFGtoPDA = (() => {

  const STATES = {
    START:  'q_start',
    LOOP:   'q_loop',
    ACCEPT: 'q_accept'
  };

  const BOTTOM = 'Z';

  /**
   * Convert a CFG to PDA.
   * @param {Object} cfg - parsed CFG object from CFGParser
   * @returns {Object} pda - full PDA definition and step-by-step explanation
   */
  function convert(cfg) {
    const transitions = [];
    const steps = [];

    // ── Step 1: Initialize ──────────────────────────────────────────
    // Push the initial stack symbol and start variable
    transitions.push({
      id: 't0',
      from: STATES.START,
      input: 'ε',
      stackTop: BOTTOM,
      to: STATES.LOOP,
      push: cfg.start + BOTTOM,
      type: 'init',
      label: `ε, ${BOTTOM} → ${cfg.start}${BOTTOM}`
    });

    steps.push({
      title: 'Initialize: Push Start Symbol',
      desc: `Create three states: q_start, q_loop, and q_accept. Read the bottom-of-stack marker "Z", and replace it with the start symbol "${cfg.start}" followed by "Z" to begin the derivation.`,
      code: `(q_start, ε, Z) → (q_loop, ${cfg.start}Z)`,
      type: 'init',
      transIds: ['t0']
    });

    // ── Step 2: Variable Expansion Rules ────────────────────────────
    const expandTransIds = [];
    const expandCodes = [];

    for (let i = 0; i < cfg.productions.length; i++) {
      const prod = cfg.productions[i];
      const rhsStr = prod.rhs.join('') === 'ε' ? 'ε' : prod.rhs.join('');
      // For stack operations, empty string means pop without pushing
      const pushStr = rhsStr === 'ε' ? 'ε' : reverseString(rhsStr.replace(/ε/g, ''));
      // Note: PDA pushes in reverse order so we get correct top after push

      const id = `t_expand_${i}`;
      transitions.push({
        id,
        from: STATES.LOOP,
        input: 'ε',
        stackTop: prod.lhs,
        to: STATES.LOOP,
        push: rhsStr === 'ε' ? 'ε' : prod.rhs.filter(s => s !== 'ε').reverse().join(''),
        type: 'expand',
        production: prod,
        label: `ε, ${prod.lhs} → ${rhsStr}`
      });

      expandTransIds.push(id);
      expandCodes.push(`(q_loop, ε, ${prod.lhs}) → (q_loop, ${rhsStr === 'ε' ? 'ε' : prod.rhs.filter(s=>s!=='ε').join('')})`);
    }

    // Group expansions by variable for cleaner steps
    const byVar = {};
    for (let i = 0; i < cfg.productions.length; i++) {
      const v = cfg.productions[i].lhs;
      if (!byVar[v]) byVar[v] = { ids: [], codes: [] };
      byVar[v].ids.push(expandTransIds[i]);
      byVar[v].codes.push(expandCodes[i]);
    }

    steps.push({
      title: 'Add Variable Expansion Transitions',
      desc: `For each production rule A → α in the grammar, add a transition: when in q_loop with variable A on top of stack, pop A and push α (in reverse order for correct left-to-right processing). These are ε-transitions (non-deterministic guessing).`,
      code: expandCodes.join('\n'),
      type: 'expand',
      transIds: expandTransIds
    });

    // Individual variable steps
    for (const [v, { ids, codes }] of Object.entries(byVar)) {
      const prods = cfg.productions.filter(p => p.lhs === v);
      const altStr = prods.map(p => p.rhs.join('')).join(' | ');
      steps.push({
        title: `Expand Variable: ${v} → ${altStr}`,
        desc: `For variable "${v}", add ${prods.length} expansion transition(s). The PDA non-deterministically guesses which production to apply.`,
        code: codes.join('\n'),
        type: 'expand-var',
        variable: v,
        transIds: ids
      });
    }

    // ── Step 3: Terminal Matching Rules ─────────────────────────────
    const matchTransIds = [];
    const matchCodes = [];

    for (let i = 0; i < cfg.terminals.length; i++) {
      const a = cfg.terminals[i];
      const id = `t_match_${i}`;
      transitions.push({
        id,
        from: STATES.LOOP,
        input: a,
        stackTop: a,
        to: STATES.LOOP,
        push: 'ε',
        type: 'match',
        terminal: a,
        label: `${a}, ${a} → ε`
      });
      matchTransIds.push(id);
      matchCodes.push(`(q_loop, ${a}, ${a}) → (q_loop, ε)`);
    }

    steps.push({
      title: 'Add Terminal Matching Transitions',
      desc: `For each terminal symbol a ∈ Σ = {${cfg.terminals.join(', ')}}, add a transition that reads "a" from input while "a" is on top of the stack, and pops it (pushes ε). This matches the terminal in the derivation.`,
      code: matchCodes.join('\n'),
      type: 'match',
      transIds: matchTransIds
    });

    // ── Step 4: Accept Transition ────────────────────────────────────
    const acceptId = 't_accept';
    transitions.push({
      id: acceptId,
      from: STATES.LOOP,
      input: 'ε',
      stackTop: BOTTOM,
      to: STATES.ACCEPT,
      push: 'ε',
      type: 'accept',
      label: `ε, ${BOTTOM} → ε`
    });

    steps.push({
      title: 'Accept State Transition',
      desc: `When bottom-of-stack marker "Z" is on top (all derivation symbols matched), transition to q_accept. This implements acceptance by empty stack.`,
      code: `(q_loop, ε, Z) → (q_accept, ε)`,
      type: 'accept',
      transIds: [acceptId]
    });

    // Final summary step
    steps.push({
      title: 'Conversion Complete ✓',
      desc: `CFG G = (V={${cfg.variables.join(',')}}, Σ={${cfg.terminals.join(',')}}, R, S=${cfg.start}) → PDA P = ({q_start, q_loop, q_accept}, Σ, Γ, δ, q_start, Z, {q_accept}) with ${transitions.length} transitions.`,
      code: `Total transitions: ${transitions.length} | Variables: ${cfg.variables.length} | Terminals: ${cfg.terminals.length}`,
      type: 'done',
      transIds: transitions.map(t => t.id)
    });

    // Build PDA definition
    const pda = {
      states: [STATES.START, STATES.LOOP, STATES.ACCEPT],
      sigma: cfg.terminals,
      gamma: [...cfg.variables, ...cfg.terminals, BOTTOM],
      start: STATES.START,
      stackStart: 'Z',
      accept: [STATES.ACCEPT],
      transitions,
      steps,
      cfg  // keep reference
    };

    return pda;
  }

  function reverseString(s) {
    return s.split('').reverse().join('');
  }

  /**
   * Get layout positions for the 3 states
   */
  function getStateLayout(width, height) {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.28;
    return {
      q_start:  { x: cx - r, y: cy, label: 'q_start' },
      q_loop:   { x: cx,     y: cy, label: 'q_loop'   },
      q_accept: { x: cx + r, y: cy, label: 'q_accept' }
    };
  }

  return { convert, getStateLayout, STATES, BOTTOM };
})();
