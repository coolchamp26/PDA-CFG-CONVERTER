# CFG ↔ PDA Visualizer

### *(Theory of Automata and Formal Languages Project)*

**Made by:** Ashambar Chaturvedi (2024UCA1898)

---

## 📌 Project Overview

This project presents an interactive web-based tool for converting between **Context-Free Grammars (CFGs)** and **Pushdown Automata (PDAs)**.

It is developed as part of the **Theory of Automata and Formal Languages (TAFL)** coursework, with the goal of bridging the gap between theoretical concepts and practical visualization.

The application focuses on:

* Mathematical correctness
* Step-by-step formal transformations
* Clean, minimal, exam-oriented outputs
* Interactive understanding through visualization

---

## 🎯 Objectives

* To implement standard algorithms for **CFG → PDA** and **PDA → CFG** conversion
* To provide **visual representation** of Pushdown Automata
* To simplify complex grammars into **minimal, readable forms**
* To assist students in understanding TAFL concepts more intuitively

---

## 🚀 Features

### 🔁 Bidirectional Conversion

#### CFG → PDA

* Uses standard construction based on **stack-driven leftmost derivation**
* Generates a minimal 3-state PDA:

  * `q_start`, `q_loop`, `q_accept`
* Ensures correct **reverse push of RHS symbols**

#### PDA → CFG

* Implements **Hopcroft-Ullman Triple Construction**:

  ```
  [qi, X, qj]
  ```
* Handles all intermediate state combinations
* Produces a complete CFG before simplification

---

### 🧠 Grammar Simplification Engine

A structured pipeline is applied to produce clean and minimal results:

* Removal of **unreachable variables**
* Removal of **non-generating symbols**
* Elimination of **ε-productions**
* Elimination of **unit productions** (`A → B`)
* Removal of redundant rules
* Conversion into **exam-standard forms**

---

### 📊 PDA Visualization

* Graphical representation using **SVG**
* Automatic layout of states and transitions
* Interactive features:

  * Dragging nodes
  * Panning the canvas
* Clear depiction of stack operations

---

### 🎨 User Interface

* Light and Dark theme support
* Clean and responsive design
* Smooth animations for better user experience

---

## 🛠 Technologies Used

* **HTML5 & CSS3**

  * Flexbox and Grid layouts
  * CSS variables
  * Responsive design

* **Vanilla JavaScript (ES6+)**

  * Modular code structure
  * Algorithm implementation
  * No external frameworks used

---

## 📂 Project Structure

```text
├── index.html            <- Main interface
├── css/
│   └── style.css         <- Styling and themes
└── js/
    ├── app.js            <- UI logic
    ├── cfg-parser.js     <- CFG parsing
    ├── cfg-to-pda.js     <- CFG → PDA conversion
    ├── pda-to-cfg.js     <- PDA → CFG conversion
    ├── pda-visualizer.js <- Graph rendering
    └── simulation.js     <- Optional simulation logic
```

---

## ⚙️ Conversion Methodology

### 🔁 CFG → PDA

1. Initialize stack:

   ```
   (q_start, ε, ε) → (q_loop, SZ)
   ```

2. For each production:

   ```
   A → X₁ X₂ ... Xₙ
   ```

   Add:

   ```
   (q_loop, ε, A) → (q_loop, Xₙ ... X₁)
   ```

   *(RHS pushed in reverse order)*

3. Match terminals:

   ```
   (q_loop, a, a) → (q_loop, ε)
   ```

4. Accept when stack becomes empty:

   ```
   (q_loop, ε, Z) → (q_accept, ε)
   ```

---

### 🔁 PDA → CFG

1. Define variables:

   ```
   [qi X qj]
   ```

2. Start symbol:

   ```
   S → [q_start Z q_accept]
   ```

3. Convert transitions:

   * Pop:

     ```
     (qi, a, X) → (qj, ε)
     ⇒ [qi X qj] → a
     ```
   * Push:

     ```
     (qi, a, X) → (qj, Y1 Y2)
     ⇒ [qi X qk] → a [qj Y1 q1][q1 Y2 qk]
     ```

4. Generate all valid combinations

---

### 🧹 Simplification

After construction:

* Remove useless and unreachable variables
* Eliminate ε-productions
* Remove unit productions
* Simplify recursive patterns
* Produce minimal grammar

---

## 🎮 How to Run

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/cfg-pda-visualizer.git
   cd cfg-pda-visualizer
   ```

2. Open `index.html` in a browser
   OR run:

   ```bash
   npx serve .
   ```

---

## 📚 Learning Outcomes

* Understanding of CFG and PDA equivalence
* Implementation of formal TAFL algorithms
* Experience with parsing and transformation logic
* Visualization of theoretical models

---

## 📌 Conclusion

This project demonstrates the practical implementation of core concepts from **Formal Languages and Automata Theory**, providing both computational accuracy and visual clarity.

It serves as a learning aid as well as a reference tool for students studying TAFL.

---
