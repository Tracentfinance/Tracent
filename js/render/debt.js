/* ═══ Tracent Render: Debt Tab ═══
   Debt method selection, accelerator slider, debt-specific UI events.
   
   BSE owns _buildDebtRelief() — the primary debt relief shell.
   Engine (legacy-calculations.js) owns debt math and countdown rendering.
   This file owns debt tab UI interactions.
   
   Depends on: core/bse.js (BSE._buildDebtRelief)
═══════════════════════════════════════════════ */

// ── Debt method ───────────────────────────────────────────
function setDebtMethod(method, btn) {
  if (typeof G !== 'undefined') G.debtMethod = method;
  document.querySelectorAll('.method-btn').forEach(function (b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var _ba = document.getElementById('btn-avalanche'); if (_ba) _ba.className = 'method-btn' + (method === 'avalanche' ? ' active' : '');
  var _bs = document.getElementById('btn-snowball'); if (_bs) _bs.className = 'method-btn' + (method === 'snowball' ? ' active' : '');
  var mi = document.getElementById('method-info');
  if (mi) mi.innerHTML = method === 'avalanche'
    ? '<strong>Avalanche method:</strong> Pay minimums on all debts, put extra cash toward the highest interest rate first. Mathematically optimal — saves the most money overall.'
    : '<strong>Snowball method:</strong> Pay minimums on all debts, put extra cash toward the smallest balance first. Psychologically powerful — quick wins keep you motivated.';
  if (typeof _0x3e799ba === 'function') { try { _0x3e799ba(); } catch (e) { } }
}
function updateDebtAccelerator(val) {
  var valEl = document.getElementById('debt-accelerator-val');
  if (valEl) valEl.textContent = '$' + parseInt(val).toLocaleString();
  if (typeof G !== 'undefined') G.extraPayment = parseInt(val);
  var impactEl = document.getElementById('debt-accelerator-impact');
  if (impactEl && typeof _0x3e799ba === 'function') { setTimeout(function () { try { _0x3e799ba(); } catch (e) { } }, 50); }
}

// ── Split costs ───────────────────────────────────────────
window.toggleSplitCosts = function () {
  window._splitCosts = !window._splitCosts;
  var btn = document.getElementById('split-costs-btn');
  var lbl = document.getElementById('split-btn-label');
  var note = document.getElementById('split-note');
  if (btn) btn.classList.toggle('active', window._splitCosts);
  if (lbl) lbl.textContent = window._splitCosts ? 'Splitting costs ✓' : 'Split with partner';
  if (note) note.style.display = window._splitCosts ? 'block' : 'none';
  if (typeof calcOwnerMortgage === 'function') calcOwnerMortgage();
  var expHint = document.getElementById('expenses-split-hint');
  if (expHint) expHint.style.display = window._splitCosts ? 'inline' : 'none';
};


// ── Window exports ────────────────────────────────────────
window.setDebtMethod = setDebtMethod;
window.updateDebtAccelerator = updateDebtAccelerator;


/* ═══════════════════════════════════════════════════════════
   BSE DEBT RELIEF RENDERER — extracted from core/bse.js
   BSE decides WHEN to show debt relief and at what layer.
   This function decides HOW the relief shell is assembled.
   Reads: window.BSE.debtLayer, window.G (financial data)
═══════════════════════════════════════════════════════════ */
window.bseRenderDebtRelief = function () {
  var fmtMoney = function (n) { return '$' + Math.round(Math.abs(n || 0)).toLocaleString(); };
  var el = document.getElementById('bse-debt-relief');
  if (!el) return;
  var BSE = window.BSE || {};
  var g = (window.G && window.G.income) ? window.G : (typeof G !== 'undefined' ? G : window.G || {});
  var cc = g.ccDebt || 0, car = g.carDebt || 0, stu = g.studentDebt || 0, oth = g.otherDebt || 0;
  var tot = cc + car + stu + oth;
  if (tot === 0) { el.style.display = 'none'; return; }
  var fcf = g.fcf || 0, layer = BSE.debtLayer || 1;

  var pri = cc > 0 ? { label: 'Credit card', amt: cc, rate: g.ccRate || 21, why: 'highest interest rate' }
    : car > 0 ? { label: 'Car loan', amt: car, rate: 6, why: 'near-term cash freedom' }
      : stu > 0 ? { label: 'Student loan', amt: stu, rate: 5.5, why: 'income flexibility' }
        : { label: 'Other debt', amt: oth, rate: 8, why: 'cash flow' };
  var extra = fcf > 0 ? Math.min(Math.round(fcf * 0.25), 200) : 0;
  var months = extra > 0 ? Math.round(pri.amt / extra) : 0;

  // Total monthly minimum across all debts (for simplified metrics block)
  var ccMin  = cc  > 0 ? Math.max(25, Math.round(cc * 0.02)) : 0;
  var carMin = car > 0 ? (g.carPayment || 300) : 0;
  var stuMin = stu > 0 ? Math.max(Math.round(stu * 0.01), 100) : 0;
  var othMin = oth > 0 ? (g.otherPayment || Math.max(Math.round(oth * 0.02), 50)) : 0;
  var totalMin = ccMin + carMin + stuMin + othMin;

  var orient = fcf < 0
    ? 'The most important thing right now isn\u2019t the debt total \u2014 it\u2019s that your spending exceeds your income. Addressing that first makes everything else easier.'
    : tot > ((g.takeHome || 0) * 12)
      ? 'You\u2019re carrying significant debt, and that\u2019s okay. There is a clear path through it. One priority at a time is how this gets done.'
      : 'Your debt is manageable at your income level. One focused priority is all that\u2019s needed right now.';

  var h = '<div class="bse-debt-wrap">';

  /* 1. HERO — calm, spacious, visually separated */
  h += '<div class="bse-dl bse-dl-hero"><div class="bse-dl-orient">' + orient + '</div>';
  if (fcf > 0) h += '<div class="bse-dl-capacity">You have <strong>' + fmtMoney(fcf) + '/mo</strong> of free cash flow. That is your tool here.</div>';
  h += '</div>';

  /* 2. TARGET FIRST — first actionable element */
  h += '<div class="bse-dl"><div class="bse-dl-label">Focus here first</div>'
    + '<div class="bse-dp-card">'
    + '<div class="bse-dp-name">' + pri.label + '</div>'
    + '<div class="bse-dp-amt">' + fmtMoney(pri.amt) + '</div>'
    + '<div class="bse-dp-why">Prioritized for ' + pri.why + '</div>'
    + (extra > 0 && months > 0 && months < 120 ? '<div class="bse-dp-timeline">Adding ' + fmtMoney(extra) + '/mo clears this in ~' + months + ' months</div>' : '')
    + '</div></div>';

  /* 3. METRICS — one primary (monthly minimums), total debt as secondary */
  h += '<div class="bse-dl bse-dl-metrics">'
    + '<div class="bse-metric-primary">'
    + '<div class="bse-metric-label">Monthly minimums due</div>'
    + '<div class="bse-metric-value">' + fmtMoney(totalMin) + '<span class="bse-metric-unit">/mo</span></div>'
    + '</div>'
    + '<div class="bse-metric-secondary">Total debt: ' + fmtMoney(tot) + '</div>'
    + '</div>';
  /* Layer 3: full list */
  if (layer >= 3) {
    var debts = [];
    if (cc > 0) debts.push({ n: 'Credit card', a: cc, r: g.ccRate || 21 });
    if (car > 0) debts.push({ n: 'Car loan', a: car, r: 6 });
    if (stu > 0) debts.push({ n: 'Student', a: stu, r: 5.5 });
    if (oth > 0) debts.push({ n: 'Other', a: oth, r: 8 });
    debts.sort(function (a, b) { return b.r - a.r; });
    h += '<div class="bse-dl"><div class="bse-dl-label">Your full debt picture</div><div class="bse-debt-list">';
    debts.forEach(function (d) {
      var mo = Math.round(d.a * d.r / 100 / 12);
      h += '<div class="bse-debt-row">'
        + '<span class="bse-dr-name">' + d.n + '</span>'
        + '<div class="bse-dr-right"><div class="bse-dr-amt">' + fmtMoney(d.a) + '</div>'
        + '<div class="bse-dr-int">' + fmtMoney(mo) + '/mo interest</div></div>'
        + '</div>';
    });
    h += '</div></div>';
  }
  /* Layer 4: strategy tools */
  if (layer >= 4) {
    h += '<div class="bse-dl"><button class="bse-dl-strategy-btn" onclick="bseUnlockDebtStrategy()">Open payoff strategy tools \u2192</button></div>';
  }
  /* Progressive reveal */
  if (layer < 3) h += '<button class="bse-dl-reveal" onclick="bseRevealDebtLayer()">See more detail \u25be</button>';
  h += '</div>';
  el.innerHTML = h; el.style.display = 'block';

  /* ── Feature layer: re-render debt experience after BSE debt content is built ── */
  if (typeof TracentRenderDebtExperience !== 'undefined') {
    try { TracentRenderDebtExperience.render(); } catch (e) { }
  }
};
