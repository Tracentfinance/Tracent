/* ═══ Tracent Engine: Cash Flow Structure ═══
   Computes G.cashflow — a structured breakdown of the user's
   monthly cash flow into fixed, flexible, and non-monthly buckets.
   Also estimates a recurring charge provision and flags leak risk.

   Reads:  G.takeHome, G.fcf, G.expenses, G.payment, G.rentAmt,
           G.totalHousingCost, G.ccDebt, G.carDebt, G.carPayment,
           G.studentDebt, G.otherPayment, G.housingType,
           G.income, G.ccRate
   Writes: G.cashflow (structured object — see schema below)

   Hook:   tracent:scoreComputed (final only) — same pattern as
           experienceLayer.js. Never fires during onboarding preview.

   Public API: window.computeCashflowStructure()
               (also callable directly for testing)

   Schema: G.cashflow = {
     fixed:                 number,  // housing + debt minimums + declared expenses
     fixedPct:              number,  // fixed as % of takeHome
     flexible:              number,  // = G.fcf (already computed)
     flexiblePct:           number,  // flexible as % of takeHome
     nonMonthlyMonthly:     number,  // annualised lumpy costs ÷ 12
     nonMonthlyAnnual:      number,  // same × 12
     nonMonthlyItems:       Array,   // [{label, monthly}] itemised estimates
     subscriptionEst:       number,  // estimated recurring charge bucket (monthly)
     effectiveFCF:          number,  // fcf − nonMonthlyMonthly − subscriptionEst
     effectiveFCFPct:       number,  // as % of takeHome
     leakRisk:              string,  // 'low' | 'medium' | 'high'
     leakItems:             Array,   // [{label, est, basis}] potential leaks
     structuredAt:          number,  // Date.now() timestamp
   }
═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── helpers ─────────────────────────────────────────────────── */
  var _pct = function (part, whole) {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
  };

  /* ── non-monthly cost estimator ──────────────────────────────────
     Estimates recurring but non-monthly costs from existing G fields.
     Returns an array of {label, monthly} line items.
     All estimates are labeled with their basis so they are never
     presented as detected facts.
  ─────────────────────────────────────────────────────────────────*/
  function _estimateNonMonthly(g) {
    var items = [];
    var housingType = g.housingType || 'renting';

    // Vehicle expenses — if user has a car debt or car payment, assume a car exists
    var hasCar = (g.carDebt || 0) > 0 || (g.carPayment || 0) > 0;
    if (hasCar) {
      items.push({ label: 'Auto insurance (est.)',    monthly: 150, basis: 'national avg ~$1,800/yr' });
      items.push({ label: 'Vehicle registration/tax', monthly: 20,  basis: 'est. $240/yr annualised' });
    }

    // Home insurance — owners and cashout
    if (housingType === 'owner' || housingType === 'cashout') {
      // PMI/insurance may already be in PITI — do not double-count.
      // G.monthlyIns is set by the owner compute path if insurance was entered.
      // Only add if G.monthlyIns is zero/missing (user left it blank).
      var alreadyCaptured = (g.monthlyIns || 0) > 0;
      if (!alreadyCaptured) {
        items.push({ label: 'Homeowners insurance (est.)', monthly: 110, basis: 'est. if not in PITI input' });
      }
    }

    // Renters insurance
    if (housingType === 'renting') {
      items.push({ label: 'Renters insurance (est.)', monthly: 18, basis: 'avg ~$215/yr annualised' });
    }

    // Annual fees — credit cards, memberships (income-scaled)
    var income = g.income || 0;
    var annualFeesEst = income > 80000 ? 40 : income > 40000 ? 25 : 15;
    items.push({ label: 'Annual fees / memberships (est.)', monthly: annualFeesEst, basis: 'est. from income band' });

    // Medical out-of-pocket — very rough provision
    var medEst = income > 100000 ? 65 : income > 60000 ? 45 : 30;
    items.push({ label: 'Medical / dental co-pays (est.)', monthly: medEst, basis: 'avg OOP provision, income-scaled' });

    return items;
  }

  /* ── subscription / recurring charge estimator ───────────────────
     We do not have bank access. This estimates the typical recurring
     charge burden from income-band data, not from transaction detection.
     All items are explicitly labeled as estimates.
  ─────────────────────────────────────────────────────────────────*/
  function _estimateSubscriptions(g) {
    var income  = g.income || 0;
    var takeHome = g.takeHome || 0;

    // Streaming + software subscriptions — income-band estimate
    var streamingEst = income > 100000 ? 85 : income > 60000 ? 65 : income > 30000 ? 45 : 30;

    // Phone plan
    var phoneEst = income > 80000 ? 90 : 70;

    // Gym / wellness
    var gymEst = income > 60000 ? 45 : income > 30000 ? 30 : 0;

    var items = [
      { label: 'Streaming / software subscriptions (est.)', est: streamingEst, basis: 'income-band average' },
      { label: 'Phone plan (est.)',                          est: phoneEst,     basis: 'avg plan cost' },
    ];
    if (gymEst > 0) {
      items.push({ label: 'Gym / wellness (est.)', est: gymEst, basis: 'income-band average' });
    }

    var total = items.reduce(function (s, i) { return s + i.est; }, 0);
    return { total: total, items: items };
  }

  /* ── housing cost ─────────────────────────────────────────────── */
  function _housingCost(g) {
    var ht = g.housingType || 'renting';
    if (ht === 'owner' || ht === 'cashout') return g.totalHousingCost || g.payment || 0;
    if (ht === 'renting')                  return g.rentAmt || 0;
    // buying / other — use totalPITI or best available
    return g.totalPITI || g.payment || g.rentAmt || 0;
  }

  /* ── debt minimums ────────────────────────────────────────────── */
  function _debtMinimums(g) {
    var cc      = (g.ccDebt || 0) > 0 ? Math.max(25, Math.round((g.ccDebt || 0) * 0.02)) : 0;
    var car     = g.carPayment || 0;
    var student = g.studentPayment || (g.studentDebt > 0 ? Math.max((g.studentDebt || 0) * 0.01, 100) : 0);
    var other   = g.otherPayment || 0;
    return cc + car + student + other;
  }

  /* ── main ─────────────────────────────────────────────────────── */
  function computeCashflowStructure() {
    var g = window.G;
    if (!g || !g.scoreFinal) return;

    var takeHome  = g.takeHome || 0;
    var fcf       = g.fcf != null ? g.fcf : 0;
    var expenses  = g.expenses || 0;        // user-declared "other expenses" bucket
    var housing   = _housingCost(g);
    var debtMin   = _debtMinimums(g);

    // ── fixed = housing + debt minimums + declared expenses ──────
    var fixed     = housing + debtMin + expenses;
    var fixedPct  = _pct(fixed, takeHome);

    // ── flexible = G.fcf (already computed by housing path) ──────
    var flexible    = fcf;
    var flexiblePct = _pct(flexible, takeHome);

    // ── non-monthly estimates ─────────────────────────────────────
    var nmItems       = _estimateNonMonthly(g);
    var nmMonthly     = nmItems.reduce(function (s, i) { return s + i.monthly; }, 0);
    var nmAnnual      = nmMonthly * 12;

    // ── subscription/recurring estimate ──────────────────────────
    var subEst        = _estimateSubscriptions(g);

    // ── effective FCF = fcf minus unbudgeted provisions ──────────
    // Only subtract provisions that are NOT already in G.expenses.
    // G.expenses is the user's self-reported "other monthly expenses" bucket.
    // If it's materially above zero (> 500/mo), assume it already covers
    // many of these — only apply the non-monthly smoothing, not subscriptions.
    var alreadyBudgeted = expenses > 500;
    var provisionToDeduct = alreadyBudgeted
      ? nmMonthly                              // subscriptions likely already in expenses
      : nmMonthly + subEst.total;             // expenses field is minimal — apply both
    var effectiveFCF    = fcf - provisionToDeduct;
    var effectiveFCFPct = _pct(effectiveFCF, takeHome);

    // ── leak risk ─────────────────────────────────────────────────
    // Based on the gap between nominal FCF and effective FCF
    // relative to take-home.
    var provisionPct = _pct(provisionToDeduct, takeHome);
    var leakRisk;
    if      (provisionPct >= 20 || effectiveFCF < 0)    leakRisk = 'high';
    else if (provisionPct >= 12 || effectiveFCF < 200)  leakRisk = 'medium';
    else                                                  leakRisk = 'low';

    // ── leak items — the specific flagged items ────────────────────
    var leakItems = subEst.items.map(function (i) {
      return { label: i.label, est: i.est, basis: i.basis };
    });
    // Add non-monthly items that represent >5% of FCF (only flag meaningful ones)
    nmItems.forEach(function (i) {
      if (fcf > 0 && (i.monthly / fcf) > 0.05) {
        leakItems.push({ label: i.label, est: i.monthly, basis: i.basis });
      }
    });

    g.cashflow = {
      fixed:              Math.round(fixed),
      fixedPct:           fixedPct,
      flexible:           Math.round(flexible),
      flexiblePct:        flexiblePct,
      nonMonthlyMonthly:  Math.round(nmMonthly),
      nonMonthlyAnnual:   Math.round(nmAnnual),
      nonMonthlyItems:    nmItems,
      subscriptionEst:    Math.round(subEst.total),
      subscriptionItems:  subEst.items,
      effectiveFCF:       Math.round(effectiveFCF),
      effectiveFCFPct:    effectiveFCFPct,
      leakRisk:           leakRisk,
      leakItems:          leakItems,
      structuredAt:       Date.now()
    };

    // Sync to window.G (G is the file-scoped let in legacy-calculations.js;
    // window.G is the shared reference. Both point to the same object after
    // the compute pass writes `window.G = G`, so this assignment is a no-op
    // in practice — kept for explicitness.)
    window.G = g;
  }

  /* ── event wire ─────────────────────────────────────────────── */
  document.addEventListener('tracent:scoreComputed', function (e) {
    var d = e.detail || {};
    // Only run on confirmed final score — not during onboarding preview
    if (d.final === true && d.estimated !== true) {
      try { computeCashflowStructure(); } catch (err) {
        console.warn('[cashflow] computeCashflowStructure error:', err);
      }
    }
  });

  /* ── public API ─────────────────────────────────────────────── */
  window.computeCashflowStructure = computeCashflowStructure;

}());
