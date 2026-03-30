/* ═══ Tracent Feature: Debt Experience (State) ═══
   Reads existing debt-related state from window.G.
   Returns a structured debt experience object.
   Does NOT rewrite debt calculations — uses engine outputs only.
   Does NOT write state. Pure derivation.

   Public API: TracentDebtExperience.getState()
   Alias:      TracentDebtExperience.compute()  (backward compat)
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  function _g() { return window.G || {}; }
  function _bse() { return window.BSE || {}; }
  function fmt(n) { return '$' + Math.abs(Math.round(n || 0)).toLocaleString(); }

  /* ── Build debt items from G ────────────────────────── */
  function _buildDebts(g) {
    var debts = [];
    if ((g.ccDebt || 0) > 0)      debts.push({ name: 'Credit card',  bal: g.ccDebt,      rate: g.ccRate      || 21,  minPmt: Math.max(25, Math.round((g.ccDebt || 0) * 0.02)) });
    if ((g.carDebt || 0) > 0)     debts.push({ name: 'Car loan',     bal: g.carDebt,     rate: g.carRate     || 7.5, minPmt: g.carPayment     || Math.round((g.carDebt     || 0) / 60) });
    if ((g.studentDebt || 0) > 0) debts.push({ name: 'Student loan', bal: g.studentDebt, rate: g.studentRate || 5.5, minPmt: g.studentPayment || Math.round((g.studentDebt || 0) / 120) });
    if ((g.otherDebt || 0) > 0)   debts.push({ name: 'Other debt',   bal: g.otherDebt,   rate: g.otherRate   || 9.0, minPmt: g.otherPayment   || Math.round((g.otherDebt   || 0) / 60) });
    var method = (window.G || {}).debtMethod || 'avalanche';
    if (method === 'snowball') {
      debts.sort(function(a, b) { return a.bal - b.bal; }); // smallest balance first
    } else {
      debts.sort(function(a, b) { return b.rate - a.rate; }); // highest rate first
    }
    return debts;
  }

  /* ── Emotional intro ────────────────────────────────── */
  function _emotionalIntro(total, fcf, stress) {
    if (stress >= 7) return {
      tone: 'calm',
      text: 'The most important thing right now isn\u2019t the total. It\u2019s that we\u2019re looking at it together, and there is a path through it.'
    };
    if (fcf < 0) return {
      tone: 'honest',
      text: 'Your spending is currently exceeding your income. Fixing that is the first step \u2014 debt payoff accelerates once cash flow is positive.'
    };
    if (total > 50000) return {
      tone: 'reassuring',
      text: 'Carrying ' + fmt(total) + ' in debt feels heavy, and that\u2019s understandable. But with a clear priority and consistent action, the number moves. One debt at a time.'
    };
    if (total > 10000) return {
      tone: 'direct',
      text: 'You\u2019re carrying ' + fmt(total) + ' in consumer debt. That\u2019s manageable at your income level. One focused priority is all that\u2019s needed right now.'
    };
    return {
      tone: 'encouraging',
      text: 'Your debt position is relatively light at ' + fmt(total) + '. A focused push clears this faster than you\u2019d expect.'
    };
  }

  /* ── Priority debt ──────────────────────────────────── */
  function _priorityDebt(debts, fcf, method) {
    if (!debts.length) return null;
    var pri = debts[0];
    var monthlyInt = Math.round(pri.bal * (pri.rate / 100) / 12);
    var extra = fcf > 0 ? Math.min(Math.round(fcf * 0.30), 300) : 0;
    var totalPmt = pri.minPmt + extra;
    var monthsToPayoff = totalPmt > 0 ? Math.ceil(pri.bal / totalPmt) : 0;
    var why = method === 'snowball'
      ? 'Prioritized because it has the smallest balance (' + fmt(pri.bal) + '). Clearing it first builds momentum and frees up a payment quickly.'
      : 'Prioritized because it has the highest interest rate (' + pri.rate + '%). Every extra dollar here saves the most money.';

    return {
      name:            pri.name,
      balance:         pri.bal,
      rate:            pri.rate,
      monthlyInterest: monthlyInt,
      minPayment:      pri.minPmt,
      suggestedExtra:  extra,
      monthsToPayoff:  monthsToPayoff,
      why:             why
    };
  }

  /* ── 3-step plan ────────────────────────────────────── */
  function _threeStepPlan(pri, debts, fcf, method) {
    var steps = [];
    if (!pri) return steps;

    steps.push({
      n: 1,
      title: 'Target your ' + pri.name + ' first',
      detail: 'At ' + pri.rate + '%, this balance costs ' + fmt(pri.monthlyInterest) + '/mo in interest alone. All extra cash goes here.'
    });

    if (pri.suggestedExtra > 0) {
      steps.push({
        n: 2,
        title: 'Add ' + fmt(pri.suggestedExtra) + '/mo from your free cash flow',
        detail: 'That clears it in approximately ' + (pri.monthsToPayoff > 0 ? pri.monthsToPayoff + ' months' : 'less than a year') + '. Then redirect that entire payment to the next debt.'
      });
    } else {
      steps.push({
        n: 2,
        title: 'Pay minimums on everything else',
        detail: 'Don\u2019t spread thin. Protect cash flow and let the priority debt get all available surplus.'
      });
    }

    if (debts.length > 1) {
      steps.push({
        n: 3,
        title: 'When cleared, cascade the payment',
        detail: method === 'snowball'
          ? 'Keep rolling the freed payment into the next balance. That\u2019s how the snowball grows.'
          : 'Keep rolling the freed payment into the next balance. That\u2019s how the avalanche gains speed.'
      });
    } else {
      steps.push({
        n: 3,
        title: 'Redirect freed cash to your next financial priority',
        detail: 'Once debt-free, that ' + fmt(pri.minPayment + pri.suggestedExtra) + '/mo becomes savings, investment, or deposit capital. Your position shifts permanently.'
      });
    }

    return steps;
  }

  /* ── Relief message / forecast ──────────────────────── */
  function _reliefMessage(pri, debts, total, fcf) {
    if (!pri) return null;
    var freedPerMonth = pri.minPayment + pri.suggestedExtra;
    var interestSaved = Math.round(pri.monthlyInterest * Math.max(0, pri.monthsToPayoff - 6));

    if (pri.monthsToPayoff > 0 && pri.monthsToPayoff <= 12) {
      return {
        type: 'forecast',
        headline: 'Your ' + pri.name + ' could be cleared in ' + pri.monthsToPayoff + ' months',
        detail: 'That frees ' + fmt(freedPerMonth) + '/mo permanently. ' + (debts.length > 1 ? 'Then the cascade begins.' : 'That changes everything.')
      };
    }
    if (pri.monthsToPayoff > 12 && pri.monthsToPayoff <= 36) {
      return {
        type: 'progress',
        headline: 'Steady progress \u2014 ' + pri.monthsToPayoff + ' months to clear ' + pri.name,
        detail: 'Every month the interest cost drops. You save approximately ' + fmt(interestSaved) + ' in total interest by staying focused.'
      };
    }
    if (fcf <= 0) {
      return {
        type: 'stabilize',
        headline: 'Fix cash flow first \u2014 then debt payoff accelerates',
        detail: 'Even ' + fmt(50) + '/mo freed from expenses changes the trajectory. The debt isn\u2019t going anywhere \u2014 but your ability to attack it improves the moment cash flow turns positive.'
      };
    }
    return {
      type: 'encouragement',
      headline: 'You\u2019re carrying ' + fmt(total) + ' \u2014 and that\u2019s okay',
      detail: 'With ' + fmt(fcf) + '/mo in free cash flow, you have the tool to make this move. One priority at a time.'
    };
  }

  /* ── Build state ────────────────────────────────────── */
  function _getState() {
    var g = _g();
    var bse = _bse();
    var method = g.debtMethod || 'avalanche';
    var debts = _buildDebts(g);
    var total = debts.reduce(function(sum, d) { return sum + d.bal; }, 0);
    if (total === 0) return null;

    var fcf      = g.fcf || 0;
    var stress   = bse.stress || 0;
    var takeHome = g.takeHome || Math.round((g.income || 0) / 12 * 0.72);
    var monthlyPressure = debts.reduce(function(sum, d) { return sum + d.minPmt; }, 0);

    var intro    = _emotionalIntro(total, fcf, stress);
    var priority = _priorityDebt(debts, fcf, method);
    var plan     = _threeStepPlan(priority, debts, fcf, method);
    var relief   = _reliefMessage(priority, debts, total, fcf);

    return {
      emotionalIntro:  intro,
      totalDebt:       total,
      monthlyPressure: monthlyPressure,
      pressureRatio:   takeHome > 0 ? Math.round((monthlyPressure / takeHome) * 100) : 0,
      priorityDebt:    priority,
      allDebts:        debts,
      plan:            plan,
      relief:          relief,
      stressLevel:     stress >= 7 ? 'high' : stress >= 4 ? 'medium' : 'low',
      stressScore:     stress
    };
  }

  /* ═══ PUBLIC API ════════════════════════════════════════ */

  window.TracentDebtExperience = {
    getState: _getState,
    compute:  _getState   /* backward-compat alias */
  };

})();
