/**
 * simulation.js
 * Simulates string acceptance on a converted PDA.
 * Uses a stack-based simulation with step-by-step visualization.
 */

const PDASimulator = (() => {

  let pda = null;
  let configs = [];    // list of { state, stackContents, inputPos, action }
  let currentStep = 0;
  let simTimer = null;

  /**
   * Set the PDA to simulate.
   */
  function setPDA(pdaObj) {
    pda = pdaObj;
    configs = [];
    currentStep = 0;
  }

  /**
   * Run a BFS/DFS simulation of the PDA on input string.
   * Returns array of computation steps.
   */
  function run(inputStr) {
    if (!pda) return { accepted: false, configs: [], reason: 'No PDA loaded' };

    const input = inputStr === '' ? [] : inputStr.split('');
    configs = [];

    let initStack, initState;
    if (pda.cfg) {
      // PDA generated from CFG: starts with [Z, S] and goes to q_loop
      const startSym  = pda.cfg.start || 'S';
      const bottomSym = pda.stackStart || 'Z';
      initStack = [bottomSym, startSym];
      initState = pda.states[1] || pda.start; // q_loop
    } else {
      // Generic PDA: starts with just the stack start symbol
      initStack = pda.stackStart ? [pda.stackStart] : ['Z'];
      initState = pda.start;
    }

    const queue = [{
      state:   initState,
      input:   [...input],
      stack:   [...initStack],
      history: [],
      depth:   0
    }];

    // Use iterative BFS with a visited set to avoid loops
    const visited = new Set();
    const MAX_STEPS = 1000;
    let totalSteps = 0;

    while (queue.length > 0 && totalSteps < MAX_STEPS) {
      const { state, input: inp, stack, history, depth } = queue.shift();
      totalSteps++;

      if (depth > 200) continue; 

      const stackTop = stack.length > 0 ? stack[stack.length - 1] : '';
      const inputHead = inp.length > 0 ? inp[0] : 'ε';

      const configKey = `${state}|${inp.join('')}|${stack.join(',')}`;
      if (visited.has(configKey)) continue;
      visited.add(configKey);

      const currentPath = [
        ...history,
        {
          state,
          inputRemaining: [...inp],
          stack: [...stack],
          action: history.length > 0 ? history[history.length - 1].actionResult : 'Start'
        }
      ];

      // Check final accept state
      if (pda.accept.includes(state) && inp.length === 0) {
        currentPath.push({
          state,
          inputRemaining: [],
          stack: [...stack],
          action: '✓ ACCEPTED',
          accepted: true
        });
        return { accepted: true, configs: currentPath };
      }

      // Check empty stack acceptance
      if (stack.length === 0 && inp.length === 0) {
        currentPath.push({
          state,
          inputRemaining: [],
          stack: [],
          action: '✓ ACCEPTED (empty stack)',
          accepted: true
        });
        return { accepted: true, configs: currentPath };
      }

      // Try all applicable transitions
      for (const t of pda.transitions) {
        if (t.from !== state) continue;

        const inputMatch = t.input === 'ε' || (inp.length > 0 && t.input === inp[0]);
        if (!inputMatch) continue;

        const stackMatch = t.stackTop === 'ε' || stackTop === t.stackTop;
        if (!stackMatch) continue;

        const newInput = t.input === 'ε' ? [...inp] : inp.slice(1);
        let newStack = [...stack];

        if (t.stackTop !== 'ε' && newStack.length > 0) {
          newStack.pop();
        }

        if (t.push && t.push !== 'ε') {
          const pushSyms = t.push.split('').reverse();
          for (const sym of pushSyms) {
            if (sym.trim()) newStack.push(sym);
          }
        }

        const actionDescription = `(${state}, ${t.input}, ${t.stackTop}) → (${t.to}, ${t.push})`;
        
        queue.push({
          state: t.to,
          input: newInput,
          stack: newStack,
          history: currentPath,
          actionResult: actionDescription,
          depth: depth + 1
        });
      }
    }

    return { accepted: false, configs: [], reason: 'String rejected or computation limit reached' };
  }

  /**
   * Get step configuration at index.
   */
  function getStep(idx) {
    return configs[Math.max(0, Math.min(idx, configs.length - 1))];
  }

  function totalSteps() { return configs.length; }

  function reset() {
    configs = [];
    currentStep = 0;
    if (simTimer) { clearInterval(simTimer); simTimer = null; }
  }

  return { setPDA, run, getStep, totalSteps, reset };

})();
