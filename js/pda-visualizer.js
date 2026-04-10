/**
 * pda-visualizer.js
 * Renders the PDA as an interactive SVG graph with animations.
 * Uses a force-directed-like layout for state nodes.
 */

const PDAVisualizer = (() => {

  // ─── Constants ─────────────────────────────────────────────────────
  const NODE_R       = 32;    // radius of state circles
  const ACCEPT_R     = 28;    // inner ring for accept states
  const SELF_LOOP_R  = 36;    // self-loop arc radius
  const LABEL_OFFSET = 14;    // edge label distance from arc

  /** Returns theme-aware node colors */
  function getColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      start:   {
        fill:   isLight ? '#ede9fe' : '#1e1e32',
        stroke: 'url(#gradStart)',
        text:   isLight ? '#6d28d9' : '#a78bfa'
      },
      loop:    {
        fill:   isLight ? '#e0f2fe' : '#1e1e32',
        stroke: 'url(#gradLoop)',
        text:   isLight ? '#0369a1' : '#38bdf8'
      },
      accept:  {
        fill:   isLight ? '#dcfce7' : '#1a2e20',
        stroke: 'url(#gradAccept)',
        text:   isLight ? '#166534' : '#34d399'
      },
      generic: {
        fill:   isLight ? '#f1f5f9' : '#1e1e32',
        stroke: 'url(#gradGeneric)',
        text:   isLight ? '#475569' : '#94a3b8'
      }
    };
  }
  const EDGE_STROKE = 'url(#arrowGrad)';
  const ANIM_DELAY  = 80; // ms between animated items

  // ─── State ──────────────────────────────────────────────────────────
  let svg, svgRoot, edgesGroup, nodesGroup;
  let viewTransform = { x: 0, y: 0, scale: 1 };
  let isDragging = false;
  let dragStart  = { x: 0, y: 0 };
  let currentTool = 'pan'; // default to pan since select was removed
  let positions  = {};   // state => { x, y }
  let svgWidth   = 700, svgHeight = 380;

  /**
   * Initialize or re-initialize the SVG canvas.
   */
  function init(svgEl) {
    svg        = svgEl;
    svgRoot    = document.getElementById('svgRoot');
    edgesGroup = document.getElementById('edgesGroup');
    nodesGroup = document.getElementById('nodesGroup');

    const bbox = svgEl.getBoundingClientRect();
    svgWidth   = bbox.width  || 700;
    svgHeight  = bbox.height || 380;

    setupInteraction(svgEl);
    injectGradients(svgEl);
  }

  /**
   * Render a full PDA.
   * @param {Object} pda - from CFGtoPDA.convert()
   */
  function render(pda) {
    clearCanvas();
    positions = computeLayout(pda.states, svgWidth, svgHeight);

    // Draw edges first (behind nodes)
    const edgeGroups = groupEdges(pda.transitions);
    let edgeIdx = 0;
    for (const [key, trans] of Object.entries(edgeGroups)) {
      setTimeout(() => drawEdge(key, trans, pda.accept), edgeIdx * ANIM_DELAY);
      edgeIdx++;
    }

    // Draw nodes on top
    for (let i = 0; i < pda.states.length; i++) {
      const state = pda.states[i];
      setTimeout(() => drawNode(
        state,
        positions[state],
        pda.start   === state,
        pda.accept.includes(state)
      ), i * 80 + edgeIdx * ANIM_DELAY * 0.5);
    }
  }

  /**
   * Compute nice positions for states.
   */
  function computeLayout(states, w, h) {
    const pos = {};
    const n   = states.length;
    const cx  = w / 2;
    const cy  = h / 2;

    if (n === 3 && states.includes('q_start') && states.includes('q_loop') && states.includes('q_accept')) {
      // Standard 3-state linear layout with breathing room
      const spacing = Math.min(w * 0.26, 170);
      const offsetY = cy + 60; // Push graph down to visually center large self-loops
      pos['q_start']  = { x: cx - spacing, y: offsetY };
      pos['q_loop']   = { x: cx,           y: offsetY };
      pos['q_accept'] = { x: cx + spacing, y: offsetY };
    } else {
      // Generic: arrange in a circle
      const r = Math.min(w, h) * 0.32;
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i / n) - Math.PI / 2;
        pos[states[i]] = {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle)
        };
      }
    }
    return pos;
  }

  /**
   * Group transitions by (from, to) pair to bundle labels.
   */
  function groupEdges(transitions) {
    const groups = {};
    for (const t of transitions) {
      const key = `${t.from}__${t.to}`;
      if (!groups[key]) groups[key] = { from: t.from, to: t.to, labels: [], transIds: [] };
      groups[key].labels.push(t.label);
      groups[key].transIds.push(t.id);
    }
    return groups;
  }

  /**
   * Draw a single edge (or self-loop) between states.
   */
  function drawEdge(key, edgeData, acceptStates) {
    const { from, to, labels } = edgeData;
    const posFrom = positions[from];
    const posTo   = positions[to];
    if (!posFrom || !posTo) return;


    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-edge', key);
    g.style.opacity = '0';

    if (from === to) {
      // Self-loop
      drawSelfLoop(g, posFrom, labels);
    } else {
      // Check reverse edge for curve offset
      const reverseKey = `${to}__${from}`;
      const hasReverse = document.querySelector(`[data-edge="${reverseKey}"]`) !== null;
      drawStraightOrCurved(g, posFrom, posTo, labels, hasReverse);
    }

    edgesGroup.appendChild(g);

    // Fade-in animation
    requestAnimationFrame(() => {
      g.style.transition = `opacity 0.4s ease`;
      g.style.opacity = '1';
    });
  }

  function drawSelfLoop(g, pos, labels) {
    const r = NODE_R + SELF_LOOP_R;
    const cx = pos.x;
    const cy = pos.y - NODE_R;

    // Arc: a circle above the node
    const startAngle = -2.4, endAngle = -0.74;
    const sx = cx + r * Math.cos(startAngle);
    const sy = cy + r * Math.sin(startAngle);
    const ex = cx + r * Math.cos(endAngle);
    const ey = cy + r * Math.sin(endAngle);

    const path = makeSVG('path', {
      d: `M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`,
      stroke: EDGE_STROKE,
      'stroke-width': '1.8',
      fill: 'none',
      'marker-end': 'url(#arrowhead)',
      'stroke-dasharray': '300',
      'stroke-dashoffset': '300'
    });

    animateDash(path);
    g.appendChild(path);
    addEdgeLabel(g, cx, cy - r * 0.95, labels);
  }

  function drawStraightOrCurved(g, p1, p2, labels, curved) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / dist, uy = dy / dist;

    // Start/end positions (on node circumference)
    const sx = p1.x + ux * NODE_R;
    const sy = p1.y + uy * NODE_R;
    const ex = p2.x - ux * NODE_R;
    const ey = p2.y - uy * NODE_R;

    let pathD;
    let lx, ly;

    if (curved) {
      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;
      const perp = 50;
      const cx   = midX - uy * perp;
      const cy   = midY + ux * perp;
      pathD = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
      lx = cx;
      ly = cy;
    } else {
      pathD = `M ${sx} ${sy} L ${ex} ${ey}`;
      lx = (sx + ex) / 2 - uy * LABEL_OFFSET;
      ly = (sy + ey) / 2 + ux * LABEL_OFFSET;
    }

    const path = makeSVG('path', {
      d: pathD,
      stroke: EDGE_STROKE,
      'stroke-width': '1.8',
      fill: 'none',
      'marker-end': 'url(#arrowhead)',
      'stroke-dasharray': '500',
      'stroke-dashoffset': '500'
    });

    animateDash(path);
    g.appendChild(path);
    addEdgeLabel(g, lx, ly, labels);
  }

  function addEdgeLabel(g, x, y, labels) {
    const maxLabels = 4;
    const shown = labels.slice(0, maxLabels);
    if (labels.length > maxLabels) shown.push(`+${labels.length - maxLabels} more`);

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const bgFill = isLight ? 'rgba(255,255,255,0.85)' : 'rgba(9,9,15,0.88)';
    const textFill = isLight ? '#475569' : '#94a3b8';

    const bg = makeSVG('rect', {
      rx: '5', ry: '5',
      fill: bgFill,
      stroke: 'rgba(167,139,250,0.2)',
      'stroke-width': '1'
    });
    g.appendChild(bg);

    const lh = 15;
    const yStart = y - (shown.length - 1) * lh / 2;

    let maxW = 0;
    const texts = [];
    for (let i = 0; i < shown.length; i++) {
      const t = makeSVG('text', {
        x: String(x), y: String(yStart + i * lh),
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-family': "'JetBrains Mono', monospace",
        'font-size': '10',
        fill: textFill
      });
      t.textContent = shown[i];
      g.appendChild(t);
      texts.push(t);
    }

    // Position bg rect after layout
    requestAnimationFrame(() => {
      let maxW2 = 0;
      for (const t of texts) {
        try { maxW2 = Math.max(maxW2, t.getBBox().width); } catch(e) {}
      }
      const bw = maxW2 + 12;
      const bh = shown.length * lh + 6;
      bg.setAttribute('x', String(x - bw / 2));
      bg.setAttribute('y', String(yStart - lh / 2 - 3));
      bg.setAttribute('width', String(bw));
      bg.setAttribute('height', String(bh));
    });
  }

  function animateDash(el) {
    requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1) 0.1s';
      el.setAttribute('stroke-dashoffset', '0');
    });
  }

  /**
   * Draw a state node.
   */
  function drawNode(state, pos, isStart, isAccept) {
    if (!pos) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-state', state);
    g.style.cursor = 'pointer';
    g.style.opacity = '0';

    // Determine color scheme
    let colorKey = 'generic';
    if (state === 'q_accept' || isAccept) colorKey = 'accept';
    else if (state === 'q_start' || isStart) colorKey = 'start';
    else if (state === 'q_loop') colorKey = 'loop';
    const c = getColors()[colorKey];

    // Pulse / glow ring (animated)
    const pulseRing = makeSVG('circle', {
      cx: String(pos.x), cy: String(pos.y), r: String(NODE_R + 8),
      fill: 'none',
      stroke: c.text,
      'stroke-width': '1',
      opacity: '0.2'
    });
    pulseRing.style.animation = `nodeRingPulse 2.5s ease-in-out ${Math.random() * 1.5}s infinite`;
    g.appendChild(pulseRing);

    // Start arrow indicator
    if (isStart) {
      const arrowLen = 36;
      const arr = makeSVG('line', {
        x1: String(pos.x - NODE_R - arrowLen),
        y1: String(pos.y),
        x2: String(pos.x - NODE_R - 2),
        y2: String(pos.y),
        stroke: 'url(#gradStart)',
        'stroke-width': '2',
        'marker-end': 'url(#arrowhead)'
      });
      g.appendChild(arr);
    }

    // Outer circle
    const outer = makeSVG('circle', {
      cx: String(pos.x), cy: String(pos.y), r: String(NODE_R),
      fill: c.fill,
      stroke: c.stroke,
      'stroke-width': '2.5'
    });
    outer.classList.add('node-circle');
    g.appendChild(outer);

    // Inner ring for accept state
    if (isAccept) {
      const inner = makeSVG('circle', {
        cx: String(pos.x), cy: String(pos.y), r: String(ACCEPT_R),
        fill: 'none',
        stroke: '#34d399',
        'stroke-width': '1.5',
        opacity: '0.6'
      });
      g.appendChild(inner);
    }

    // Label
    const label = makeSVG('text', {
      x: String(pos.x), y: String(pos.y),
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-family': "'JetBrains Mono', monospace",
      'font-size': '11',
      'font-weight': '600',
      fill: c.text
    });
    label.textContent = state;
    g.appendChild(label);

    nodesGroup.appendChild(g);

    // Fade + scale animation
    requestAnimationFrame(() => {
      g.style.transition = 'opacity 0.4s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
      g.style.opacity = '1';
      g.setAttribute('transform-origin', `${pos.x} ${pos.y}`);
    });

    // Hover glow effect
    g.addEventListener('mouseenter', () => {
      outer.style.filter = 'url(#glowStrong)';
      outer.style.transition = 'all 0.2s ease';
    });
    g.addEventListener('mouseleave', () => {
      outer.style.filter = '';
    });
  }

  /**
   * Inject gradient definitions into SVG <defs>.
   */
  function injectGradients(svgEl) {
    const existingDefs = svgEl.querySelector('defs');
    const defs = existingDefs || document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    const grads = [
      { id: 'gradStart',   c1: '#a78bfa', c2: '#818cf8' },
      { id: 'gradLoop',    c1: '#38bdf8', c2: '#2dd4bf' },
      { id: 'gradAccept',  c1: '#34d399', c2: '#10b981' },
      { id: 'gradGeneric', c1: '#64748b', c2: '#475569' }
    ];

    for (const g of grads) {
      if (!defs.querySelector(`#${g.id}`)) {
        const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        grad.setAttribute('id', g.id);
        grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
        grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');
        const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', g.c1);
        const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', g.c2);
        grad.appendChild(s1); grad.appendChild(s2);
        defs.appendChild(grad);
      }
    }

    // Keyframe for pulse ring
    if (!document.getElementById('visAnimStyles')) {
      const style = document.createElement('style');
      style.id = 'visAnimStyles';
      style.textContent = `
        @keyframes nodeRingPulse {
          0%, 100% { opacity: 0.15; r: ${NODE_R + 8}; }
          50%       { opacity: 0.35; r: ${NODE_R + 16}; }
        }
      `;
      document.head.appendChild(style);
    }

    if (!existingDefs) svgEl.insertBefore(defs, svgEl.firstChild);
  }

  /**
   * Set up pan/zoom interactions.
   */
  function setupInteraction(svgEl) {
    // Pan
    svgEl.addEventListener('mousedown', (e) => {
      if (e.target === svgEl || e.target === svgRoot) {
        isDragging = true;
        dragStart = { x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y };
        svgEl.style.cursor = 'grabbing';
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      viewTransform.x = e.clientX - dragStart.x;
      viewTransform.y = e.clientY - dragStart.y;
      applyTransform();
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
      if (svg) svg.style.cursor = currentTool === 'pan' ? 'grab' : 'default';
    });

    // Zoom
    svgEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      viewTransform.scale = Math.min(3, Math.max(0.3, viewTransform.scale * factor));
      applyTransform();
    }, { passive: false });
  }

  function applyTransform() {
    if (!svgRoot) return;
    svgRoot.setAttribute('transform',
      `translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`
    );
  }

  // ─── Public controls ──────────────────────────────────────────────

  function zoomIn()  { viewTransform.scale = Math.min(3, viewTransform.scale * 1.2); applyTransform(); }
  function zoomOut() { viewTransform.scale = Math.max(0.3, viewTransform.scale / 1.2); applyTransform(); }

  function fitView() {
    viewTransform = { x: 0, y: 0, scale: 1 };
    applyTransform();
  }

  function setActiveTool(tool) {
    currentTool = tool;
    if (svg) svg.style.cursor = tool === 'pan' ? 'grab' : 'default';
  }

  /**
   * Highlight specific transitions in the table and graph.
   */
  function highlightTransitions(ids, color = '#f59e0b') {
    document.querySelectorAll('tr[data-trans-id]').forEach(tr => {
      tr.classList.remove('tr-highlight');
    });
    for (const id of ids) {
      const tr = document.querySelector(`tr[data-trans-id="${id}"]`);
      if (tr) tr.classList.add('tr-highlight');
    }
  }

  function clearHighlights() {
    document.querySelectorAll('.tr-highlight').forEach(el => el.classList.remove('tr-highlight'));
  }

  function clearCanvas() {
    if (edgesGroup) edgesGroup.innerHTML = '';
    if (nodesGroup) nodesGroup.innerHTML = '';
    viewTransform = { x: 0, y: 0, scale: 1 };
    applyTransform();
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  function makeSVG(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    return el;
  }

  return {
    init, render, clearCanvas,
    zoomIn, zoomOut, fitView, setActiveTool,
    highlightTransitions, clearHighlights
  };

})();
