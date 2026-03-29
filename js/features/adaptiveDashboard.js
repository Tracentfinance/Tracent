/* ═══ Tracent Feature: Adaptive Dashboard (State) ═══
   Reads window.G + window.BSE after engine computation.
   Returns a structured adaptive dashboard state object.
   Does NOT render. Does NOT write state. Pure derivation.

   Modes: debt_relief | home_focus | growth_focus | retirement_focus | stabilize
   High stress → minimal UI. Low stress → optional detail.

   Public API: TracentAdaptiveDashboard.getState()
   Alias:      TracentAdaptiveDashboard.compute()  (backward compat)
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  function _g() { return window.G || {}; }
  function _bse() { return window.BSE || {}; }
  function fmt(n) { return '$' + Math.abs(Math.round(n || 0)).toLocaleString(); }

  /* ── Mode detection ─────────────────────────────────── */
  function _detectMode(g, bse) {
    var intent = g.primaryIntent || 'stable';
    var arch   = bse.archetype || 'stable_confident';
    var stress = bse.stress || 0;
    var fcf    = g.fcf || 0;
    var totDebt = (g.ccDebt || 0) + (g.carDebt || 0) + (g.studentDebt || 0) + (g.otherDebt || 0);
    var dti    = g.dti || 0;

    if (arch === 'in_retirement' || arch === 'pre_retirement') return 'retirement_focus';
    if (arch === 'anxious_overwhelmed' || stress >= 7) return 'stabilize';

    if (intent === 'debt' || (totDebt > 5000 && dti > 40)) return 'debt_relief';
    if (intent === 'home' || intent === 'buy')              return 'home_focus';
    if (intent === 'retire')                                return 'retirement_focus';
    if (intent === 'grow' || intent === 'invest_more')      return 'growth_focus';

    if (fcf < 0 || (totDebt > 0 && dti > 43)) return 'debt_relief';
    if (totDebt > 8000)                        return 'debt_relief';

    return 'growth_focus';
  }

  /* ── Stress classification ──────────────────────────── */
  function _stressScore(bse) {
    return Math.min(10, Math.max(0, (bse.stress || 0)));
  }
  function _stressLevel(score) {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /* ── Emotional header ───────────────────────────────── */
  function _emotionalHeader(mode, g, bse) {
    var name = g.firstname ? g.firstname + ', ' : '';
    var score = g.score || 0;
    var stress = bse.stress || 0;

    if (stress >= 7) return {
      title: name + 'let\u2019s focus on one thing.',
      sub: 'Your position is under pressure, but there is a clear next step.',
      tone: 'calm'
    };
    if (mode === 'debt_relief') return {
      title: name + 'your debt has a clear path through it.',
      sub: 'One priority at a time is how this gets done.',
      tone: 'reassuring'
    };
    if (mode === 'home_focus') return {
      title: name + 'your home plan is taking shape.',
      sub: 'Every month of preparation makes the purchase stronger.',
      tone: 'encouraging'
    };
    if (mode === 'retirement_focus') {
      if (bse.archetype === 'in_retirement') return {
        title: name + 'your plan is working.',
        sub: 'Stability and consistency are your biggest advantages now.',
        tone: 'reassuring'
      };
      return {
        title: name + 'your retirement timeline is active.',
        sub: 'The decisions you make now compound for decades.',
        tone: 'encouraging'
      };
    }
    if (mode === 'growth_focus') {
      if (score >= 70) return {
        title: name + 'you\u2019re in a strong position.',
        sub: 'The foundation is solid. Now it\u2019s about consistency and compounding.',
        tone: 'confident'
      };
      return {
        title: name + 'you\u2019re building momentum.',
        sub: 'Each step forward makes the next one easier.',
        tone: 'encouraging'
      };
    }
    return {
      title: name + 'here\u2019s where you stand.',
      sub: 'One step at a time moves the whole picture forward.',
      tone: 'neutral'
    };
  }

  /* ── Primary focus ──────────────────────────────────── */
  function _primaryFocus(mode, g, bse) {
    var fcf = g.fcf || 0;
    var efMo = parseInt(g.emergency || '0');
    var cc = g.ccDebt || 0;
    var totDebt = (cc) + (g.carDebt || 0) + (g.studentDebt || 0) + (g.otherDebt || 0);

    if (mode === 'stabilize' || fcf < 0) return {
      label: 'Stabilize cash flow',
      metric: fmt(Math.abs(fcf)) + '/mo shortfall',
      action: 'Find one expense to reduce this week',
      cta: { text: 'See your spending \u2192', fn: "switchTab('debtrank')" },
      urgency: 'high'
    };
    if (mode === 'debt_relief') {
      var pri = cc > 0 ? { name: 'credit card', amt: cc, rate: g.ccRate || 21 }
              : (g.carDebt || 0) > 0 ? { name: 'car loan', amt: g.carDebt, rate: 7 }
              : (g.studentDebt || 0) > 0 ? { name: 'student loan', amt: g.studentDebt, rate: 5.5 }
              : { name: 'debt', amt: totDebt, rate: 8 };
      var extra = fcf > 0 ? Math.min(Math.round(fcf * 0.25), 200) : 0;
      return {
        label: 'Target: ' + pri.name,
        metric: fmt(pri.amt) + ' at ' + pri.rate + '%',
        action: extra > 0 ? 'Add ' + fmt(extra) + '/mo to this payment' : 'Any extra payment helps',
        cta: { text: 'See the plan \u2192', fn: "switchTab('debtrank')" },
        urgency: 'medium'
      };
    }
    if (mode === 'home_focus') {
      var hp = g.homePrice || g.targetHomePrice || 0;
      var dp = g.depositSaved || g.downPayment || 0;
      var gap = hp > 0 ? Math.max(0, hp * 0.10 + hp * 0.03 - dp) : 0;
      return {
        label: 'Home readiness',
        metric: gap > 0 ? fmt(gap) + ' to close' : 'Deposit target met',
        action: gap > 0 ? 'Automate ' + fmt(Math.round(fcf * 0.5)) + '/mo toward deposit' : 'Get 3 lender quotes this week',
        cta: { text: 'See home plan \u2192', fn: "switchTab('home')" },
        urgency: 'low'
      };
    }
    if (mode === 'retirement_focus') {
      var match = g.retMatch || 'none';
      var matchOk = match === 'full' || match === 'maxed';
      return {
        label: bse.archetype === 'in_retirement' ? 'Plan stability' : 'Retirement readiness',
        metric: matchOk ? 'Match captured' : 'Match: ' + match,
        action: bse.archetype === 'in_retirement'
          ? 'Maintain consistency \u2014 your plan is working'
          : matchOk ? 'Increase contributions by 1%' : 'Capture your full employer match',
        cta: { text: 'See retirement \u2192', fn: "showProgressSub('retirement')" },
        urgency: 'low'
      };
    }
    if (efMo < 3) return {
      label: 'Build emergency buffer',
      metric: efMo + ' of 3 months',
      action: 'Direct surplus to high-yield savings first',
      cta: { text: 'See your plan \u2192', fn: "switchTab('home')" },
      urgency: 'medium'
    };
    return {
      label: 'Deploy surplus',
      metric: fmt(fcf) + '/mo available',
      action: 'Automate monthly investment on payday',
      cta: { text: 'See growth plan \u2192', fn: "switchTab('home')" },
      urgency: 'low'
    };
  }

  /* ── Action steps (max 3) ───────────────────────────── */
  function _steps(mode, g, bse) {
    var steps = [];
    var fcf = g.fcf || 0;
    var efMo = parseInt(g.emergency || '0');
    var totDebt = (g.ccDebt || 0) + (g.carDebt || 0) + (g.studentDebt || 0) + (g.otherDebt || 0);
    var stress = bse.stress || 0;

    /* FIX 5: High-stress steps use calmer, non-contradictory language */
    if (stress >= 7) {
      steps.push({ n: 1, text: 'Review this week\u2019s spending for anything non-essential' });
      steps.push({ n: 2, text: 'Protect minimum payments \u2014 rebuild breathing room first' });
      steps.push({ n: 3, text: 'Come back to Tracent next week \u2014 one step at a time' });
      return steps;
    }

    if (mode === 'debt_relief') {
      steps.push({ n: 1, text: 'Focus all extra cash on your highest-rate debt' });
      if (fcf > 0) steps.push({ n: 2, text: 'Add ' + fmt(Math.min(Math.round(fcf * 0.25), 200)) + '/mo extra' });
      steps.push({ n: steps.length + 1, text: 'When cleared, redirect payment to next debt' });
    } else if (mode === 'home_focus') {
      steps.push({ n: 1, text: 'Automate deposit savings from each paycheck' });
      if (g.credit === 'poor' || g.credit === 'below') steps.push({ n: 2, text: 'Improve credit score before applying' });
      else steps.push({ n: 2, text: 'Get pre-approval from 3 lenders' });
      steps.push({ n: 3, text: 'Review Tracent monthly to track readiness' });
    } else if (mode === 'retirement_focus') {
      if (bse.archetype === 'in_retirement') {
        steps.push({ n: 1, text: 'Maintain current income sources' });
        if (totDebt > 0) steps.push({ n: 2, text: 'Clear remaining debt to protect cash flow' });
        steps.push({ n: steps.length + 1, text: 'Review position quarterly' });
      } else {
        steps.push({ n: 1, text: 'Capture full employer match' });
        steps.push({ n: 2, text: 'Increase contribution rate by 1% this quarter' });
        if (totDebt > 0) steps.push({ n: 3, text: 'Clear high-rate debt to free compounding capital' });
        else steps.push({ n: 3, text: 'Avoid new debt \u2014 protect the compounding runway' });
      }
    } else {
      if (efMo < 3) steps.push({ n: 1, text: 'Build emergency fund to 3 months' });
      else steps.push({ n: 1, text: 'Automate investment on payday' });
      steps.push({ n: 2, text: 'Review and optimise subscriptions/expenses' });
      steps.push({ n: 3, text: 'Check in with Tracent weekly' });
    }

    return steps.slice(0, 3);
  }

  /* ── Build state ────────────────────────────────────── */
  function _getState() {
    var g = _g();
    var bse = _bse();
    if (!g.score && !g.income) return null;

    var mode   = _detectMode(g, bse);
    var sScore = _stressScore(bse);
    var sLevel = _stressLevel(sScore);
    var header = _emotionalHeader(mode, g, bse);
    var focus  = _primaryFocus(mode, g, bse);
    var steps  = _steps(mode, g, bse);

    return {
      stressLevel:         sLevel,
      stressScore:         sScore,
      dashboardMode:       mode,
      emotionalHeader:     header,
      primaryFocus:        focus,
      steps:               steps,
      showExpandedMetrics: sLevel !== 'high' && bse.densityLevel !== 'minimal',
      score:               g.score || null,
      fcf:                 g.fcf || 0,
      archetype:           bse.archetype || null
    };
  }

  /* ═══ PUBLIC API ════════════════════════════════════════ */

  window.TracentAdaptiveDashboard = {
    getState: _getState,
    compute:  _getState   /* backward-compat alias */
  };

})();
