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
  if (window.G) window.G.debtMethod = method;
  document.querySelectorAll('.method-btn').forEach(function (b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var _ba = document.getElementById('btn-avalanche'); if (_ba) _ba.className = 'method-btn' + (method === 'avalanche' ? ' active' : '');
  var _bs = document.getElementById('btn-snowball'); if (_bs) _bs.className = 'method-btn' + (method === 'snowball' ? ' active' : '');
  var mi = document.getElementById('method-info');
  if (mi) mi.innerHTML = method === 'avalanche'
    ? '<strong>Avalanche:</strong> Extra cash goes to your highest-rate debt first. Saves the most interest overall.'
    : '<strong>Snowball:</strong> Extra cash goes to your smallest balance first. Faster wins keep you moving.';
  // setMethod() directly mutates file-scoped debtMethod in legacy-calculations.js,
  // bypassing the window.G → G object-identity bridge that breaks in hydration paths.
  if (typeof setMethod === 'function') {
    try { setMethod(method); } catch (e) {
      if (typeof _0x3e799ba === 'function') { try { _0x3e799ba(); } catch (e2) { } }
    }
  } else if (typeof _0x3e799ba === 'function') {
    try { _0x3e799ba(); } catch (e) { }
  }
  if (typeof TracentRenderDebtExperience !== 'undefined' && typeof TracentRenderDebtExperience.render === 'function') {
    try { TracentRenderDebtExperience.render(); } catch (e) { }
  }
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
  var method = g.debtMethod || 'avalanche';

  // Build and sort debt candidates by active method
  var _priCandidates = [];
  if (cc > 0)  _priCandidates.push({ label: 'Credit card',  amt: cc,  rate: g.ccRate      || 21  });
  if (car > 0) _priCandidates.push({ label: 'Car loan',     amt: car, rate: g.carRate     || 7.5 });
  if (stu > 0) _priCandidates.push({ label: 'Student loan', amt: stu, rate: g.studentRate || 5.5 });
  if (oth > 0) _priCandidates.push({ label: 'Other debt',   amt: oth, rate: g.otherRate   || 9.0 });
  if (method === 'snowball') {
    _priCandidates.sort(function(a, b) { return a.amt - b.amt; });
  } else {
    _priCandidates.sort(function(a, b) { return b.rate - a.rate; });
  }
  var _pc = _priCandidates[0] || { label: 'Other debt', amt: oth, rate: 8 };
  var pri = {
    label: _pc.label,
    amt:   _pc.amt,
    rate:  _pc.rate,
    why:   method === 'snowball' ? 'Smallest balance \u2014 clear it first for the fastest win.' : 'Highest interest rate \u2014 every extra dollar saves the most here.'
  };
  var extra = fcf > 0 ? Math.min(Math.round(fcf * 0.25), 200) : 0;
  var months = extra > 0 ? Math.round(pri.amt / extra) : 0;
  // Estimation precision flag — false when user has explicitly provided rates
  var _ratesDefault = (g.ratesAreDefault !== false);

  // Total monthly minimum across all debts (for simplified metrics block)
  var ccMin  = cc  > 0 ? Math.max(25, Math.round(cc * 0.02)) : 0;
  var carMin = car > 0 ? (g.carPayment || 300) : 0;
  var stuMin = stu > 0 ? Math.max(Math.round(stu * 0.01), 100) : 0;
  var othMin = oth > 0 ? (g.otherPayment || Math.max(Math.round(oth * 0.02), 50)) : 0;
  var totalMin = ccMin + carMin + stuMin + othMin;

  // Retirement mode: check BSE navStyle or age-based flag
  var _retirementMode = (window.BSE && window.BSE.navStyle === 'retirement')
    || (g.age >= 60) || (g.currentAge >= 60);
  var orient = _retirementMode
    ? 'Reducing this debt improves your monthly flexibility \u2014 that matters more now than payoff speed.'
    : fcf < 0
      ? 'Your spending currently exceeds your income. Fixing that first makes debt payoff possible.'
      : tot > ((g.takeHome || 0) * 12)
        ? 'Significant debt, and a clear path through it. One priority at a time.'
        : 'Your debt is manageable. One focused target is all that\u2019s needed.';

  var h = '<div class="bse-debt-wrap">';

  /* 1. HERO — calm, spacious, visually separated */
  h += '<div class="bse-dl bse-dl-hero"><div class="bse-dl-orient">' + orient + '</div>';
  if (fcf > 0) h += '<div class="bse-dl-capacity"><strong>' + fmtMoney(fcf) + '/mo</strong> free cash flow — that\u2019s your tool.</div>';
  h += '</div>';

  /* 2. TARGET FIRST — first actionable element */
  h += '<div class="bse-dl"><div class="bse-dl-label">Focus here first</div>'
    + '<div class="bse-dp-card">'
    + '<div class="bse-dp-name">' + pri.label + '</div>'
    + '<div class="bse-dp-amt">' + fmtMoney(pri.amt) + '</div>'
    + (pri.why ? '<div class="bse-dp-why">' + pri.why + '</div>' : '')
    + (extra > 0 && months > 0 && months < 120
        ? '<div class="bse-dp-timeline">Adding ' + fmtMoney(extra) + '/mo clears this in '
          + (_ratesDefault
            ? '~' + Math.round(months * 0.88) + '\u2013' + Math.round(months * 1.13) + ' months'
            : '~' + months + ' months')
          + '</div>'
        : '')
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
    if (cc > 0)  debts.push({ n: 'Credit card', a: cc,  r: g.ccRate      || 21  });
    if (car > 0) debts.push({ n: 'Car loan',    a: car, r: g.carRate     || 7.5 });
    if (stu > 0) debts.push({ n: 'Student',     a: stu, r: g.studentRate || 5.5 });
    if (oth > 0) debts.push({ n: 'Other',       a: oth, r: g.otherRate   || 9.0 });
    debts.sort(function (a, b) { return method === 'snowball' ? a.a - b.a : b.r - a.r; });
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
  /* Estimation disclaimer — only when rates are defaulted */
  if (_ratesDefault) {
    var _arch = (window.BSE && window.BSE.archetype) || '';
    var _disc = _arch === 'anxious_overwhelmed' || _arch === 'avoider'
      ? 'We\u2019re estimating based on typical rates \u2014 you can refine this anytime.'
      : _arch === 'optimizer'
        ? 'Assuming typical APR ranges. Add exact rates in settings to refine.'
        : 'Estimates based on typical rates. Add exact APRs for precision.';
    h += '<div class="bse-dl-disclaimer">' + _disc + '</div>';
  }
  h += '</div>';
  el.innerHTML = h; el.style.display = 'block';

  /* ── Feature layer: re-render debt experience after BSE debt content is built ── */
  if (typeof TracentRenderDebtExperience !== 'undefined') {
    try { TracentRenderDebtExperience.render(); } catch (e) { }
  }
  /* ── Experience layer: apply archetype adaptations to debt tab ── */
  if (typeof TracentExperienceLayer !== 'undefined') {
    try { TracentExperienceLayer.render(); } catch (e) { }
  }
};
