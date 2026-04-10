/**
 * cfg-parser.js
 * Parses a CFG string into a structured object.
 * Supports: A -> alpha | beta, eps/ε for epsilon
 */

const CFGParser = (() => {
  /**
   * Parse raw grammar text into a CFG object.
   * Returns: { variables, terminals, start, productions, raw }
   * or throws on error.
   */
  function parse(text) {
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'));

    if (lines.length === 0) throw new Error('Grammar is empty.');

    const productions = [];  // { lhs: string, rhs: string[] }[]
    const variableSet  = new Set();

    // First pass: collect all LHS symbols (variables)
    for (const line of lines) {
      const arrowMatch = line.match(/^([A-Z][A-Za-z0-9'_]*)\s*(?:->|→)\s*(.+)$/);
      if (!arrowMatch) {
        throw new Error(`Invalid production rule: "${line}". Expected format: A -> alpha`);
      }
      variableSet.add(arrowMatch[1]);
    }

    // Second pass: parse RHS
    for (const line of lines) {
      const arrowMatch = line.match(/^([A-Z][A-Za-z0-9'_]*)\s*(?:->|→)\s*(.+)$/);
      const lhs = arrowMatch[1];
      const rhsRaw = arrowMatch[2];

      // Split by | (pipe) for alternatives
      const alternatives = rhsRaw.split('|').map(alt => alt.trim());

      for (const alt of alternatives) {
        const symbols = tokenize(alt, variableSet);
        productions.push({ lhs, rhs: symbols });
      }
    }

    // Determine terminals
    const terminalSet = new Set();
    for (const { rhs } of productions) {
      for (const sym of rhs) {
        if (sym !== 'ε' && !variableSet.has(sym)) {
          terminalSet.add(sym);
        }
      }
    }

    const variables = Array.from(variableSet);
    const terminals = Array.from(terminalSet).sort();
    const start = variables[0];  // First LHS of first rule

    return {
      variables,
      terminals,
      start,
      productions,
      raw: text
    };
  }

  /**
   * Tokenize a RHS string into an array of symbols.
   * Handles multi-char variables (uppercase), terminals (lowercase),
   * and epsilon (ε or eps or epsilon or λ).
   */
  function tokenize(str, variableSet) {
    if (!str || str === 'ε' || str.toLowerCase() === 'eps' || str.toLowerCase() === 'epsilon' || str === 'λ') {
      return ['ε'];
    }

    const symbols = [];
    let i = 0;

    while (i < str.length) {
      // Skip spaces
      if (str[i] === ' ') { i++; continue; }

      // Check for epsilon
      if (str.slice(i, i+7).toLowerCase() === 'epsilon') {
        symbols.push('ε'); i += 7; continue;
      }
      if (str.slice(i, i+3).toLowerCase() === 'eps') {
        symbols.push('ε'); i += 3; continue;
      }
      if (str[i] === 'ε' || str[i] === 'λ') {
        symbols.push('ε'); i++; continue;
      }

      // Multi-char variable (e.g., S', A1, EXPR — starts uppercase)
      if (/[A-Z]/.test(str[i])) {
        let sym = str[i];
        let j = i + 1;
        // Greedily extend if it still looks like a known variable
        while (j < str.length && /[A-Za-z0-9'_]/.test(str[j])) {
          const candidate = sym + str[j];
          if (variableSet.has(candidate)) {
            sym = candidate;
            j++;
          } else {
            break;
          }
        }
        symbols.push(sym);
        i += sym.length;
        continue;
      }

      // Single terminal character
      symbols.push(str[i]);
      i++;
    }

    return symbols.length > 0 ? symbols : ['ε'];
  }

  /**
   * Validate a CFG object for common issues.
   * Returns an array of warning strings (empty = ok).
   */
  function validate(cfg) {
    const warnings = [];

    // Check start symbol has at least one production
    const startProds = cfg.productions.filter(p => p.lhs === cfg.start);
    if (startProds.length === 0) {
      warnings.push(`Start symbol "${cfg.start}" has no productions.`);
    }

    // Check all variables in RHS are defined
    for (const { lhs, rhs } of cfg.productions) {
      for (const sym of rhs) {
        if (sym !== 'ε' && /[A-Z]/.test(sym[0]) && !cfg.variables.includes(sym)) {
          warnings.push(`Undefined variable "${sym}" in rule ${lhs} -> ${rhs.join('')}`);
        }
      }
    }

    return warnings;
  }

  /**
   * Format a CFG object back into a readable string.
   */
  function format(cfg) {
    const grouped = {};
    for (const p of cfg.productions) {
      if (!grouped[p.lhs]) grouped[p.lhs] = [];
      grouped[p.lhs].push(p.rhs.join(''));
    }
    return Object.entries(grouped)
      .map(([lhs, alts]) => `${lhs} → ${alts.join(' | ')}`)
      .join('\n');
  }

  return { parse, validate, format, tokenize };
})();
