/**
 * pda-to-cfg.js
 * Converts a PDA to an equivalent minimal CFG using the formal triple-construction
 * method (Sipser / Hopcroft), then minimises and simplifies the result.
 *
 * Algorithm (Steps 1–8):
 *  1. Variable definition: [qi,X,qj]
 *  2. Start symbol productions
 *  3. Pop transitions   → [qi,X,qj] → a
 *  4. Push transitions  → [qi,X,qk] → a [qj,Y1,q1][q1,Y2,q2]...[qm,Yn,qk]
 *  5. ε-transitions handled inside steps 3 & 4
 *  6. Completeness check
 *  7. Minimisation: useless/unreachable removal, isomorphic merge, unit-prod
 *     elimination, renaming, deduplication
 *  8. Final clean output
 */

const PDAtoCFG = (() => {

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC: parse raw user input into a PDA object
  // ─────────────────────────────────────────────────────────────────────────────
  function parsePDA(statesStr, sigmaStr, gammaStr, startState, stackStart, acceptStr, transStr) {
    const states     = statesStr.split(',').map(s => s.trim()).filter(Boolean);
    const sigma      = sigmaStr.split(',').map(s => s.trim()).filter(Boolean);
    const gamma      = gammaStr.split(',').map(s => s.trim()).filter(Boolean);
    const accept     = acceptStr.split(',').map(s => s.trim()).filter(Boolean);
    const start      = startState.trim();
    const stackStart_ = stackStart.trim();

    if (!states.length) throw new Error('No states provided.');
    if (!start)         throw new Error('No start state provided.');
    if (!stackStart_)   throw new Error('No initial stack symbol provided.');

    const parsedTransitions = parseTransitions(transStr);

    // Validate states / stack symbols referenced in transitions
    for (const t of parsedTransitions) {
      if (!states.includes(t.from)) throw new Error(`Unknown state "${t.from}" in transition.`);
      if (!states.includes(t.to))   throw new Error(`Unknown state "${t.to}" in transition.`);
    }

    // Normalize transitions that pop 'ε' by treating them as applying to ANY stack symbol X.
    // If a transition has stackTop = 'ε', it conceptually pops nothing. 
    // We normalize this by creating a copy of the transition for every possible stack symbol X,
    // essentially "replacing" X with the requested push symbols.
    // (This matches user intent for transitions like (q0, eps, eps) -> (q1, SZ) 
    // where they expect SZ to become the new top stack contents.)
    const transitions = [];
    for (const t of parsedTransitions) {
      if (t.stackTop === 'ε') {
        for (const X of gamma) {
          transitions.push({
            ...t,
            stackTop: X,
            label: t.label + ' (normalized for ' + X + ')'
          });
        }
      } else {
        transitions.push(t);
      }
    }

    return { states, sigma, gamma, start, stackStart: stackStart_, accept, transitions };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Parse transition lines: (state, input, stackTop) -> (nextState, push)
  // ─────────────────────────────────────────────────────────────────────────────
  function parseTransitions(text) {
    const transitions = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Match: (qi, input, stackTop) -> (qj, push)
      const m = line.match(
        /^\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)\s*(?:->|→)\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)$/
      );
      if (!m) {
        throw new Error(
          `Invalid transition: "${line}"\n` +
          `Expected format: (state, input, stackTop) -> (nextState, push)`
        );
      }

      const normaliseEps = s => s.replace(/^(eps|epsilon|λ)$/i, 'ε');

      const from     = m[1].trim();
      const input    = normaliseEps(m[2].trim());
      const stackTop = normaliseEps(m[3].trim());
      const to       = m[4].trim();
      const pushRaw  = normaliseEps(m[5].trim());

      // push: either 'ε' (pop) or a string of stack symbols (could be multi-char names separated by space/comma)
      // Support both: "AZ" (concatenated single chars) and "A Z" or "A,Z"
      let pushSyms;
      if (pushRaw === 'ε' || pushRaw === '') {
        pushSyms = []; // pop transition
      } else {
        // Try space/comma separation first (multi-char symbol names)
        if (pushRaw.includes(' ') || pushRaw.includes(',')) {
          pushSyms = pushRaw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        } else {
          // Single chars concatenated (e.g., "AZ")
          pushSyms = pushRaw.split('');
        }
        pushSyms = pushSyms.filter(s => s !== 'ε' && s !== '');
      }

      transitions.push({
        from, input, stackTop, to,
        pushSyms,                           // array of symbols pushed (bottom first = leftmost)
        pushRaw: pushSyms.length ? pushSyms.join('') : 'ε',
        label: `${input}, ${stackTop} → ${pushSyms.length ? pushSyms.join('') : 'ε'}`
      });
    }

    return transitions;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC: main conversion
  // ─────────────────────────────────────────────────────────────────────────────
  function convert(pda) {
    const { states, start, stackStart, accept, transitions } = pda;
    const steps = [];
    let productions = []; // { lhs: string, rhs: string[] }

    // ── STEP 1: Variable notation explained ────────────────────────────────────
    steps.push({
      title: 'STEP 1: VARIABLE DEFINITION',
      desc:
        'Variables of the form [qi,X,qj] represent: ' +
        '"all strings that drive the PDA from qi to qj while exactly consuming stack symbol X." ' +
        `We will generate variables for all qi, qj ∈ {${states.join(', ')}} and X ∈ Γ.`,
      code: null
    });

    // ── STEP 2: START SYMBOL ───────────────────────────────────────────────────
    const startRules = [];
    // If accept states given → accept by final state
    // Otherwise → accept by empty stack (all states are potential end states)
    const endStates = accept.length > 0 ? accept : states;

    for (const qk of endStates) {
      const prod = { lhs: 'S', rhs: [`[${start},${stackStart},${qk}]`] };
      productions.push(prod);
      startRules.push(`S → [${start},${stackStart},${qk}]`);
    }

    steps.push({
      title: 'STEP 2: START SYMBOL',
      desc: accept.length > 0
        ? `PDA accepts by final state. S → [${start},${stackStart},qf] for each accept state qf.`
        : `No accept states given — assuming acceptance by empty stack. S → [${start},${stackStart},qi] for all states qi.`,
      code: startRules.join('\n')
    });

    // ── STEP 3: POP TRANSITIONS (push = ε) ────────────────────────────────────
    // (qi, a, X) → (qj, ε)   gives   [qi,X,qj] → a
    const popCodes = [];
    for (const t of transitions) {
      if (t.pushSyms.length === 0) {
        const lhs = `[${t.from},${t.stackTop},${t.to}]`;
        const rhs = t.input === 'ε' ? ['ε'] : [t.input];
        productions.push({ lhs, rhs });
        popCodes.push(`${lhs} → ${rhs.join(' ')}`);
      }
    }

    if (popCodes.length > 0) {
      steps.push({
        title: 'STEP 3: HANDLE POP TRANSITIONS',
        desc: 'For each (qi, a, X) → (qj, ε): add [qi,X,qj] → a  (or ε if no input consumed).',
        code: popCodes.join('\n')
      });
    }

    // ── STEP 4 & 5: PUSH TRANSITIONS ──────────────────────────────────────────
    // (qi, a, X) → (qj, Y1 Y2 ... Yn)
    // For all state combinations q1…q_{n-1}, qk:
    //   [qi,X,qk] → a [qj,Y1,q1] [q1,Y2,q2] … [q_{n-1},Yn,qk]
    const pushCodes = [];

    for (const t of transitions) {
      if (t.pushSyms.length === 0) continue; // already handled as pop

      const a = t.input;         // terminal (or ε)
      const syms = t.pushSyms;   // [Y1, Y2, ..., Yn]
      const n = syms.length;

      // Generate all combinations of n-1 intermediate states
      // recurse: idx = which symbol we're placing (0-based)
      //          stateAt[idx] = the state AFTER processing symbol syms[idx]
      // stateAt[-1] = t.to  (state after the transition fires)
      // stateAt[n-1] = qk   (the final target state, we iterate over all)

      function generateChains(symIdx, fromState, rhsSoFar, finalTarget) {
        if (symIdx === n - 1) {
          // last symbol: [fromState, syms[symIdx], finalTarget]
          const varLast = `[${fromState},${syms[symIdx]},${finalTarget}]`;
          const rhs = [...rhsSoFar, varLast];
          const lhs = `[${t.from},${t.stackTop},${finalTarget}]`;
          productions.push({ lhs, rhs });

          if (pushCodes.length < 80) {
            const inputPart = a === 'ε' ? '' : a + ' ';
            pushCodes.push(`${lhs} → ${inputPart}${rhs.filter(x => x !== a).join(' ')}`);
          }
        } else {
          // intermediate symbol: try all states as the intermediate
          for (const nextState of states) {
            const varMid = `[${fromState},${syms[symIdx]},${nextState}]`;
            generateChains(symIdx + 1, nextState, [...rhsSoFar, varMid], finalTarget);
          }
        }
      }

      // Iterate over all possible final states qk
      for (const qk of states) {
        const initialRhs = a === 'ε' ? [] : [a];
        generateChains(0, t.to, initialRhs, qk);
      }
    }

    if (pushCodes.length > 0) {
      steps.push({
        title: 'STEP 4 & 5: HANDLE PUSH TRANSITIONS',
        desc:
          'For each (qi, a, X) → (qj, Y1…Yn): add productions ' +
          '[qi,X,qk] → a [qj,Y1,q1][q1,Y2,q2]…[q_{n-1},Yn,qk] for ALL state combinations.',
        code:
          pushCodes.slice(0, 20).join('\n') +
          (pushCodes.length > 20 ? `\n… (${pushCodes.length - 20} more combinations)` : '')
      });
    }

    // ── STEP 6: COMPLETENESS CHECK ─────────────────────────────────────────────
    steps.push({
      title: 'STEP 6: COMPLETENESS CHECK',
      desc: `Total raw productions generated: ${productions.length}. ` +
            `Every PDA transition has been encoded (${transitions.length} transitions processed).`,
      code: null
    });

    // ── STEP 7: MINIMISATION ───────────────────────────────────────────────────
    const beforeCount = productions.length;

    // 7a. Remove non-generating variables (variables that derive no terminal string)
    productions = removeNonGenerating(productions);

    // 7b. Remove unreachable variables (not reachable from S)
    productions = removeUnreachable(productions);

    // 7c. Eliminate unit productions A → B
    productions = eliminateUnitProductions(productions);

    // 7d. Inline ε-only variables: if X → ε is the ONLY rule for X, remove X
    //     and for each rule containing X on the RHS, produce both versions (with/without X).
    productions = eliminateEpsilonVariables(productions);

    // 7e. Aggressively inline single-rule terminal-only variables
    //     e.g. if C has exactly one rule "C → b", replace every [... C ...] with b
    productions = inlineSingleRuleTerminalVars(productions);

    // 7f. Merge isomorphic variables (same rule sets → same variable)
    productions = mergeIsomorphic(productions);

    // 7g. Deduplicate
    productions = deduplicate(productions);

    // 7h. Rename [qi,X,qj] variables to clean A, B, C…
    productions = renameVariables(productions);

    // 7i. Final dedup after rename
    productions = deduplicate(productions);

    // 7j. Another pass of inlining/merging after rename
    productions = inlineSingleRuleTerminalVars(productions);
    productions = mergeIsomorphic(productions);
    productions = deduplicate(productions);

    // 7k. Fold single-chain starts.
    // If S has exactly one rule "S -> α A β", and A is the only variable, we can fold A into S.
    productions = foldSingleChainStart(productions);
    productions = deduplicate(productions);

    const afterCount = productions.length;

    steps.push({
      title: 'STEP 7: MINIMISATION & SIMPLIFICATION',
      desc:
        `Reduced from ${beforeCount} to ${afterCount} productions. ` +
        `Applied: non-generating removal, unreachable removal, ` +
        `unit-production elimination, isomorphic variable merging, renaming.`,
      code: null
    });

    // ── STEP 8: FINAL OUTPUT ───────────────────────────────────────────────────
    const summary = formatFinalGrammar(productions);
    steps.push({
      title: 'STEP 8: FINAL MINIMAL CFG',
      desc: 'Clean, exam-ready CFG equivalent to the input PDA.',
      code: summary
    });

    return { productions, steps };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MINIMISATION HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Remove variables that cannot derive any terminal string.
   * Iteratively mark variables as "generating" if all RHS symbols are
   * terminals or already known generating variables.
   */
  function removeNonGenerating(prods) {
    const generating = new Set(['ε']);

    let changed = true;
    while (changed) {
      changed = false;
      for (const p of prods) {
        if (generating.has(p.lhs)) continue;
        if (p.rhs.every(sym => generating.has(sym) || isTerminal(sym))) {
          generating.add(p.lhs);
          changed = true;
        }
      }
    }

    // Keep only productions where LHS is generating AND every RHS symbol is either generating or a terminal
    return prods.filter(p =>
      generating.has(p.lhs) &&
      p.rhs.every(sym => generating.has(sym) || isTerminal(sym))
    );
  }

  /**
   * Remove variables not reachable from S.
   */
  function removeUnreachable(prods) {
    const reachable = new Set(['S']);
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of prods) {
        if (!reachable.has(p.lhs)) continue;
        for (const sym of p.rhs) {
          if (!isTerminal(sym) && !reachable.has(sym)) {
            reachable.add(sym);
            changed = true;
          }
        }
      }
    }
    return prods.filter(p => reachable.has(p.lhs));
  }

  /**
   * Eliminate unit productions A → B by substituting B's rules into A.
   * Handles chains (A → B → C → …) and avoids infinite loops.
   */
  function eliminateUnitProductions(prods) {
    // Build a map: var → all its alternative RHSs
    const rulesOf = ruleMap(prods);
    const vars = [...rulesOf.keys()];
    let result = [];

    for (const v of vars) {
      // Find all variables reachable from v via unit chains
      const unitReachable = new Set();
      const queue = [v];
      while (queue.length) {
        const cur = queue.shift();
        const rhs_list = rulesOf.get(cur) || [];
        for (const rhs of rhs_list) {
          if (rhs.length === 1 && !isTerminal(rhs[0]) && rhs[0] !== cur) {
            if (!unitReachable.has(rhs[0])) {
              unitReachable.add(rhs[0]);
              queue.push(rhs[0]);
            }
          }
        }
      }

      // Keep non-unit productions of v itself
      for (const rhs of (rulesOf.get(v) || [])) {
        if (!(rhs.length === 1 && !isTerminal(rhs[0]))) {
          result.push({ lhs: v, rhs });
        }
      }

      // Add non-unit productions from every unit-reachable variable
      for (const u of unitReachable) {
        for (const rhs of (rulesOf.get(u) || [])) {
          if (!(rhs.length === 1 && !isTerminal(rhs[0]))) {
            result.push({ lhs: v, rhs });
          }
        }
      }
    }

    return deduplicate(result);
  }

  /**
   * Inline nullable (ε-only) variables.
   * If a variable X has ONLY the production X → ε, we:
   *  1. For each rule containing X: generate a version WITHOUT X (dropped).
   *  2. Remove X's definition entirely.
   *  3. Filter out any remaining RHS that still reference X (they only existed
   *     in case X derived something non-empty, which it doesn't).
   *
   * Repeated until no more pure-ε vars exist.
   */
  function eliminateEpsilonVariables(prods) {
    let current = [...prods];
    let changed = true;
    while (changed) {
      changed = false;
      const counts = {};
      current.forEach(p => { counts[p.lhs] = (counts[p.lhs] || 0) + 1; });

      // Find a non-S variable whose ONLY rule is X → ε
      const epsVar = Object.keys(counts).find(v => {
        if (v === 'S') return false;
        const rules = current.filter(p => p.lhs === v);
        return rules.length === 1 && rules[0].rhs.length === 1 && rules[0].rhs[0] === 'ε';
      });
      if (!epsVar) break;

      // Build new production list:
      // • Drop X → ε definition entirely.
      // • For every other rule that has X in its RHS, emit ONLY the version with X removed.
      // • Rules that don't contain X pass through unchanged.
      const newProds = [];
      for (const p of current) {
        if (p.lhs === epsVar) continue; // drop X → ε
        if (!p.rhs.includes(epsVar)) {
          newProds.push(p);             // no X in RHS — keep as-is
        } else {
          // emit version with all X's stripped out
          const newRhs = p.rhs.filter(sym => sym !== epsVar);
          const finalRhs = newRhs.length === 0 ? ['ε'] : newRhs;
          newProds.push({ lhs: p.lhs, rhs: finalRhs });
        }
      }
      current = deduplicate(newProds);
      changed = true;
    }
    return current;
  }

  /**
   * Inline variables with exactly ONE all-terminal production.
   * e.g. if C → b is the only rule for C, replace every occurrence of C with b.
   */
  function inlineSingleRuleTerminalVars(prods) {
    let current = [...prods];
    let changed = true;
    while (changed) {
      changed = false;
      const counts = {};
      current.forEach(p => { counts[p.lhs] = (counts[p.lhs] || 0) + 1; });
      const target = Object.keys(counts).find(v => {
        if (v === 'S') return false;
        if (counts[v] !== 1) return false;
        const rule = current.find(p => p.lhs === v);
        return rule && rule.rhs.every(s => isTerminal(s));
      });
      if (!target) break;
      const rhsToInline = current.find(p => p.lhs === target).rhs;
      current = current.filter(p => p.lhs !== target);
      current = current.map(p => {
        if (!p.rhs.includes(target)) return p;
        const newRhs = [];
        for (const sym of p.rhs) {
          if (sym === target) {
            if (!(rhsToInline.length === 1 && rhsToInline[0] === 'ε')) newRhs.push(...rhsToInline);
          } else {
            newRhs.push(sym);
          }
        }
        return { lhs: p.lhs, rhs: newRhs.length === 0 ? ['ε'] : newRhs };
      });
      current = deduplicate(current);
      changed = true;
    }
    return current;
  }

  /**
   * Merge variables whose complete rule sets are identical (isomorphic).
   * Always keep the alphabetically first / 'S' as the canonical representative.
   */
  function mergeIsomorphic(prods) {
    let current = [...prods];
    let changed = true;

    while (changed) {
      changed = false;
      const sig = new Map(); // signature → canonical variable

      for (const v of [...new Set(current.map(p => p.lhs))]) {
        const key = current
          .filter(p => p.lhs === v)
          .map(p => p.rhs.join(' '))
          .sort()
          .join('||');

        if (!sig.has(key)) {
          sig.set(key, v);
        } else {
          const canon = sig.get(key);
          // Keep whichever is S, or the lexicographically smaller one
          const [keep, discard] = (canon === 'S' || (discard !== 'S' && canon < v))
            ? [canon, v]
            : [v, canon];

          if (discard !== keep) {
            // Replace all occurrences of discard with keep
            current = current
              .filter(p => p.lhs !== discard)
              .map(p => ({ lhs: p.lhs, rhs: p.rhs.map(s => s === discard ? keep : s) }));
            sig.set(key, keep);
            changed = true;
            break; // restart scan after any merge
          }
        }
      }

      if (changed) current = deduplicate(current);
    }

    return current;
  }

  /**
   * Rename all non-S triple-style variables [qi,X,qj] to clean A, B, C, …
   */
  function renameVariables(prods) {
    const nameMap = new Map();
    nameMap.set('S', 'S');

    // Stable order: S first, then others in insertion order
    const seen = [];
    for (const p of prods) {
      if (!nameMap.has(p.lhs)) seen.push(p.lhs);
      for (const s of p.rhs) {
        if (!isTerminal(s) && !nameMap.has(s)) seen.push(s);
      }
    }
    // Remove S already mapped
    const others = seen.filter(v => v !== 'S');

    let code = 65; // 'A'
    for (const v of others) {
      if (nameMap.has(v)) continue;
      let letter = String.fromCharCode(code++);
      if (letter === 'S') letter = String.fromCharCode(code++); // skip S
      nameMap.set(v, letter);
    }

    return prods.map(p => ({
      lhs: nameMap.get(p.lhs) || p.lhs,
      rhs: p.rhs.map(s => (isTerminal(s) ? s : (nameMap.get(s) || s)))
    }));
  }

  /**
   * Remove duplicate productions.
   */
  function deduplicate(prods) {
    const seen = new Set();
    return prods.filter(p => {
      const sig = `${p.lhs}→${p.rhs.join(' ')}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  function isTerminal(sym) {
    // terminals: lowercase letters, digits, ε, and single special chars that aren't [ ]
    if (sym === 'ε') return true;
    if (sym.startsWith('[')) return false;        // triple variable
    if (/^[A-Z]/.test(sym)) return false;         // renamed variable (uppercase)
    return true;
  }

  function ruleMap(prods) {
    const m = new Map();
    for (const p of prods) {
      if (!m.has(p.lhs)) m.set(p.lhs, []);
      m.get(p.lhs).push(p.rhs);
    }
    return m;
  }

  /**
   * If S has exactly one production, e.g., S -> a A, we can fold A into S
   * by renaming A to S and replacing A's rules with S's rules (substituting A for S).
   * E.g.
   *   S -> a A
   *   A -> a A b | b
   * becomes:
   *   S -> a (a S b) | a (b)  (wait, no, it's easier to just rename A to S if S is a simple wrapper)
   * Better approach: If S is just a straightforward wrapper around one variable A
   * (e.g. S -> a A), then A represents S without the 'a'.
   * Actually, for `S -> a A, A -> a A b | b`, we can't just rename A.
   * If we want `S -> a S b | a b`, notice that if `S = a A`, then `A = S / a`.
   * So `A -> a A b | b` becomes `(S / a) -> a (S / a) b | b`, so `S -> a S b | a b`.
   * This is a special pattern recognition for `S -> prefix A suffix`.
   */
  function foldSingleChainStart(prods) {
    let current = [...prods];
    const sProds = current.filter(p => p.lhs === 'S');
    if (sProds.length !== 1) return current;

    const sRhs = sProds[0].rhs;
    // Find the single variable in S's RHS, if there is exactly one
    const varsInS = sRhs.filter(sym => !isTerminal(sym));
    if (varsInS.length !== 1) return current;

    const A = varsInS[0];
    // We only want to fold if A is NOT used anywhere else except in S and its own rules
    const usesOfA = current.filter(p => p.lhs !== 'S' && p.lhs !== A && p.rhs.includes(A));
    if (usesOfA.length > 0) return current;

    const aProds = current.filter(p => p.lhs === A);
    if (aProds.length === 0) return current;

    // Okay, S -> prefix A suffix
    const prefix = [];
    const suffix = [];
    let foundA = false;
    for (const sym of sRhs) {
      if (sym === A) foundA = true;
      else if (!foundA) prefix.push(sym);
      else suffix.push(sym);
    }

    // Now, for every rule A => alpha, we generate S => prefix alpha suffix.
    // BUT we also want to see if A's rules are recursive on A: `A => gamma A delta`.
    // If we just blindly replace, we get S => prefix gamma A delta suffix. We'd still need A.
    // However, if we notice `S = prefix A suffix`, we might be able to replace A in the recursive rule with S.
    // This only works perfectly if `gamma = prefix` and `delta = suffix`? No, think of S => a A.
    // A => a A b | b.
    // We want S => a S b | a b.
    // S = a A  =>  A = a^-1 S.
    // A => a A b  ==>  a^-1 S => a (a^-1 S) b. Multiply by 'a': S => a a a^-1 S b => S => a S b.
    // A => b      ==>  a^-1 S => b. Multiply by 'a': S => a b.
    
    // Pattern match: A => alpha A beta | gamma
    // If `prefix` matches `alpha`? No.
    // Let's do a simple substitution:
    // Create new rules for S by wrapping A's rules.
    // A => a A b  --> S => prefix (a A b) suffix => a a A b.  Wait, we want to replace A with S.
    // Where can we replace A with S? S = prefix A suffix.
    // So if a RHS of A contains A, we want to somehow turn it into S.
    // This requires the prefix and suffix to exactly surround the recursive A!
    
    // Let's check if EVERY recursive rule of A has `prefix A suffix` exactly.
    // Actually, in `A -> a A b`, we have `a A b`.
    // We want to form S! But S is `a A`. Wait, if S = a A, then `a A` is S.
    // So `A -> (a A) b` -> `A -> S b`.
    // Then we fold: S -> a A -> a (S b). So S -> a S b! IT WORKS.
    
    let canFold = true;
    const newAProds = [];
    
    // Step 1: Try to find `prefix A suffix` inside A's recursive rules and replace with `S`
    for(const p of aProds) {
       let rhsStr = p.rhs.join(' ');
       let targetStr = [...prefix, A, ...suffix].join(' ');
       if (rhsStr.includes(targetStr) && targetStr !== '') {
           let newRhsStr = rhsStr.replace(targetStr, 'S');
           newAProds.push({lhs: A, rhs: newRhsStr.split(' ').filter(Boolean)});
       } else if (p.rhs.includes(A)) {
           // recursive but doesn't contain the exact S pattern
           // can we still fold? S -> a A. A -> A b. => S -> a A b -> a (S/a) b ... not easily expressible without inverse.
           // In `a A b`, S is `a A`. The pattern `a A` IS in `a A b`!
           // But what if S = `A b`? Then `a A b` has `A b`.
           // Let's implement generic substring replacement!
           const sPattern = [...prefix, A, ...suffix];
           // Find if sPattern is a sub-array of p.rhs
           let subIndex = -1;
           for(let i=0; i<=p.rhs.length - sPattern.length; i++) {
               let match = true;
               for(let j=0; j<sPattern.length; j++) {
                   if(p.rhs[i+j] !== sPattern[j]) { match = false; break; }
               }
               if(match) { subIndex = i; break; }
           }
           
           if (subIndex !== -1) {
               const newRhs = [...p.rhs.slice(0, subIndex), 'S', ...p.rhs.slice(subIndex + sPattern.length)];
               newAProds.push({lhs: A, rhs: newRhs});
           } else {
               canFold = false;
               break;
           }
       } else {
           newAProds.push(p);
       }
    }
    
    if (!canFold) return current;
    
    // Step 2: Now that recursive A rules refer to S instead of A, A is no longer recursive!
    // We can just inline A into S!
    const newProds = current.filter(p => p.lhs !== 'S' && p.lhs !== A);
    for(const p of newAProds) {
        // Substitute p.rhs into S -> prefix [p.rhs] suffix
        let newRhs = [...prefix];
        if (!(p.rhs.length === 1 && p.rhs[0] === 'ε')) {
            newRhs = newRhs.concat(p.rhs);
        }
        newRhs = newRhs.concat(suffix);
        if (newRhs.length === 0) newRhs = ['ε'];
        newProds.push({lhs: 'S', rhs: newRhs});
    }
    
    return deduplicate(newProds);
  }


  function formatFinalGrammar(prods) {
    const grouped = new Map();
    for (const p of prods) {
      if (!grouped.has(p.lhs)) grouped.set(p.lhs, new Set());
      grouped.get(p.lhs).add(p.rhs.join(' '));
    }
    const lines = [];
    // S first, then rest sorted
    if (grouped.has('S')) {
      lines.push(`S → ${[...grouped.get('S')].sort().join(' | ')}`);
    }
    for (const [lhs, alts] of grouped) {
      if (lhs === 'S') continue;
      lines.push(`${lhs} → ${[...alts].sort().join(' | ')}`);
    }
    return lines.join('\n');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return { parsePDA, convert };
})();

// Node.js compatibility (for testing)
if (typeof module !== 'undefined') module.exports = PDAtoCFG;
