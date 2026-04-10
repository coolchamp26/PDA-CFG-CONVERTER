# CFG ↔ PDA: TAFL Visualizer

A stunning, interactive web application built to cleanly convert between **Context-Free Grammars (CFG)** and **Pushdown Automata (PDA)**. 

This project implements rigorous mathematical algorithms from the Theory of Automata and Formal Languages (TAFL), featuring an intuitive user interface and fully animated interactive graphs.

## 🚀 Features

- **CFG to PDA Conversion:** Converts Context-Free Grammars into equivalent non-deterministic Pushdown Automata accepting by empty stack. Supports top-down parser logic implicitly.
- **PDA to CFG Conversion:** Implements the formal Hopcroft-Ullman Triple Construction algorithm (`[qi, X, qj]`). Accompanied by a 7-step recursive optimization and minimization pipeline:
   - Removes unreachable and non-generating variables gracefully.
   - Eliminates cascading ε-rules natively.
   - Eliminates Unit Productions (collapsing `A → B` chains flawlessly).
   - Generates minimal and highly readable "exam-ready" output.
- **Interactive Graph Rendering:** Automatic spatial layouts of Pushdown Automata states and transition paths using a proprietary vanilla SVG implementation with drag-and-pan controls.
- **Theme-Aware UI:** Beautiful built-in Light and Dark modes. Heavy use of modern CSS techniques like glassmorphism overlays, aesthetic gradients, and polished micro-animations.

## 🛠 Technologies Used

- **HTML5 & Vanilla CSS3**: Highly structured DOM featuring CSS flex/grid layouts, dynamic custom variables, responsive typography, and glassmorphic aesthetic depth. Zero external CSS frameworks.
- **Vanilla JavaScript (ES6+)**: Clean, encapsulated module patterns for algorithmic logic, mathematical minimization passes, and interactive SVG canvas manipulations. Zero heavy frontend libraries (no React/Vue), ensuring maximum execution velocity directly in the browser runtime.

## 📂 Project Structure

```text
├── index.html            <- Main application entry point & layout definition
├── css/
│   └── style.css         <- Core styling, animations, and theme implementations
└── js/
    ├── app.js            <- Global DOM bindings, toast notifications, UI state logic
    ├── cfg-parser.js     <- Textual CFG parser & internal data structure formatter
    ├── cfg-to-pda.js     <- Conversion logic mapping CFG rules to PDA transitions
    ├── pda-to-cfg.js     <- Core engine for formal PDA to CFG recursive generation & minimization
    ├── pda-visualizer.js <- Graph rendering engine mapping state transitions into animated SVGs
    └── simulation.js     <- (Optional) Step-by-step logic and machine simulator algorithms
```

## 🎮 How to Access

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/cfg-pda-visualizer.git
   ```
2. **Launch locally:** 
   Open `index.html` directly in your favorite modern browser. Alternatively, run a local development server for the cleanest experience (e.g. `npx serve .`).
3. **Select your mode via the Top Navigation Bar:**
   - **CFG → PDA Tab**: Input rules in standard text-based notation (e.g., `S -> a | a S b`). Watch it immediately generate the formal tuple mathematical model and state diagram.
   - **PDA → CFG Tab**: Specify formal PDA configurations (states, alphabets, transitions). Use natural syntax strings like `(q0, a, Z) -> (q1, AZ)`. Enjoy an interactive view of the generated transition graph, and immediately reveal the mathematically minimal grammar!

## 🤝 Open Source Note

This project is perfectly suited for use by Computer Science students and institutions teaching formal language and automata theory natively visualizing notoriously difficult computational models directly in the browser!
