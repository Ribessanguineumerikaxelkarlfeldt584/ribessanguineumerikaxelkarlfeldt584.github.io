/**
 * <need-a-break> Web Component
 *
 * A friendly component that gently reminds someone to take a break.
 *
 * Attributes:
 *   name="Danny"      – Personalises the greeting: "Danny, you've earned a break."
 *   theme="light|dark" – Forces light or dark theme (auto-detects by default).
 *
 * Usage:
 *   <script src="need-a-break.js"></script>
 *   <need-a-break name="Danny"></need-a-break>
 */

class NeedABreak extends HTMLElement {
  // -------------------------------------------------------------------
  // Observed attributes – the browser calls attributeChangedCallback
  // whenever one of these changes on the element.
  // -------------------------------------------------------------------
  static get observedAttributes() {
    return ["name", "theme"];
  }

  constructor() {
    super();

    // Pool of encouraging messages (kept positive, not preachy).
    this._messages = [
      "You've been working hard.",
      "Maybe it's time for a weekend away.",
      "Even a short walk can recharge you.",
      "Vacation days exist for a reason.",
      "Take care of yourself first.",
      "Rest is part of the process.",
      "Your best work comes after a break.",
      "Nature is calling. Answer it. 🌿",
      "The world won't end if you step away.",
      "You deserve a slow morning.",
    ];

    // Icons displayed at the top of the card.
    this._icons = ["🌴", "🏖️", "🌊", "☀️", "🌺"];

    // Current energy level (100 = full, 0 = empty).
    this._energy = 100;

    // Index of the currently displayed message.
    this._msgIndex = Math.floor(Math.random() * this._messages.length);

    // Index of the currently displayed icon.
    this._iconIndex = Math.floor(Math.random() * this._icons.length);

    // Timer ID for the energy drain interval.
    this._drainTimer = null;

    // Attach a shadow DOM (open so external JS can still inspect it).
    this._shadow = this.attachShadow({ mode: "open" });

    // Build the DOM structure once in the constructor.
    this._build();
  }

  // -------------------------------------------------------------------
  // Lifecycle – element added to the document
  // -------------------------------------------------------------------
  connectedCallback() {
    this._applyTheme();
    this._updateName();
    this._startDrain();
  }

  // -------------------------------------------------------------------
  // Lifecycle – element removed from the document
  // -------------------------------------------------------------------
  disconnectedCallback() {
    this._stopDrain();
  }

  // -------------------------------------------------------------------
  // Lifecycle – observed attribute changed
  // -------------------------------------------------------------------
  attributeChangedCallback(name) {
    if (name === "theme") this._applyTheme();
    if (name === "name") this._updateName();
  }

  // -------------------------------------------------------------------
  // Build the shadow DOM structure (called once in the constructor).
  // -------------------------------------------------------------------
  _build() {
    // ---- Stylesheet via adoptedStyleSheets ----
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(this._css());
    this._shadow.adoptedStyleSheets = [sheet];

    // ---- HTML structure ----
    // We create elements programmatically so the component works even
    // in environments where innerHTML is restricted (e.g., CSP).
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "region");
    card.setAttribute("aria-label", "Need a break reminder");

    // Icon
    const icon = document.createElement("div");
    icon.className = "icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = this._icons[this._iconIndex];
    this._iconEl = icon;

    // Message
    const msg = document.createElement("p");
    msg.className = "message";
    msg.id = "nab-msg";
    msg.textContent = this._messages[this._msgIndex];
    this._msgEl = msg;

    // Warning banner (hidden until energy is low)
    const warn = document.createElement("p");
    warn.className = "warning";
    warn.setAttribute("aria-live", "assertive");
    warn.setAttribute("role", "alert");
    warn.hidden = true;
    warn.textContent = "⚠️ You deserve a break!";
    this._warnEl = warn;

    // Energy label row
    const energyLabel = document.createElement("div");
    energyLabel.className = "energy-label";

    const labelText = document.createElement("span");
    labelText.textContent = "Energy";

    const labelPct = document.createElement("span");
    labelPct.className = "energy-pct";
    this._energyPctEl = labelPct;

    energyLabel.appendChild(labelText);
    energyLabel.appendChild(labelPct);

