# CFG ↔ PDA: TAFL Visualizer

An advanced, interactive web application for converting between **Context-Free Grammars (CFGs)** and **Pushdown Automata (PDAs)** with mathematically rigorous algorithms and clean, exam-ready outputs.

Built with a focus on **clarity, correctness, and performance**, this tool bridges formal language theory with intuitive visualization.

---

## 🚀 Features

### 🔁 Bidirectional Conversion

* **CFG → PDA**

  * Implements standard construction using stack-based leftmost derivation simulation.
  * Generates minimal 3-state PDA (`q_start`, `q_loop`, `q_accept`).
  * Ensures correct reverse push of RHS symbols.

* **PDA → CFG**

  * Implements **Hopcroft-Ullman Triple Construction** (`[qi, X, qj]`).
  * Covers all intermediate state combinations for correctness.
  * Produces a fully equivalent grammar before simplification.

---

### 🧠 Intelligent Simplification Engine

A multi-stage optimization pipeline ensures clean, minimal output:

* Removal of **unreachable variables**
* Removal of **non-generating symbols**
* Elimination of **ε-productions**
* Elimination of **unit productions** (`A → B`)
* Deduplication of redundant rules
* Pattern compression into **exam-standard forms** (e.g., `S → aSb | ab`)

---

### 📊 Interactive PDA Visualization

* Automatic **graph layout generation**
* Smooth **SVG-based rendering**
* Drag-and-pan support
* Clear depiction of transitions and stack operations

---

### 🎨 Modern UI/UX

* Light & Dark mode support
* Glassmorphism-inspired design
* Smooth animations and micro-interactions
* Fully responsive layout

---

## 🛠 Technologies Used

* **HTML5 & CSS3**

  * Flexbox & Grid layouts
  * Custom properties (CSS variables)
  * Responsive typography
  * Glassmorphic UI design

* **Vanilla JavaScript (ES6+)**

  * Modular architecture
  * Algorithmic transformation logic
  * No external frameworks (maximum performance)

---

## 📂 Project Structure

```text
├── index.html            <- Application entry point
├── css/
│   └── style.css         <- Styling, animations, themes
└── js/
    ├── app.js            <- UI logic & state management
    ├── cfg-parser.js     <- CFG parsing & normalization
    ├── cfg-to-pda.js     <- CFG → PDA conversion engine
    ├── pda-to-cfg.js     <- PDA → CFG construction + simplification
    ├── pda-visualizer.js <- SVG graph rendering engine
    └── simulation.js     <- Optional step-by-step execution
```

---

## 🎮 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/cfg-pda-visualizer.git
cd cfg-pda-visualizer
```

### 2. Run Locally

Open `index.html` directly in your browser
OR use a local server:

```bash
npx serve .
```

### 3. Use the Interface

* **CFG → PDA Tab**

  * Input rules like:

    ```
    S -> aSb | ab
    ```
  * View generated PDA + graph

* **PDA → CFG Tab**

  * Input transitions like:

    ```
    (q0, a, Z) -> (q1, AZ)
    ```
  * Get minimized CFG instantly

---

## ⚙️ Conversion Process

### 🔁 CFG → PDA (Standard Construction)

1. Initialize stack with start symbol:

   ```
   (q_start, ε, ε) → (q_loop, SZ)
   ```

2. For each production:

   ```
   A → X₁ X₂ ... Xₙ
   ```

   Add:

   ```
   (q_loop, ε, A) → (q_loop, Xₙ ... X₂ X₁)
   ```

   (Push RHS in reverse order)

3. Match terminals:

   ```
   (q_loop, a, a) → (q_loop, ε)
   ```

4. Accept when stack is empty:

   ```
   (q_loop, ε, Z) → (q_accept, ε)
   ```

---

### 🔁 PDA → CFG (Hopcroft-Ullman Construction)

1. Create variables:

   ```
   [qi X qj]
   ```

   Meaning: transitions from `qi` to `qj` removing `X`

2. Start symbol:

   ```
   S → [q_start Z q_accept]
   ```

3. For transitions:

   * Pop:

     ```
     (qi, a, X) → (qj, ε)
     ⇒ [qi X qj] → a
     ```
   * Push:

     ```
     (qi, a, X) → (qj, Y1 Y2)
     ⇒ combine intermediate states:
     [qi X qk] → a [qj Y1 q1][q1 Y2 qk]
     ```

4. Generate all valid combinations

---

### 🧹 Simplification Pipeline

After construction:

* Remove useless variables
* Remove unreachable symbols
* Eliminate ε-productions
* Eliminate unit productions
* Collapse recursive patterns
* Minimize grammar size

---

## 🎯 Design Philosophy

* **Correctness over shortcuts**
* **Minimal outputs for exams**
* **Readable transformations**
* **Interactive understanding over static theory**

---

## 🚀 Future Improvements

* Step-by-step simulation of stack operations
* CFG ambiguity detection
* CNF/GNF conversion modules
* Export graphs as images/PDF
* Competitive programming mode (quick solve)

---