    // Progress bar track
    const track = document.createElement("div");
    track.className = "bar-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", "Energy level");
    track.setAttribute("aria-valuenow", "100");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    this._trackEl = track;

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    this._fillEl = fill;

    track.appendChild(fill);

    // Buttons row
    const buttons = document.createElement("div");
    buttons.className = "buttons";

    // "Another suggestion" button
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-next";
    nextBtn.textContent = "Another suggestion";
    nextBtn.setAttribute("aria-describedby", "nab-msg");
    nextBtn.addEventListener("click", () => this._nextMessage());
    nextBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._nextMessage();
      }
    });

    // "Recharge" button
    const rechargeBtn = document.createElement("button");
    rechargeBtn.className = "btn btn-recharge";
    rechargeBtn.textContent = "Recharge";
    rechargeBtn.setAttribute("aria-label", "Recharge energy to 100%");
    rechargeBtn.addEventListener("click", () => this._recharge());
    rechargeBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._recharge();
      }
    });
    this._rechargeBtnEl = rechargeBtn;

    buttons.appendChild(nextBtn);
    buttons.appendChild(rechargeBtn);

    // Assemble card
    card.appendChild(icon);
    card.appendChild(msg);
    card.appendChild(warn);
    card.appendChild(energyLabel);
    card.appendChild(track);
    card.appendChild(buttons);

    this._cardEl = card;
    this._shadow.appendChild(card);

    // Set initial energy display.
    this._updateEnergyUI();
  }

  // -------------------------------------------------------------------
  // Show the next random message (different from the current one).
  // -------------------------------------------------------------------
  _nextMessage() {
    let next;
    do {
      next = Math.floor(Math.random() * this._messages.length);
    } while (next === this._msgIndex && this._messages.length > 1);
    this._msgIndex = next;

    // Also cycle the icon for visual variety.
    this._iconIndex = (this._iconIndex + 1) % this._icons.length;
    this._iconEl.textContent = this._icons[this._iconIndex];

    // Animate the message swap with a quick fade.
    this._msgEl.classList.remove("fade-in");
    // Force reflow so the animation restarts.
    void this._msgEl.offsetWidth;
    this._msgEl.textContent = this._messages[this._msgIndex];
    this._msgEl.classList.add("fade-in");

    // Personalise if a name is set.
    this._updateName();
  }

  // -------------------------------------------------------------------
  // Personalise the displayed message with the name attribute.
  // -------------------------------------------------------------------
  _updateName() {
    const name = this.getAttribute("name");
    if (!name) return;
    // Only prepend the name if it isn't already there.
    const base = this._messages[this._msgIndex];
    this._msgEl.textContent = `${name}, ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
  }

  // -------------------------------------------------------------------
  // Start draining the energy bar every second (1% per tick → ~100s).
  // -------------------------------------------------------------------
  _startDrain() {
    if (this._drainTimer) return; // already running
    this._drainTimer = setInterval(() => {
      if (this._energy > 0) {
        this._energy = Math.max(0, this._energy - 1);
        this._updateEnergyUI();
      }
    }, 1000);
  }

  // -------------------------------------------------------------------
  // Stop the drain timer (called when the element is disconnected).
  // -------------------------------------------------------------------
  _stopDrain() {
    clearInterval(this._drainTimer);
    this._drainTimer = null;
  }

  // -------------------------------------------------------------------
  // Restore energy to 100% and hide the warning.
  // -------------------------------------------------------------------
  _recharge() {
    this._energy = 100;
    this._updateEnergyUI();
    // Give the card a little bounce to celebrate.
    this._cardEl.classList.remove("shake");
    void this._cardEl.offsetWidth;
    this._cardEl.classList.add("bounce");
    setTimeout(() => this._cardEl.classList.remove("bounce"), 600);
  }

  // -------------------------------------------------------------------
  // Sync all energy-related UI elements with this._energy.
  // -------------------------------------------------------------------
  _updateEnergyUI() {
    const pct = this._energy;

    // Update progress bar width.
    this._fillEl.style.width = `${pct}%`;

    // Update ARIA attributes for accessibility.
    this._trackEl.setAttribute("aria-valuenow", String(pct));

    // Update the percentage label.
    this._energyPctEl.textContent = `${pct}%`;

    // Change bar colour as energy drops.
    this._fillEl.className =
      "bar-fill" +
      (pct <= 20 ? " bar-low" : pct <= 50 ? " bar-mid" : "");

    // Show/hide the warning banner and shake animation.
    if (pct <= 20 && !this._warnEl.hidden) return; // already shown
    if (pct <= 20) {
      this._warnEl.hidden = false;
      this._cardEl.classList.add("shake");
    } else {
      this._warnEl.hidden = true;
      this._cardEl.classList.remove("shake");
    }
  }

  // -------------------------------------------------------------------
  // Apply the correct colour theme (light / dark / auto).
  // -------------------------------------------------------------------
  _applyTheme() {
    const theme = this.getAttribute("theme");
    this._cardEl.classList.remove("theme-light", "theme-dark");
    if (theme === "light") this._cardEl.classList.add("theme-light");
    else if (theme === "dark") this._cardEl.classList.add("theme-dark");
    // If neither, the CSS uses prefers-color-scheme automatically.
  }

  // -------------------------------------------------------------------
  // All component styles in one place.
  // -------------------------------------------------------------------
  _css() {
    return /* css */ `
      /* ---- Host sizing ---- */
      :host {
        display: inline-block;
        font-family: system-ui, sans-serif;
      }

      /* ---- Card shell ---- */
      .card {
        width: 320px;
        min-height: 220px;
        padding: 24px 22px 18px;
        border-radius: 18px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        /* Default (light) colours */
        background: #f0faf4;
        color: #1a3d2b;
        box-shadow: 0 4px 24px rgba(0,0,0,0.10);
        transition: background 0.4s, color 0.4s;
      }

      /* ---- Theme overrides ---- */
      .card.theme-dark {
        background: #1a2e25;
        color: #d4f0e2;
      }

      @media (prefers-color-scheme: dark) {
        .card:not(.theme-light) {
          background: #1a2e25;
          color: #d4f0e2;
        }
      }

      /* ---- Floating icon animation ---- */
      .icon {
        font-size: 2.6rem;
        animation: float 3.6s ease-in-out infinite;
        line-height: 1;
        user-select: none;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0);   }
        50%       { transform: translateY(-8px); }
      }

      /* ---- Message ---- */
      .message {
        margin: 0;
        font-size: 1rem;
        line-height: 1.5;
        text-align: center;
        min-height: 3em;
        opacity: 1;
        transition: opacity 0.2s;
      }

      .message.fade-in {
        animation: fadeIn 0.35s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0);   }
      }

      /* ---- Warning banner ---- */
      .warning {
        margin: 0;
        font-size: 0.88rem;
        font-weight: 600;
        color: #b85c00;
        text-align: center;
        animation: pulse 1.6s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1;   }
        50%       { opacity: 0.5; }
      }

      /* ---- Energy label row ---- */
      .energy-label {
        width: 100%;
        display: flex;
        justify-content: space-between;
        font-size: 0.78rem;
        opacity: 0.75;
        margin-bottom: -4px;
      }

      /* ---- Progress bar ---- */
      .bar-track {
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: rgba(0,0,0,0.10);
        overflow: hidden;
      }

      .bar-fill {
        height: 100%;
        border-radius: 4px;
        background: #3cb872;
        transition: width 0.8s ease, background 0.6s;
      }

      .bar-fill.bar-mid { background: #e0a020; }
      .bar-fill.bar-low { background: #d94f00; }

      /* ---- Buttons ---- */
      .buttons {
        display: flex;
        gap: 8px;
        margin-top: 4px;
        flex-wrap: wrap;
        justify-content: center;
      }

      .btn {
        border: none;
        border-radius: 999px;
        padding: 7px 16px;
        font-size: 0.85rem;
        cursor: pointer;
        font-family: inherit;
        transition: transform 0.15s, box-shadow 0.15s;
      }

      .btn:focus-visible {
        outline: 3px solid #3cb872;
        outline-offset: 2px;
      }

      .btn:active {
        transform: scale(0.96);
      }

      .btn-next {
        background: #3cb872;
        color: #fff;
      }

      .btn-next:hover {
        background: #2ea060;
        box-shadow: 0 2px 8px rgba(60,184,114,0.35);
      }

      .btn-recharge {
        background: transparent;
        color: currentColor;
        border: 1.5px solid currentColor;
        opacity: 0.7;
      }

      .btn-recharge:hover {
        opacity: 1;
        box-shadow: 0 2px 8px rgba(0,0,0,0.10);
      }

      /* ---- Card animations ---- */
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%       { transform: translateX(-4px); }
        40%       { transform: translateX(4px); }
        60%       { transform: translateX(-3px); }
        80%       { transform: translateX(3px); }
      }

      .card.shake {
        animation: shake 0.5s ease, breathe 4s ease-in-out 0.5s infinite;
      }

      @keyframes breathe {
        0%, 100% { transform: scale(1);    box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
        50%       { transform: scale(1.02); box-shadow: 0 6px 28px rgba(0,0,0,0.15); }
      }

      @keyframes bounce {
        0%   { transform: scale(1);    }
        40%  { transform: scale(1.04); }
        70%  { transform: scale(0.97); }
        100% { transform: scale(1);    }
      }

      .card.bounce {
        animation: bounce 0.6s ease;
      }
    `;
  }
}

// Register the custom element.
customElements.define("need-a-break", NeedABreak);
