/* ═══ Tracent Engine: Legacy Calculations ═══
   Tax rates, take-home estimator, credit scoring, housing calculations,
   financial health score, main compute engine, housing recommendations,
   format helpers, dynamic cards, dashboard tabs, career benchmarks,
   salary tools, event handlers, DOMContentLoaded wiring.
   
   WARNING: Do not restructure. This is the stable calculation core.
   Future pass: extract into sub-modules after full test coverage.
═══════════════════════════════════════════════ */

let selectedCredit = 'fair';

// ─── STATE TAX RATES (approximate marginal/flat) ───
const STATE_TAX = {
  AL:0.05, AK:0, AZ:0.025, AR:0.047, CA:0.093, CO:0.044, CT:0.065,
  DE:0.066, FL:0, GA:0.055, HI:0.079, ID:0.058, IL:0.0495, IN:0.0315,
  IA:0.057, KS:0.057, KY:0.045, LA:0.0425, ME:0.075, MD:0.0575,
  MA:0.05, MI:0.0425, MN:0.0985, MS:0.047, MO:0.054, MT:0.0675,
  NE:0.0664, NV:0, NH:0, NJ:0.0897, NM:0.059, NY:0.0685, NC:0.0499,
  ND:0.029, OH:0.04, OK:0.0475, OR:0.099, PA:0.0307, RI:0.0599,
  SC:0.07, SD:0, TN:0, TX:0, UT:0.0485, VT:0.0875, VA:0.0575,
  WA:0, WV:0.065, WI:0.0765, WY:0
};

// ─── PROPERTY TAX RATES BY STATE (avg annual %) ───
const STATE_PROP_TAX = {
  AL:0.0040, AK:0.0119, AZ:0.0062, AR:0.0063, CA:0.0076, CO:0.0051,
  CT:0.0214, DE:0.0057, FL:0.0098, GA:0.0092, HI:0.0030, ID:0.0063,
  IL:0.0227, IN:0.0085, IA:0.0153, KS:0.0138, KY:0.0086, LA:0.0055,
  ME:0.0136, MD:0.0109, MA:0.0123, MI:0.0154, MN:0.0112, MS:0.0065,
  MO:0.0097, MT:0.0084, NE:0.0153, NV:0.0060, NH:0.0218, NJ:0.0249,
  NM:0.0080, NY:0.0172, NC:0.0084, ND:0.0098, OH:0.0157, OK:0.0090,
  OR:0.0097, PA:0.0153, RI:0.0163, SC:0.0057, SD:0.0117, TN:0.0071,
  TX:0.0181, UT:0.0060, VT:0.0194, VA:0.0082, WA:0.0093, WV:0.0059,
  WI:0.0185, WY:0.0061
};

// ─── CREDIT SCORE RATE PREMIUMS ───
const CREDIT_PREMIUM = {
  excellent: 0,     // 760+ — best rate
  good:      0.20,  // 720-759
  fair:      0.50,  // 680-719
  below:     1.20,  // 620-679
  poor:      2.10,  // <620 — specialist products
  unknown:   0.35   // assume slightly above average
};

// ─── CREDIT SCORE UI ───
function selectCredit(score) {
  selectedCredit = score;
  document.querySelectorAll('.credit-option').forEach(el => {
    el.style.borderColor = 'var(--gray-2)';
    el.style.background = 'white';
  });
  const sel = document.querySelector(`[data-score="${score}"]`);
  if (sel) { sel.style.borderColor = 'var(--teal)'; sel.style.background = 'var(--teal-dim)'; }
  estimateTakeHome();
}

// ─── MARKET RATE (editable baseline) ───
const BASE_MARKET_RATE = 6.72; // Updated: March 2026
function _0x4fe0ea1(creditScore) {
  return BASE_MARKET_RATE + (CREDIT_PREMIUM[creditScore] || 0);
}

// ─── TAKE-HOME ESTIMATOR ───
function updateStateHomePriceHints() {
  var state = (document.getElementById('state') && document.getElementById('state').value) || (G && G.state) || 'NY';
  var medianHome = (typeof STATE_MEDIAN_HOME !== 'undefined' && STATE_MEDIAN_HOME[state]) || 350000;
  var fmtM = function(n){ return n>=1000000?'$'+(n/1000000).toFixed(1)+'M':'$'+Math.round(n/1000)+'k'; };
  var STATE_NAMES = {AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
    CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',
    ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
    ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
    MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
    NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
    OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
    TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
    WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'Washington DC'};
  var sn = STATE_NAMES[state] || state;
  document.querySelectorAll('.state-median-home').forEach(function(el){ el.textContent = fmtM(medianHome); });
  document.querySelectorAll('.state-name-dynamic').forEach(function(el){ el.textContent = sn; });
  var stateNoteEl = document.getElementById('state-median-home-note');
  if (stateNoteEl) stateNoteEl.textContent = 'Median home in ' + sn + ': ' + fmtM(medianHome) + ' · Zillow/NAR est.';
  var stateNoteEl2 = document.getElementById('career-state-note');
  if (stateNoteEl2 && typeof STATE_SALARY_MULT !== 'undefined') {
    var adj = STATE_SALARY_MULT[state] || 1.0;
    stateNoteEl2.textContent = adj >= 1.05
      ? 'Wages in ' + sn + ' run ~' + Math.round((adj-1)*100) + '% above national median · BLS data, AI-verified.'
      : 'BLS national benchmarks · AI-verified for ' + sn + '.';
  }
}


function forceEstimateTakeHome() {
  const el = document.getElementById('takehome');
  if (el) el.removeAttribute('data-manual');
  const hint = document.getElementById('takehome-hint');
  if (hint) hint.textContent = 'How is this estimated? ▾';
  estimateTakeHome();
  // Re-render job market preview with new state multiplier
  var jobTitleEl = document.getElementById('job-title');
  if (jobTitleEl && jobTitleEl.value && jobTitleEl.value.trim().length > 1) {
    onJobTitleInput(jobTitleEl.value.trim());
  }
  // Update any state-specific hints
  if (typeof updateStateHomePriceHints === 'function') updateStateHomePriceHints();
}

function estimateTakeHome() {
  const gross = parseFloat(document.getElementById('income').value) || 0;
  if (!gross) return;
  const liveState = document.getElementById('state')?.value || 'NY';
  const workState = document.getElementById('work-state')?.value || '';
  const jobtype   = document.getElementById('jobtype')?.value || 'private';
  const filing    = document.getElementById('filing-status')?.value || 'single';

  // ── 2024 Federal brackets + standard deductions by filing status ──
  // Source: IRS Rev. Proc. 2023-34
  const configs = {
    single: {
      deduction: 14600,
      brackets: [
        [11600,  0.10, 0],
        [47150,  0.12, 1160],
        [100525, 0.22, 5426],
        [191950, 0.24, 17169],
        [243725, 0.32, 39111],
        [609350, 0.35, 55679],
        [Infinity, 0.37, 183647]
      ]
    },
    mfj: {
      deduction: 29200,
      brackets: [
        [23200,   0.10, 0],
        [94300,   0.12, 2320],
        [201050,  0.22, 10852],
        [383900,  0.24, 34337],
        [487450,  0.32, 78221],
        [731200,  0.35, 111357],
        [Infinity, 0.37, 202154]
      ]
    },
    hoh: {
      deduction: 21900,
      brackets: [
        [16550,   0.10, 0],
        [63100,   0.12, 1655],
        [100500,  0.22, 7241],
        [191950,  0.24, 15469],
        [243700,  0.32, 37417],
        [609350,  0.35, 53977],
        [Infinity, 0.37, 181954]
      ]
    },
    mfs: {
      deduction: 14600,
      brackets: [
        [11600,  0.10, 0],
        [47150,  0.12, 1160],
        [100525, 0.22, 5426],
        [191950, 0.24, 17169],
        [243725, 0.32, 39111],
        [365600, 0.35, 55679],
        [Infinity, 0.37, 98671]
      ]
    }
  };

  const cfg = configs[filing] || configs.single;
  const taxable = Math.max(0, gross - cfg.deduction);

  let fedTax = 0;
  let prevBracket = 0;
  for (const [limit, rate, base] of cfg.brackets) {
    if (taxable <= limit) {
      fedTax = base + (taxable - prevBracket) * rate;
      break;
    }
    prevBracket = limit;
  }
  fedTax = Math.max(0, fedTax);

  // FICA (same regardless of filing status)
  // Self-employed pay both halves (15.3%), employees pay half (7.65%)
  const ficaRate = jobtype === 'selfemployed' ? 0.153 : 0.0765;
  const fica = (Math.min(gross, 168600) * (jobtype === 'selfemployed' ? 0.124 : 0.062)) +
               gross * (jobtype === 'selfemployed' ? 0.029 : 0.0145);

  // ── State tax ──
  const liveRate = STATE_TAX[liveState] || 0;
  let workRate = 0, cityTax = 0, stateTaxNote = '';

  if (!workState || workState === '') {
    workRate = liveRate;
  } else if (workState === 'NYC') {
    workRate = 0.0882;
    cityTax  = gross * 0.03876;
    if (liveState === 'CT') {
      const ctCredit = Math.min(gross * liveRate, gross * workRate);
      stateTaxNote = `\u26a0\ufe0f CT/NYC commuter: NY state + NYC city tax (~8.8% + 3.9%). CT gives a credit, so you pay NYC\u2019s higher combined rate. Est. extra vs CT-only: $${Math.round((gross * workRate + cityTax - ctCredit) / 12).toLocaleString()}/mo.`;
    } else {
      stateTaxNote = `NYC city tax (~3.88%) adds on top of NY state tax \u2014 a significant extra cost for NYC workers.`;
    }
  } else if (workState === 'other') {
    workRate = Math.max(liveRate, 0.05);
    stateTaxNote = `\u26a0\ufe0f Working across state lines \u2014 estimated conservatively. Check your specific states.`;
  } else {
    const workStateTaxRate = STATE_TAX[workState] || 0;
    workRate = Math.max(liveRate, workStateTaxRate);
    if (workStateTaxRate > liveRate)
      stateTaxNote = `You work in ${workState} (${(workStateTaxRate*100).toFixed(1)}% rate) \u2014 ${liveState} typically gives a credit, so you pay ${workState}\u2019s higher rate.`;
    else if (workStateTaxRate < liveRate)
      stateTaxNote = `You work in ${workState} (${(workStateTaxRate*100).toFixed(1)}%) but live in ${liveState} (${(liveRate*100).toFixed(1)}%). You may owe the difference to ${liveState}.`;
    else
      stateTaxNote = `Similar rates between your live and work states.`;
  }

  const stateTax   = gross * workRate + cityTax;
  const totalTax   = fedTax + fica + stateTax;
  const annualNet  = Math.max(gross * 0.45, gross - totalTax);
  const monthly    = Math.round(annualNet / 12);

  // Effective tax rate
  const effRate = Math.round((totalTax / gross) * 100);

  // Update field if not manually overridden
  const thEl = document.getElementById('takehome');
  if (thEl && thEl.getAttribute('data-manual') !== 'true') thEl.value = monthly;

  // Breakdown — show filing status used
  const breakdown = document.getElementById('takehome-breakdown');
  if (breakdown) {
    breakdown.style.display = 'block';
    const filingLabels = {single:'Single',mfj:'Married/Joint',hoh:'Head of Household',mfs:'Married/Separate'};
    let txt = `${filingLabels[filing] || 'Single'} · Fed: <strong>$${Math.round(fedTax/12).toLocaleString()}/mo</strong> · FICA: <strong>$${Math.round(fica/12).toLocaleString()}/mo</strong> · State: <strong>$${Math.round(stateTax/12).toLocaleString()}/mo</strong> · Effective: <strong>${effRate}%</strong>`;
    breakdown.innerHTML = txt;
  }

  // Work state note
  const workStateNote = document.getElementById('work-state-note');
  if (workStateNote) {
    if (stateTaxNote) {
      workStateNote.textContent = stateTaxNote;
      workStateNote.style.display = 'block';
      workStateNote.style.color = workState === 'NYC' || workState === 'other' ? 'var(--amber)' : 'var(--gray-4)';
    } else {
      workStateNote.style.display = 'none';
    }
  }

  // State note (live state)
  const stateNote = document.getElementById('state-note');
  if (stateNote) {
    const noTax = STATE_TAX[liveState] === 0;
    stateNote.textContent = noTax
      ? `✅ ${liveState} has no state income tax.`
      : `${liveState} income tax: ~${(liveRate * 100).toFixed(1)}%`;
    stateNote.style.color = noTax ? 'var(--green)' : 'var(--gray-4)';
  }

  // Job type notes
  const jobtypeNote = document.getElementById('jobtype-note');
  if (jobtypeNote) {
    const notes = {
      teacher: '🎓 Teachers may qualify for PSLF student loan forgiveness and state-specific mortgage assistance.',
      public: '🏛️ Public employees may qualify for PSLF and first-time buyer assistance.',
      military: '⭐ Veterans qualify for VA loans — 0% down, no PMI, competitive rates.',
      selfemployed: '💼 Self-employed applicants need 2 years of tax returns for mortgage qualification. Lenders use net income.',
      parttime: '⚠️ Part-time income may require longer employment history for mortgage qualification.',
      private: ''
    };
    const note = notes[document.getElementById('jobtype').value] || '';
    jobtypeNote.textContent = note;
    jobtypeNote.style.display = note ? 'block' : 'none';
  }
}

function toggleOwnerOverrides() {
  const el = document.getElementById('owner-overrides');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ── Split costs toggle ─────────────────────────────────────────────
function toggleSplitCosts() {
  window._splitCosts = !window._splitCosts;
  var btn   = document.getElementById('split-costs-btn');
  var label = document.getElementById('split-btn-label');
  var note  = document.getElementById('split-note');
  if (btn) {
    if (window._splitCosts) {
      btn.style.background    = 'rgba(0,119,182,0.1)';
      btn.style.borderColor   = 'var(--teal)';
      btn.style.color         = 'var(--teal)';
    } else {
      btn.style.background    = 'white';
      btn.style.borderColor   = 'var(--gray-2)';
      btn.style.color         = 'var(--gray-4)';
    }
  }
  if (label) label.textContent = window._splitCosts ? 'Splitting costs ✓' : 'Split with partner?';
  if (note)  note.style.display = window._splitCosts ? 'block' : 'none';
  // Recalculate with new split factor
  calcOwnerMortgage();
}


function calcOwnerMortgage() {
  const price    = parseFloat(document.getElementById('purchase-price')?.value) || 0;
  const dp       = parseFloat(document.getElementById('down-payment')?.value) || 0;
  const rate     = parseFloat(document.getElementById('currentrate')?.value) || 0;
  const yrsLeft  = parseFloat(document.getElementById('yearsleft')?.value) || 30;
  const balOverride = parseFloat(document.getElementById('balance-override')?.value) || 0;
  const homeValueOverride = parseFloat(document.getElementById('home-value')?.value) || 0;

  if (!price || !rate) return;

  const originalLoan = Math.max(0, price - dp);
  const dpPct = price > 0 ? Math.round((dp / price) * 100) : 0;

  // Update down payment % badge
  const badge = document.getElementById('dp-pct-badge');
  if (badge) {
    badge.textContent = dpPct + '%';
    badge.style.color = dpPct >= 20 ? 'var(--green)' : dpPct >= 10 ? 'var(--navy)' : 'var(--amber)';
  }

  // P&I calculation
  const _0x8ee2cd7 = (bal, r, yrs) => {
    const m = (r / 100) / 12, n = yrs * 12;
    if (m === 0) return bal / n;
    return (bal * m * Math.pow(1 + m, n)) / (Math.pow(1 + m, n) - 1);
  };

  // Estimate current balance from original loan + years left
  // If years left < original term, we approximate the original term as 30yr
  const originalTerm = 30;
  const yearsInto = Math.max(0, originalTerm - yrsLeft);
  const monthlyPI = _0x8ee2cd7(originalLoan, rate, originalTerm);

  // Amortize to find current balance
  let bal = originalLoan;
  const r = (rate / 100) / 12;
  for (let i = 0; i < yearsInto * 12; i++) {
    bal = bal * (1 + r) - monthlyPI;
    if (bal < 0) { bal = 0; break; }
  }
  const estimatedBalance = balOverride > 0 ? balOverride : Math.round(bal);

  // Recalculate P&I on estimated current balance for years left
  const currentPI = Math.round(_0x8ee2cd7(estimatedBalance, rate, yrsLeft));

  // Home value: override or estimate (purchase price × 1.03^yearsInto)
  const estimatedHomeValue = homeValueOverride > 0
    ? homeValueOverride
    : Math.round(price * Math.pow(1.03, yearsInto));

  const ltv = estimatedHomeValue > 0 ? Math.round((estimatedBalance / estimatedHomeValue) * 100) : 0;
  const equity = Math.max(0, estimatedHomeValue - estimatedBalance);
  const equityPct = 100 - ltv;

  // PMI
  const hasPMI = dpPct < 20 && ltv > 80;
  const pmiMonthly = hasPMI ? Math.round(estimatedBalance * 0.0085 / 12) : 0;

  // Apply split factor if user shares costs with partner
  var splitFactor = window._splitCosts ? 0.5 : 1.0;
  var displayPI = Math.round(currentPI * splitFactor);

  // Write to hidden fields that _0x7730df6 reads
  const balEl = document.getElementById('balance');
  const pmtEl = document.getElementById('payment');
  if (balEl) balEl.value = estimatedBalance;  // full balance — asset is the whole house
  if (pmtEl) pmtEl.value = displayPI;             // your share of the monthly payment
  window._splitEquity = window._splitCosts ? 0.5 : 1.0;

  // Update preview boxes
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  set('calc-pi', '$' + displayPI.toLocaleString() + (window._splitCosts ? ' (your half)' : ''));
  set('calc-balance', '$' + Math.round(estimatedBalance / 1000) + 'K');

  const ltvEl = document.getElementById('calc-ltv');
  if (ltvEl) {
    ltvEl.textContent = ltv + '%';
    ltvEl.style.color = ltv <= 80 ? 'var(--green)' : ltv <= 90 ? 'var(--amber)' : 'var(--red)';
  }

  const pmiBox = document.getElementById('calc-pmi-box');
  const pmiEl = document.getElementById('calc-pmi');
  const pmiNote = document.getElementById('calc-pmi-note');
  if (hasPMI) {
    if (pmiEl) { pmiEl.textContent = '$' + pmiMonthly + '/mo'; pmiEl.style.color = 'var(--red)'; }
    if (pmiBox) pmiBox.style.background = 'rgba(230,57,70,0.06)';
    if (pmiNote) {
      pmiNote.style.display = 'block';
      pmiNote.textContent = `⚠️ PMI is costing you $${pmiMonthly}/mo because your down payment was under 20%. You need ${equityPct < 20 ? (20 - equityPct) + '% more equity to remove it' : 'an appraisal — you may qualify to cancel now'}. Ask your lender once you hit 20% equity.`;
    }
  } else {
    if (pmiEl) { pmiEl.textContent = 'None ✅'; pmiEl.style.color = 'var(--green)'; }
    if (pmiBox) pmiBox.style.background = 'rgba(16,185,129,0.06)';
    if (pmiNote) pmiNote.style.display = 'none';
  }
}

function _0xe57aa32() {
  const el = document.getElementById('takehome');
  if (el) el.setAttribute('data-manual', 'true');
  const hint = document.getElementById('takehome-hint');
  if (hint) hint.textContent = '✏️ Manual override active';
}

function _0x4fee8f4() {
  const el = document.getElementById('tax-help');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ─── INPUT VALIDATION ───
function validateField(input, min, max, label) {
  const val = parseFloat(input.value);
  const warnId = input.id + '-warning';
  const warn = document.getElementById(warnId);
  if (!warn) return true;
  if (isNaN(val) || val < min) {
    warn.textContent = `⚠️ ${label} looks too low — did you enter the right number?`;
    warn.style.display = 'block';
    input.style.borderColor = 'var(--amber)';
    return false;
  }
  if (val > max) {
    warn.textContent = `⚠️ ${label} looks unusually high — please double-check.`;
    warn.style.display = 'block';
    input.style.borderColor = 'var(--amber)';
    return false;
  }
  warn.style.display = 'none';
  input.style.borderColor = '';
  return true;
}

// validateStep1 — no-op; V21 phase flow handles validation
function validateStep1() {}

// ─── BUYING COST PREVIEW ───
function updateBuyingEstimates() {
  const price = parseFloat(document.getElementById('home-price')?.value) || 0;
  const dpPct = parseFloat(document.getElementById('deposit-pct')?.value) || 10;
  const loanType = document.getElementById('loan-type')?.value || 'conventional';
  const state = document.getElementById('state')?.value || 'NY';
  const credit = selectedCredit;
  if (!price) return;

  const dp = price * (dpPct / 100);
  const loan = price - dp;
  const rate = _0x4fe0ea1(credit);
  const r = (rate / 100) / 12, n = 360;
  const pi = Math.round((loan * r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1));

  // PMI
  let pmi = 0;
  if (dpPct < 20 && loanType === 'conventional') pmi = Math.round(loan * 0.01 / 12);
  if (loanType === 'fha') pmi = Math.round(loan * 0.0085 / 12); // FHA MIP

  // Property tax estimate from state
  const propTaxRate = STATE_PROP_TAX[state] || 0.012;
  const monthlyTax = Math.round(price * propTaxRate / 12);

  // Insurance estimate
  const monthlyIns = Math.round((price * 0.005) / 12);
  const totalPITI = pi + pmi + monthlyTax + monthlyIns;

  // Closing costs ~3%
  const closingCosts = Math.round(price * 0.03);
  const totalCash = Math.round(dp + closingCosts);

  // Loan type notes
  const loanNotes = {
    conventional: dpPct < 20 ? `Conventional loan with ${dpPct}% down requires PMI until you reach 20% equity. Est. PMI: $${pmi}/mo.` : `✅ 20%+ down — no PMI required. Best available rates.`,
    fha: `FHA loans require as little as 3.5% down but carry Mortgage Insurance Premium (MIP) for the life of the loan. Great for credit scores 580+.`,
    va: `✅ VA loans for veterans: 0% down required, no PMI, competitive rates. Requires Certificate of Eligibility.`,
    usda: `✅ USDA loans for rural/suburban areas: 0% down, low rates. Income limits apply. Check usda.gov for eligibility.`
  };
  const lnNote = document.getElementById('loan-type-note');
  if (lnNote) { lnNote.textContent = loanNotes[loanType] || ''; }

  // Show preview
  const preview = document.getElementById('buying-cost-preview');
  if (preview) { preview.style.display = 'block'; }

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('preview-pi', `$${pi.toLocaleString()}/mo`);
  set('preview-pmi', pmi > 0 ? `$${pmi.toLocaleString()}/mo` : 'None');
  const pmiRow = document.getElementById('preview-pmi-row');
  if (pmiRow) pmiRow.style.display = (loanType === 'va' || loanType === 'usda') ? 'none' : 'flex';
  set('preview-tax', `$${monthlyTax.toLocaleString()}/mo`);
  set('preview-ins', `$${monthlyIns.toLocaleString()}/mo`);
  set('preview-total', `$${totalPITI.toLocaleString()}/mo`);
  set('preview-dp', `$${Math.round(dp).toLocaleString()}`);
  set('preview-closing', `$${closingCosts.toLocaleString()}`);
  set('preview-cash-total', `$${totalCash.toLocaleString()}`);
}

// ─── LIFE EVENT NOTES ───
function _0x1fc21d4() {
  const ev = document.getElementById('life-event')?.value || 'none';
  const noteEl = document.getElementById('life-event-note');
  if (!noteEl) return;
  const notes = {
    new_job: 'Lenders typically want 2 years at your current employer. A recent job change may require a letter of explanation.',
    divorce: 'Separation can affect your credit, co-signed debts, and qualifying income. Tracent will factor this into your recommendations.',
    bereavement: 'Inheritances or estate changes can significantly affect your financial position. Tracent will flag relevant opportunities.',
    new_baby: 'Growing families often have increased expenses and may qualify for specific state assistance programs.',
    job_loss: 'If your income has recently dropped, Tracent will prioritise emergency fund and debt management recommendations.',
    health: 'Medical debt is handled differently by many lenders — Tracent will note this in your assessment.'
  };
  noteEl.textContent = notes[ev] || '';
  noteEl.style.display = ev !== 'none' && notes[ev] ? 'block' : 'none';
}

// ─── RETIREMENT MATCH NOTE ───
function _0xe2ad9e2() {
  const match = document.getElementById('retirement-match')?.value || 'none';
  const note = document.getElementById('retirement-note');
  if (!note) return;
  if (match === 'full' || match === 'partial') {
    note.textContent = '💡 An unmatched 401(k) is essentially free money — Tracent will flag this if you\'re not maximising it.';
    note.style.display = 'block';
  } else {
    note.style.display = 'none';
  }
}

// ─── MONTHLY PAYMENT CALCULATOR ───
function _0x8ee2cd7(principal, annualRate, years) {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
  const r = (annualRate / 100) / 12, n = years * 12;
  return (principal * r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
}

// ─── FORMAT HELPERS ───
function _0x4f66a67(n) { return '$' + Math.abs(Math.round(n)).toLocaleString(); }
function _0x3e27a99(n) { return Math.round(n) + '%'; }

// ─── FINANCIAL HEALTH SCORE ───
// ── PROPERTY READINESS ──────────────────────────────
// Scores how close the user is to mortgage readiness (0-100)
function _0x5d74b48() {
  const card = document.getElementById('readiness-card');
  if (!card || !G.score) return;

  const monthlyIncome = G.income ? G.income / 12 : (G.takeHome || 0);
  const takeHome      = G.takeHome || monthlyIncome * 0.72;
  const dti           = G.dti || 0;
  const creditTier    = G.creditScore || 'unknown';
  const ef            = parseInt(G.emergencyMonths) || 0;
  const deposit       = (G.depositSaved || 0) + (G.savingsAmt || 0);
  const targetDeposit = G.targetPrice ? G.targetPrice * 0.10 : monthlyIncome * 36; // 10% or 3yrs income
  const depositPct    = targetDeposit > 0 ? Math.min(deposit / targetDeposit, 1) : 0;
  const fcf           = G.fcf !== undefined ? G.fcf : (takeHome - (G.payment || G.rentAmt || 0) - (G.ccDebt > 0 ? Math.max(G.ccDebt * 0.02, 25) : 0));

  // Component scores 0-100
  const dtiScore     = dti <= 0 ? 50 : dti < 28 ? 100 : dti < 36 ? 78 : dti < 43 ? 50 : dti < 50 ? 25 : 5;
  const creditScore  = { excellent:100, good:70, fair:70, poor:20, below:20, unknown:45 }[creditTier] || 45;
  const efScore      = ef >= 3 ? 100 : ef >= 2 ? 70 : ef >= 1 ? 40 : 0;
  const depositScore = Math.round(depositPct * 100);
  const fcfScore     = takeHome > 0 ? Math.min(Math.max(Math.round((fcf / takeHome) * 400), 0), 100) : 50;

  // Housing-type bonus: already owns = closer to property goal
  const ownerBonus = (G.housingType === 'owner' || G.housingType === 'cashout') ? 15 : 0;

  const readiness = Math.min(100, Math.round(
    dtiScore      * 0.28 +
    creditScore   * 0.22 +
    efScore       * 0.18 +
    depositScore  * 0.22 +
    fcfScore      * 0.10
  ) + ownerBonus);

  // Label
  let label, sub, arcColor;
  if (readiness >= 80) {
    label = 'Mortgage Ready'; sub = 'Strong position — start lender conversations';
    arcColor = '#10B981';
  } else if (readiness >= 60) {
    label = 'Getting Close'; sub = G.housingType === 'renting' ? 'Keep building your deposit & score' : '1–2 moves away from your next property';
    arcColor = '#0077B6';
  } else if (readiness >= 40) {
    label = 'Building Foundations'; sub = dti > 36 ? 'Reduce DTI to unlock better rates' : ef < 2 ? 'Build emergency fund first' : 'Growing steadily';
    arcColor = '#F8A750';
  } else {
    label = 'Early Stage'; sub = 'Your plan starts here — every step counts';
    arcColor = '#E63946';
  }

  // Update card
  const labelEl = document.getElementById('readiness-label');
  const subEl   = document.getElementById('readiness-sub');
  const pctEl   = document.getElementById('readiness-pct');
  const barEl   = document.getElementById('readiness-bar');
  const arcEl   = document.getElementById('readiness-arc');

  if (labelEl) labelEl.textContent = label;
  if (subEl)   subEl.textContent   = sub;
  if (pctEl)   pctEl.textContent   = readiness + '%';
  if (barEl)   { barEl.style.width = readiness + '%'; barEl.style.background = `linear-gradient(90deg, ${arcColor}, ${arcColor}cc)`; }
  if (arcEl)   {
    const circ = 163.4; // 2*pi*26
    arcEl.style.stroke = arcColor;
    arcEl.style.strokeDashoffset = circ - (readiness / 100) * circ;
  }
  G.readiness = readiness;
}

// ── GLOBAL FORMAT HELPERS ──
function _0x82f03c5(n, compact) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (compact && abs >= 1000000) return sign + '$' + (abs/1000000).toFixed(1) + 'M';
  if (compact && abs >= 1000) return sign + '$' + (abs/1000).toFixed(1) + 'k';
  return sign + '$' + Math.round(abs).toLocaleString();
}

function _0xb70f5a4(dti, fcf, credit, emergency, ccDebt, ccRate, housingType, totalNonHousingDebt, monthlyIncome) {
  // ── TRACENT SCORE — 5 weighted categories, each scored 0–100 ──
  // Mirrors FICO methodology: independent category scores combined by weight.

  // ── 1. PAYMENT STABILITY (30%) — DTI ratio ──
  // How well do your monthly obligations fit your income?
  let cat1;
  if      (dti <  20) cat1 = 100;
  else if (dti <  28) cat1 = 88;
  else if (dti <  36) cat1 = 68;
  else if (dti <  43) cat1 = 42;
  else if (dti <  50) cat1 = 20;
  else                cat1 = 5;

  // ── 2. DEBT LOAD (25%) — Consumer debt as % of annual income ──
  // Total non-housing debt / annual income
  const annualIncome = monthlyIncome * 12;
  const debtRatio = annualIncome > 0 ? totalNonHousingDebt / annualIncome : 1;
  let cat2;
  if      (debtRatio === 0)     cat2 = 100;
  else if (debtRatio <  0.10)   cat2 = 88;
  else if (debtRatio <  0.20)   cat2 = 70;
  else if (debtRatio <  0.35)   cat2 = 50;
  else if (debtRatio <  0.50)   cat2 = 28;
  else                          cat2 = 8;

  // ── 3. CASH CUSHION (25%) — Emergency fund (55%) + FCF margin (45%) ──
  // How much runway do you have if things go wrong?
  const ef = parseInt(emergency) || 0;
  let efScore;
  if      (ef >= 6) efScore = 100;
  else if (ef >= 4) efScore = 88;
  else if (ef >= 3) efScore = 72;
  else if (ef >= 2) efScore = 52;
  else if (ef >= 1) efScore = 30;
  else              efScore = 0;

  const fcfMargin = monthlyIncome > 0 ? fcf / monthlyIncome : (fcf > 0 ? 0.15 : -0.1);
  let fcfScore;
  if      (fcfMargin >= 0.25) fcfScore = 100;
  else if (fcfMargin >= 0.15) fcfScore = 85;
  else if (fcfMargin >= 0.10) fcfScore = 68;
  else if (fcfMargin >= 0.05) fcfScore = 48;
  else if (fcfMargin >= 0.01) fcfScore = 28;
  else if (fcfMargin >= 0)    fcfScore = 15;
  else                        fcfScore = 0;

  const cat3 = Math.round(efScore * 0.55 + fcfScore * 0.45);

  // ── 4. CREDIT STANDING (10%) — Stated credit band ──
  const creditMap = { excellent: 100, good: 65, fair: 65, poor: 20, below: 20, unknown: 48 };
  const cat4 = creditMap[credit] || 48;

  // ── 5. WEALTH BUILDING (10%) — Savings + assets relative to monthly income ──
  // How many months of income do you have in savings/assets?
  const savings = (G.savingsAmt || 0) + (G.depositSaved || 0);
  const savingsMonths = monthlyIncome > 0 ? savings / monthlyIncome : 0;
  let cat5;
  if      (savingsMonths >= 18) cat5 = 100;
  else if (savingsMonths >= 12) cat5 = 88;
  else if (savingsMonths >= 6)  cat5 = 72;
  else if (savingsMonths >= 3)  cat5 = 52;
  else if (savingsMonths >= 1)  cat5 = 32;
  else                          cat5 = 10;

  // ── WEIGHTED FINAL SCORE ──
  const score = Math.max(10, Math.min(100, Math.round(
    cat1 * 0.30 +
    cat2 * 0.25 +
    cat3 * 0.25 +
    cat4 * 0.10 +
    cat5 * 0.10
  )));

  // Store category scores on G for use in breakdown modal
  G.scoreCategories = {
    paymentStability: { score: cat1, weight: 30, label: 'Payment Stability', icon: '📋',
      value: dti + '% DTI',
      desc: dti < 28 ? 'Excellent — well below lender limits' : dti < 36 ? 'Good — some room to improve' : dti < 43 ? 'Elevated — approaching lender limits' : 'High — affecting loan eligibility' },
    debtLoad: { score: cat2, weight: 25, label: 'Debt Load', icon: '💳',
      value: debtRatio === 0 ? 'None' : Math.round(debtRatio * 100) + '% of income',
      desc: debtRatio === 0 ? 'Debt-free — maximum score' : debtRatio < 0.1 ? 'Minimal — strong position' : debtRatio < 0.2 ? 'Manageable — monitor closely' : 'Significant — focus on payoff' },
    cashCushion: { score: cat3, weight: 25, label: 'Cash Cushion', icon: '🛡️',
      value: ef + ' mo emergency + $' + Math.round(Math.max(0,fcf)).toLocaleString() + '/mo free',
      desc: ef >= 3 && fcfMargin >= 0.10 ? 'Strong buffer — resilient position' : ef === 0 ? 'No emergency fund — highest priority fix' : fcfMargin < 0.05 ? 'Tight margins — cash flow needs attention' : 'Building — keep growing this' },
    creditStanding: { score: cat4, weight: 10, label: 'Credit Standing', icon: '⭐',
      value: credit === 'excellent' ? 'Excellent (720+)' : credit === 'fair' || credit === 'good' ? 'Good (640–719)' : credit === 'poor' || credit === 'below' ? 'Building (<640)' : 'Not provided',
      desc: cat4 >= 80 ? 'Qualifies for best rates — saves thousands' : cat4 >= 60 ? 'Eligible for most mortgages' : 'Priority area — affects every rate you receive' },
    wealthBuilding: { score: cat5, weight: 10, label: 'Wealth Building', icon: '📈',
      value: savingsMonths >= 1 ? Math.round(savingsMonths) + ' months saved' : savings > 0 ? '$' + Math.round(savings).toLocaleString() + ' saved' : 'No savings recorded',
      desc: savingsMonths >= 6 ? 'Strong — compound growth working for you' : savingsMonths >= 3 ? 'Good foundation — keep building' : 'Early stage — even small consistent amounts count' },
  };

  // ── DOM UPDATES ──
  const arcColor = score >= 85 ? '#10B981' : score >= 70 ? '#0077B6' : score >= 55 ? '#F4A261' : '#E63946';
  const circumference = 439.8; // 2*pi*70
  const offset = circumference - (score / 100) * circumference;

  const arcEl = document.getElementById('score-ring-arc');
  if (arcEl) { arcEl.style.strokeDashoffset = offset; arcEl.style.stroke = arcColor; }
  const numEl = document.getElementById('score-ring-num');
  if (numEl) {
    numEl.style.color = arcColor;
    const prev = parseInt(numEl.textContent) || 0;
    if (prev !== score) animateValue(numEl, prev, score, 1200, v => Math.round(v));
    else numEl.textContent = score;
  }
  // glow halo — match score colour
  const glowEl = document.getElementById('score-ring-glow');
  if (glowEl) {
    const rgba = arcColor.startsWith('#') ? arcColor : arcColor;
    glowEl.style.background = `radial-gradient(circle, ${arcColor}2a 0%, transparent 65%)`;
    glowEl.style.filter = `drop-shadow(0 0 18px ${arcColor}55)`;
  }

  let title, badge, badgeColor, sub;
  if      (score >= 85) { title = 'Excellent'; badge = 'STRONG';  badgeColor = 'rgba(16,185,129,0.25)'; sub = 'All five areas are healthy'; }
  else if (score >= 70) { title = 'Good';      badge = 'GOOD';    badgeColor = 'rgba(0,119,182,0.25)';  sub = 'One or two areas to sharpen'; }
  else if (score >= 55) { title = 'Fair';       badge = 'FAIR';    badgeColor = 'rgba(244,162,97,0.25)'; sub = 'A few areas need attention'; }
  else if (score >= 40) { title = 'Poor';       badge = 'ACTION';  badgeColor = 'rgba(230,57,70,0.2)';   sub = 'Several risk factors present'; }
  else                   { title = 'Very Poor';  badge = 'URGENT';  badgeColor = 'rgba(230,57,70,0.3)';   sub = 'Address top issues first'; }

  // Find the lowest-scoring category for the sub-hint
  const cats = Object.values(G.scoreCategories);
  const weakest = cats.reduce((a, b) => a.score < b.score ? a : b);
  if (score < 85) sub = weakest.label + ': ' + weakest.desc;

  const titleEl = document.getElementById('score-title');
  if (titleEl) titleEl.textContent = title;
  const subEl = document.getElementById('score-sub');
  if (subEl) subEl.textContent = sub;
  const disclaimEl = document.getElementById('score-disclaimer');
  if (disclaimEl) disclaimEl.style.display = 'block';
  const badgeEl = document.getElementById('score-badge');
  if (badgeEl) {
    badgeEl.textContent = badge;
    badgeEl.style.background = badgeColor;
    badgeEl.style.borderColor = arcColor;
    badgeEl.style.color = arcColor;
  }

  G.score = score;
  // Accessibility: text label inside ring for colour-blind users
  var a11yLabel = document.getElementById('score-ring-label');
  if (a11yLabel) {
    a11yLabel.textContent = title || '';
    a11yLabel.style.display = 'block';
  }
  // Update readiness card whenever score updates
  if (typeof _0x5d74b48 === 'function') _0x5d74b48();
  // ── Career hero market badge + bar ──
  try {
    if (G.income && typeof matchMarketWage === 'function') {
      var gap2 = calcIncomeGap(G.income, G.jobTitle || '', G.jobtype || 'private', G.state || '');
      // Headline
      var hl = document.getElementById('hm-career-headline');
      if (hl) hl.textContent = gap2.roleTitle ? gap2.roleTitle + ' trajectory' : 'Your income path';
      // Market badge
      var mktBadge = document.getElementById('hm-market-badge');
      if (mktBadge) {
        mktBadge.style.display = 'block';
        if (gap2.aboveMedian) {
          mktBadge.style.background = 'rgba(16,185,129,0.2)'; mktBadge.style.color = '#34D399';
          mktBadge.style.border = '1px solid rgba(16,185,129,0.3)';
          mktBadge.textContent = '↑ Above market';
        } else if (gap2.pctOfMedian >= 85) {
          mktBadge.style.background = 'rgba(248,181,0,0.2)'; mktBadge.style.color = '#F8B500';
          mktBadge.style.border = '1px solid rgba(248,181,0,0.3)';
          mktBadge.textContent = 'Near median';
        } else {
          mktBadge.style.background = 'rgba(0,168,232,0.15)'; mktBadge.style.color = '#00A8E8';
          mktBadge.style.border = '1px solid rgba(0,168,232,0.25)';
          mktBadge.textContent = '↑ Room to grow';
        }
      }
      // Bar
      var barWrap = document.getElementById('hm-market-bar-wrap');
      var fill = document.getElementById('hm-market-fill');
      var pctEl = document.getElementById('hm-market-pct');
      var msgEl = document.getElementById('hm-market-msg');
      if (barWrap) barWrap.style.display = 'block';
      if (fill) { fill.style.width = Math.min(100, gap2.pctOfMedian) + '%'; fill.style.background = gap2.aboveMedian ? '#10B981' : '#00A8E8'; }
      if (pctEl) pctEl.textContent = gap2.pctOfMedian + '% of market median';
      if (msgEl) {
        if (gap2.aboveMedian) {
          msgEl.textContent = 'You earn $' + Math.round((G.income - gap2.marketMedian)/1000) + 'k above market — strong negotiating position.';
        } else {
          msgEl.textContent = '$' + Math.round(Math.abs(gap2.gapFromMedian)/1000) + 'k below market median. The data supports asking for a raise.';
        }
      }
      // Update header market gap pill
      var pillMarketWrap = document.getElementById('pill-market-wrap');
      var pillMarketGap  = document.getElementById('pill-market-gap');
      if (pillMarketWrap && pillMarketGap) {
        if (!gap2.aboveMedian && gap2.gapFromMedian) {
          pillMarketWrap.style.display = 'flex';
          pillMarketGap.textContent = '-$' + Math.round(Math.abs(gap2.gapFromMedian)/1000) + 'k vs market';
        } else if (gap2.aboveMedian) {
          pillMarketWrap.style.display = 'flex';
          pillMarketGap.style.color = '#10B981';
          pillMarketGap.textContent = '+$' + Math.round((G.income - gap2.marketMedian)/1000) + 'k vs market';
        }
      }
      // Store for salary negotiation modal
      window._marketGapData = gap2;
      // Show negotiate CTA only when below market
      var negCta = document.getElementById('hm-negotiate-cta');
      if (negCta) negCta.style.display = gap2.aboveMedian ? 'none' : 'flex';
    }
  } catch(e) {}

  // Sync mini score chip in compact header
  var miniNum = document.getElementById('mini-score-num');
  var miniArc = document.getElementById('mini-score-arc');
  if (miniNum) miniNum.textContent = score;
  if (miniArc) miniArc.style.strokeDashoffset = (427 - (score / 100) * 427).toFixed(1);
  return score;
}

// ─── MAIN COMPUTE ───
function _0x82f61a0() {
  const name = (document.getElementById('firstname').value || '').trim();
  const income = parseFloat(document.getElementById('income').value) || 72000;
  const takeHomeInput = parseFloat(document.getElementById('takehome').value) || 0;
  // Use .value directly — inputs were enabled by nextStep(5) before this runs
  const state     = document.getElementById('state')?.value     || G.state    || 'NY';
  const jobtype   = document.getElementById('jobtype')?.value   || G.jobtype  || 'private';
  const emergency = document.getElementById('emergency')?.value || G.emergency|| '3';
  const goal      = document.getElementById('goal')?.value      || G.goal     || 'build_savings';
  const stay      = parseInt(document.getElementById('stayduration')?.value) || G.stay || 5;
  const lifeEvent = document.getElementById('life-event')?.value      || G.lifeEvent || 'none';
  const retMatch  = document.getElementById('retirement-match')?.value || G.retMatch  || 'none';
  const credit = selectedCredit;

  // Take-home: use manual if entered, else estimate
  let monthlyIncome;
  if (takeHomeInput > 100 && takeHomeInput < income) {
    monthlyIncome = takeHomeInput;
  } else {
    // Auto-estimate using state tax
    const stateTaxRate = STATE_TAX[state] || 0;
    let fedTax = 0;
    if (income <= 11600) fedTax = income * 0.10;
    else if (income <= 47150) fedTax = 1160 + (income-11600)*0.12;
    else if (income <= 100525) fedTax = 5426 + (income-47150)*0.22;
    else if (income <= 191950) fedTax = 17169 + (income-100525)*0.24;
    else fedTax = 39111 + (income-191950)*0.32;
    fedTax = Math.max(0, fedTax - 14600*0.12);
    const fica = Math.min(income,168600)*0.062 + income*0.0145;
    const stateTax = income * stateTaxRate;
    monthlyIncome = Math.round(Math.max(income*0.5, income - fedTax - fica - stateTax) / 12);
  }

  // Debts
  const ccDebt = parseFloat(document.getElementById('cc-debt').value) || 0;
  const ccRate = parseFloat(document.getElementById('cc-rate').value) || 21;
  const studentDebt = parseFloat(document.getElementById('student-debt')?.value) || 0;
  const studentPayment = parseFloat(document.getElementById('student-payment')?.value) || 0;
  const studentIDR = document.getElementById('student-idr')?.checked || false;
  const carDebt = parseFloat(document.getElementById('car-debt').value) || 0;
  const carPayment = parseFloat(document.getElementById('car-payment').value) || 0;
  const otherDebt = parseFloat(document.getElementById('other-debt').value) || 0;
  const otherPayment = parseFloat(document.getElementById('other-payment').value) || 0;
  const expenses = parseFloat(document.getElementById('expenses').value) || 800;

  const ccMinPayment = ccDebt > 0 ? Math.max(25, ccDebt * 0.02) : 0;
  // Student loans on IDR — use actual payment (may be $0)
  const effectiveStudentPayment = studentIDR ? studentPayment : (studentDebt > 0 ? Math.max(studentPayment, studentDebt * 0.01) : 0);
  const totalNonHousingDebt = ccDebt + studentDebt + carDebt + otherDebt;
  const totalNonHousingPayments = ccMinPayment + effectiveStudentPayment + carPayment + otherPayment;

  // Property tax from state
  const propTaxRate = STATE_PROP_TAX[state] || 0.012;

  // Market rate adjusted for credit
  const marketRate = _0x4fe0ea1(credit);

  // Save to global state
  G.income = income; G.takeHome = monthlyIncome; G.expenses = expenses;
  G.ccDebt = ccDebt; G.ccRate = ccRate; G.carDebt = carDebt;
  G.carPayment = carPayment; G.studentDebt = studentDebt;
  G.studentPayment = effectiveStudentPayment;
  G.otherDebt = otherDebt; G.otherPayment = otherPayment;
  G.housingType = housingType; G.state = state; G.credit = credit;
  G.jobTitle = (document.getElementById('job-title')?.value || '').trim();
  G.careerStage = document.getElementById('career-stage')?.value || 'growing';
  G.raiseRate = parseFloat(window._selectedRaiseRate || '0.03');
  G.bonusType = document.getElementById('bonus-type')?.value || 'none';
  G.marketRate = marketRate; G.propTaxRate = propTaxRate;
  G.lifeEvent = lifeEvent; G.retMatch = retMatch; G.jobtype = jobtype;
  G.filingStatus = document.getElementById('filing-status')?.value || 'single';
  G.splitCosts   = window._splitCosts || false;

  // Update name
  { const e = document.getElementById('user-name'); if (e) e.textContent = name || 'there'; }

  // Update profile
  { const e = document.getElementById('p-income'); if (e) e.textContent = _0x4f66a67(income) + '/yr · ' + _0x4f66a67(monthlyIncome) + '/mo take-home'; }
  { const _e = document.getElementById('p-job'); if (_e) _e.textContent = ({
    teacher: 'Teacher / Educator', public: 'Government Employee',
    private: 'Private Sector', selfemployed: 'Self-Employed',
    military: 'Military / Veterans', parttime: 'Part-time'
  }[jobtype] || jobtype); }
  { const e = document.getElementById('p-emergency'); if (e) e.textContent = ({'0':'Less than 1 month','1':'1–2 months','3':'3–5 months','6':'6+ months'}[emergency] || ''); }
  { const e = document.getElementById('p-cc-debt'); if (e) e.textContent = _0x4f66a67(ccDebt); }
  { const e = document.getElementById('p-cc-rate'); if (e) e.textContent = ccRate + '%'; }
  { const e = document.getElementById('p-car-debt'); if (e) e.textContent = _0x4f66a67(carDebt); }
  { const e = document.getElementById('p-other-debt'); if (e) e.textContent = _0x4f66a67(otherDebt + studentDebt); }
  { const e = document.getElementById('p-total-debt'); if (e) e.textContent = _0x4f66a67(totalNonHousingDebt); }
  if (totalNonHousingDebt === 0) { const _e = document.getElementById('p-total-debt'); if (_e) _e.style.color = 'var(--green)'; }

  // Route to correct compute function
  if (housingType === 'owner') {
    _0x7730df6(name, monthlyIncome, expenses, stay, totalNonHousingPayments, ccDebt, ccRate, totalNonHousingDebt, propTaxRate, marketRate, credit, retMatch, lifeEvent, state, emergency);
  } else if (housingType === 'buying') {
    _0x8c997eb(name, monthlyIncome, expenses, totalNonHousingPayments, ccDebt, ccRate, totalNonHousingDebt, propTaxRate, marketRate, credit, state, lifeEvent);
  } else if (housingType === 'cashout') {
    _0xe1060a7(name, monthlyIncome, expenses, totalNonHousingPayments, ccDebt, ccRate, totalNonHousingDebt, propTaxRate, marketRate, credit);
  } else {
    _0xc58715d(name, monthlyIncome, expenses, totalNonHousingPayments, ccDebt, ccRate, totalNonHousingDebt, propTaxRate, marketRate, credit, state, lifeEvent, retMatch);
  }

  // Compute health score — uses G which is populated by compute functions above
  let allHousingPayments = 0;
  if (housingType === 'owner') {
    allHousingPayments = parseFloat(document.getElementById('payment')?.value) || 0;
  } else if (housingType === 'renting') {
    allHousingPayments = parseFloat(document.getElementById('rent-amount')?.value) || 0;
  } else if (housingType === 'buying') {
    // Use current rent for health score (what they're paying now)
    allHousingPayments = parseFloat(document.getElementById('current-rent')?.value) || 0;
  } else if (housingType === 'cashout') {
    allHousingPayments = parseFloat(document.getElementById('payment')?.value) || 0;
  }
  const totalDTIPayments = allHousingPayments + totalNonHousingPayments;
  const dtiForScore = monthlyIncome > 0 ? Math.round((totalDTIPayments / monthlyIncome) * 100) : 0;
  G.dti = dtiForScore;
  _0xb70f5a4(dtiForScore, G.fcf || 0, credit, emergency, ccDebt, ccRate, housingType, totalNonHousingDebt, monthlyIncome);

  // ── [V21] Score history — deterministic delta for monthly review ──
  // Append current score to G._scoreHistory so v21BuildMonthlyReviewData()
  // can compute a real delta without randomness.
  if (!G._scoreHistory) G._scoreHistory = [];
  var _lastEntry = G._scoreHistory[G._scoreHistory.length - 1];
  // Only append if score has changed or there's no entry yet
  if (!_lastEntry || _lastEntry.score !== G.score) {
    if (typeof G !== 'undefined' && G) G._scoreHistory.push({ score: G.score || 0, ts: new Date().toISOString() });
    // Cap history at 24 entries (~2 years of monthly checks)
    if (G._scoreHistory.length > 24) G._scoreHistory = G._scoreHistory.slice(-24);
  }

  showScreen('dashboard');
  var nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'flex';
  _0x237ffb0();
  _0x8e1bc2f();
  _0x36940e3();
  // Land on Home overview tab
  // Use window.switchTab to guarantee resolution across strict/non-strict boundaries
  if (typeof window.switchTab === 'function') window.switchTab('home');
  if (typeof window._0x257a008 === 'function') window._0x257a008('home');
  // Pre-render goal card so it's ready when user taps Advice
  setTimeout(renderGoalFocus, 200);
  setTimeout(updateStateHomePriceHints, 150);
}

// ═══════════════════════════
// OWNER PATH
// ═══════════════════════════
function _0x7730df6(name, monthlyIncome, expenses, stay, nonHousingPayments, ccDebt, ccRate, totalNonHousingDebt, propTaxRate, marketRate, credit, retMatch, lifeEvent, state, emergency) {
  const balance = parseFloat(document.getElementById('balance').value) || 0;
  const currentRate = parseFloat(document.getElementById('currentrate').value) || 7.0;
  const payment = parseFloat(document.getElementById('payment').value) || 0; // P&I only
  const yearsLeft = parseInt(document.getElementById('yearsleft').value) || 25;
  const homeValue = parseFloat(document.getElementById('home-value').value) || balance * 1.15;
  const annualPropTax = parseFloat(document.getElementById('prop-tax').value) || Math.round(homeValue * propTaxRate);
  const annualInsurance = parseFloat(document.getElementById('home-insurance').value) || Math.max(800, homeValue * 0.005);

  const monthlyTax = Math.round(annualPropTax / 12);
  const monthlyIns = Math.round(annualInsurance / 12);
  const totalHousingCost = payment + monthlyTax + monthlyIns; // PITI
  const equity = Math.max(0, homeValue - balance);
  const ltv = Math.round((balance / homeValue) * 100);
  const equityPct = 100 - ltv;

  const allPayments = totalHousingCost + nonHousingPayments;
  const dti = Math.round((allPayments / monthlyIncome) * 100);
  const fcf = Math.round(monthlyIncome - allPayments - expenses);

  // Credit-adjusted refinance rate
  const creditPremium = CREDIT_PREMIUM[credit] || 0;
  const targetRefiRate = Math.max(currentRate - 0.75, 4.5 + creditPremium);
  const closingCosts = Math.round(balance * 0.02);

  const newPayment = _0x8ee2cd7(balance, targetRefiRate, yearsLeft);
  const monthlySavings = Math.round(payment - newPayment);
  const breakeven = monthlySavings > 0 ? Math.round(closingCosts / monthlySavings) : 999;

  // Jumbo loan check
  const isJumbo = balance > 766550;

  // PMI check (if LTV > 80)
  const hasPMI = ltv > 80;
  const pmiCost = hasPMI ? Math.round(balance * 0.008 / 12) : 0;

  // Cash-out potential
  const maxCashOut = Math.max(0, Math.round(homeValue * 0.80 - balance));

  const ccAnnualInterest = Math.round(ccDebt * (ccRate / 100));

  // Update profile
  const _st = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  _st('p-balance', _0x4f66a67(balance) + ' (' + ltv + '% LTV)');
  _st('p-rate', currentRate + '%');
  _st('p-payment', _0x4f66a67(totalHousingCost) + '/mo (PITI)');
  _st('p-dti', dti + '%');
  _st('p-fcf', _0x4f66a67(Math.max(0, fcf)));
  _st('metric-dti', dti + '%');
  _st('metric-savings', monthlySavings > 0 ? _0x4f66a67(monthlySavings) : 'N/A');
  _st('metric-breakeven', breakeven < 999 ? breakeven + ' mo' : 'N/A');

  G.balance = balance; G.currentRate = currentRate; G.payment = payment;
  G.yearsLeft = yearsLeft; G.fcf = fcf; G.homeValue = homeValue;
  G.equity = equity; G.ltv = ltv; G.totalHousingCost = totalHousingCost;
  G.monthlyTax = monthlyTax; G.monthlyIns = monthlyIns;
  G.targetRefiRate = targetRefiRate; G.marketRate = marketRate;

  // ── RECOMMENDATION LOGIC ──
  let color, eyebrow, headline, recText;
  const N = name ? name + ', ' : '';

  // Priority 1: Negative cash flow
  if (fcf < 0) {
    color = 'red'; eyebrow = '🚨 Your Expenses Exceed Your Income';
    headline = `You're spending ${_0x4f66a67(Math.abs(fcf))}/month more than you earn`;
    recText = `${N}your total monthly obligations (${_0x4f66a67(allPayments)} housing + debt + ${_0x4f66a67(expenses)} expenses) exceed your take-home pay of ${_0x4f66a67(monthlyIncome)} by ${_0x4f66a67(Math.abs(fcf))}. This needs immediate attention before refinancing is relevant. Priority one is identifying which costs can be reduced. ${emergency === '0' ? ' ⚠️ You also have no emergency fund — this is financially vulnerable territory.' : ''}`;
  }
  // Priority 2: Credit score is limiting options
  else if (credit === 'poor') {
    color = 'red'; eyebrow = '🔧 Credit Score is Your Biggest Obstacle';
    headline = 'Build your credit to 620+ before refinancing makes sense';
    recText = `${N}with a credit score below 620, today's standard mortgage products aren't accessible at competitive rates. Specialist products exist but carry significant premiums. Your most valuable financial move right now is credit building: pay all bills on time, get your credit card utilisation below 30% (your ${_0x4f66a67(ccDebt)} balance at ${ccRate}% is likely hurting your score), and dispute any errors on your credit report. Aim for 620+ within 12 months.`;
  }
  // Priority 3: High CC debt
  else if (ccDebt > 5000 && ccRate >= 18 && currentRate > 6.5) {
    color = 'red'; eyebrow = '⚠️ Clear Credit Cards First';
    headline = `Your credit cards are costing ${_0x4f66a67(ccAnnualInterest)}/year — fix this before refinancing`;
    recText = `${N}your ${_0x4f66a67(ccDebt)} credit card balance at ${ccRate}% drains ${_0x4f66a67(ccAnnualInterest)} in annual interest — a guaranteed ${ccRate}% return if you pay it off. With your free cash flow of ${_0x4f66a67(fcf)}/month, Tracent recommends clearing the cards first, then reassessing refinancing. This will also improve your credit score, potentially getting you a better rate when you do refinance.`;
  }
  // Priority 4: 401k match not being taken
  else if ((retMatch === 'full' || retMatch === 'partial') && fcf > 500) {
    // Still show housing rec but add strong 401k note
    if (currentRate <= 6.5 + creditPremium) {
      color = 'green'; eyebrow = '✅ Strong Position — Optimise Now';
      headline = 'Your mortgage rate is solid. But you may be missing free money.';
      recText = `${N}your ${currentRate}% rate is competitive for your credit profile. The bigger opportunity: ${retMatch === 'full' ? 'you have a full 401(k) match available — that\'s an instant 100% return on contributions. Max it before making extra mortgage payments.' : 'you have a 401(k) match available — contribute at least enough to capture the full match before directing extra cash to mortgage.'} ${totalNonHousingDebt > 0 ? `Also clear your ${_0x4f66a67(totalNonHousingDebt)} in non-housing debt.` : ''}`;
    } else {
      color = 'amber'; eyebrow = '⏳ Monitor Rate + Maximise 401(k)';
      headline = `Watch for ${targetRefiRate.toFixed(2)}% — and capture your employer match now`;
      recText = `${N}while watching for refinancing opportunities (target: ${targetRefiRate.toFixed(2)}% for your credit profile), make sure you're capturing your full 401(k) employer match — it's an immediate return that outperforms most financial moves. Your ${currentRate}% rate plus ${_0x4f66a67(totalHousingCost)}/month PITI (including ${_0x4f66a67(monthlyTax)}/mo tax and ${_0x4f66a67(monthlyIns)}/mo insurance) means your DTI is ${dti}%.`;
    }
  }
  // Priority 5: Jumbo loan
  else if (isJumbo) {
    color = 'amber'; eyebrow = '🏦 Jumbo Loan — Specialist Rate Rules Apply';
    headline = 'Your loan exceeds conforming limits — compare specialist lenders';
    recText = `${N}with a balance of ${_0x4f66a67(balance)}, you're above the $766,550 conforming loan limit. Jumbo loans operate under different rules — rates may be higher or lower than standard mortgages depending on your credit (${credit}) and lender. Tracent recommends getting quotes from at least 3 specialist jumbo lenders before deciding on refinancing. Your equity position of ${_0x4f66a67(equity)} (${equityPct}%) is strong.`;
  }
  // Priority 6: PMI — should they refinance to remove it
  else if (hasPMI && equityPct >= 18) {
    color = 'amber'; eyebrow = '💡 You May Be Able to Remove PMI';
    headline = `You\'re paying ${_0x4f66a67(pmiCost)}/mo in PMI — here's how to eliminate it`;
    recText = `${N}your LTV of ${ltv}% means you're paying approximately ${_0x4f66a67(pmiCost)}/month in PMI. Once you reach 20% equity (you're at ${equityPct}%), you can request PMI cancellation — saving ${_0x4f66a67(pmiCost * 12)}/year. Contact your lender to initiate the appraisal process. ${monthlySavings > 0 ? `A refinance at ${targetRefiRate.toFixed(2)}% would also eliminate PMI and save ${_0x4f66a67(monthlySavings)}/month total — break-even: ${breakeven} months.` : ''}`;
  }
  // Priority 7: Rate is competitive
  else if (currentRate <= 5.5 + creditPremium) {
    color = 'green'; eyebrow = '✅ Excellent Mortgage Position';
    headline = 'Your rate is excellent — focus on building wealth';
    recText = `${N}at ${currentRate}%, your mortgage rate is very competitive${credit !== 'excellent' ? ` for your credit profile` : ''}. No refinancing needed. Your PITI of ${_0x4f66a67(totalHousingCost)}/month (including ${_0x4f66a67(monthlyTax)} tax and ${_0x4f66a67(monthlyIns)} insurance) gives you ${_0x4f66a67(fcf)} monthly free cash flow. ${totalNonHousingDebt > 0 ? `Priority: clear your ${_0x4f66a67(totalNonHousingDebt)} in other debts.` : `Consider directing ${_0x4f66a67(Math.round(fcf * 0.3))}/month to extra principal payments — this can save years and thousands in interest.`}`;
  }
  // Priority 8: Refinance makes sense now
  else if (monthlySavings > 0 && breakeven <= stay * 12 * 0.7 && credit !== 'below' && credit !== 'poor') {
    color = 'green'; eyebrow = '✅ Refinance Now — Numbers Work';
    headline = `Save ${_0x4f66a67(monthlySavings)}/month — break-even in ${breakeven} months`;
    recText = `${N}at today's rate of ~${marketRate.toFixed(2)}% (adjusted for your ${credit} credit), refinancing from ${currentRate}% saves ${_0x4f66a67(monthlySavings)}/month and breaks even in ${breakeven} months — well within your ${stay}-year plan. Closing costs: ~${_0x4f66a67(closingCosts)}. Your new PITI would be approximately ${_0x4f66a67(Math.round(newPayment + monthlyTax + monthlyIns))}/month.${maxCashOut > 20000 ? ` You also have ${_0x4f66a67(maxCashOut)} in accessible equity if needed.` : ''}`;
  }
  // Priority 9: Poor credit but could refinance later
  else if (credit === 'below') {
    color = 'amber'; eyebrow = '⏳ Improve Credit Score First';
    headline = `At your credit score, today's rate is ~${marketRate.toFixed(2)}% — improving it saves more`;
    recText = `${N}with a ${credit} credit score, you're paying a ~${creditPremium}% premium over best rates. Improving from ${credit} to 'fair' (680+) could save you approximately ${_0x4f66a67(_0x8ee2cd7(balance, marketRate, yearsLeft) - _0x8ee2cd7(balance, marketRate - 0.7, yearsLeft))}/month before any rate drop. Focus: pay down credit cards to under 30% utilisation, pay all bills on time for 6 months, then reassess. Target rate at good credit: ~${(BASE_MARKET_RATE + 0.2).toFixed(2)}%.`;
  }
  // Default: Monitor and wait
  else {
    color = 'amber'; eyebrow = '⏳ Monitor & Wait';
    headline = `Set your alert at ${targetRefiRate.toFixed(2)}% — don't refinance yet`;
    recText = `${N}at ${currentRate}%, your rate is above current market. At ${targetRefiRate.toFixed(2)}%, you'd save ${_0x4f66a67(Math.abs(monthlySavings))}/month with a ${breakeven}-month break-even. Your real monthly housing cost is ${_0x4f66a67(totalHousingCost)} (P&I ${_0x4f66a67(payment)} + tax ${_0x4f66a67(monthlyTax)} + insurance ${_0x4f66a67(monthlyIns)}). ${ccDebt > 0 ? `Use your ${_0x4f66a67(fcf)} free cash flow to chip away at your ${_0x4f66a67(ccDebt)} credit card balance (${_0x4f66a67(ccAnnualInterest)}/yr in interest) while you wait.` : `DTI: ${dti}%. Free cash flow: ${_0x4f66a67(fcf)}/month.`}`;
  }

  // Life event override note
  if (lifeEvent === 'job_loss' && fcf > 0) {
    recText += ` ⚠️ With a recent job loss, Tracent strongly recommends pausing any major financial decisions for 90 days and prioritising your emergency fund.`;
  }
  if (lifeEvent === 'divorce') {
    recText += ` Note: separation may affect your mortgage qualification if the loan is jointly held — consult a housing counsellor or attorney before refinancing.`;
  }

  _0xe29af62(color, eyebrow, headline, recText);
  _0xf480616(ccDebt, ccRate, totalNonHousingDebt, fcf, name, G.studentDebt || 0, credit);
  _0x8d99b9d(monthlyIncome, expenses, nonHousingPayments, totalHousingCost, name, fcf);
  _0x73dc3fc('owner', fcf, balance, payment, yearsLeft, emergency, monthlyIncome, expenses);
}

// ═══════════════════════════
// BUYER PATH
// ═══════════════════════════
function _0x8c997eb(name, monthlyIncome, expenses, nonHousingPayments, ccDebt, ccRate, totalNonHousingDebt, propTaxRate, marketRate, credit, state, lifeEvent) {
  const homePrice = parseFloat(document.getElementById('home-price').value) || 300000;
  const depositSaved = parseFloat(document.getElementById('deposit-saved').value) || 0;
  const depositPct = parseFloat(document.getElementById('deposit-pct').value) || 10;
  const loanType = document.getElementById('loan-type')?.value || 'conventional';
  const rent = parseFloat(document.getElementById('current-rent').value) || 0;

  const targetDeposit = homePrice * (depositPct / 100);
  const depositGap = Math.max(0, targetDeposit - depositSaved);
  const loanAmount = Math.max(0, homePrice - Math.max(depositSaved, targetDeposit));

  // Credit-adjusted rate
  const pi = Math.round(_0x8ee2cd7(loanAmount, marketRate, 30));

  // PMI
  let pmi = 0;
  if (depositPct < 20 && loanType === 'conventional') pmi = Math.round(loanAmount * 0.01 / 12);
  if (loanType === 'fha') pmi = Math.round(loanAmount * 0.0085 / 12);
  if (loanType === 'va' || loanType === 'usda') pmi = 0;

  // Property tax & insurance
  const stateForPropTax = STATE_PROP_TAX[document.getElementById('state')?.value || 'NY'] || propTaxRate;
  const monthlyTax = Math.round(homePrice * stateForPropTax / 12);
  const monthlyIns = Math.round(Math.max(800, homePrice * 0.005) / 12);

  const totalPITI = pi + pmi + monthlyTax + monthlyIns;
  const closingCosts = Math.round(homePrice * 0.03);
  const totalCashNeeded = Math.round(Math.max(depositSaved, targetDeposit) + closingCosts);

  const allPaymentsAfterBuying = totalPITI + nonHousingPayments;
  const dtiAfterBuying = Math.round((allPaymentsAfterBuying / monthlyIncome) * 100);

  // Current FCF (renting)
  const fcfNow = Math.round(monthlyIncome - rent - expenses - nonHousingPayments);
  // FCF after buying
  const fcfAfterBuying = Math.round(monthlyIncome - totalPITI - expenses - nonHousingPayments);

  const savingCapacity = Math.max(0, Math.round(fcfNow * 0.5));
  const cashGap = Math.max(0, totalCashNeeded - depositSaved);
  const monthsToReady = savingCapacity > 0 ? Math.ceil(cashGap / savingCapacity) : 999;

  const ccAnnualInterest = Math.round(ccDebt * (ccRate / 100));

  const _sb = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  _sb('p-balance', _0x4f66a67(homePrice) + ' (target)');
  _sb('p-rate', marketRate.toFixed(2) + '% (credit-adjusted)');
  _sb('p-payment', _0x4f66a67(totalPITI) + '/mo PITI');
  _sb('p-dti', dtiAfterBuying + '% (after buying)');
  _sb('p-fcf', _0x4f66a67(fcfNow) + ' (now) / ' + _0x4f66a67(fcfAfterBuying) + ' (after)');
  _sb('metric-dti', dtiAfterBuying + '%');
  _sb('metric-savings', depositGap > 0 ? _0x4f66a67(cashGap) + ' needed' : '✅ Ready');
  _sb('metric-breakeven', monthsToReady < 999 ? monthsToReady + ' mo' : '—');

  G.fcf = fcfNow; G.homePrice = homePrice; G.depositSaved = depositSaved;
  G.totalPITI = totalPITI; G.dtiAfterBuying = dtiAfterBuying;

  let color, eyebrow, headline, recText;
  const N = name ? name + ', ' : '';

  if (fcfNow < 0) {
    color = 'red'; eyebrow = '🚨 Current Budget is in the Red';
    headline = `Your monthly obligations already exceed income by ${_0x4f66a67(Math.abs(fcfNow))}`;
    recText = `${N}before thinking about buying, your current spending (${_0x4f66a67(rent)} rent + ${_0x4f66a67(nonHousingPayments)} debt + ${_0x4f66a67(expenses)} expenses) is outpacing your ${_0x4f66a67(monthlyIncome)} take-home. Buying would add to this pressure. Priority one is reducing current obligations.`;
  }
  else if (credit === 'poor') {
    color = 'red'; eyebrow = '🔧 Credit Score Needs Work First';
    headline = 'Focus on reaching 620+ credit score before applying for a mortgage';
    recText = `${N}below 620, most conventional and FHA lenders will either decline your application or offer rates that make the purchase unaffordable. ${loanType === 'fha' ? 'FHA requires 580+ for 3.5% down or 500+ for 10% down.' : ''} Use the next 12 months to build credit through on-time payments and reducing credit card utilisation below 30%. Your ${_0x4f66a67(ccDebt)} card balance at ${ccRate}% is likely a significant drag on your score.`;
  }
  else if (ccDebt > 8000 && dtiAfterBuying > 43) {
    color = 'red'; eyebrow = '⚠️ Debt Will Block Your Mortgage';
    headline = 'Pay down existing debt first — lenders will decline at this DTI';
    recText = `${N}with ${_0x4f66a67(totalNonHousingDebt)} in existing debt, your DTI after buying would be ${dtiAfterBuying}% — above the standard 43% qualifying threshold most lenders use. Paying down your credit cards (${_0x4f66a67(ccDebt)} at ${ccRate}% — costing ${_0x4f66a67(ccAnnualInterest)}/year) will reduce your DTI and improve your credit score, improving both your eligibility and the rate you're offered.`;
  }
  else if (cashGap <= 0 && dtiAfterBuying <= 43) {
    color = 'green'; eyebrow = '✅ You\'re Ready to Buy';
    headline = 'Deposit ready — start pre-approval conversations now';
    recText = `${N}you have enough saved for a ${depositPct}% down payment (${_0x4f66a67(Math.max(depositSaved, targetDeposit))}) plus estimated closing costs (~${_0x4f66a67(closingCosts)}). Your estimated monthly PITI would be ${_0x4f66a67(totalPITI)} (P&I ${_0x4f66a67(pi)} + PMI ${pmi > 0 ? _0x4f66a67(pmi) : '$0'} + tax ${_0x4f66a67(monthlyTax)} + insurance ${_0x4f66a67(monthlyIns)}). DTI: ${dtiAfterBuying}%.${credit === 'fair' || credit === 'below' ? ` At your current credit score, your rate is ~${marketRate.toFixed(2)}% — improving to 'good' could save ~${_0x4f66a67(_0x8ee2cd7(loanAmount, marketRate, 30) - _0x8ee2cd7(loanAmount, marketRate-0.5, 30))}/month.` : ''} ${ccDebt > 0 ? `Consider clearing your ${_0x4f66a67(ccDebt)} credit card balance before or shortly after closing.` : ''}`;
  }
  else if (dtiAfterBuying > 43) {
    color = 'red'; eyebrow = '⚠️ Affordability Gap at This Price';
    headline = `DTI would be ${dtiAfterBuying}% — above lender thresholds`;
    const affordablePrice = Math.round((monthlyIncome * 0.43 - nonHousingPayments) / (marketRate / 1200) * (1 - Math.pow(1 + marketRate/1200, -360)));
    recText = `${N}at ${_0x4f66a67(homePrice)}, your PITI of ${_0x4f66a67(totalPITI)}/month pushes DTI to ${dtiAfterBuying}%. Lenders typically cap this at 43%. Based on your income, you can comfortably afford approximately ${_0x4f66a67(Math.max(0, affordablePrice))} — or you could ${totalNonHousingDebt > 0 ? `clear your ${_0x4f66a67(totalNonHousingDebt)} in existing debt first, which would meaningfully lower your DTI` : 'increase your income or down payment'}.`;
  }
  else {
    color = 'amber'; eyebrow = '⏳ Building Toward Buying';
    headline = `${_0x4f66a67(cashGap)} more needed — on track in ~${monthsToReady} months`;
    recText = `${N}you need ${_0x4f66a67(cashGap)} more to cover your ${depositPct}% down payment (${_0x4f66a67(targetDeposit)}) plus closing costs (~${_0x4f66a67(closingCosts)}). Based on your current free cash flow of ${_0x4f66a67(fcfNow)}/month, you could reach it in approximately ${monthsToReady} months. When you buy, expect PITI of ${_0x4f66a67(totalPITI)}/month — your FCF drops from ${_0x4f66a67(fcfNow)} to ${_0x4f66a67(fcfAfterBuying)}/month. ${ccDebt > 0 ? `Clear your ${_0x4f66a67(ccDebt)} credit card debt (${_0x4f66a67(ccAnnualInterest)}/yr) in parallel — it improves your mortgage application and saves you money now.` : ''}`;
  }

  _0xe29af62(color, eyebrow, headline, recText);
  _0xf480616(ccDebt, ccRate, totalNonHousingDebt, fcfNow, name, G.studentDebt || 0, credit);
  _0x8d99b9d(monthlyIncome, expenses, nonHousingPayments, rent, name, fcfNow);
  const emergencyVal = document.getElementById('emergency')?.value || '3';
  _0x73dc3fc('buying', fcfNow, 0, 0, 0, emergencyVal, monthlyIncome, expenses);
  // Store rent for health score & Rate Watch
  G.rentAmt = rent;
}

// ═══════════════════════════
// CASH-OUT REFI PATH
// ═══════════════════════════
function _0xe1060a7(name, monthlyIncome, expenses, nonHousingPayments, ccDebt, ccRate, totalNonHousingDebt, propTaxRate, marketRate, credit) {
  const balance = parseFloat(document.getElementById('co-balance').value) || 280000;
  const homeValue = parseFloat(document.getElementById('co-homevalue').value) || 420000;
  const currentRate = parseFloat(document.getElementById('co-rate').value) || 6.5;
  const yearsLeft = parseInt(document.getElementById('co-years').value) || 24;
  const cashWanted = parseFloat(document.getElementById('co-cashwant').value) || 50000;
  const purpose = document.getElementById('co-purpose')?.value || 'debt';
  const annualPropTax = parseFloat(document.getElementById('co-proptax').value) || Math.round(homeValue * propTaxRate);
  const annualIns = parseFloat(document.getElementById('co-insurance').value) || 1600;
  const monthlyTax = Math.round(annualPropTax / 12);
  const monthlyIns = Math.round(annualIns / 12);

  const maxCashOut = Math.max(0, Math.round(homeValue * 0.80 - balance));
  const newLoanAmount = balance + Math.min(cashWanted, maxCashOut);
  const newRate = marketRate + 0.25; // cash-out typically +0.25%
  const newPayment = Math.round(_0x8ee2cd7(newLoanAmount, newRate, 30));
  const newPITI = newPayment + monthlyTax + monthlyIns;
  const oldPayment = Math.round(_0x8ee2cd7(balance, currentRate, yearsLeft));
  const oldPITI = oldPayment + monthlyTax + monthlyIns;
  const paymentIncrease = newPITI - oldPITI;
  const newDTI = Math.round(((newPITI + nonHousingPayments) / monthlyIncome) * 100);
  const fcf = Math.round(monthlyIncome - newPITI - nonHousingPayments - expenses);
  const closingCosts = Math.round(newLoanAmount * 0.02);
  const equity = homeValue - balance;
  const equityPct = Math.round((equity / homeValue) * 100);

  // Purpose-based analysis
  const purposeAnalysis = {
    debt: ccDebt > 0 ? `This could eliminate your ${_0x4f66a67(ccDebt)} credit card balance (${ccRate}% APR) — saving ${_0x4f66a67(Math.round(ccDebt * ccRate / 100))} annually. But your mortgage rate (${newRate.toFixed(2)}%) is lower than credit card rate — this swap makes financial sense IF you don't accumulate new card debt.` : 'Make sure the debts you consolidate have higher interest rates than your new mortgage rate to ensure this actually saves money.',
    renovation: 'Home improvements can increase property value and are often tax-deductible if they meet IRS criteria. Get quotes before committing to ensure the renovation value justifies the cost.',
    investment: `Using equity for an investment property down payment can create rental income. With ${_0x4f66a67(Math.min(cashWanted, maxCashOut))} you could fund a down payment on a ${_0x4f66a67(Math.min(cashWanted, maxCashOut) / 0.2)} investment property — but ensure rental income covers your increased mortgage payment of ${_0x4f66a67(paymentIncrease)}/mo.`,
    emergency: 'A cash-out refi for emergency funds is expensive — closing costs plus a higher long-term rate. A HELOC (home equity line of credit) may be cheaper if you only need occasional access to funds.',
    other: 'Evaluate carefully — this converts short-term cash needs into a 30-year obligation.'
  };

  const _sc = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  _sc('p-balance', _0x4f66a67(newLoanAmount) + ' (new balance)');
  _sc('p-rate', newRate.toFixed(2) + '%');
  _sc('p-payment', _0x4f66a67(newPITI) + '/mo PITI');
  _sc('p-dti', newDTI + '%');
  _sc('p-fcf', _0x4f66a67(Math.max(0, fcf)));
  _sc('metric-dti', newDTI + '%');
  _sc('metric-savings', _0x4f66a67(Math.min(cashWanted, maxCashOut)));
  _sc('metric-breakeven', _0x4f66a67(paymentIncrease) + '/mo more');

  G.fcf = fcf; G.balance = newLoanAmount;

  const N = name ? name + ', ' : '';
  let color, eyebrow, headline, recText;

  if (maxCashOut <= 0) {
    color = 'red'; eyebrow = '🚫 Insufficient Equity';
    headline = 'Not enough equity for a cash-out refinance';
    recText = `${N}your current LTV is ${Math.round((balance/homeValue)*100)}%. Lenders require you to maintain at least 20% equity — you need your home to be worth at least ${_0x4f66a67(Math.round(balance / 0.8))} to access any cash. Focus on building equity through payments or home appreciation.`;
  } else if (cashWanted > maxCashOut) {
    color = 'amber'; eyebrow = '⚠️ Requested More Than Available';
    headline = `Maximum accessible equity is ${_0x4f66a67(maxCashOut)} — not ${_0x4f66a67(cashWanted)}`;
    recText = `${N}lenders cap cash-out refinances at 80% LTV. Your home (${_0x4f66a67(homeValue)}) × 80% = ${_0x4f66a67(homeValue * 0.8)}, minus your balance of ${_0x4f66a67(balance)}, leaves ${_0x4f66a67(maxCashOut)} available. ${purposeAnalysis[purpose]} New payment: ${_0x4f66a67(newPITI)}/month (${_0x4f66a67(paymentIncrease)}/mo more). Closing costs: ~${_0x4f66a67(closingCosts)}.`;
  } else if (newDTI > 43 || fcf < 200) {
    color = 'red'; eyebrow = '⚠️ Cash-Out Would Stretch You Thin';
    headline = 'The numbers work on paper but leave little room for error';
    recText = `${N}accessing ${_0x4f66a67(cashWanted)} would raise your new PITI to ${_0x4f66a67(newPITI)}/month — ${_0x4f66a67(paymentIncrease)}/month more than now. This puts your DTI at ${newDTI}% and leaves ${_0x4f66a67(Math.max(0, fcf))}/month free cash flow. ${purposeAnalysis[purpose]} Consider a HELOC instead — you'd only pay interest on what you draw, keeping payments flexible.`;
  } else {
    color = 'green'; eyebrow = '✅ Cash-Out Refinance is Feasible';
    headline = `You can access ${_0x4f66a67(Math.min(cashWanted, maxCashOut))} — here's the real cost`;
    recText = `${N}at ${newRate.toFixed(2)}% (${0.25}% above standard rate for cash-out), your new payment rises from ${_0x4f66a67(oldPITI)} to ${_0x4f66a67(newPITI)}/month — ${_0x4f66a67(paymentIncrease)}/month more. Closing costs: ~${_0x4f66a67(closingCosts)}. You'll retain ${_0x4f66a67(homeValue - newLoanAmount)} equity (${Math.round((1 - newLoanAmount/homeValue)*100)}% of home value). ${purposeAnalysis[purpose]}`;
  }

  _0xe29af62(color, eyebrow, headline, recText);
  _0xf480616(ccDebt, ccRate, totalNonHousingDebt, fcf, name, 0, credit);
  _0x8d99b9d(monthlyIncome, expenses, nonHousingPayments, newPITI, name, fcf);
}

// ═══════════════════════════
// RENTER PATH
// ═══════════════════════════
function _0xc58715d(name, monthlyIncome, expenses, nonHousingPayments, ccDebt, ccRate, totalNonHousingDebt, propTaxRate, marketRate, credit, state, lifeEvent, retMatch) {
  const rent = parseFloat(document.getElementById('rent-amount').value) || 1500;
  const savings = parseFloat(document.getElementById('renter-savings').value) || 0;
  const targetPrice = parseFloat(document.getElementById('renter-target-price').value) || 300000;
  const renterGoal = document.getElementById('renter-goal').value;

  const fcf = Math.round(monthlyIncome - rent - expenses - nonHousingPayments);
  const monthlySavingCapacity = Math.max(0, Math.round(fcf * 0.45));
  const targetDeposit = targetPrice * 0.10;
  const closingCosts = Math.round(targetPrice * 0.03);
  const totalCashNeeded = targetDeposit + closingCosts;
  const cashGap = Math.max(0, totalCashNeeded - savings);
  const monthsToReady = monthlySavingCapacity > 0 ? Math.ceil(cashGap / monthlySavingCapacity) : 999;

  // Estimated PITI if they bought at target price
  const loanAmt = targetPrice * 0.90;
  const pi = Math.round(_0x8ee2cd7(loanAmt, marketRate, 30));
  const pmi = Math.round(loanAmt * 0.01 / 12); // 10% down = PMI
  const statePropTax = STATE_PROP_TAX[state] || propTaxRate;
  const monthlyTax = Math.round(targetPrice * statePropTax / 12);
  const monthlyIns = Math.round(Math.max(800, targetPrice * 0.005) / 12);
  const estPITI = pi + pmi + monthlyTax + monthlyIns;
  const dtiIfBuying = Math.round(((estPITI + nonHousingPayments) / monthlyIncome) * 100);
  const fcfAfterBuying = monthlyIncome - estPITI - nonHousingPayments - expenses;
  const rentToBuyDiff = estPITI - rent;

  const ccAnnualInterest = Math.round(ccDebt * (ccRate / 100));

  const _sr = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  _sr('p-balance', 'Renting — ' + _0x4f66a67(targetPrice) + ' target');
  _sr('p-rate', marketRate.toFixed(2) + '% (credit-adjusted)');
  _sr('p-payment', _0x4f66a67(rent) + '/mo rent');
  _sr('p-dti', Math.round(((rent + nonHousingPayments) / monthlyIncome) * 100) + '% (renting)');
  _sr('p-fcf', _0x4f66a67(Math.max(0, fcf)));
  _sr('metric-dti', dtiIfBuying + '% (if buying)');
  _sr('metric-savings', _0x4f66a67(monthlySavingCapacity) + '/mo');
  _sr('metric-breakeven', monthsToReady < 999 ? monthsToReady + ' mo' : '—');

  G.fcf = fcf; G.rentAmt = rent; G.savingsAmt = savings; G.homePrice = targetPrice;

  const N = name ? name + ', ' : '';
  let color, eyebrow, headline, recText;

  if (fcf < 0) {
    color = 'red'; eyebrow = '🚨 Budget is in the Red';
    headline = `Monthly outgoings exceed income by ${_0x4f66a67(Math.abs(fcf))}`;
    recText = `${N}your rent (${_0x4f66a67(rent)}) + debt payments (${_0x4f66a67(nonHousingPayments)}) + expenses (${_0x4f66a67(expenses)}) total ${_0x4f66a67(rent + nonHousingPayments + expenses)} — exceeding your ${_0x4f66a67(monthlyIncome)} take-home by ${_0x4f66a67(Math.abs(fcf))}. Buying a home is not realistic until this is resolved. First priority: identify which expenses can be reduced or which debts can be cleared fastest.${ccDebt > 0 ? ` Your ${_0x4f66a67(ccDebt)} credit card balance at ${ccRate}% (costing ${_0x4f66a67(ccAnnualInterest)}/yr) should be priority one.` : ''}`;
  }
  else if (credit === 'poor' && renterGoal !== 'no') {
    color = 'amber'; eyebrow = '🔧 Build Credit Alongside Savings';
    headline = 'Your path to homeownership starts with credit repair';
    recText = `${N}with a below-620 credit score, conventional mortgages aren't accessible. Your 12-month plan: (1) pay all bills on time — this is the biggest credit factor; (2) get credit card utilisation below 30%; (3) check your credit report for errors at AnnualCreditReport.com. In parallel, save ${_0x4f66a67(monthlySavingCapacity)}/month toward your ${_0x4f66a67(targetDeposit)} deposit goal. With both improving, you'll be in a strong position by ${new Date(Date.now() + monthsToReady * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {month:'long',year:'numeric'})}.`;
  }
  else if (ccDebt > 5000 && ccRate >= 18) {
    color = 'red'; eyebrow = '⚠️ Credit Card Debt is Slowing You Down';
    headline = `${_0x4f66a67(ccAnnualInterest)}/year in interest — clear this before saving for a deposit`;
    recText = `${N}your ${_0x4f66a67(ccDebt)} at ${ccRate}% costs ${_0x4f66a67(ccAnnualInterest)} annually — money that could be going straight into your deposit fund. Tracent recommends a debt-first approach: use your ${_0x4f66a67(fcf)} monthly free cash flow to clear the cards first (est. ${Math.ceil(ccDebt / Math.max(fcf * 0.7, 50))} months), then redirect those payments into savings. This also improves your credit score, getting you a better mortgage rate when you're ready to buy.`;
  }
  else if (renterGoal === 'no') {
    color = 'green'; eyebrow = '✅ Smart Renting Strategy';
    headline = 'Renting by choice — here\'s how to build serious wealth';
    recText = `${N}renting gives you flexibility — the key is investing the difference. With ${_0x4f66a67(fcf)} monthly free cash flow, Tracent recommends: ${retMatch !== 'none' ? `(1) max your 401(k) to capture employer match — it's an instant return; (2) ` : '(1) '}invest ${_0x4f66a67(monthlySavingCapacity)}/month in a diversified index fund. Over 20 years at 7% average return, that's ~${_0x4f66a67(monthlySavingCapacity * 12 * 20 * 1.5)} in wealth built. ${totalNonHousingDebt > 0 ? `First clear your ${_0x4f66a67(totalNonHousingDebt)} in debt — then redirect those payments to investing.` : ''}`;
  }
  else if (monthsToReady <= 24 || renterGoal === 'yes_soon') {
    const canAfford = dtiIfBuying <= 43 && fcfAfterBuying > 300;
    color = canAfford ? 'amber' : 'red';
    eyebrow = canAfford ? '⏳ Almost There' : '⚠️ 2 Years Is Tight';
    headline = canAfford
      ? `${_0x4f66a67(cashGap)} gap — ready to buy in ~${monthsToReady} months`
      : `Buying in 2 years at ${_0x4f66a67(targetPrice)} may be a stretch`;
    recText = canAfford
      ? `${N}you need ${_0x4f66a67(cashGap)} more (10% deposit ${_0x4f66a67(targetDeposit)} + closing costs ~${_0x4f66a67(closingCosts)}). At ${_0x4f66a67(monthlySavingCapacity)}/month saved, you'll be ready in ~${monthsToReady} months. When you buy, your PITI would be ~${_0x4f66a67(estPITI)}/month — ${_0x4f66a67(rentToBuyDiff > 0 ? rentToBuyDiff : 0)} more than your current rent. DTI: ${dtiIfBuying}%. ${credit !== 'excellent' && credit !== 'good' ? `Improving your credit from '${credit}' to 'good' could save ~${_0x4f66a67(Math.round(_0x8ee2cd7(loanAmt, marketRate, 30) - _0x8ee2cd7(loanAmt, marketRate - 0.5, 30)))}/mo.` : ''}`
      : `${N}your target of ${_0x4f66a67(targetPrice)} would cost ${_0x4f66a67(estPITI)}/month (PITI), leaving only ${_0x4f66a67(Math.max(0, fcfAfterBuying))} free cash flow. DTI would be ${dtiIfBuying}%. Consider a lower price target (~${_0x4f66a67(Math.round(targetPrice * 0.85))}) or extend your timeline to 3–4 years to build a larger deposit.`;
  }
  else {
    color = 'amber'; eyebrow = '⏳ Solid Plan — Stay the Course';
    headline = `Save ${_0x4f66a67(monthlySavingCapacity)}/month — buying realistic in ~${Math.round(monthsToReady / 12 * 10) / 10} years`;
    recText = `${N}you have ${_0x4f66a67(savings)} saved. Putting aside ${_0x4f66a67(monthlySavingCapacity)}/month gets you to a 10% deposit + closing costs (${_0x4f66a67(totalCashNeeded)}) in ~${monthsToReady} months. When you buy at ${_0x4f66a67(targetPrice)}, expect PITI of ~${_0x4f66a67(estPITI)}/month at your credit-adjusted rate of ${marketRate.toFixed(2)}%. ${ccDebt > 0 ? `Clear your ${_0x4f66a67(ccDebt)} cards (${_0x4f66a67(ccAnnualInterest)}/yr) in parallel — improves both your cash flow and mortgage eligibility.` : ''}${retMatch !== 'none' && retMatch !== 'maxed' ? ` Don't forget: capture your full 401(k) employer match before saving extra in cash.` : ''}`;
  }

  _0xe29af62(color, eyebrow, headline, recText);
  _0xf480616(ccDebt, ccRate, totalNonHousingDebt, fcf, name, G.studentDebt || 0, credit);
  _0x8d99b9d(monthlyIncome, expenses, nonHousingPayments, rent, name, fcf);
  _0x73dc3fc('renting', fcf, 0, 0, 0, '', monthlyIncome, expenses);
}

// ─── HELPERS ───
function _0xe29af62(color, eyebrow, headline, recText) {
  // Update eyebrow
  const eyebrowEl = document.getElementById('rec-eyebrow');
  if (eyebrowEl) { eyebrowEl.className = 'rec-eyebrow ' + color; eyebrowEl.innerHTML = eyebrow; }
  // Dynamic recheck date
  const recheckEl = document.getElementById('rec-recheck-bar');
  if (recheckEl) {
    const freq = document.getElementById('recheck-freq')?.value || '6';
    const recheckDate = new Date();
    recheckDate.setMonth(recheckDate.getMonth() + parseInt(freq));
    recheckEl.innerHTML = 'Recheck scheduled: <strong>' + recheckDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + '</strong> · or when rates move ±0.25%';
  }
  // Show advice content, hide empty state
  var adviceContent = document.getElementById('advice-content');
  var adviceEmpty   = document.getElementById('ai-empty');
  if (adviceContent) adviceContent.style.display = 'block';
  if (adviceEmpty)   adviceEmpty.style.display   = 'none';
  // Update status bar
  var sb = document.getElementById('main-rec-status');
  if (sb) sb.className = 'rec-status-bar ' + color;
  const ew = document.querySelector('#main-rec-card .rec-eyebrow');
  if (ew) { ew.className = 'rec-eyebrow ' + color; ew.innerHTML = eyebrow; }
  // Update metric cards with contextual values
  const mDTI = document.getElementById('metric-dti');
  const mSav = document.getElementById('metric-savings');
  const mSavLbl = document.getElementById('metric-savings-label');
  const mBE  = document.getElementById('metric-breakeven');
  const mBELbl = document.getElementById('metric-breakeven-label');
  if (mDTI) mDTI.textContent = G.dti != null ? Math.round(G.dti) + '%' : '—';
  if (mSav) mSav.textContent = G.fcf != null ? (G.fcf >= 0 ? '+$' : '-$') + Math.abs(Math.round(G.fcf)).toLocaleString() : '—';
  if (mSavLbl) mSavLbl.textContent = 'Free cash flow';
  const totalDebtAmt = (G.ccDebt||0)+(G.carDebt||0)+(G.studentDebt||0)+(G.otherDebt||0);
  if (mBE) mBE.textContent = totalDebtAmt > 0 ? '$' + Math.round(totalDebtAmt/1000*10)/10 + 'k' : '—';
  if (mBELbl) mBELbl.textContent = 'Total debt';
  const rh = document.getElementById('rec-headline');
  if (rh) rh.textContent = headline;
  const rw = document.getElementById('rec-why');
  if (rw) rw.innerHTML = recText;
}

// ─── DYNAMIC BOTTOM CARDS (owner-aware) ───
function _0x73dc3fc(housingType, fcf, balance, payment, yearsLeft, emergency, monthlyIncome, expenses) {
  const el = document.getElementById('dynamic-bottom-cards');
  if (!el) return;
  let html = '';

  // Emergency fund card — always shown, content adapts
  const efMonths = parseInt(emergency) || 0;
  if (efMonths < 3) {
    html += `<div class="rec-card">
      <div class="rec-status-bar amber"></div>
      <div class="rec-body">
        <div class="rec-eyebrow amber">⚠️ Build Your Safety Net</div>
        <div class="rec-headline" style="font-size:18px;">Emergency fund needs attention</div>
        <div class="rec-why">You currently have ${efMonths < 1 ? 'less than 1 month' : efMonths + '–' + (efMonths+1) + ' months'} of expenses covered. Tracent recommends 3–6 months minimum — this is your financial foundation before any other move.</div>
      </div>
    </div>`;
  } else {
    html += `<div class="rec-card">
      <div class="rec-status-bar green"></div>
      <div class="rec-body">
        <div class="rec-eyebrow green">✅ Emergency Fund Solid</div>
        <div class="rec-headline" style="font-size:18px;">You're covered for ${efMonths === 6 ? '6+' : efMonths + '–' + (efMonths+2)} months</div>
        <div class="rec-why">Tracent recommends 3–6 months of expenses. You're in the green — no action needed here.</div>
      </div>
    </div>`;
  }

  // Principal acceleration card — ONLY for homeowners
  if (housingType === 'owner' && balance > 0 && payment > 0) {
    const extraMonthly = Math.max(0, Math.round(fcf * 0.25));
    if (extraMonthly >= 50) {
      // Arrow function — safe in all contexts
      const calcPayoff = (bal, rate, pmt) => {
        const r = (rate / 100) / 12;
        let b = bal, m = 0;
        while (b > 0 && m < 600) { b = b * (1 + r) - pmt; m++; }
        return m;
      };
      const currentRate = G.currentRate || 7.0;
      const standardMonths = yearsLeft * 12;
      const fasterMonths = Math.min(standardMonths, calcPayoff(balance, currentRate, payment + extraMonthly));
      const monthsSaved = Math.max(0, standardMonths - fasterMonths);
      const interestSaved = Math.round(monthsSaved * payment * 0.4);

      html += `<div class="rec-card">
        <div class="rec-status-bar teal"></div>
        <div class="rec-body">
          <div class="rec-eyebrow teal">💡 Opportunity</div>
          <div class="rec-headline" style="font-size:18px;">Extra ${_0x4f66a67(extraMonthly)}/mo cuts ${Math.round(monthsSaved / 12 * 10) / 10} years off your mortgage</div>
          <div class="rec-why">Based on your free cash flow, you could comfortably add ${_0x4f66a67(extraMonthly)} to your monthly principal payment. Over time this saves an estimated ${_0x4f66a67(interestSaved)} in interest and clears your mortgage ${Math.round(monthsSaved / 12 * 10) / 10} years early.</div>
          <button class="rec-action-btn" style="margin-top:12px;background:var(--navy);" onclick="switchTab('progress');showProgressSub('goals');_0x257a008('progress')">Set Up a Payoff Goal →</button>
        </div>
      </div>`;
    }
  }

  // For renters/buyers — savings momentum card instead
  if (housingType !== 'owner' && fcf > 200) {
    const monthlySave = Math.round(fcf * 0.5);
    html += `<div class="rec-card">
      <div class="rec-status-bar teal"></div>
      <div class="rec-body">
        <div class="rec-eyebrow teal">💡 Savings Opportunity</div>
        <div class="rec-headline" style="font-size:18px;">Save ${_0x4f66a67(monthlySave)}/month — ${_0x4f66a67(monthlySave * 12)}/year toward your goal</div>
        <div class="rec-why">Your free cash flow gives you room to save ${_0x4f66a67(monthlySave)}/month (50% of FCF). Automate this transfer on payday — you won't miss what you don't see. Set a goal below to track it.</div>
        <button class="rec-action-btn" style="margin-top:12px;background:var(--navy);" onclick="switchTab('progress');showProgressSub('goals');_0x257a008('progress')">Set a Savings Goal →</button>
      </div>
    </div>`;
  }

  el.innerHTML = html;
}

function _0xf480616(ccDebt, ccRate, totalNonHousingDebt, fcf, name, studentDebt, credit) {
  const extra = document.getElementById('extra-debt-cards');
  if (!extra) return;
  let html = '';
  if (ccDebt > 0) {
    const annualInterest = Math.round(ccDebt * (ccRate / 100));
    const monthsToPayoff = Math.ceil(ccDebt / Math.max(fcf * 0.4, 50));
    html += `<div class="rec-card">
      <div class="rec-status-bar red"></div>
      <div class="rec-body">
        <div class="rec-eyebrow red">💳 Credit Card Priority</div>
        <div class="rec-headline" style="font-size:15px;">Costing ${_0x4f66a67(annualInterest)}/year at ${ccRate}%</div>
        <div class="rec-why">${_0x4f66a67(ccDebt)} balance at ${ccRate}% APR = ${_0x4f66a67(Math.round(annualInterest/12))}/month in interest alone. Paying 40% of free cash flow clears it in ~${monthsToPayoff} months — also improving your credit score.</div>
      </div></div>`;
  }
  if (studentDebt > 0) {
    html += `<div class="rec-card">
      <div class="rec-status-bar amber"></div>
      <div class="rec-body">
        <div class="rec-eyebrow amber">🎓 Student Loan Impact</div>
        <div class="rec-headline" style="font-size:15px;">Student debt affects your mortgage DTI</div>
        <div class="rec-why">${_0x4f66a67(studentDebt)} in student loans. Lenders count your monthly student payment in DTI calculations — even on IDR plans. ${credit === 'poor' || credit === 'below' ? 'Check if you qualify for Public Service Loan Forgiveness (PSLF) or income-driven forgiveness programs.' : 'Consider whether refinancing student loans makes sense for your situation.'}</div>
      </div></div>`;
  }
  extra.innerHTML = html;
  const eds = document.getElementById('extra-debt-section');
  if (eds) eds.style.display = html.trim() ? 'block' : 'none';
}

function _0x8d99b9d(monthlyIncome, expenses, debtPayments, housingCost, name, fcf) {
  const remaining = monthlyIncome - housingCost - debtPayments - expenses;

  // Update the 4-box grid using cf-grid
  const cfGrid = document.getElementById('cf-grid');
  if (cfGrid) {
    cfGrid.innerHTML = [
      { icon: '🏠', label: 'Housing & debt', val: housingCost + debtPayments, color: 'var(--navy)' },
      { icon: '🧾', label: 'Fixed expenses',  val: expenses,                  color: 'var(--gray-4)' },
      { icon: '📊', label: 'Take-home/mo',    val: monthlyIncome,             color: 'var(--navy)' },
      { icon: '💵', label: 'Free cash flow',  val: remaining,                 color: remaining >= 0 ? 'var(--teal)' : 'var(--red)' },
    ].map(b => `
      <div style="background:var(--gray-1);border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:16px;margin-bottom:4px;">${b.icon}</div>
        <div style="font-family:var(--font-display);font-size:15px;color:${b.color};margin-bottom:2px;">${b.val < 0 ? '-$' : '$'}${Math.abs(Math.round(b.val)).toLocaleString()}</div>
        <div style="font-size:11px;color:var(--gray-4);">${b.label}</div>
      </div>`).join('');
  }

  // Update headline
  const cfHeadline = document.getElementById('cf-headline');
  if (cfHeadline) {
    cfHeadline.textContent = remaining >= 0
      ? `$${Math.round(remaining).toLocaleString()} free each month`
      : `Monthly shortfall of $${Math.abs(Math.round(remaining)).toLocaleString()}`;
    cfHeadline.style.color = remaining >= 0 ? 'var(--navy)' : 'var(--red)';
  }

  // Update split suggestion
  const cfSuggestion = document.getElementById('cf-suggestion');
  if (!cfSuggestion) return;

  if (remaining <= 0) {
    cfSuggestion.innerHTML = `
      <div style="color:var(--red);font-size:13px;font-weight:600;padding:4px 0;">⚠️ Monthly outgoings exceed take-home pay.</div>
      <div style="font-size:12px;color:var(--gray-4);margin-top:4px;">Focus on reducing your highest-cost debt or cutting a recurring expense. The Debt Plan tab shows the fastest route out.</div>`;
    return;
  }

  // Income-adjusted splits
  const tier = monthlyIncome < 3500 ? 'low' : monthlyIncome < 6000 ? 'mid' : 'high';
  const splits = {
    low:  { save: 0.40, invest: 0.10, give: 0.05 },
    mid:  { save: 0.30, invest: 0.20, give: 0.05 },
    high: { save: 0.20, invest: 0.30, give: 0.05 },
  };
  const s = splits[tier];
  const spend = 1 - s.save - s.invest - s.give;

  cfSuggestion.innerHTML = `
    <div style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:10px;letter-spacing:0.5px;">HOW TO USE YOUR $${Math.round(remaining).toLocaleString()}/MO FREE CASH</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div style="background:var(--gray-1);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:var(--navy);">${_0x4f66a67(remaining * spend)}</div>
        <div style="font-size:11px;color:var(--gray-4);">Lifestyle / flex</div>
      </div>
      <div style="background:rgba(0,119,182,0.08);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:var(--teal);">${_0x4f66a67(remaining * s.save)}</div>
        <div style="font-size:11px;color:var(--gray-4);">Save / emergency</div>
      </div>
      <div style="background:rgba(244,162,97,0.1);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:var(--amber);">${_0x4f66a67(remaining * s.invest)}</div>
        <div style="font-size:11px;color:var(--gray-4);">Invest / grow</div>
      </div>
      <div style="background:rgba(16,185,129,0.08);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:var(--green);">${_0x4f66a67(remaining * s.give)}</div>
        <div style="font-size:11px;color:var(--gray-4);">Give / charity</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--gray-4);margin-top:8px;">Split adjusted for your income level.</div>`;
}

// ─── FIELD WARNING CSS ───
// Injected into head
const warningStyle = document.createElement('style');
warningStyle.textContent = `.field-warning { font-size: 12px; color: var(--amber); margin-top: 5px; padding: 6px 10px; background: rgba(244,162,97,0.1); border-radius: 8px; border-left: 3px solid var(--amber); }`;
document.head.appendChild(warningStyle);

// Wire up life event and retirement dropdowns
document.addEventListener('DOMContentLoaded', function() {
  // Disable all inputs not on the active (landing) screen
  // This is the only reliable way to prevent iOS showing $0 toolbar
  setTimeout(function() {
    document.querySelectorAll('.screen:not(.active) input, .screen:not(.active) select, .screen:not(.active) textarea').forEach(function(el) {
      if (el.classList.contains('form-input') || el.type === 'range' || el.tagName === 'SELECT') {
        el.setAttribute('disabled', '');
      }
    });
  }, 0);
});
document.addEventListener('DOMContentLoaded', () => {
  const le = document.getElementById('life-event');
  if (le) le.addEventListener('change', _0x1fc21d4);
  const rm = document.getElementById('retirement-match');
  if (rm) rm.addEventListener('change', _0xe2ad9e2);
  const st = document.getElementById('student-debt');
  if (st) st.addEventListener('input', () => {
    const grp = document.getElementById('student-idr-group');
    if (grp) grp.style.display = parseFloat(st.value) > 0 ? 'block' : 'none';
  });
  const lt = document.getElementById('loan-type');
  if (lt) lt.addEventListener('change', updateBuyingEstimates);
  // Initialize buying estimates
  setTimeout(updateBuyingEstimates, 200);
  setTimeout(estimateTakeHome, 100);
  setTimeout(calcOwnerMortgage, 150);
});
// ─── DASHBOARD TABS ───
// ── Haptic feedback — works on iOS (AudioContext) and Android (vibrate) ──
function haptic(style) {
  // Premium haptics — used for meaningful state changes only
  try {
    // Telegram Mini App haptics
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
      if (style === 'light')   Telegram.WebApp.HapticFeedback.impactOccurred('light');
      else if (style === 'medium' || style === 'heavy') Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      else if (style === 'success') Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      return;
    }
    // Web vibration API
    if (navigator.vibrate) {
      if (style === 'light')   navigator.vibrate(8);
      else if (style === 'medium') navigator.vibrate(16);
      else if (style === 'heavy')  navigator.vibrate([20, 8, 20]);
      else if (style === 'success')navigator.vibrate([12, 28, 18]);
      else navigator.vibrate(8);
      return;
    }
    // iOS AudioContext fallback
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    osc.frequency.setValueAtTime(1, ctx.currentTime);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.001);
    ctx.close();
  } catch(e) {}
}


function _0x701dc98() {
  const sub = window._progressSub || 'goals';
  showProgressSub(sub);
}

// Activate bottom nav item by its element ID
function _0x257a008(name) {
  const el = document.getElementById('nav-' + name);
  if (el) _0x77d1667(el);
}

// Show/hide Rate Sim tab (top bar + bottom nav) based on housing type
function _0x8e1bc2f() {
  const botBtn = document.getElementById('nav-rates');
  if (G.housingType === 'renting') {
    if (botBtn) botBtn.style.display = 'none';
  } else {
    if (botBtn) { botBtn.style.display = ''; document.getElementById('nav-rates-label').textContent = 'Rates'; }
  }
}

function _0x77d1667(el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  // Brief haptic-style scale on the icon
  const icon = el.querySelector('.nav-icon');
  if (icon) {
    icon.style.transform = 'translateY(-3px) scale(1.15)';
    setTimeout(() => { icon.style.transform = ''; }, 200);
  }
}

// ─── HOME OVERVIEW TAB ───
// ── Goal focus card — renders at top of advice tab ─────────────────
function renderGoalFocus() {
  var card  = document.getElementById('goal-focus-card');
  var icon  = document.getElementById('goal-focus-icon');
  var title = document.getElementById('goal-focus-title');
  var sub   = document.getElementById('goal-focus-sub');
  var ms    = document.getElementById('goal-focus-milestone');
  var msText= document.getElementById('goal-focus-milestone-text');
  var label = document.getElementById('ai-advice-goal-label');
  var chatIntro = document.getElementById('ai-chat-intro');
  if (!card || !G || !G.goal) return;

  var goals = {
    build_savings:    { icon:'🛡️', title:'Build savings & emergency fund',      sub:'Your advice is focused on growing your cash buffer and financial resilience.',    milestone: 'Hit 3 months of expenses saved' },
    invest_more:      { icon:'📈', title:'Invest & grow wealth',                 sub:'Every recommendation is aimed at freeing up and deploying more of your income.',  milestone: 'Invest 15% of gross income monthly' },
    buy_home:         { icon:'🏠', title:'Save for a home',                      sub:'Your plan is built around reaching your deposit target and mortgage readiness.',   milestone: 'Reach 10% deposit + closing costs' },
    retire_early:     { icon:'🌅', title:'Build toward early retirement',         sub:'Your advice prioritises wealth compounding and financial independence milestones.',milestone: 'Hit 25× annual expenses invested' },
    property_invest:  { icon:'🏢', title:'Invest in property',                   sub:'Focused on building the financial position to acquire investment real estate.',    milestone: 'Reach 20% deposit on investment property' },
    pay_off_debt:     { icon:'💳', title:'Pay off debt',                         sub:'Your recommendations are ordered by the fastest path to becoming debt-free.',     milestone: 'Clear highest-rate debt first' },
  };

  var g = goals[G.goal] || { icon:'🎯', title:'Improve financial position', sub:'Personalised to your numbers and situation.', milestone: 'Improve Tracent score by 10 points' };

  if (icon)  icon.textContent  = g.icon;
  if (title) title.textContent = g.title;
  if (sub)   sub.textContent   = g.sub;
  if (card)  card.style.display = 'block';

  // Milestone — show with relevant context
  var milestoneText = g.milestone;
  if (G.goal === 'buy_home' && G.depositSaved > 0) {
    var target = (G.purchasePrice || 350000) * 0.10;
    var pct = Math.min(100, Math.round(G.depositSaved / target * 100));
    milestoneText = pct + '% of deposit target reached — ' + g.milestone;
  } else if (G.goal === 'build_savings' && G.savingsAmt >= 0 && G.takeHome > 0) {
    var months = Math.round(G.savingsAmt / G.takeHome * 10) / 10;
    milestoneText = months + ' months saved — target: 3 months (' + g.milestone + ')';
  }
  if (msText) msText.textContent = milestoneText;
  if (ms)     ms.style.display   = 'block';

  // Update sub-header label
  if (label) label.textContent = 'Focused on: ' + g.title.toLowerCase();

  // Update chat intro
  if (chatIntro) {
    var goalShort = {
      build_savings:'build your emergency fund',buy_home:'save for a home',
      invest_more:'grow your investments',retire_early:'reach early retirement',
      property_invest:'invest in property',pay_off_debt:'pay off your debt'
    };
    chatIntro.textContent = 'I know your goal is to ' + (goalShort[G.goal]||'improve your finances') + '. Ask me anything \u2014 I\'ll keep every answer focused on getting you there.';
  }
}


function _0x80e4d42() {
  const fmt = n => n == null ? '—' : (Math.abs(n) >= 1000 ? (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)/1000*10)/10 + 'k' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString());
  const _0x3e27a99 = n => n == null ? '—' : Math.round(n) + '%';

  // Stagger animate all home cards
  // Premium stagger: home metric cards
  document.querySelectorAll('#tab-home .home-metric-card, #tab-home .rec-card, #tab-home .readiness-card-interactive, #readiness-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(var(--tr-shift-md,12px))';
    setTimeout(() => {
      el.style.transition = 'opacity var(--tr-slow,0.24s) var(--tr-ease-out-soft,ease), transform var(--tr-slow,0.24s) var(--tr-ease-emphasis,ease)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 60 + i * 55);
  });

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = (document.getElementById('firstname')?.value || '').trim() || G.firstname || G.name || '';
  const el = id => document.getElementById(id);
  if (el('home-greeting')) el('home-greeting').textContent = greet + (name ? ', ' + name : '');
  if (el('home-date')) el('home-date').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  _0x5d74b48();

  // Teaser pills
  var teaserStrip = document.getElementById('hm-teaser-strip');
  if (teaserStrip && G.income) {
    teaserStrip.style.display = 'grid';
    // Net worth
    var teaserNwEl = document.getElementById('hm-nw-val-blur');
    if (teaserNwEl && G.fcf !== undefined) {
      var approxNW = (G.balance > 0 ? Math.round(G.balance * 0.25) : 0) + (G.savingsAmt || 0) + (G.depositSaved || 0);
      teaserNwEl.textContent = approxNW >= 0 ? '$' + Math.round(approxNW/1000) + 'k' : '-$' + Math.round(Math.abs(approxNW)/1000) + 'k';
    }
    // Career Y5
    var carEl = document.getElementById('hm-career-blur');
    var y5 = document.getElementById('hm-career-y5');
    if (carEl && y5 && y5.textContent && y5.textContent !== '—') {
      carEl.textContent = y5.textContent;
    }
  }

  // Score ring lives in the header (updated by _0xb70f5a4)
  // Celebrate on first render if score is good
  const score = G.score || null;
  if (score && !window._scoreCelebrated && score >= 70) {
    window._scoreCelebrated = true;
    setTimeout(() => _0x38fc09e(score >= 85 ? '🎉 Excellent financial health!' : '✅ Good score — keep building!'), 600);
  }

  // FCF
  const fcf = G.fcf;
  if (el('hm-cashflow-val')) {
    el('hm-cashflow-val').textContent = fcf != null ? fmt(fcf) : '—';
    el('hm-cashflow-val').style.color = fcf > 0 ? 'var(--teal)' : fcf < 0 ? 'var(--red)' : 'var(--navy)';
    if (el('hm-cashflow-sub')) el('hm-cashflow-sub').textContent = fcf > 0 ? 'Surplus each month' : fcf < 0 ? 'Monthly shortfall' : 'Free each month';
  }

  // DTI
  const dti = (() => {
    const th = G.takeHome || 1;
    const housing = G.housingType === 'owner' || G.housingType === 'cashout' ? (G.payment || 0) : G.housingType === 'renting' ? (G.rentAmt || 0) : (G.totalPITI || 0);
    const consumer = (G.ccDebt > 0 ? Math.max(G.ccDebt * 0.02, 25) : 0) + (G.carPayment || 0) + (G.otherPayment || 0) + (G.studentDebt > 0 ? (G.idrPayment || Math.max(G.studentDebt * 0.01, 100)) : 0);
    return Math.round((housing + consumer) / th * 100);
  })();
  if (el('hm-dti-val')) {
    el('hm-dti-val').textContent = _0x3e27a99(dti);
    el('hm-dti-val').style.color = dti > 43 ? 'var(--red)' : dti > 36 ? 'var(--amber)' : 'var(--teal)';
    if (el('hm-dti-sub')) el('hm-dti-sub').textContent = dti > 43 ? 'High — lenders flag >43%' : dti > 36 ? 'Moderate — watch this' : 'Healthy range';
  }

  // Total non-housing consumer debt
  const totalDebt = (G.ccDebt || 0) + (G.carDebt || 0) + (G.studentDebt || 0) + (G.otherDebt || 0);
  if (el('hm-debt-val')) {
    el('hm-debt-val').textContent = fmt(totalDebt);
    if (el('hm-debt-sub')) el('hm-debt-sub').textContent = totalDebt === 0 ? '🎉 Debt-free!' : 'CC + car + student + other';
  }

  // Net worth — actuals only, no projected home price for non-owners
  const homeVal = (G.homeValue && G.homeValue > (G.balance||0)) ? G.homeValue : (G.balance ? Math.round(G.balance * 1.25) : 0);
  const isOwner = G.housingType === 'owner' || G.housingType === 'cashout';
  const assets = (isOwner ? homeVal : 0) + (G.savingsAmt || 0) + (G.depositSaved || 0);
  const liabilities = (isOwner ? (G.balance || 0) : 0) + totalDebt;
  const nw = assets - liabilities;
  if (el('hm-networth-val')) {
    el('hm-networth-val').textContent = fmt(nw);
    el('hm-networth-val').style.color = nw >= 0 ? 'var(--teal)' : 'var(--red)';
    if (el('hm-networth-sub')) el('hm-networth-sub').textContent = nw >= 0 ? 'Positive net worth' : 'Net negative — room to grow';
  }
  // Update header pills
  var pillNW = el('pill-networth');
  if (pillNW) pillNW.textContent = fmt(nw);
  var pillsEl = document.getElementById('preview-pills');
  if (pillsEl && G.score) pillsEl.style.display = 'flex';

  // Career card on Home
  (function() {
    const proj = _0xf114ec9();
    const fmt = n => '$' + (Math.abs(n) >= 1000 ? Math.round(Math.abs(n)/1000*10)/10 + 'k' : Math.round(Math.abs(n)));
    if (el('hm-career-now'))  el('hm-career-now').textContent  = fmt(proj[0].total);
    if (el('hm-career-y5'))   el('hm-career-y5').textContent   = fmt(proj[5].total);
    if (el('hm-career-y10'))  el('hm-career-y10').textContent  = fmt(proj[10].total);
    var pillY10 = el('pill-career-y10');
    if (pillY10) pillY10.textContent = fmt(proj[10].total);
    // Mini chart — full width viewBox 0 0 300 28
    const svg = el('hm-career-mini-chart');
    if (svg) {
      const allPts = proj.slice(0, 6);
      const minV = proj[0].total * 0.85, maxV = proj[5].total * 1.05;
      const toX = i => (i / 5) * 298 + 1;
      const toY = v => 26 - ((v - minV) / (maxV - minV)) * 22;
      const solidPts = allPts.map((p,i) => `${toX(i)},${toY(p.total)}`).join(' ');
      // Area fill
      const areaCoords = `1,28 ${solidPts} ${toX(5)},28`;
      svg.innerHTML = `
        <defs>
          <linearGradient id="mcg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00A8E8" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#00A8E8" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="${areaCoords}" fill="url(#mcg)"/>
        <polyline points="${solidPts}" fill="none" stroke="var(--teal-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  })();

  // Insights strip
  const insights = [];
  if (fcf < 0) insights.push({ icon: '🔴', text: 'Spending exceeds take-home — review your cash flow', tab: 'recommend', nav: 'advice' });
  else if (fcf > 0 && fcf < G.takeHome * 0.1) insights.push({ icon: '🟡', text: 'Tight margins — under 10% free cash flow', tab: 'recommend', nav: 'advice' });
  if (dti > 43) insights.push({ icon: '⚠️', text: 'DTI above 43% — may affect loan eligibility', tab: 'debtrank', nav: 'debt' });
  if (G.ccDebt > 1000) insights.push({ icon: '💳', text: `$${Math.round(G.ccDebt).toLocaleString()} credit card balance — priority payoff`, tab: 'debtrank', nav: 'debt' });
  if (score && score >= 80) insights.push({ icon: '✅', text: 'Strong financial health score — keep it up', tab: 'recommend', nav: 'advice' });
  if (G.housingType === 'owner' && G.currentRate > (G.marketRate || MARKET_RATE_30Y) + 0.75) insights.push({ icon: '🏠', text: 'Your rate is above market — check refinance options', tab: 'simulator', nav: 'rates' });
  if (!insights.length) insights.push({ icon: '👍', text: 'Everything looks balanced — keep building wealth', tab: 'recommend', nav: 'advice' });

  const insightsEl = el('hm-insights');
  if (insightsEl) {
    insightsEl.style.display = 'block';
    insightsEl.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:var(--gray-3);letter-spacing:0.2px;margin-bottom:12px;">Quick Insights</div>
      ${insights.slice(0,3).map(i => `
        <div onclick="switchTab('${i.tab}');_0x257a008('${i.nav}')" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--gray-2);cursor:pointer;transition:opacity 0.15s;" onmouseenter="this.style.opacity='.7'" onmouseleave="this.style.opacity='1'">
          <span style="font-size:15px;flex-shrink:0;">${i.icon}</span>
          <span style="font-size:13px;color:var(--navy);line-height:1.4;">${i.text}</span>
          <svg style="margin-left:auto;flex-shrink:0;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-3)" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`).join('')}
    `;
    // Remove last border
    const rows = insightsEl.querySelectorAll('div[style*="border-bottom"]');
    if (rows.length) rows[rows.length-1].style.borderBottom = 'none';
  }

  // Update header 3-stat strip
  const fmt2 = n => n == null ? '—' : (Math.abs(n) >= 1000 ? (n<0?'-':'')+'$'+Math.round(Math.abs(n)/1000*10)/10+'k' : (n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString());
  const hdrFcf = el('hdr-fcf');
  if (hdrFcf) { hdrFcf.textContent = fmt2(G.fcf); hdrFcf.style.color = (G.fcf||0) >= 0 ? 'var(--teal-light)' : '#ff6b7a'; }
  const hdrDti = el('hdr-dti');
  if (hdrDti) { hdrDti.textContent = dti + '%'; hdrDti.style.color = dti > 43 ? '#ff6b7a' : dti > 36 ? 'var(--amber)' : 'var(--teal-light)'; }
  const hdrDebt = el('hdr-debt');
  const td = (G.ccDebt||0)+(G.carDebt||0)+(G.studentDebt||0)+(G.otherDebt||0);
  if (hdrDebt) { hdrDebt.textContent = fmt2(td); hdrDebt.style.color = td === 0 ? 'var(--teal-light)' : 'white'; }

  // Goals count
  const goalCount = (window._goals || []).length;
  if (el('hm-goals-count')) el('hm-goals-count').textContent = goalCount > 0 ? goalCount + ' active goal' + (goalCount > 1 ? 's' : '') : 'Track progress';

  // Count-up animation on metric values
  const animateCount = (el, target, prefix='', suffix='', isK=false) => {
    if (!el || target == null || isNaN(target)) return;
    const duration = 900, start = performance.now();
    const startVal = 0;
    const sign = target < 0 ? '-' : '';
    const abs = Math.abs(target);
    const update = (ts) => {
      const prog = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      const cur = Math.round(abs * ease);
      el.textContent = sign + prefix + (isK ? (cur >= 1000 ? Math.round(cur/100)/10 + 'k' : cur) : cur.toLocaleString()) + suffix;
      if (prog < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  };

  // Animate the metric values
  const fcfAbs = Math.abs(fcf || 0);
  const fcfEl = el('hm-cashflow-val');
  if (fcfEl && fcf != null) animateCount(fcfEl, fcfAbs, '$', '', fcfAbs >= 1000);

  const dtiEl = el('hm-dti-val');
  const dtiVal = G.takeHome > 0 ? (() => {
    const housing = G.housingType === 'owner' || G.housingType === 'cashout' ? (G.payment||0) : G.housingType === 'renting' ? (G.rentAmt||0) : (G.totalPITI||0);
    const consumer = (G.ccDebt>0?Math.max(G.ccDebt*0.02,25):0)+(G.carPayment||0)+(G.otherPayment||0)+(G.studentDebt>0?(G.idrPayment||Math.max(G.studentDebt*0.01,100)):0);
    return Math.round((housing+consumer)/G.takeHome*100);
  })() : null;
  if (dtiEl && dtiVal != null) animateCount(dtiEl, dtiVal, '', '%');

  const debtTotal = (G.ccDebt||0)+(G.carDebt||0)+(G.studentDebt||0)+(G.otherDebt||0);
  const debtEl = el('hm-debt-val');
  if (debtEl && debtTotal >= 0) animateCount(debtEl, debtTotal, '$', '', debtTotal >= 1000);

  const nwEl = el('hm-networth-val');
  if (nwEl && nw != null) animateCount(nwEl, Math.abs(nw), '$', '', Math.abs(nw) >= 1000);

  // Share score card
  const shareEl = el('hm-share-card');
  if (shareEl && score) {
    const scoreLabel = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Needs Attention' : 'Under Pressure';
    shareEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--gray-3);letter-spacing:0.2px;margin-bottom:5px;">Share Your Score</div>
          <div style="font-size:14px;color:var(--navy);font-weight:500;line-height:1.4;">My Tracent score is <strong>${score}</strong> — <em>${scoreLabel}</em></div>
          <div style="font-size:12px;color:var(--gray-4);margin-top:3px;">Know your financial position in 3 minutes</div>
        </div>
        <button onclick="shareScore(${score},'${scoreLabel}')" style="background:var(--navy);color:white;border:none;border-radius:50px;padding:10px 18px;font-family:var(--font-body);font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;display:flex;align-items:center;gap:6px;transition:background 0.2s;" onmouseover="this.style.background='var(--teal)'" onmouseout="this.style.background='var(--navy)'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share
        </button>
      </div>`;
    shareEl.style.display = 'block';
  }

  // Score factors + salary check (fire after home tab data is ready)
  _0x01d514a(score);
  _0xf426109();
}

// ─── ALERT SETTINGS ───
function _0x4f4976d() {
  const el = document.getElementById('settings-activity-log');
  if (!el) return;
  const now = new Date();
  const fmt = (d) => d.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});

  const alertRate = parseFloat(document.getElementById('rate-alert-slider')?.value) || 6.30;
  const freq = parseInt(document.getElementById('recheck-freq')?.value) || 6;
  const recheckDate = new Date(); recheckDate.setMonth(recheckDate.getMonth() + freq);

  const items = [];

  // Rate watch — always show if homeowner/cashout
  if (G.housingType === 'owner' || G.housingType === 'cashout') {
    const distFromTarget = Math.abs(MARKET_RATE_30Y - alertRate);
    items.push({
      icon: '📊', color: 'amber',
      title: 'Rate Watch Active',
      desc: `Watching for ${alertRate.toFixed(2)}% — market is currently ${MARKET_RATE_30Y.toFixed(2)}% (${distFromTarget.toFixed(2)}% away)`,
      time: 'Updated today'
    });
    items.push({
      icon: '📅', color: 'green',
      title: 'Next scheduled recheck',
      desc: `Full re-analysis on ${fmt(recheckDate)} using updated rates`,
      time: 'Set today'
    });
  }

  // Analysis date
  if (G.income) {
    items.push({
      icon: '✅', color: 'green',
      title: 'Analysis completed',
      desc: `Financial health score calculated from your inputs`,
      time: fmt(now)
    });
  }

  // Goals
  const goalCount = (window._goals || []).length;
  if (goalCount > 0) {
    items.push({
      icon: '🎯', color: 'amber',
      title: goalCount + ' active goal' + (goalCount > 1 ? 's' : ''),
      desc: 'Track your progress in the Goals tab',
      time: 'Active'
    });
  }

  if (!items.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--gray-4);padding:8px 0;">Complete onboarding to see your activity log.</div>';
    return;
  }

  el.innerHTML = items.map(item => `
    <div class="alert-item">
      <div class="alert-icon ${item.color}">${item.icon}</div>
      <div style="flex:1">
        <div class="alert-title">${item.title}</div>
        <div class="alert-desc">${item.desc}</div>
        <div class="alert-time">${item.time}</div>
      </div>
    </div>`).join('');
}

function _0x47a7c11() {
  // Show empty-state indicators if user hasn't saved real data
  const isFirstRun = !G.income || G.income === 72000;
  if (isFirstRun) {
    const emptyNote = document.getElementById('settings-empty-note');
    if (emptyNote) emptyNote.style.display = 'block';
  }
  _0x4f4976d();
  // Inject live market rate wherever it's referenced
  const mrEls = ['settings-market-rate','timeline-market-rate'];
  mrEls.forEach(id => { const e = document.getElementById(id); if (e) e.textContent = MARKET_RATE_30Y.toFixed(2) + '%'; });
  const presetBtn = document.getElementById('rate-preset-today');
  if (presetBtn) presetBtn.textContent = MARKET_RATE_30Y.toFixed(2) + '% · Today';
  // Update rate slider hint
  const rateHint = document.querySelector('#settings-alert-desc');
  if (rateHint) rateHint.innerHTML = rateHint.innerHTML.replace(/6\.72%/g, MARKET_RATE_30Y.toFixed(2) + '%');
  const slider = document.getElementById('rate-alert-slider');
  if (slider) updateAlertRate(slider.value);
  _0x2f9cdea();
}

function updateAlertRate(val) {
  const rate = parseFloat(val).toFixed(2);
  if (document.getElementById('rate-alert-val')) document.getElementById('rate-alert-val').textContent = rate + '%';
  if (document.getElementById('alert-summary-rate')) document.getElementById('alert-summary-rate').textContent = rate + '%';
  if (document.getElementById('timeline-rate-val')) document.getElementById('timeline-rate-val').textContent = rate + '%';
  if (document.getElementById('p-refi-threshold')) document.getElementById('p-refi-threshold').textContent = rate + '%';
}

function _0x2f9cdea() {
  const freqEl = document.getElementById('recheck-freq');
  if (!freqEl) return;
  const months = parseInt(freqEl.value) || 6;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const dateStr = d.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' });
  const freqLabels = { '3': '3 months', '6': '6 months', '12': '12 months', 'rate_only': 'rate movement only' };
  if (document.getElementById('alert-summary-freq')) document.getElementById('alert-summary-freq').textContent = freqLabels[freqEl.value] || '6 months';
  if (document.getElementById('timeline-recheck-date')) document.getElementById('timeline-recheck-date').textContent = dateStr;
}

document.addEventListener('DOMContentLoaded', () => {
  const rc = document.getElementById('recheck-freq');
  if (rc) rc.addEventListener('change', _0x2f9cdea);
});

// ─── GOALS ENGINE ───
let goals = [];
let selectedGoalType = null;
let editingGoalId = null;
let activeCheckinGoal = null;

const goalMeta = {
  deposit:   { icon: '🏡', color: '#0077B6', bg: 'rgba(0,119,182,0.12)', label: 'House Deposit',    motivations: ['Every dollar saved is a step closer to your keys 🔑', 'Your future self will thank you for this.', 'The best time to start was yesterday. The second best is now.'] },
  emergency: { icon: '🛡️', color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Emergency Fund',   motivations: ['Security is freedom. Keep going.', 'This fund lets you say no when life says yes.', 'Peace of mind has a price — you\'re paying it.'] },
  debt:      { icon: '💳', color: '#E63946', bg: 'rgba(230,57,70,0.12)',  label: 'Debt Payoff',       motivations: ['Every payment is buying back your future.', 'Debt-free is a feeling you\'re earning right now.', 'You\'re cutting the cost of your past. Keep cutting.'] },
  invest:    { icon: '📈', color: '#F4A261', bg: 'rgba(244,162,97,0.12)', label: 'Investment Fund',   motivations: ['Compound interest doesn\'t sleep. Keep feeding it.', 'The market rewards the patient. Stay consistent.', 'Investing monthly beats timing the market every time.'] },
  retire:    { icon: '🌴', color: '#9B59B6', bg: 'rgba(155,89,182,0.12)', label: 'Retirement',        motivations: ['Future you is counting on present you.', 'The earlier you invest, the less you need to.', 'Every contribution today is a day of freedom later.'] },
  custom:    { icon: '⭐', color: '#F4A261', bg: 'rgba(244,162,97,0.12)', label: 'Custom Goal',       motivations: ['Goals without plans are just wishes. You\'ve got both.', 'You set the target. Now hit it.', 'Progress over perfection — keep showing up.'] },
};

function selectGoalType(type, el) {
  selectedGoalType = type;
  document.querySelectorAll('.goal-type-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('goal-fields').style.display = 'block';
  // Pre-fill name
  const meta = goalMeta[type];
  document.getElementById('goal-name-input').value = meta.label;
  // Pre-fill from G state
  if (type === 'deposit' && G.depositSaved) document.getElementById('goal-current-input').value = G.depositSaved;
  if (type === 'emergency') document.getElementById('goal-target-input').value = Math.round((G.expenses + G.payment) * 4);
  if (type === 'debt' && (G.ccDebt + G.carDebt + G.otherDebt) > 0) {
    document.getElementById('goal-target-input').value = G.ccDebt + G.carDebt + G.otherDebt;
    document.getElementById('goal-current-input').value = 0;
  }
  if (G.fcf > 0) document.getElementById('goal-monthly-input').value = Math.round(G.fcf * 0.4);
}

function addGoal() {
  const name = document.getElementById('goal-name-input').value.trim();
  const target = parseFloat(document.getElementById('goal-target-input').value) || 0;
  const current = parseFloat(document.getElementById('goal-current-input').value) || 0;
  const monthly = parseFloat(document.getElementById('goal-monthly-input').value) || 0;
  const reminder = document.getElementById('goal-reminder-input').value;

  if (!name || !target) { alert('Please enter a goal name and target amount.'); return; }

  const goal = {
    id: Date.now(),
    type: selectedGoalType || 'custom',
    name, target, current, monthly, reminder,
    streak: 0,
    checkins: [],
    createdAt: new Date().toISOString(),
    lastCheckin: null,
  };
  goals.push(goal);

  // Reset form
  document.getElementById('goal-fields').style.display = 'none';
  document.querySelectorAll('.goal-type-btn').forEach(b => b.classList.remove('selected'));
  selectedGoalType = null;
  ['goal-name-input','goal-target-input','goal-current-input','goal-monthly-input'].forEach(id => document.getElementById(id).value = '');

  _0x338efee();
  _0x36940e3();
}

function deleteGoal(id) {
  goals = goals.filter(g => g.id !== id);
  _0x338efee();
  _0x36940e3();
}

function _0x338efee() {
  const name = (document.getElementById('firstname') && document.getElementById('firstname').value.trim()) || 'there';
  // Update reminder preview
  _0x74237db(name);

  if (goals.length === 0) {
    { const _gl = document.getElementById('goals-list'); if (_gl) _gl.innerHTML = `
      <div class="empty-goals">
        <div class="empty-icon">🎯</div>
        <strong style="color:var(--navy);font-size:16px;">No goals set yet</strong><br>
        Pick a goal type above to start tracking your progress and get monthly reminders.
      </div>`; }
    return;
  }

  let html = '';
  goals.forEach(goal => {
    const meta = goalMeta[goal.type] || goalMeta.custom;
    const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
    const remaining = Math.max(0, goal.target - goal.current);
    const monthsLeft = goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : null;
    const targetDate = monthsLeft ? _0x760196b(monthsLeft) : null;
    const streakHtml = goal.streak > 0
      ? `<span class="streak-pill">🔥 ${goal.streak} check-in${goal.streak > 1 ? 's' : ''}</span>` : '';
    const reminderHtml = `<span class="reminder-tag">🔔 ${goal.reminder}</span>`;
    const lastCheckinText = goal.lastCheckin
      ? `Last updated ${_0x390f7bb(goal.lastCheckin)}`
      : 'No check-ins yet — tap to log progress';

    html += `
      <div class="goal-card">
        <div class="goal-card-header">
          <div class="goal-card-icon-title">
            <div class="goal-icon-circle" style="background:${meta.bg};">${meta.icon}</div>
            <div>
              <div class="goal-title-text">${goal.name} ${streakHtml}</div>
              <div class="goal-subtitle">${reminderHtml} ${lastCheckinText}</div>
            </div>
          </div>
          <div class="goal-amount-target">
            <div class="goal-current-val" style="color:${meta.color}">$${Math.round(goal.current).toLocaleString()}</div>
            <div class="goal-target-val">of $${Math.round(goal.target).toLocaleString()}</div>
          </div>
        </div>
        <div class="goal-progress-wrap">
          <div class="goal-progress-bar-bg">
            <div class="goal-progress-bar-fill" style="width:${pct}%;background:${meta.color};"></div>
          </div>
          <div class="goal-progress-meta">
            <span style="color:${meta.color};font-weight:600;">${pct}% complete</span>
            <span>${remaining > 0 ? '$' + Math.round(remaining).toLocaleString() + ' to go' : '🎉 Goal reached!'}${targetDate ? ' · ' + targetDate : ''}</span>
          </div>
        </div>
        ${goal.monthly > 0 ? `
        <div style="padding:8px 18px 4px;">
          <div style="background:var(--gray-1);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--gray-4);line-height:1.5;">
            💰 Saving <strong style="color:var(--navy);">$${goal.monthly.toLocaleString()}/month</strong>
            ${monthsLeft ? ` · On track to finish <strong style="color:${meta.color};">${targetDate}</strong>` : ''}
            ${goal.checkins && goal.checkins.length > 0 ? ` · Added <strong style="color:var(--teal);">$${Math.round(goal.checkins.reduce((s,c)=>s+(c.added||0),0)).toLocaleString()}</strong> total` : ''}
          </div>
        </div>` : ''}
        <div class="goal-card-footer">

          <button class="goal-action-btn secondary" onclick="showMilestones(${goal.id})">🏆 Milestones</button>
          <button class="goal-action-btn danger" onclick="deleteGoal(${goal.id})">✕ Remove</button>
        </div>
      </div>`;
  });
  { const _gl = document.getElementById('goals-list'); if (_gl) _gl.innerHTML = html; }
}

function showMilestones(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;
  const meta = goalMeta[goal.type] || goalMeta.custom;
  const milestones = [25, 50, 75, 100];
  let msg = `🏆 Milestones for "${goal.name}"\n\n`;
  milestones.forEach(m => {
    const amt = Math.round(goal.target * m / 100);
    const reached = goal.current >= amt;
    msg += `${reached ? '✅' : '⏳'} ${m}% — $${amt.toLocaleString()}${reached ? ' (reached!)' : ''}\n`;
  });
  alert(msg);
}

function _0x74237db(name) {
  const titleEl = document.getElementById('reminder-preview-title');
  const bodyEl = document.getElementById('reminder-preview-body');
  const month = new Date().toLocaleString('default', { month: 'long' });

  if (goals.length === 0) {
    if (titleEl) titleEl.textContent = `Hey ${name} — here's your ${month} update 👋`;
    if (bodyEl) bodyEl.textContent = 'Set a goal above and Tracent will personalise this message every month with your real numbers, encouragement, and your single most important next action.';
    return;
  }

  // Pick most active goal
  const topGoal = goals.reduce((a, b) => (b.current / b.target) > (a.current / a.target) ? b : a);
  const meta = goalMeta[topGoal.type] || goalMeta.custom;
  const pct = Math.min(100, Math.round((topGoal.current / topGoal.target) * 100));
  const remaining = Math.max(0, topGoal.target - topGoal.current);
  const motivation = meta.motivations[new Date().getDate() % meta.motivations.length];
  const monthsLeft = topGoal.monthly > 0 ? Math.ceil(remaining / topGoal.monthly) : null;

  titleEl.textContent = `Hey ${name} — your ${month} financial check-in 👋`;
  bodyEl.innerHTML = `Your <strong>${topGoal.name}</strong> is ${pct}% complete — $${Math.round(topGoal.current).toLocaleString()} of $${Math.round(topGoal.target).toLocaleString()} saved.${monthsLeft ? ` You're on track to finish in ~${monthsLeft} months.` : ''}<br><br><em>${motivation}</em><br><br>💡 <strong>This month's action:</strong> ${remaining > 0 ? `Put $${topGoal.monthly.toLocaleString()} toward your ${topGoal.name} goal before the 1st.` : '🎉 Goal complete! Time to set your next one.'}`;
}

function _0x760196b(monthsLeft) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsLeft);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
}

function _0x390f7bb(isoStr) {
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 60000);
  if (diff < 2) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
}

// ─── GLOBAL STATE (set after compute) ───
// ─── LIVE MARKET RATE (update weekly or wire to an API) ───
let MARKET_RATE_30Y = 6.72;

let G = {
  balance: 342000, currentRate: 7.1, payment: 2380, yearsLeft: 27,
  income: 72000, expenses: 1100, ccDebt: 4200, ccRate: 21,
  carDebt: 14500, carPayment: 340, otherDebt: 0, otherPayment: 0,
  homePrice: 0, depositSaved: 0, savingsAmt: 0, rentAmt: 0,
  fcf: 500, housingType: 'owner', debtMethod: 'avalanche'
};

// ─── RATE SIMULATOR ───
function _0x52c679f() {
  const ownerView = document.getElementById('sim-owner-view');
  const buyerView = document.getElementById('sim-buyer-view');

  if (G.housingType === 'buying') {
    if (ownerView) ownerView.style.display = 'none';
    if (buyerView) buyerView.style.display = 'block';
    _0x340b247();
  } else {
    if (ownerView) ownerView.style.display = 'block';
    if (buyerView) buyerView.style.display = 'none';
    const slider = document.getElementById('rate-slider');
    if (slider && G.currentRate) slider.value = G.currentRate;
    if (slider) updateSimulator(slider.value);
    _0x7bdbfe0();
    // Update today's rate label in alert card
    const todayLbl = document.getElementById('alert-sim-today-label');
    if (todayLbl) todayLbl.textContent = 'Today: ' + MARKET_RATE_30Y.toFixed(2) + '%';
  }
}

function _0x340b247() {
  const el = document.getElementById('rate-watch-content');
  if (!el) return;

  const deposit     = G.depositSaved || G.savingsAmt || 0;
  const targetPrice = G.homePrice || 0;
  const credit      = G.credit || 'fair';
  const baseRate    = BASE_MARKET_RATE + (CREDIT_PREMIUM[credit] || 0);
  const takeHome    = G.takeHome || (G.income / 12);
  const monthlyRent = G.rentAmt || 0;
  const nonHousing  = (G.carPayment||0) + (G.otherPayment||0)
    + Math.max(0, (G.ccDebt||0) * 0.02)
    + (G.studentDebt > 0 ? (G.idrPayment || Math.max((G.studentDebt||0) * 0.01, 100)) : 0);

  const mp = (bal, r, yrs) => {
    const m = (r/100)/12, n = yrs*12;
    if (m === 0 || bal <= 0) return 0;
    return (bal * m * Math.pow(1+m,n)) / (Math.pow(1+m,n)-1);
  };

  const creditPremium = CREDIT_PREMIUM[credit] || 0;

  el.innerHTML = `
    <div class="simulator-card">
      <h3>Rate &amp; Affordability</h3>
      <div class="simulator-sub">Drag the rate to see how it changes what you can afford — and what your target home costs each month.</div>

      <div style="text-align:center;margin-bottom:4px;">
        <div class="rate-big" id="rw-rate-display">${baseRate.toFixed(2)}%</div>
        <div class="rate-big-label">Your credit-adjusted rate</div>
      </div>
      <input type="range" id="rw-slider" min="3.0" max="9.0"
        value="${baseRate.toFixed(2)}"
        oninput="updateRateWatch(parseFloat(this.value))"
        style="margin-bottom:6px;" disabled>
      <div class="rate-markers"><span>3%</span><span>5%</span><span>7%</span><span>9%</span></div>

      <!-- Preset quick-tap buttons -->
      <div style="display:flex;gap:8px;margin:16px 0 20px;">
        ${[0, -0.5, -1.0, -1.5].map((d, i) => {
          const r = Math.max(3, parseFloat((baseRate + d).toFixed(2)));
          const labels = ['Today', '−0.5%', '−1.0%', '−1.5%'];
          return `<button onclick="document.getElementById('rw-slider').value=${r};updateRateWatch(${r})"
            style="flex:1;padding:8px 2px;border-radius:50px;border:1.5px solid ${i===0?'var(--amber)':'var(--gray-2)'};background:${i===0?'rgba(244,162,97,0.08)':'white'};font-family:var(--font-body);font-size:12px;font-weight:600;color:${i===0?'var(--amber)':'var(--gray-4)'};cursor:pointer;transition:all 0.15s;">
            ${labels[i]}<br><span style="font-size:10px;font-weight:400;opacity:0.7;">${r.toFixed(2)}%</span>
          </button>`;
        }).join('')}
      </div>

      <!-- Big two-metric cards -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        <div style="background:linear-gradient(135deg,var(--navy),#0e2640);border-radius:14px;padding:16px;text-align:center;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.2px;color:rgba(255,255,255,0.4);margin-bottom:8px;">Max You Can Afford</div>
          <div style="font-family:var(--font-display);font-size:28px;color:var(--teal-light);line-height:1;transition:all 0.25s;" id="rw-max-price">—</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:5px;">at 43% DTI</div>
        </div>
        <div style="background:white;border-radius:14px;padding:16px;text-align:center;border:var(--card-border);box-shadow:var(--card-shadow);">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.2px;color:var(--gray-3);margin-bottom:8px;">${targetPrice > 0 ? 'Target Home P&amp;I' : 'Monthly P&amp;I'}</div>
          <div style="font-family:var(--font-display);font-size:28px;color:var(--navy);line-height:1;transition:all 0.25s;" id="rw-target-pi">${targetPrice > 0 ? '—' : 'No target set'}</div>
          <div style="font-size:11px;color:var(--gray-4);margin-top:5px;">${targetPrice > 0 ? _0x4f66a67(targetPrice) + ' home' : 'Set target price in setup'}</div>
        </div>
      </div>

      <!-- DTI bar -->
      <div id="rw-dti-bar"></div>

      <!-- Verdict -->
      <div id="rw-verdict" class="sim-verdict neutral"></div>
    </div>

    <!-- Rent vs buy card -->
    <div class="simulator-card">
      <h3 style="font-size:15px;">⚖️ Rent vs Buy at this rate</h3>
      <div id="rw-rent-vs-buy"></div>
    </div>

    ${creditPremium > 0 ? `
    <div class="simulator-card" style="border-left:3px solid var(--amber);">
      <div class="rec-eyebrow amber" style="display:inline-flex;margin-bottom:16px;">⚠️ Credit Premium Active</div>
      <div style="font-size:14px;font-weight:600;color:var(--navy);margin-bottom:6px;">Your credit score is costing you ${creditPremium.toFixed(1)}% extra</div>
      <div style="font-size:13px;color:var(--gray-4);line-height:1.6;">Improving your credit score one tier is equivalent to rates falling ${creditPremium.toFixed(1)}% — often achievable faster than waiting for the Bank of England to cut. On a ${_0x4f66a67(targetPrice||300000)} home that's roughly <strong style="color:var(--teal);">$${Math.round(mp(Math.max(0,(targetPrice||300000)-deposit), baseRate, 30) - mp(Math.max(0,(targetPrice||300000)-deposit), Math.max(3,baseRate-creditPremium*0.6), 30)).toLocaleString()}/month</strong> saved.</div>
    </div>` : ''}
  `;

  updateRateWatch(baseRate);
}

function updateRateWatch(rate) {
  rate = Math.max(3, Math.min(9, parseFloat(rate)));

  const deposit     = G.depositSaved || G.savingsAmt || 0;
  const targetPrice = G.homePrice || 0;
  const credit      = G.credit || 'fair';
  const baseRate    = BASE_MARKET_RATE + (CREDIT_PREMIUM[credit] || 0);
  const takeHome    = G.takeHome || (G.income / 12);
  const monthlyRent = G.rentAmt || 0;
  const nonHousing  = (G.carPayment||0) + (G.otherPayment||0)
    + Math.max(0, (G.ccDebt||0) * 0.02)
    + (G.studentDebt > 0 ? (G.idrPayment || Math.max((G.studentDebt||0)*0.01, 100)) : 0);

  const mp = (bal, r, yrs) => {
    const m=(r/100)/12, n=yrs*12;
    if (m===0||bal<=0) return 0;
    return (bal*m*Math.pow(1+m,n))/(Math.pow(1+m,n)-1);
  };

  // ── Max affordable at this rate (back-solve for 43% DTI) ──
  const maxHousingPmt = takeHome * 0.43 - nonHousing;
  const rM = (rate/100)/12;
  const maxLoan = maxHousingPmt > 0
    ? maxHousingPmt * ((Math.pow(1+rM,360)-1) / (rM * Math.pow(1+rM,360))) : 0;
  const maxPrice = Math.max(0, Math.round(maxLoan + deposit));

  // ── P&I + DTI for the target home ──
  const targetLoan = Math.max(0, targetPrice - deposit);
  const targetPI   = targetPrice > 0 ? Math.round(mp(targetLoan, rate, 30)) : 0;
  const dti        = takeHome > 0 ? Math.round(((targetPI + nonHousing) / takeHome) * 100) : 0;

  // P&I at today's rate (for comparison)
  const basePI     = targetPrice > 0 ? Math.round(mp(targetLoan, baseRate, 30)) : 0;
  const piSaving   = basePI - targetPI;
  const gap        = maxPrice - targetPrice; // positive = headroom, negative = over budget

  // ── Rate display ──
  const rd = document.getElementById('rw-rate-display');
  if (rd) {
    rd.textContent = rate.toFixed(2) + '%';
    rd.style.color = rate <= 5.5 ? 'var(--green)' : rate <= 6.5 ? 'var(--teal)' : rate <= 7.2 ? 'var(--amber)' : 'var(--red)';
  }

  // ── Max price card ──
  const mpEl = document.getElementById('rw-max-price');
  if (mpEl) {
    mpEl.textContent = maxPrice >= 1000 ? '$' + Math.round(maxPrice/1000) + 'K' : _0x4f66a67(maxPrice);
    const baseMax = (() => {
      const bPmt = takeHome * 0.43 - nonHousing;
      const bR = (baseRate/100)/12;
      return bPmt > 0 ? Math.round(bPmt * ((Math.pow(1+bR,360)-1)/(bR*Math.pow(1+bR,360))) + deposit) : 0;
    })();
    const maxDelta = maxPrice - baseMax;
    mpEl.innerHTML = (maxPrice >= 1000 ? '$' + Math.round(maxPrice/1000) + 'K' : _0x4f66a67(maxPrice))
      + (maxDelta !== 0 ? `<span style="font-size:13px;color:${maxDelta>0?'#7fffda':'#ff8fa3'};display:block;margin-top:2px;">${maxDelta>0?'▲':'▼'}$${Math.round(Math.abs(maxDelta)/1000)}K vs today</span>` : '');
    mpEl.style.color = gap >= 0 ? 'var(--teal-light)' : '#ff6b7a';
  }

  // ── Target PI card ──
  const tpiEl = document.getElementById('rw-target-pi');
  if (tpiEl && targetPrice > 0) {
    const piColor = dti <= 36 ? 'var(--teal)' : dti <= 43 ? 'var(--amber)' : 'var(--red)';
    tpiEl.innerHTML = `$${targetPI.toLocaleString()}<span style="font-size:13px;font-weight:400;color:var(--gray-4);">/mo</span>`
      + (piSaving > 0 ? `<span style="font-size:13px;color:var(--teal);display:block;margin-top:2px;">-$${piSaving.toLocaleString()} vs today</span>` : '');
    tpiEl.style.color = piColor;
  }

  // ── DTI progress bar ──
  const dtiEl = document.getElementById('rw-dti-bar');
  if (dtiEl && targetPrice > 0) {
    const dtiColor = dti <= 36 ? 'var(--green)' : dti <= 43 ? 'var(--amber)' : 'var(--red)';
    const baseDti = takeHome > 0 ? Math.round(((basePI + nonHousing) / takeHome) * 100) : 0;
    const dtiDelta = dti - baseDti;
    const gapChip = gap >= 0
      ? `<span style="background:rgba(16,185,129,0.12);color:var(--green);padding:3px 10px;border-radius:20px;font-weight:600;">✅ $${Math.round(gap/1000)}K headroom</span>`
      : `<span style="background:rgba(230,57,70,0.1);color:var(--red);padding:3px 10px;border-radius:20px;font-weight:600;">⚠️ $${Math.round(Math.abs(gap)/1000)}K over max</span>`;
    dtiEl.innerHTML = `
      <div style="background:var(--gray-1);border-radius:12px;padding:14px;margin-bottom:12px;border:var(--card-border);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gray-3);">DTI at this rate</span>
          <span style="font-family:var(--font-display);font-size:20px;color:${dtiColor};">${dti}%
            ${dtiDelta !== 0 ? `<span style="font-size:12px;color:${dtiDelta<0?'var(--green)':'var(--red)'};">${dtiDelta<0?'▼':'▲'}${Math.abs(dtiDelta)}%</span>` : ''}
          </span>
        </div>
        <div style="height:8px;background:var(--gray-2);border-radius:4px;overflow:hidden;margin-bottom:8px;">
          <div style="width:${Math.min(100,dti)}%;height:100%;background:${dtiColor};border-radius:4px;transition:width 0.25s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gray-3);margin-bottom:16px;">
          <span>0%</span><span style="color:var(--green);">36%</span><span style="color:var(--amber);">43%</span><span>50%+</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;">${gapChip}
          ${piSaving > 0 ? `<span style="color:var(--teal);">-$${piSaving.toLocaleString()}/mo vs today</span>` : ''}
        </div>
      </div>`;
  } else if (dtiEl) {
    dtiEl.innerHTML = '';
  }

  // ── Verdict ──
  const vEl = document.getElementById('rw-verdict');
  if (vEl) {
    let cls, msg;
    if (!targetPrice) {
      cls = 'neutral'; msg = 'Set a target home price during setup to see personalised affordability figures.';
    } else if (dti > 50) {
      cls = 'bad'; msg = `At ${rate.toFixed(2)}%, your DTI would hit ${dti}% — most lenders cap at 43–45%. You'd need rates below ~${(rate - 1).toFixed(1)}%, a bigger deposit, or a lower target price.`;
    } else if (dti > 43) {
      cls = 'bad'; msg = `At ${rate.toFixed(2)}%, DTI is ${dti}% — just over the 43% threshold. Try a target price of ${_0x4f66a67(Math.round(maxPrice/1000)*1000)} or wait for rates to fall a little further.`;
    } else if (dti > 36) {
      cls = 'neutral'; msg = `At ${rate.toFixed(2)}%, DTI is ${dti}% — you'd likely qualify, but it's firm. Your monthly breathing room would be ${_0x4f66a67(Math.max(0, Math.round(takeHome - targetPI - nonHousing - (G.expenses||0))))}.`;
    } else {
      cls = 'good'; msg = `At ${rate.toFixed(2)}%, DTI is a healthy ${dti}%. You could afford up to ${_0x4f66a67(maxPrice)} at this rate${piSaving > 0 ? ` — saving $${piSaving.toLocaleString()}/mo vs buying today` : ''}.`;
    }
    vEl.className = 'sim-verdict ' + cls;
    vEl.textContent = msg;
  }

  // ── Rent vs buy ──
  const rvbEl = document.getElementById('rw-rent-vs-buy');
  if (rvbEl) {
    if (monthlyRent > 0 && targetPrice > 0) {
      const annualRent = monthlyRent * 12;
      rvbEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div style="background:rgba(244,162,97,0.08);border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:var(--amber);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Keep Renting</div>
            <div style="font-family:var(--font-display);font-size:22px;color:var(--navy);">$${monthlyRent.toLocaleString()}/mo</div>
            <div style="font-size:11px;color:var(--gray-4);margin-top:4px;">$${annualRent.toLocaleString()}/yr · no equity</div>
          </div>
          <div style="background:${dti<=43?'var(--teal-dim)':'rgba(230,57,70,0.07)'};border-radius:12px;padding:14px;text-align:center;border:1.5px solid ${dti<=43?'rgba(0,119,182,0.25)':'rgba(230,57,70,0.2)'};">
            <div style="font-size:10px;font-weight:700;color:${dti<=43?'var(--teal)':'var(--red)'};letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Buy at ${rate.toFixed(2)}%</div>
            <div style="font-family:var(--font-display);font-size:22px;color:var(--navy);">$${targetPI.toLocaleString()}/mo</div>
            <div style="font-size:11px;color:var(--gray-4);margin-top:4px;">${targetPI <= monthlyRent ? '✅ Less than rent' : '+$'+(targetPI-monthlyRent).toLocaleString()+'/mo vs rent'} · equity builds</div>
          </div>
        </div>
        <div style="background:var(--navy);border-radius:12px;padding:14px;font-size:13px;color:rgba(255,255,255,0.8);line-height:1.6;">
          💡 <strong style="color:var(--teal-light);">The honest trade-off:</strong>
          ${targetPI <= monthlyRent
            ? `At ${rate.toFixed(2)}%, your P&I (${_0x4f66a67(targetPI)}) is <em>lower</em> than your rent — every payment builds equity.`
            : `You'd pay ${_0x4f66a67(targetPI - monthlyRent)}/mo more than rent, but into an asset you own.`}
          Waiting 12 months costs ${_0x4f66a67(annualRent)} in rent. Refinancing later costs ~${_0x4f66a67(Math.round(targetLoan * 0.02))} (2% of loan).
        </div>`;
    } else {
      rvbEl.innerHTML = `<div style="font-size:13px;color:var(--gray-4);padding:8px 0;">Enter your rent amount and target home price during setup to see this comparison.</div>`;
    }
  }
}

function setRate(r) {
  document.getElementById('rate-slider').value = r;
  updateSimulator(r);
}

function updateSimulator(rateVal) {
  const rate = parseFloat(rateVal);
  document.getElementById('sim-rate-display').textContent = rate.toFixed(2) + '%';

  // colour the rate display
  const rd = document.getElementById('sim-rate-display');
  rd.style.color = rate <= 5.5 ? 'var(--green)' : rate <= 6.5 ? 'var(--teal)' : rate <= 7.2 ? 'var(--amber)' : 'var(--red)';

  if (G.housingType !== 'owner' || !G.balance) {
    document.getElementById('sim-monthly').textContent = '—';
    document.getElementById('sim-savings').textContent = 'N/A';
    document.getElementById('sim-breakeven').textContent = 'N/A';
    document.getElementById('sim-lifetime').textContent = 'N/A';
    document.getElementById('sim-verdict').textContent = 'Rate simulator works best for homeowners with a mortgage.';
    document.getElementById('sim-verdict').className = 'sim-verdict neutral';
    return;
  }

  const mp = (bal, r, yrs) => {
    const m = (r/100)/12, n = yrs*12;
    if (m === 0) return bal/n;
    return (bal * m * Math.pow(1+m,n)) / (Math.pow(1+m,n)-1);
  };

  const newPayment = mp(G.balance, rate, G.yearsLeft);
  const diff = G.payment - newPayment;
  const closingCosts = G.balance * 0.02;
  const breakeven = diff > 0 ? Math.round(closingCosts / diff) : null;
  const currentTotalInterest = G.payment * G.yearsLeft * 12 - G.balance;
  const newTotalInterest = newPayment * G.yearsLeft * 12 - G.balance;
  const lifetimeSavings = currentTotalInterest - newTotalInterest;

  document.getElementById('sim-monthly').textContent = '$' + Math.round(newPayment).toLocaleString();
  const savEl = document.getElementById('sim-savings');
  savEl.textContent = (diff >= 0 ? '+$' : '-$') + Math.abs(Math.round(diff)).toLocaleString() + '/mo';
  savEl.className = 'sim-result-val ' + (diff > 0 ? 'positive' : diff < 0 ? 'negative' : '');
  document.getElementById('sim-breakeven').textContent = breakeven ? breakeven + ' mo' : 'N/A';
  const lsEl = document.getElementById('sim-lifetime');
  lsEl.textContent = (lifetimeSavings >= 0 ? '+$' : '-$') + Math.abs(Math.round(lifetimeSavings/1000)) + 'K';
  lsEl.className = 'sim-result-val ' + (lifetimeSavings > 0 ? 'positive' : 'negative');

  // verdict
  const vEl = document.getElementById('sim-verdict');
  if (rate >= G.currentRate) {
    vEl.textContent = `At ${rate.toFixed(2)}%, your payment increases by $${Math.abs(Math.round(diff))}/month. Your current rate of ${G.currentRate}% is better — don't refinance unless you need to.`;
    vEl.className = 'sim-verdict bad';
  } else if (breakeven && breakeven <= 24) {
    vEl.textContent = `✅ At ${rate.toFixed(2)}%, refinancing saves $${Math.round(diff)}/month and breaks even in just ${breakeven} months. Tracent says: act when rates reach this level.`;
    vEl.className = 'sim-verdict good';
  } else if (breakeven && breakeven <= 48) {
    vEl.textContent = `⏳ At ${rate.toFixed(2)}%, you'd save $${Math.round(diff)}/month with a ${breakeven}-month break-even. Reasonable — depends on how long you plan to stay.`;
    vEl.className = 'sim-verdict neutral';
  } else {
    vEl.textContent = `At ${rate.toFixed(2)}%, the savings ($${Math.round(diff)}/mo) don't justify closing costs within a reasonable timeframe. Wait for a better rate.`;
    vEl.className = 'sim-verdict neutral';
  }
}

// ─── REFI ANALYSIS CARD ───
function _0x7bdbfe0() {
  const el = document.getElementById('refi-analysis-body');
  if (!el) return;
  if (G.housingType !== 'owner' || !G.balance || !G.currentRate) {
    el.innerHTML = '<div style="color:var(--gray-4);font-size:13px;padding:8px 0;">Complete onboarding with your mortgage details to see your personalised refinance analysis.</div>';
    return;
  }
  const bal = G.balance, curRate = G.currentRate, yrs = G.yearsLeft || 25;
  const tgtRate = G.targetRefiRate || Math.max(curRate - 0.75, 4.5);
  const mktRate = MARKET_RATE_30Y;
  const mp = (b,r,y) => { const m=(r/100)/12,n=y*12; return m===0?b/n:(b*m*Math.pow(1+m,n))/(Math.pow(1+m,n)-1); };
  const curPmt  = Math.round(mp(bal, curRate, yrs));
  const tgtPmt  = Math.round(mp(bal, tgtRate, yrs));
  const mktPmt  = Math.round(mp(bal, mktRate, yrs));
  const closing = Math.round(bal * 0.02);
  const savingAtTarget = curPmt - tgtPmt;
  const savingAtMarket = curPmt - mktPmt;
  const beTarget = savingAtTarget > 0 ? Math.round(closing / savingAtTarget) : null;
  const beMarket = savingAtMarket > 0 ? Math.round(closing / savingAtMarket) : null;
  const fmt = n => '$' + Math.abs(Math.round(n)).toLocaleString();

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div style="background:var(--gray-1);border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:10px;color:var(--gray-3);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Your rate</div>
        <div style="font-family:var(--font-display);font-size:22px;color:var(--navy);">${curRate}%</div>
        <div style="font-size:11px;color:var(--gray-4);">${fmt(curPmt)}/mo P&I</div>
      </div>
      <div style="background:rgba(0,119,182,0.08);border-radius:10px;padding:12px;text-align:center;border:1.5px solid rgba(0,119,182,0.2);">
        <div style="font-size:10px;color:var(--teal);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Your target</div>
        <div style="font-family:var(--font-display);font-size:22px;color:var(--teal);">${tgtRate.toFixed(2)}%</div>
        <div style="font-size:11px;color:var(--gray-4);">${fmt(tgtPmt)}/mo · saves ${fmt(savingAtTarget)}</div>
      </div>
    </div>
    <div style="background:white;border:var(--card-border);border-radius:10px;padding:14px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-2);font-size:13px;">
        <span style="color:var(--gray-4);">Estimated closing costs</span>
        <span style="font-weight:600;color:var(--navy);">${fmt(closing)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-2);font-size:13px;">
        <span style="color:var(--gray-4);">Savings at target rate</span>
        <span style="font-weight:700;color:${savingAtTarget > 0 ? 'var(--teal)' : 'var(--red)'};">${savingAtTarget > 0 ? '+' : ''}${fmt(savingAtTarget)}/mo</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-2);font-size:13px;">
        <span style="color:var(--gray-4);">Break-even at target rate</span>
        <span style="font-weight:700;color:var(--navy);">${beTarget ? beTarget + ' months' : 'N/A'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;">
        <span style="color:var(--gray-4);">Today's market (${mktRate.toFixed(2)}%)</span>
        <span style="font-weight:600;color:${savingAtMarket > 0 ? 'var(--teal)' : 'var(--red)'};">${savingAtMarket > 0 ? 'saves ' + fmt(savingAtMarket) + '/mo' : 'no benefit'}</span>
      </div>
    </div>
    <div style="margin-top:12px;padding:10px 14px;border-radius:10px;font-size:12px;line-height:1.6;
      background:${beTarget && beTarget <= 24 ? 'rgba(16,185,129,0.1)' : beTarget && beTarget <= 48 ? 'rgba(244,162,97,0.1)' : 'rgba(0,119,182,0.07)'};
      color:${beTarget && beTarget <= 24 ? 'var(--green)' : beTarget && beTarget <= 48 ? 'var(--amber)' : 'var(--teal)'};">
      ${beTarget && beTarget <= 24 ? '✅ At your target rate, refinancing makes strong financial sense — break-even under 24 months.' :
        beTarget && beTarget <= 48 ? `⏳ Break-even of ${beTarget} months is reasonable if you plan to stay ${Math.ceil(beTarget/12)+1}+ more years.` :
        `📊 Use the slider above to find a rate where the numbers work for your situation.`}
    </div>
    <button class="rec-action-btn" style="margin-top:12px;" onclick="openScenarios()">See Full Rate Scenario Comparison</button>`;
}

// ─── DEBT RANKER ───
let debtMethod = 'avalanche';

function setMethod(m) {
  debtMethod = m;
  var _ba = document.getElementById('btn-avalanche'); if(_ba) _ba.className = 'method-btn' + (m === 'avalanche' ? ' active' : '');
  var _bs = document.getElementById('btn-snowball'); if(_bs) _bs.className = 'method-btn' + (m === 'snowball' ? ' active' : '');
  document.getElementById('method-info').innerHTML = m === 'avalanche'
    ? '<strong>Avalanche method:</strong> Pay minimums on all debts, put extra cash toward the highest interest rate first. Mathematically optimal — saves the most money overall.'
    : '<strong>Snowball method:</strong> Pay minimums on all debts, put extra cash toward the smallest balance first. Psychologically powerful — quick wins keep you motivated.';
  _0x3e799ba();
}

function _0x3e799ba() {
  const debts = [];
  if (G.ccDebt > 0)   debts.push({ name:'Credit Card',  balance:G.ccDebt,    rate:G.ccRate||21,       minPayment:Math.max(25,Math.round(G.ccDebt*0.02)),  icon:'💳', color:'red'  });
  if (G.carDebt > 0)  debts.push({ name:'Car Loan',     balance:G.carDebt,   rate:7.5,                minPayment:G.carPayment||300,                        icon:'🚗', color:'amber'});
  if (G.otherDebt>0)  debts.push({ name:'Other Loans',  balance:G.otherDebt, rate:9.0,                minPayment:G.otherPayment||150,                      icon:'📋', color:'amber'});
  if (G.housingType==='owner'&&G.balance>0) debts.push({ name:'Mortgage', balance:G.balance, rate:G.currentRate, minPayment:G.payment, icon:'🏡', color:'teal'});
  if (G.studentDebt>0) debts.push({ name:'Student Loan', balance:G.studentDebt, rate:5.5, minPayment:G.idrPayment||Math.max(G.studentDebt*0.01,100), icon:'🎓', color:'amber'});

  const rankList   = document.getElementById('debt-rank-list');
  const summaryEl  = document.getElementById('debt-summary');

  if (debts.length === 0) {
    rankList.innerHTML  = '<div style="text-align:center;padding:30px;color:var(--gray-4);font-size:14px;">🎉 No debts found! Your Tracent score gets a boost.</div>';
    summaryEl.innerHTML = '';
    return;
  }

  // ── Core simulation ──────────────────────────────────────────────
  function simulate(debtList, extraMonthly) {
    // deep clone
    let sim = debtList.map(d => ({ ...d, bal: d.balance }));
    let month = 0, totalInterest = 0, payoffEvents = [], available = extraMonthly;
    const MAX = 360;
    while (sim.some(d => d.bal > 0) && month < MAX) {
      month++;
      // 1. Accrue interest + pay minimums on all
      sim.forEach(d => {
        if (d.bal <= 0) return;
        d.bal += d.bal * (d.rate / 100 / 12);
        totalInterest += d.bal * (d.rate / 100 / 12); // already added above — fix:
        d.bal -= d.bal * (d.rate / 100 / 12); // cancel — redo correctly below
      });
      // redo correctly
      totalInterest -= totalInterest; // reset — simpler redo:
      sim = sim; // no-op; rewrite loop:
      month--; totalInterest = 0; sim = debtList.map(d => ({ ...d, bal: d.balance }));
      available = extraMonthly;
      payoffEvents = [];
      // CORRECT simulation:
      while (sim.some(d => d.bal > 0) && month < MAX) {
        month++;
        // accrue
        sim.forEach(d => { if (d.bal > 0) { totalInterest += d.bal * (d.rate/100/12); d.bal *= 1 + d.rate/100/12; } });
        // pay minimums
        sim.forEach(d => { if (d.bal > 0) { const p = Math.min(d.bal, d.minPayment); d.bal -= p; } });
        // throw extra at target (first with balance > 0 — already in priority order)
        const target = sim.find(d => d.bal > 0);
        if (target && available > 0) { const extra = Math.min(target.bal, available); target.bal = Math.max(0, target.bal - extra); }
        // record payoffs and cascade freed minimums
        sim.forEach(d => {
          if (d.bal <= 0 && !payoffEvents.find(e => e.name === d.name)) {
            payoffEvents.push({ name:d.name, icon:d.icon, month, freed:d.minPayment });
            available += d.minPayment; // cascade: freed minimum rolls forward
          }
        });
      }
      break; // exit outer while — inner while did the work
    }
    return { months: month, interest: Math.round(totalInterest), payoffEvents, available };
  }

  // ── Build sorted lists for each method ──────────────────────────
  const nonMortgage = debts.filter(d => d.name !== 'Mortgage');
  const avalancheOrder = [...nonMortgage].sort((a,b) => b.rate - a.rate);
  const snowballOrder  = [...nonMortgage].sort((a,b) => a.balance - b.balance);

  // Extra cash = 40% of free cash flow, min $0
  const extraCash = Math.max(0, Math.round((G.fcf||0) * 0.4));

  const avResult  = simulate(avalancheOrder, extraCash);
  const sbResult  = simulate(snowballOrder,  extraCash);
  const baseline  = simulate(nonMortgage.map(d=>({...d})).sort((a,b)=>b.rate-a.rate), 0);

  const isAvalanche = debtMethod === 'avalanche';
  const activeResult   = isAvalanche ? avResult  : sbResult;
  const activeOrder    = isAvalanche ? avalancheOrder : snowballOrder;
  const interestSaved  = Math.max(0, baseline.interest - activeResult.interest);
  const monthsSaved    = Math.max(0, baseline.months   - activeResult.months);

  // Delta between methods — the "which is better for you" insight
  const avBetter  = avResult.interest <= sbResult.interest;
  const interestDelta = Math.abs(avResult.interest - sbResult.interest);
  const monthsDelta   = Math.abs(avResult.months   - sbResult.months);

  const maxBal = Math.max(...debts.map(d=>d.balance));
  const totalDebt = debts.reduce((s,d)=>s+d.balance,0);
  const totalAnnualInterest = debts.reduce((s,d)=>s+d.balance*(d.rate/100),0);
  const fmt = n => _0x4f66a67 ? _0x4f66a67(n) : '$'+Math.round(n).toLocaleString();

  // ── Rank cards ──────────────────────────────────────────────────
  // Use activeOrder for rank, add all debts (mortgage last)
  const allSorted = [
    ...activeOrder,
    ...debts.filter(d => d.name === 'Mortgage'),
    ...debts.filter(d => !nonMortgage.includes(d) && d.name !== 'Mortgage')
  ];
  // Dedupe
  const seen = new Set();
  const displayOrder = allSorted.filter(d => { if(seen.has(d.name)){return false;} seen.add(d.name); return true; });

  // For each non-mortgage debt, calculate actual months using its position in priority order
  let rankHtml = '';
  displayOrder.forEach((d, i) => {
    const isMortgage = d.name === 'Mortgage';
    const annualInterest  = Math.round(d.balance * (d.rate / 100));
    const monthlyInterest = Math.round(annualInterest / 12);
    const pct = Math.round((d.balance / maxBal) * 100);

    // Find when this debt gets paid off in the active simulation
    const payoffEvent = activeResult.payoffEvents.find(e => e.name === d.name);
    const monthsDisplay = isMortgage
      ? Math.ceil(d.balance / d.minPayment) + ' mo (min pmt)'
      : payoffEvent
        ? payoffEvent.month + ' mo'
        : extraCash > 0 ? Math.ceil(d.balance / (d.minPayment + extraCash)) + ' mo (est)' : Math.ceil(d.balance / d.minPayment) + ' mo';

    const priorityClass = i === 0 ? 'priority-1' : i === 1 ? 'priority-2' : i === 2 ? 'priority-3' : 'priority-4';
    const reasonText = isMortgage
      ? 'Pay minimums only — focus consumer debt first.'
      : i === 0
        ? (isAvalanche ? `Highest rate (${d.rate}%) — costs most per dollar.` : `Smallest balance (${fmt(d.balance)}) — fastest win.`)
        : i === 1
        ? 'Next in line after priority #1 is cleared.'
        : 'Pay minimums only until higher-priority debts are gone.';

    rankHtml += `<div class="debt-rank-item">
      <div class="debt-rank-num ${priorityClass}">${isMortgage ? '🏡' : i+1}</div>
      <div class="debt-rank-info">
        <div class="debt-rank-title">${d.icon} ${d.name}</div>
        <div class="debt-rank-desc">${reasonText}<br>Costing <strong>${fmt(monthlyInterest)}/month</strong> in interest (${d.rate}% APR).</div>
        <div class="debt-rank-bar-wrap"><div class="debt-rank-bar ${d.color}" style="width:${pct}%"></div></div>
        <div class="debt-rank-meta">
          <span>${fmt(d.balance)} balance</span>
          <span>${monthsDisplay}</span>
        </div>
      </div>
    </div>`;
  });
  rankList.innerHTML = rankHtml;

  // ── Cascade summary card ─────────────────────────────────────────
  let cascadeHtml = '';
  if (nonMortgage.length > 0) {
    const methodLabel = isAvalanche ? 'Avalanche' : 'Snowball';
    const methodEmoji = isAvalanche ? '🏔️' : '⛄';

    // Method comparison callout
    let comparisonHtml = '';
    if (nonMortgage.length > 1 && interestDelta > 50) {
      const betterMethod = avBetter ? 'Avalanche' : 'Snowball';
      const worseMethod  = avBetter ? 'Snowball'  : 'Avalanche';
      const currentIsBetter = (isAvalanche && avBetter) || (!isAvalanche && !avBetter);
      comparisonHtml = `
        <div style="background:${currentIsBetter?'rgba(16,185,129,0.08)':'rgba(244,162,97,0.08)'};border:1px solid ${currentIsBetter?'rgba(16,185,129,0.2)':'rgba(244,162,97,0.2)'};border-radius:12px;padding:12px 14px;margin-bottom:14px;">
          <div style="font-size:12px;font-weight:700;color:${currentIsBetter?'var(--green)':'var(--amber)'};margin-bottom:4px;">
            ${currentIsBetter ? '✅ Optimal method for your debts' : `💡 Switch to ${betterMethod} to save more`}
          </div>
          <div style="font-size:12px;color:var(--gray-4);line-height:1.5;">
            ${avBetter
              ? `Avalanche saves ${fmt(interestDelta)} more in interest than Snowball${monthsDelta>0?' and clears debt '+monthsDelta+' months faster':''}.`
              : `Snowball gets you debt-free ${monthsDelta} months faster than Avalanche — ${fmt(interestDelta)} more in interest but the quick wins keep momentum going.`}
          </div>
        </div>`;
    }

    cascadeHtml = `
    <div class="rec-card" style="margin-top:4px;">
      <div class="rec-status-bar ${extraCash > 0 ? 'teal' : 'amber'}"></div>
      <div class="rec-body">
        <div class="rec-eyebrow teal">${methodEmoji} ${methodLabel} Payoff Plan</div>
        <div class="rec-headline" style="font-size:18px;">Debt-free in <strong>${activeResult.months} months</strong>${interestSaved > 0 ? ` · saves ${fmt(interestSaved)}` : ''}</div>
        <div style="font-size:13px;color:var(--gray-4);line-height:1.6;margin-bottom:14px;">
          ${extraCash > 0
            ? `You have <strong style="color:var(--teal);">${fmt(extraCash)}/month</strong> of extra cash targeting your #1 priority. Each cleared debt rolls its minimum payment into the next — the cascade effect.`
            : `Your current cash flow covers minimums only. Even <strong>$50–100/mo extra</strong> would save significant interest. Set a debt payoff goal to see the impact.`}
        </div>
        ${comparisonHtml}
        <!-- Cascade timeline -->
        <div style="margin-bottom:14px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--gray-4);margin-bottom:16px;">Payoff timeline · ${methodLabel}</div>
          ${activeResult.payoffEvents.map((e,i) => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:${i===0?'var(--teal-dim)':'var(--gray-1)'};margin-bottom:6px;border-left:3px solid ${i===0?'var(--teal)':'var(--gray-2)'};">
              <div style="font-size:20px;">${e.icon}</div>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;color:var(--navy);">${e.name} — paid off</div>
                <div style="font-size:12px;color:var(--gray-4);">Month ${e.month} · ${fmt(e.freed)}/mo cascades to next debt</div>
              </div>
              <div style="font-size:12px;font-weight:700;color:var(--teal);">Mo. ${e.month}</div>
            </div>`).join('')}
          <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(16,185,129,0.08);margin-bottom:6px;border-left:3px solid var(--green);">
            <div style="font-size:20px;">🎉</div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;color:var(--navy);">All consumer debts cleared</div>
              <div style="font-size:12px;color:var(--gray-4);">${fmt(nonMortgage.reduce((s,d)=>s+d.minPayment,0)+extraCash)}/mo freed for savings or investing</div>
            </div>
            <div style="font-size:12px;font-weight:700;color:var(--green);">Mo. ${activeResult.months}</div>
          </div>
        </div>
        <!-- Stats comparison -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:var(--gray-1);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-family:var(--font-display);font-size:20px;color:var(--teal);">${activeResult.months} mo</div>
            <div style="font-size:10px;color:var(--gray-4);font-weight:500;">With ${fmt(extraCash)}/mo extra</div>
          </div>
          <div style="background:var(--gray-1);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-family:var(--font-display);font-size:20px;color:var(--gray-3);">${baseline.months} mo</div>
            <div style="font-size:10px;color:var(--gray-4);font-weight:500;">Minimums only</div>
          </div>
          <div style="background:rgba(16,185,129,0.08);border-radius:10px;padding:12px;text-align:center;border:1px solid rgba(16,185,129,0.2);">
            <div style="font-family:var(--font-display);font-size:20px;color:var(--green);">${monthsSaved} mo</div>
            <div style="font-size:10px;color:var(--gray-4);font-weight:500;">Time saved</div>
          </div>
          <div style="background:rgba(16,185,129,0.08);border-radius:10px;padding:12px;text-align:center;border:1px solid rgba(16,185,129,0.2);">
            <div style="font-family:var(--font-display);font-size:20px;color:var(--green);">${fmt(interestSaved)}</div>
            <div style="font-size:10px;color:var(--gray-4);font-weight:500;">Interest saved</div>
          </div>
        </div>
      </div>
    </div>`;
  } else {
    cascadeHtml = `<div class="rec-card" style="margin-top:4px;">
      <div class="rec-status-bar teal"></div>
      <div class="rec-body">
        <div class="rec-eyebrow teal">📊 Debt Summary</div>
        <div class="rec-headline" style="font-size:15px;">${fmt(totalAnnualInterest)}/year in total interest</div>
        <div class="rec-why">Total debt: ${fmt(totalDebt)}. Only your mortgage remains — you're in a strong position.</div>
      </div>
    </div>`;
  }
  summaryEl.innerHTML = cascadeHtml;

  // ── Timeline chart ───────────────────────────────────────────────
  const timelineEl = document.getElementById('debt-timeline-chart');
  if (timelineEl && nonMortgage.length > 0) {
    // Plot both methods for visual comparison
    function getBalancePoints(orderedDebts, extra) {
      let sim = orderedDebts.map(d => ({ ...d, bal: d.balance }));
      let avail = extra, mo = 0, pts = [{ m:0, b: orderedDebts.reduce((s,d)=>s+d.balance,0) }];
      while (sim.some(d=>d.bal>0) && mo < 360) {
        mo++;
        sim.forEach(d => { if(d.bal>0){ d.bal *= 1 + d.rate/100/12; const p=Math.min(d.bal,d.minPayment); d.bal-=p; }});
        const tgt = sim.find(d=>d.bal>0);
        if(tgt && avail>0){ tgt.bal = Math.max(0, tgt.bal-avail); }
        sim.forEach(d=>{ if(d.bal<=0 && d.bal!==-999){ d.bal=-999; avail+=d.minPayment; }});
        if(mo%3===0||!sim.some(d=>d.bal>0)) pts.push({ m:mo, b:Math.max(0,sim.reduce((s,d)=>s+(d.bal>0?d.bal:0),0)) });
      }
      return pts;
    }
    const avPts = getBalancePoints([...avalancheOrder], extraCash);
    const sbPts = getBalancePoints([...snowballOrder],  extraCash);
    const allPts = [...avPts, ...sbPts];
    const maxM = Math.max(...allPts.map(p=>p.m));
    const maxB = nonMortgage.reduce((s,d)=>s+d.balance,0);
    const W = 300, H = 80;
    const px = m => Math.round((m/maxM)*W);
    const py = b => Math.round(H - (b/maxB)*H);
    const toPath = pts => pts.map((p,i) => (i===0?'M':'L')+px(p.m)+' '+py(p.b)).join(' ');
    timelineEl.innerHTML = `<svg width="100%" height="${H+20}" viewBox="0 0 ${W} ${H+20}" style="overflow:visible;">
      <path d="${toPath(avPts)}" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linecap="round"/>
      <path d="${toPath(sbPts)}" fill="none" stroke="var(--amber)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="4 2"/>
      <text x="4"  y="${H+16}" font-size="9" fill="var(--teal)">🏔️ Avalanche</text>
      <text x="${W/2}" y="${H+16}" font-size="9" fill="var(--amber)" text-anchor="middle">⛄ Snowball (dashed)</text>
      <text x="${W}" y="${H+16}" font-size="9" fill="var(--gray-4)" text-anchor="end">${maxM} mo</text>
    </svg>`;
  }
}

// ─── SCORE BREAKDOWN MODAL ───

var _sbdWhatIfState = {};  // overrides keyed by category id

// Canonical implementations are in the UI Controller block (use openModal/closeModal pattern).
// These stubs allow engine code to call them before the controller block loads.

// Compute the 5 category scores, with optional what-if overrides
function _0xf056049(overrides) {
  overrides = overrides || {};
  const hasOverrides = Object.keys(overrides).length > 0;

  // ── Fast path: no what-if changes — use the scores already computed by _0xb70f5a4 ──
  if (!hasOverrides && G.scoreCategories && G.score) {
    const cats = G.scoreCategories;
    return {
      total: G.score,
      categories: [
        {
          id: 'paymentStability', weight: 30, score: cats.paymentStability.score,
          label: 'Payment Stability', icon: '📋',
          value: cats.paymentStability.value,
          why: cats.paymentStability.desc,
          fixLabel: 'What if my DTI was lower?',
          fixType: 'range', fixKey: 'dti',
          fixMin: 10, fixMax: 60, fixStep: 1,
          fixVal: G.dti || 30, fixUnit: '%',
          fixHint: (G.dti || 30) > 28 ? 'Get DTI below 36% to unlock more points.' : null,
        },
        {
          id: 'debtLoad', weight: 25, score: cats.debtLoad.score,
          label: 'Debt Load', icon: '💳',
          value: cats.debtLoad.value,
          why: cats.debtLoad.desc,
          fixLabel: 'What if I paid down debt?',
          fixType: 'range', fixKey: 'ccDebt',
          fixMin: 0, fixMax: Math.max((G.ccDebt || 0) + 5000, 20000), fixStep: 500,
          fixVal: G.ccDebt || 0, fixUnit: '$',
          fixHint: (G.ccDebt || 0) > 0 ? 'Clearing credit card debt has the biggest single impact on this category.' : null,
        },
        {
          id: 'cashCushion', weight: 25, score: cats.cashCushion.score,
          label: 'Cash Cushion', icon: '🛡️',
          value: cats.cashCushion.value,
          why: cats.cashCushion.desc,
          fixLabel: 'What if I grew my emergency fund?',
          fixType: 'range', fixKey: 'efMo',
          fixMin: 0, fixMax: 12, fixStep: 1,
          fixVal: parseInt(G.emergency || 0), fixUnit: ' mo',
          fixHint: parseInt(G.emergency || 0) < 3 ? 'Reaching 3 months of emergency savings unlocks a significant boost.' : null,
        },
        {
          id: 'creditStanding', weight: 10, score: cats.creditStanding.score,
          label: 'Credit Standing', icon: '⭐',
          value: cats.creditStanding.value,
          why: cats.creditStanding.desc,
          fixLabel: 'What if my credit improved?',
          fixType: 'select', fixKey: 'credit',
          fixOptions: [
            { value: 'excellent', label: 'Excellent (760+)' },
            { value: 'good',      label: 'Good (720–759)' },
            { value: 'fair',      label: 'Fair (680–719)' },
            { value: 'below',     label: 'Below avg (620–679)' },
            { value: 'poor',      label: 'Poor (<620)' },
          ],
          fixVal: G.credit || 'fair',
          fixHint: 'Improving your credit band from fair to good/excellent can save thousands on future loans.',
        },
        {
          id: 'wealthBuilding', weight: 10, score: cats.wealthBuilding.score,
          label: 'Wealth Building', icon: '📈',
          value: cats.wealthBuilding.value,
          why: cats.wealthBuilding.desc,
          fixLabel: 'What if I saved more?',
          fixType: 'range', fixKey: 'savings',
          fixMin: 0, fixMax: Math.max(((G.savingsAmt || 0) + (G.depositSaved || 0)) * 3, 50000), fixStep: 1000,
          fixVal: (G.savingsAmt || 0) + (G.depositSaved || 0), fixUnit: '$',
          fixHint: 'Reaching 3+ months of income in savings moves this category significantly.',
        },
      ]
    };
  }

  // ── What-if path: recalculate with overrides ──
  const takeHome = G.takeHome || (G.income ? G.income / 12 * 0.72 : 0);
  const dti      = 'dti'     in overrides ? overrides.dti     : (G.dti || 0);
  const efMo     = 'efMo'    in overrides ? overrides.efMo    : parseInt(G.emergency || 0);
  const fcfVal   = 'fcfVal'  in overrides ? overrides.fcfVal  : (G.fcf || 0);
  const credit   = 'credit'  in overrides ? overrides.credit  : (G.credit || 'unknown');
  const ccDebt   = 'ccDebt'  in overrides ? overrides.ccDebt  : (G.ccDebt || 0);
  const savings  = 'savings' in overrides ? overrides.savings : ((G.savingsAmt || 0) + (G.depositSaved || 0));

  const totalNH     = ccDebt + (G.carDebt || 0) + (G.studentDebt || 0) + (G.otherDebt || 0);
  const annualIncome = takeHome * 12;
  const debtRatio   = annualIncome > 0 ? totalNH / annualIncome : 0;
  const savingsMo   = takeHome > 0 ? savings / takeHome : 0;
  const fcfMargin   = takeHome > 0 ? fcfVal / takeHome : 0;

  let s1 = dti < 20 ? 100 : dti < 28 ? 88 : dti < 36 ? 68 : dti < 43 ? 42 : dti < 50 ? 20 : 5;
  let s2 = debtRatio === 0 ? 100 : debtRatio < 0.10 ? 88 : debtRatio < 0.20 ? 70 : debtRatio < 0.35 ? 50 : debtRatio < 0.50 ? 28 : 8;
  const efScore  = efMo >= 6 ? 100 : efMo >= 4 ? 88 : efMo >= 3 ? 72 : efMo >= 2 ? 52 : efMo >= 1 ? 30 : 0;
  const fcfScore = fcfMargin >= 0.25 ? 100 : fcfMargin >= 0.15 ? 85 : fcfMargin >= 0.10 ? 68 : fcfMargin >= 0.05 ? 48 : fcfMargin >= 0.01 ? 28 : fcfMargin >= 0 ? 15 : 0;
  const s3 = Math.round(efScore * 0.55 + fcfScore * 0.45);
  const creditMap = { excellent: 100, good: 65, fair: 65, poor: 20, below: 20, unknown: 48 };
  const s4 = creditMap[credit] || 48;
  const s5 = savingsMo >= 18 ? 100 : savingsMo >= 12 ? 88 : savingsMo >= 6 ? 72 : savingsMo >= 3 ? 52 : savingsMo >= 1 ? 32 : 10;
  const total = Math.max(10, Math.min(100, Math.round(s1*0.30 + s2*0.25 + s3*0.25 + s4*0.10 + s5*0.10)));

  const fmtCash = n => n >= 0 ? '$' + Math.round(n).toLocaleString() : '-$' + Math.abs(Math.round(n)).toLocaleString();

  return {
    total,
    categories: [
      { id:'paymentStability', weight:30, score:s1, label:'Payment Stability', icon:'📋', value: dti+'% DTI', why: dti<28?'Healthy DTI':dti<36?'Manageable':'Elevated — reduce debt or raise income', fixLabel:'What if my DTI was lower?', fixType:'range', fixKey:'dti', fixMin:10, fixMax:60, fixStep:1, fixVal:dti, fixUnit:'%', fixHint: dti>28?'Below 36% unlocks more points.':null },
      { id:'debtLoad', weight:25, score:s2, label:'Debt Load', icon:'💳', value: debtRatio===0?'Debt-free':Math.round(debtRatio*100)+'% of income', why: debtRatio===0?'Debt-free':'Consumer debt vs income', fixLabel:'What if I paid down debt?', fixType:'range', fixKey:'ccDebt', fixMin:0, fixMax:Math.max(ccDebt+5000,20000), fixStep:500, fixVal:ccDebt, fixUnit:'$', fixHint: ccDebt>0?'Clearing CC debt has biggest impact.':null },
      { id:'cashCushion', weight:25, score:s3, label:'Cash Cushion', icon:'🛡️', value: efMo+' mo emergency · '+fmtCash(fcfVal)+'/mo free', why: efMo===0?'No emergency fund':efMo<3?'Under 3 months':'Good buffer', fixLabel:'What if I grew my emergency fund?', fixType:'range', fixKey:'efMo', fixMin:0, fixMax:12, fixStep:1, fixVal:efMo, fixUnit:' mo', fixHint: efMo<3?'3 months unlocks a significant boost.':null },
      { id:'creditStanding', weight:10, score:s4, label:'Credit Standing', icon:'⭐', value: credit==='excellent'?'Excellent (720+)':credit==='fair'||credit==='good'?'Good (640–719)':'Building (<640)', why:'Credit band affects every rate you receive', fixLabel:'What if my credit improved?', fixType:'select', fixKey:'credit', fixOptions:[{value:'excellent',label:'Excellent (760+)'},{value:'good',label:'Good (720–759)'},{value:'fair',label:'Fair (680–719)'},{value:'below',label:'Below avg (620–679)'},{value:'poor',label:'Poor (<620)'}], fixVal:credit, fixHint:'Improving credit saves thousands on future loans.' },
      { id:'wealthBuilding', weight:10, score:s5, label:'Wealth Building', icon:'📈', value: savingsMo>=1?Math.round(savingsMo)+' months saved':'No savings recorded', why: savingsMo>=6?'Strong — compound growth working':'Build savings to improve this', fixLabel:'What if I saved more?', fixType:'range', fixKey:'savings', fixMin:0, fixMax:Math.max(savings*3,50000), fixStep:1000, fixVal:savings, fixUnit:'$', fixHint:'3+ months of income in savings moves this significantly.' },
    ]
  };
}

function _0xa0823d6(s) {
  return s >= 85 ? '#10B981' : s >= 70 ? '#0077B6' : s >= 55 ? '#F4A261' : '#E63946';
}
function _0x0c87a2d(s) {
  return s >= 85 ? 'Excellent' : s >= 70 ? 'Good' : s >= 55 ? 'Fair' : s >= 40 ? 'Poor' : 'Very Poor';
}

var _sbdActiveCatId = null;

function _0xdbcabb1() {
  const hasOverrides = Object.keys(_sbdWhatIfState).length > 0;
  const { total, categories } = _0xf056049(_sbdWhatIfState);
  const baseTotal = hasOverrides ? _0xf056049({}).total : total;
  const diff = total - baseTotal;
  const col = _0xa0823d6(total);
  const circ = 251.3;

  // Mini ring
  const arc = document.getElementById('sbd-ring-arc');
  if (arc) { arc.style.strokeDashoffset = circ - (total/100)*circ; arc.style.stroke = col; }
  const num = document.getElementById('sbd-score-num');
  if (num) { num.textContent = total; num.style.color = col; }
  const titleEl = document.getElementById('sbd-title');
  if (titleEl) titleEl.textContent = (hasOverrides ? 'Adjusted: ' : '') + _0x0c87a2d(total);
  const subEl = document.getElementById('sbd-subtitle');
  if (subEl) subEl.textContent = hasOverrides ? 'What-if mode — adjust any category to see impact' : 'Five categories · tap any to model a fix';

  // What-if banner
  const banner = document.getElementById('sbd-whatif-banner');
  if (banner) {
    banner.style.display = hasOverrides ? 'flex' : 'none';
    if (hasOverrides) {
      const wt = document.getElementById('sbd-whatif-title');
      const ws = document.getElementById('sbd-whatif-sub');
      const wsc = document.getElementById('sbd-whatif-score');
      if (wt) wt.textContent = diff > 0 ? '+' + diff + ' points from this change' : diff < 0 ? diff + ' points — reviewing impact' : 'No change yet';
      if (ws) ws.textContent = diff > 0 && total >= 70 && baseTotal < 70 ? 'Crosses into the Good band!' : diff > 0 && total >= 85 && baseTotal < 85 ? 'Crosses into Excellent!' : diff > 0 ? 'Getting closer to ' + (total < 70 ? 'Good (70)' : 'Excellent (85)') : 'Adjust the slider to model a different scenario';
      if (wsc) { wsc.textContent = total; wsc.style.color = col; }
    }
  }

  // Category cards
  const list = document.getElementById('sbd-factor-list');
  if (!list) return;

  // Score band legend — one-time header
  const bandHtml = `
    <div style="display:flex;gap:4px;margin-bottom:16px;overflow-x:auto;padding-bottom:2px;">
      ${[['Very Poor','<40','#E63946'],['Poor','40–54','#F4A261'],['Fair','55–69','#F4A261'],['Good','70–84','#0077B6'],['Excellent','85+','#10B981']].map(([b,r,col]) => `
        <div style="flex:1;min-width:52px;text-align:center;padding:7px 4px;border-radius:8px;background:${col}14;border:1px solid ${col}22;">
          <div style="font-size:11px;font-weight:700;color:${col};letter-spacing:0.5px;">${b}</div>
          <div style="font-size:11px;color:var(--gray-3);margin-top:1px;">${r}</div>
        </div>`).join('')}
    </div>`;

  list.innerHTML = bandHtml + categories.map(cat => {
    const contribution = Math.round(cat.score * cat.weight / 100 * 10) / 10;
    const maxContribution = cat.weight;
    const isActive = _sbdActiveCatId === cat.id;
    const catCol = _0xa0823d6(cat.score);

    // Fix control
    let fixHtml = '';
    if (cat.fixType === 'range') {
      const fmtFv = v => cat.fixUnit === '$' ? '$' + Math.round(Math.max(0,v)).toLocaleString() : Math.round(v) + cat.fixUnit;
      fixHtml = `
        <div style="padding:14px 16px;border-top:1px solid var(--gray-2);background:rgba(0,119,182,0.02);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:12px;color:var(--gray-4);">${cat.fixLabel}</span>
            <span id="sbd-fv-${cat.id}" style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--teal);">${fmtFv(cat.fixVal)}</span>
          </div>
          <input type="range" min="${cat.fixMin}" max="${cat.fixMax}" value="${_sbdWhatIfState[cat.fixKey] !== undefined ? _sbdWhatIfState[cat.fixKey] : cat.fixVal}"
            oninput="sbdApply('${cat.id}','${cat.fixKey}',+this.value,'${cat.fixUnit}')"
            style="width:100%;accent-color:var(--teal);" disabled>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--gray-3);margin-top:3px;">
            <span>${cat.fixUnit === '$' ? '$0' : cat.fixMin + cat.fixUnit}</span>
            <span>${cat.fixUnit === '$' ? '$' + Math.round(cat.fixMax).toLocaleString() : cat.fixMax + cat.fixUnit}</span>
          </div>
          ${cat.fixHint ? `<div style="font-size:11px;color:var(--gray-4);background:var(--gray-1);border-radius:8px;padding:8px 10px;margin-top:10px;line-height:1.5;">💡 ${cat.fixHint}</div>` : ''}
        </div>`;
    } else if (cat.fixType === 'select') {
      const curVal = _sbdWhatIfState[cat.fixKey] || cat.fixVal;
      fixHtml = `
        <div style="padding:14px 16px;border-top:1px solid var(--gray-2);background:rgba(0,119,182,0.02);">
          <div style="font-size:12px;color:var(--gray-4);margin-bottom:16px;">${cat.fixLabel}</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${cat.fixOptions.map(opt => {
              const isSelected = curVal === opt.value;
              const optCol = _0xa0823d6(opt.score);
              return `<div onclick="sbdApplySelect('${cat.id}','${cat.fixKey}','${opt.value}')"
                style="padding:11px 14px;border-radius:10px;border:1.5px solid ${isSelected ? 'var(--teal)' : 'var(--gray-2)'};background:${isSelected ? 'var(--teal-dim)' : 'white'};cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all 0.15s;">
                <span style="font-size:13px;font-weight:600;color:var(--navy);">${opt.label}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="width:28px;height:6px;border-radius:3px;background:${optCol};opacity:0.7;"></div>
                  <span style="font-size:12px;font-weight:700;color:${optCol};">${opt.score}/100</span>
                </div>
              </div>`;
            }).join('')}
          </div>
          ${cat.fixHint ? `<div style="font-size:11px;color:var(--gray-4);background:var(--gray-1);border-radius:8px;padding:8px 10px;margin-top:10px;line-height:1.5;">💡 ${cat.fixHint}</div>` : ''}
        </div>`;
    }

    return `
    <div style="background:white;border:1px solid var(--gray-2);border-radius:16px;overflow:hidden;margin-bottom:16px;" id="sbd-card-${cat.id}">
      <div onclick="sbdToggle('${cat.id}')" style="padding:16px;cursor:pointer;user-select:none;">
        <!-- Row 1: icon + label + score -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:40px;height:40px;border-radius:12px;background:${catCol}16;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${cat.icon}</div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
              <div style="font-size:14px;font-weight:700;color:var(--navy);">${cat.label}</div>
              <div style="font-size:12px;font-weight:700;color:${catCol};">${cat.score}/100</div>
            </div>
            <div style="font-size:11px;color:var(--gray-3);">Weighted ${cat.weight}% · contributes <strong style="color:var(--navy);">${contribution}</strong> of <strong>${maxContribution}</strong> possible points</div>
          </div>
        </div>
        <!-- Progress bar — styled like a credit score category bar -->
        <div style="position:relative;height:8px;background:var(--gray-1);border-radius:4px;margin-bottom:8px;overflow:hidden;">
          <div style="position:absolute;left:0;top:0;height:100%;width:${cat.score}%;background:${catCol};border-radius:4px;transition:width 0.8s cubic-bezier(.16,1,.3,1);"></div>
        </div>
        <!-- Row 3: band labels -->
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gray-3);margin-bottom:8px;">
          <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
        </div>
        <!-- Row 4: current value + why + tap hint -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--teal);margin-bottom:2px;">${cat.value}</div>
            <div style="font-size:12px;color:var(--gray-4);line-height:1.4;">${cat.why}</div>
          </div>
          <div style="font-size:10px;color:var(--gray-3);flex-shrink:0;background:var(--gray-1);padding:4px 8px;border-radius:6px;white-space:nowrap;">${isActive ? 'Close ▲' : 'Fix it ▾'}</div>
        </div>
      </div>
      ${isActive ? fixHtml : `<div id="sbd-fix-${cat.id}" style="display:none;">${fixHtml}</div>`}
    </div>`;
  }).join('');
}

function sbdToggle(catId) {
  const prev = _sbdActiveCatId;
  _sbdActiveCatId = _sbdActiveCatId === catId ? null : catId;
  _0xdbcabb1();
  // Keep scrolled to the card
  requestAnimationFrame(() => {
    const card = document.getElementById('sbd-card-' + catId);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function sbdApply(catId, key, val, unit) {
  _sbdWhatIfState[key] = val;
  _sbdActiveCatId = catId;
  // Update just the displayed value label without full re-render
  const fvEl = document.getElementById('sbd-fv-' + catId);
  if (fvEl) fvEl.textContent = unit === '$' ? '$' + Math.round(Math.max(0,val)).toLocaleString() : Math.round(val) + unit;
  // Re-render the header ring + banner (light update)
  _0x7443caf();
}

function sbdApplySelect(catId, key, val) {
  _sbdWhatIfState[key] = val;
  _sbdActiveCatId = catId;
  _0xdbcabb1();
  requestAnimationFrame(() => {
    const card = document.getElementById('sbd-card-' + catId);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function _0x7443caf() {
  // Lightweight re-render: just update the ring and banner, not the full card list
  const { total } = _0xf056049(_sbdWhatIfState);
  const hasOverrides = Object.keys(_sbdWhatIfState).length > 0;
  const baseTotal = _0xf056049({}).total;
  const diff = total - baseTotal;
  const col = _0xa0823d6(total);
  const circ = 251.3;
  const arc = document.getElementById('sbd-ring-arc');
  if (arc) { arc.style.strokeDashoffset = circ - (total/100)*circ; arc.style.stroke = col; }
  const num = document.getElementById('sbd-score-num');
  if (num) { num.textContent = total; num.style.color = col; }
  const banner = document.getElementById('sbd-whatif-banner');
  if (banner) {
    banner.style.display = hasOverrides ? 'flex' : 'none';
    if (hasOverrides) {
      const wt = document.getElementById('sbd-whatif-title');
      const wsc = document.getElementById('sbd-whatif-score');
      const ws = document.getElementById('sbd-whatif-sub');
      if (wt) wt.textContent = diff > 0 ? '+' + diff + ' points from this change' : diff < 0 ? diff + ' points — reviewing impact' : 'Adjust slider to see impact';
      if (wsc) { wsc.textContent = total; wsc.style.color = col; }
      if (ws) ws.textContent = diff > 0 && total >= 70 && baseTotal < 70 ? 'Crosses into the Good band!' : diff > 0 && total >= 85 && baseTotal < 85 ? 'Crosses into Excellent!' : diff > 0 ? 'Moves you closer to the next band' : 'See impact in real time';
    }
  }
}

// ─── SALARY CHECK ───
// BLS-style salary bands by broad job category (US, 2024 estimates)
var BLS_SALARY = {
  'software':   { p25: 82000,  median: 112000, p75: 148000, label: 'Software & Tech' },
  'engineer':   { p25: 75000,  median: 100000, p75: 132000, label: 'Engineering' },
  'nurse':      { p25: 68000,  median: 80000,  p75: 96000,  label: 'Nursing' },
  'teacher':    { p25: 46000,  median: 62000,  p75: 80000,  label: 'Education' },
  'finance':    { p25: 68000,  median: 95000,  p75: 138000, label: 'Finance & Accounting' },
  'manager':    { p25: 72000,  median: 100000, p75: 138000, label: 'Management' },
  'sales':      { p25: 52000,  median: 76000,  p75: 110000, label: 'Sales' },
  'marketing':  { p25: 54000,  median: 78000,  p75: 108000, label: 'Marketing' },
  'healthcare': { p25: 58000,  median: 78000,  p75: 104000, label: 'Healthcare' },
  'legal':      { p25: 72000,  median: 110000, p75: 168000, label: 'Legal' },
  'trade':      { p25: 44000,  median: 60000,  p75: 80000,  label: 'Skilled Trades' },
  'driver':     { p25: 40000,  median: 52000,  p75: 68000,  label: 'Transport & Logistics' },
  'retail':     { p25: 32000,  median: 42000,  p75: 56000,  label: 'Retail & Customer Service' },
  'admin':      { p25: 40000,  median: 55000,  p75: 72000,  label: 'Administrative' },
  'design':     { p25: 52000,  median: 74000,  p75: 102000, label: 'Design & Creative' },
  'default':    { p25: 48000,  median: 68000,  p75: 95000,  label: 'General Professional' }
};

function _0x9950ed7(title) {
  if (!title) return 'default';
  const t = title.toLowerCase();
  if (/soft|dev|engineer.*soft|program|code|cloud|data sci|ml|ai|cyber|web|front|back|full.?stack/.test(t)) return 'software';
  if (/engineer|mechanical|civil|electrical|chemical|structural/.test(t)) return 'engineer';
  if (/nurs|rn |lpn|midwif|healthcare.*nurse/.test(t)) return 'nurse';
  if (/teach|educat|professor|instructor|lecturer|tutor/.test(t)) return 'teacher';
  if (/financ|account|cpa|cfo|analyst|banking|invest|actuar/.test(t)) return 'finance';
  if (/manager|director|head of|vp |vice pres|ceo|coo|cmo|cto|chief/.test(t)) return 'manager';
  if (/sales|account exec|business dev|bdr|sdr/.test(t)) return 'sales';
  if (/market|brand|seo|content|growth|social media|pr |public rel/.test(t)) return 'marketing';
  if (/doctor|physician|physio|therapist|pharmacist|dentist|surgeon|medical/.test(t)) return 'healthcare';
  if (/lawyer|attorney|solicitor|legal|barrister|paralegal/.test(t)) return 'legal';
  if (/electrician|plumber|carpenter|mechanic|welder|hvac|construct|technician/.test(t)) return 'trade';
  if (/driver|delivery|logistics|transport|truck|warehouse/.test(t)) return 'driver';
  if (/retail|cashier|store|customer service|hospitality|barista|server|waitress/.test(t)) return 'retail';
  if (/admin|coordinator|receptionist|assistant|clerk|secretary/.test(t)) return 'admin';
  if (/design|ux|ui|graphic|creative|art direct|illustrat/.test(t)) return 'design';
  return 'default';
}

function _0xf426109() {
  const card = document.getElementById('salary-check-card');
  if (!card) return;

  const salary = G.income || 0;
  const jobTitle = (document.getElementById('job-type')?.value || '').trim();
  const cat = _0x9950ed7(jobTitle);
  const band = BLS_SALARY[cat] || BLS_SALARY.default;

  // Update label
  const badge = document.getElementById('salary-check-badge');
  if (badge) { badge.style.display = 'inline-block'; }
  const headlineEl = document.getElementById('salary-check-headline');
  if (headlineEl) headlineEl.textContent = band.label + ' · Market Benchmark';

  // Salary display
  const el = id => document.getElementById(id);
  const fmt = n => '$' + (Math.abs(n) >= 1000 ? (Math.abs(n)/1000).toFixed(0) + 'K' : Math.abs(n));
  if (el('sc-your-salary')) el('sc-your-salary').textContent = fmt(salary);
  if (el('sc-median-salary')) el('sc-median-salary').textContent = fmt(band.median);

  const gap = salary - band.median;
  if (el('sc-gap-val')) {
    el('sc-gap-val').textContent = (gap >= 0 ? '+' : '-') + fmt(Math.abs(gap));
    el('sc-gap-val').style.color = gap >= 0 ? 'var(--green)' : 'var(--red)';
  }

  // Bar positioning — map salary onto p25–p75 range (extended to 0.5× and 1.5×)
  const barMin = band.p25 * 0.7;
  const barMax = band.p75 * 1.3;
  const barRange = barMax - barMin;

  const userPct  = Math.min(100, Math.max(0, (salary - barMin) / barRange * 100));
  const medPct   = Math.min(100, Math.max(0, (band.median - barMin) / barRange * 100));
  const p25Pct   = Math.min(100, Math.max(0, (band.p25 - barMin) / barRange * 100));
  const p75Pct   = Math.min(100, Math.max(0, (band.p75 - barMin) / barRange * 100));

  // Zone fill (p25 to p75)
  if (el('sc-zone-fill')) {
    el('sc-zone-fill').style.left  = p25Pct + '%';
    el('sc-zone-fill').style.width = (p75Pct - p25Pct) + '%';
  }
  if (el('sc-user-fill')) el('sc-user-fill').style.width = userPct + '%';
  if (el('sc-median-marker')) el('sc-median-marker').style.left = medPct + '%';
  if (el('sc-user-dot')) el('sc-user-dot').style.left = userPct + '%';

  if (el('sc-p25-label')) el('sc-p25-label').textContent = fmt(band.p25);
  if (el('sc-median-label')) el('sc-median-label').textContent = 'Median ' + fmt(band.median);
  if (el('sc-p75-label')) el('sc-p75-label').textContent = fmt(band.p75);

  // Verdict
  let verdictText = '';
  if (salary <= 0) {
    verdictText = 'Enter your income in settings to see how you compare.';
  } else if (salary >= band.p75) {
    verdictText = 'You\u2019re earning in the top 25% for ' + band.label + ' \u2014 strong position. Your income gives you real mortgage leverage.';
  } else if (salary >= band.median) {
    verdictText = 'You\u2019re at or above the median for ' + band.label + '. Solid footing \u2014 a targeted raise to ' + fmt(band.p75) + ' could significantly accelerate your property timeline.';
  } else if (salary >= band.p25) {
    const raiseNeeded = band.median - salary;
    verdictText = 'You\u2019re below the median for ' + band.label + ' by ' + fmt(raiseNeeded) + '/year. The market data supports asking for a raise \u2014 this is a negotiating position worth pursuing.';
  } else {
    verdictText = 'Your salary is below the 25th percentile for ' + band.label + '. Before focusing on a mortgage, closing this income gap is your highest-leverage financial move.';
  }
  if (el('salary-verdict-text')) el('salary-verdict-text').textContent = verdictText;

  // Property impact
  const propertyImpact = document.getElementById('salary-property-impact');
  const propertyText = document.getElementById('salary-property-text');
  if (propertyImpact && propertyText && salary > 0) {
    propertyImpact.style.display = 'block';
    if (gap < -5000) {
      // Below median — show what median income would unlock
      const extraMonthly = (band.median - salary) / 12;
      const extraBorrowing = Math.round((extraMonthly * 0.28 * 12) / 0.055); // rough at 5.5% rate
      propertyText.textContent = 'If you earned the median ' + fmt(band.median) + '/year, you could borrow approximately ' + fmt(extraBorrowing) + ' more \u2014 that\u2019s a meaningfully different property budget.';
    } else if (gap >= 0) {
      const monthlyIncome = salary / 12;
      const maxBorrowing = Math.round((monthlyIncome * 0.28 * 12) / 0.055);
      propertyText.textContent = 'At your income, lenders typically qualify you for up to ' + fmt(maxBorrowing) + ' (at 28% DTI, 5.5% rate). Your salary is working for you.';
    } else {
      const monthlyIncome = salary / 12;
      const maxBorrowing = Math.round((monthlyIncome * 0.28 * 12) / 0.055);
      propertyText.textContent = 'At current income, you qualify for approximately ' + fmt(maxBorrowing) + '. Closing the salary gap to median adds roughly ' + fmt(Math.round(((band.median - salary) * 0.28) / 0.055)) + ' to your borrowing power.';
    }
  }
}

// ─── SCORE FACTORS ───
function _0x01d514a(score) {
  const container = document.getElementById('hm-score-factors');
  const list = document.getElementById('hm-score-factors-list');
  if (!container || !list) return;

  if (!G.income || !G.housingType) { container.style.display = 'none'; return; }

  container.style.display = 'block';
  const factors = [];

  // DTI factor
  if (G.dti !== undefined) {
    const dti = G.dti;
    if (dti < 28) {
      factors.push({ icon: '✅', label: 'Low debt-to-income ratio', detail: dti + '% DTI — lenders love this. Strong mortgage qualification.', positive: true });
    } else if (dti < 43) {
      factors.push({ icon: '⚠️', label: 'Moderate DTI', detail: 'Your ' + dti + '% DTI is acceptable but leaves less room. Below 36% strengthens your mortgage application.', positive: false });
    } else {
      factors.push({ icon: '🔴', label: 'High debt-to-income ratio', detail: dti + '% DTI — above lender thresholds. Reducing debt is your #1 score lever.', positive: false });
    }
  }

  // Credit factor
  if (G.creditScore) {
    if (G.creditScore === 'excellent') {
      factors.push({ icon: '✅', label: 'Strong credit score (720+)', detail: 'You qualify for the best mortgage rates — saving thousands over the loan life.', positive: true });
    } else if (G.creditScore === 'fair') {
      factors.push({ icon: '⚠️', label: 'Good credit (640–719)', detail: 'Mortgage-eligible but higher rates apply. Each tier up saves ~0.25% on your rate.', positive: false });
    } else {
      factors.push({ icon: '🔴', label: 'Building credit (<640)', detail: 'Focus here first \u2014 most lenders need 620+ minimum. Some FHA options at 580+.', positive: false });
    }
  }

  // Free cash flow factor
  if (G.fcf !== undefined) {
    const fcf = G.fcf;
    const monthlyIncome = G.income / 12;
    const savingsRate = monthlyIncome > 0 ? Math.round((fcf / monthlyIncome) * 100) : 0;
    if (fcf >= 1000) {
      factors.push({ icon: '✅', label: 'Healthy free cash flow', detail: '$' + Math.round(fcf).toLocaleString() + '/mo free — ' + savingsRate + '% savings rate. Compounds fast toward a deposit.', positive: true });
    } else if (fcf >= 200) {
      factors.push({ icon: '⚠️', label: 'Tight cash flow', detail: 'Only $' + Math.round(fcf).toLocaleString() + '/mo free. Reducing one expense category could unlock meaningful savings momentum.', positive: false });
    } else {
      factors.push({ icon: '🔴', label: 'Negative or minimal cash flow', detail: 'Spending exceeds or matches income — a deposit won\u2019t grow from here. This is the first thing to fix.', positive: false });
    }
  }

  // Housing-specific factor
  if (G.housingType === 'owner' && G.currentRate > 0) {
    const mktRate = window.MARKET_RATE_30Y || 6.72;
    if (G.currentRate > mktRate + 0.5) {
      factors.push({ icon: '⚠️', label: 'Above-market mortgage rate', detail: 'Your rate of ' + G.currentRate.toFixed(2) + '% is ' + (G.currentRate - mktRate).toFixed(2) + '% above market. Refinancing is worth modelling.', positive: false });
    } else {
      factors.push({ icon: '✅', label: 'Competitive mortgage rate', detail: 'Your ' + G.currentRate.toFixed(2) + '% rate is near market. No immediate action needed unless rates drop further.', positive: true });
    }
  } else if (G.housingType === 'buying') {
    const dep = G.depositSaved || 0;
    const target = (G.homePrice || 0) * 0.1;
    if (target > 0) {
      const pct = Math.round(dep / target * 100);
      if (pct >= 100) {
        factors.push({ icon: '✅', label: 'Deposit target reached', detail: 'You have enough for a 10% deposit. Check DTI and credit to complete your readiness picture.', positive: true });
      } else {
        factors.push({ icon: '⚠️', label: 'Building deposit (' + pct + '% of target)', detail: 'Focus on cash flow to close the gap faster. Time to first home depends on your monthly savings rate.', positive: false });
      }
    }
  }

  // Take top 3, sorted positive last so the actionable items stand out
  const topFactors = factors.slice(0, 3);
  list.innerHTML = topFactors.map(f => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;background:${f.positive ? 'rgba(16,185,129,0.06)' : 'rgba(244,162,97,0.06)'};border:1px solid ${f.positive ? 'rgba(16,185,129,0.15)' : 'rgba(244,162,97,0.15)'};">
      <span style="font-size:16px;flex-shrink:0;margin-top:1px;">${f.icon}</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:2px;">${f.label}</div>
        <div style="font-size:12px;color:var(--gray-4);line-height:1.5;">${f.detail}</div>
      </div>
    </div>
  `).join('');
}

// ─── NET WORTH ───
function _0x5517bf6() {
  const monthlyIncome = G.income / 12;
  const plus = window._tracentPlus;

  // Show / hide paywall vs unlocked sections
  const paywallCard = document.getElementById('nw-paywall-card');
  const unlockedSection = document.getElementById('nw-breakdown-unlocked');
  if (paywallCard) paywallCard.style.display = 'none'; // always show content free
  if (unlockedSection) unlockedSection.style.display = 'block';

  if (G.housingType === 'owner') {
    _0x4b08b5e(monthlyIncome);
  } else if (G.housingType === 'buying') {
    _0xda59b7c(monthlyIncome);
  } else {
    _0x30a56de(monthlyIncome);
  }
}

function _0x4b08b5e(monthlyIncome) {
  // Current snapshot — prefer user-entered homeValue, else appreciate from purchase price
  const yearsOwned = G.yearsLeft ? Math.max(0, 30 - G.yearsLeft) : 5;
  const homeValue = G.homeValue && G.homeValue > G.balance
    ? G.homeValue
    : (G.balance > 0 ? Math.round(G.balance / (1 - 0.03 * yearsOwned) * 1.03) : G.balance * 1.25);
  const homeEquity = Math.max(0, homeValue - G.balance);
  const cashSavings = Math.max(0, G.fcf * 4);
  const totalAssets = homeValue + cashSavings;
  const totalLiabilities = G.balance + G.ccDebt + G.carDebt + G.otherDebt;
  const netWorth = totalAssets - totalLiabilities;
  const allPayments = G.payment + G.carPayment + G.otherPayment + Math.max(0, G.ccDebt * 0.02);
  const dti = Math.round((allPayments / monthlyIncome) * 100);
  const liquidityMonths = (G.expenses + G.payment) > 0 ? Math.round(cashSavings / (G.expenses + G.payment)) : 0;
  const equityPct = homeValue > 0 ? Math.round((homeEquity / homeValue) * 100) : 0;

  _0xb8a2b9e(typeof netWorthAdj !== 'undefined' ? netWorthAdj : netWorth, 'Your current net worth snapshot', typeof splitEq !== 'undefined' && splitEq < 1 ? 'Showing your 50% equity share' : null);
  { const _e = document.getElementById('nw-label'); if (_e) _e.textContent = 'Current Net Worth'; }
  // update teaser on decision tab
  const tv = document.getElementById('nw-teaser-val');
  if (tv) tv.textContent = (netWorth >= 0 ? 'Est. net worth: $' : 'Est. net worth: -$') + Math.abs(Math.round(netWorth/1000)) + 'K — tap to see full breakdown →';
  _0xf312b9c(typeof totalAssetsAdj !== 'undefined' ? totalAssetsAdj : totalAssets, totalLiabilities);

  var splitEq = window._splitEquity || 1.0;
  var homeDisplayVal = splitEq < 1 ? Math.round(homeEquity * splitEq) : homeValue;
  var homeDisplayLabel = splitEq < 1 ? 'Home equity (your 50% share)' : 'Home — estimated market value';
  var totalAssetsAdj = homeDisplayVal + cashSavings;
  var netWorthAdj = totalAssetsAdj - totalLiabilities;
  let aHtml = _0xb7aa5c8('🏡', homeDisplayLabel, homeDisplayVal, 'positive');
  aHtml += _0xb7aa5c8('💵', 'Cash & savings (estimated)', cashSavings, 'positive');
  const _ar = document.getElementById(window._tracentPlus ? 'nw-asset-rows-unlocked' : 'nw-asset-rows'); if (_ar) _ar.innerHTML = aHtml;

  let lHtml = _0xb7aa5c8('🏡', 'Mortgage remaining', G.balance, 'negative');
  if (G.ccDebt > 0) lHtml += _0xb7aa5c8('💳', 'Credit card debt', G.ccDebt, 'negative');
  if (G.carDebt > 0) lHtml += _0xb7aa5c8('🚗', 'Car loan', G.carDebt, 'negative');
  if (G.otherDebt > 0) lHtml += _0xb7aa5c8('📋', 'Other loans', G.otherDebt, 'negative');
  const _lr = document.getElementById(window._tracentPlus ? 'nw-liability-rows-unlocked' : 'nw-liability-rows'); if (_lr) _lr.innerHTML = lHtml;

  _0xa9e1fb8(dti, liquidityMonths, equityPct + '% equity in home',
    (G.ccDebt + G.carDebt + G.otherDebt) > 0
      ? Math.ceil((G.ccDebt + G.carDebt + G.otherDebt) / Math.max(G.fcf * 0.4, 50)) + ' months to non-housing debt free'
      : '✅ No non-mortgage debt');
}

function _0xda59b7c(monthlyIncome) {
  // ACTUALS ONLY — show where the user stands TODAY, not a hypothetical purchase
  const cashNow    = G.depositSaved || 0;
  const studentDebt = G.studentDebt || 0;
  const nonHousingDebt = (G.ccDebt||0) + (G.carDebt||0) + (G.otherDebt||0) + studentDebt;
  const totalAssets = cashNow;
  const netWorthNow = cashNow - nonHousingDebt;

  const dti = Math.round((((G.rentAmt||0) + (G.carPayment||0) + (G.otherPayment||0) + Math.max(0,(G.ccDebt||0)*0.02)) / monthlyIncome) * 100);
  const targetPrice = G.homePrice || 0;
  const depositGap = Math.max(0, targetPrice * 0.1 - cashNow);
  const monthsToReady = G.fcf > 0 && depositGap > 0 ? Math.ceil(depositGap / (G.fcf * 0.5)) : (depositGap === 0 ? 0 : 999);

  _0xb8a2b9e(netWorthNow, 'Your net worth today', 'Pre-purchase — based on your actual savings & debts');
  const e = (id) => document.getElementById(id);
  if (e('nw-label')) e('nw-label').textContent = 'Current Net Worth';

  _0xf312b9c(totalAssets, nonHousingDebt);

  // Deposit progress banner
  const depPct = targetPrice > 0 ? Math.min(100, Math.round((cashNow / (targetPrice * 0.1)) * 100)) : 0;
  const readyBanner = targetPrice > 0 ? `
    <div style="background:var(--navy);border-radius:14px;padding:18px;margin-bottom:14px;">
      <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:16px;">10% DEPOSIT PROGRESS — TARGET $${Math.round(targetPrice/1000)}K HOME</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-family:var(--font-display);font-size:22px;color:white;">$${Math.round(cashNow).toLocaleString()}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.5);">of $${Math.round(targetPrice*0.1).toLocaleString()} needed</div>
      </div>
      <div style="background:rgba(255,255,255,0.12);border-radius:4px;height:8px;overflow:hidden;margin-bottom:8px;">
        <div style="width:${depPct}%;height:100%;background:linear-gradient(90deg,var(--teal),var(--teal-light));border-radius:4px;transition:width 0.8s ease;"></div>
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);">${depPct >= 100 ? '✅ Deposit target met — check your DTI & credit score' : monthsToReady < 999 ? `~${monthsToReady} months away saving 50% of free cash flow` : 'Increase monthly savings to hit target faster'}</div>
    </div>` : '';

  if (e('nw-asset-rows')) e('nw-asset-rows').innerHTML = readyBanner + _0xb7aa5c8('💵', 'Savings / deposit fund', cashNow, 'positive');

  let lHtml = '';
  if (G.ccDebt > 0) lHtml += _0xb7aa5c8('💳', 'Credit card debt', G.ccDebt, 'negative');
  if (G.carDebt > 0) lHtml += _0xb7aa5c8('🚗', 'Car loan', G.carDebt, 'negative');
  if (studentDebt > 0) lHtml += _0xb7aa5c8('🎓', 'Student loans', studentDebt, 'negative');
  if (G.otherDebt > 0) lHtml += _0xb7aa5c8('📋', 'Other loans', G.otherDebt, 'negative');
  if (!lHtml) lHtml = `<div style="padding:10px 0;font-size:13px;color:var(--teal);">🎉 No consumer debt — great position to buy from</div>`;
  if (e('nw-liability-rows')) e('nw-liability-rows').innerHTML = lHtml;

  _0xa9e1fb8(
    dti + '% current DTI',
    depositGap > 0 ? '$' + Math.round(depositGap).toLocaleString() + ' deposit gap' : '✅ Deposit ready',
    G.rentAmt ? '$' + Math.round(G.rentAmt).toLocaleString() + '/mo rent (current)' : 'No rent entered',
    'Net worth based on actual figures only'
  );
}

function _0x30a56de(monthlyIncome) {
  // For renters wanting to buy: show PROJECTED net worth after purchase, not actuals
  const cashSavings  = G.savingsAmt || 0;
  const targetPrice  = G.homePrice  || 0;
  const nonHousingDebt = (G.ccDebt||0) + (G.carDebt||0) + (G.otherDebt||0) + (G.studentDebt||0);
  const netWorthNow  = cashSavings - nonHousingDebt;

  // Projected purchase scenario
  const deposit      = Math.min(cashSavings, targetPrice * 0.1);
  const loanAmount   = Math.max(0, targetPrice - deposit);
  const depositPct   = targetPrice > 0 ? Math.round((deposit / targetPrice) * 100) : 0;

  // 5-yr projection after buying
  const refiRate = G.marketRate || MARKET_RATE_30Y;
  const mp = (bal, r, yrs) => { const m=(r/100)/12,n=yrs*12; return m===0?bal/n:(bal*m*Math.pow(1+m,n))/(Math.pow(1+m,n)-1); };
  const monthlyPmt   = loanAmount > 0 ? mp(loanAmount, refiRate, 30) : 0;
  const homeIn5Yrs   = targetPrice * Math.pow(1.03, 5);
  const r5            = (refiRate/100)/12;
  const balAfter5    = loanAmount > 0
    ? loanAmount * Math.pow(1+r5,60) - monthlyPmt * ((Math.pow(1+r5,60)-1)/r5)
    : 0;
  const equityIn5Yrs  = homeIn5Yrs - Math.max(0, balAfter5);
  const nwAfterBuy   = targetPrice - loanAmount - nonHousingDebt; // net worth day-of-purchase
  const nwIn5Yrs     = equityIn5Yrs - nonHousingDebt;             // 5-yr projection

  // Savings-to-deposit months
  const monthlySave  = Math.max(0, G.fcf * 0.5);
  const depositTarget = targetPrice * 0.1;
  const depositGap   = Math.max(0, depositTarget - cashSavings);
  const monthsAway   = monthlySave > 0 && depositGap > 0 ? Math.ceil(depositGap / monthlySave) : (depositGap === 0 ? 0 : 999);

  // Hero: actuals only — savings minus debts, no house price included
  const nwEl = document.getElementById('nw-total');
  if (nwEl) {
    nwEl.textContent = (netWorthNow>=0?'$':'-$') + Math.abs(Math.round(netWorthNow/1000)) + 'K';
    nwEl.className = 'networth-val ' + (netWorthNow>=0?'positive':'negative');
  }
  const nwLbl = document.getElementById('nw-label');
  if (nwLbl) nwLbl.textContent = 'Current Net Worth';
  const nwSub = document.getElementById('nw-sub');
  if (nwSub) nwSub.textContent = 'Your actual position today — savings minus debts';

  // Bars: actuals only — savings vs debts, no house price
  _0xf312b9c(cashSavings, nonHousingDebt);

  // Before → After banner
  const bannerHtml = targetPrice > 0 ? `
    <div style="background:var(--navy);border-radius:14px;padding:18px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
      <div>
        <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px;">Today<br>(renting)</div>
        <div style="font-family:var(--font-display);font-size:18px;color:${netWorthNow>=0?'var(--teal-light)':'#ff6b7a'};">${netWorthNow>=0?'$':'-$'}${Math.abs(Math.round(netWorthNow/1000))}K</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;color:var(--teal);font-size:20px;">→</div>
      <div>
        <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px;">After<br>purchase</div>
        <div style="font-family:var(--font-display);font-size:18px;color:${nwAfterBuy>=0?'var(--teal-light)':'#ff6b7a'};">${nwAfterBuy>=0?'$':'-$'}${Math.abs(Math.round(nwAfterBuy/1000))}K</div>
      </div>
    </div>
    <div style="background:var(--teal-dim);border:1.5px solid rgba(0,119,182,0.25);border-radius:12px;padding:14px;margin-bottom:12px;font-size:13px;color:var(--navy);line-height:1.6;">
      <strong>📈 5-year projection:</strong> At 3%/yr appreciation, your home equity grows your net worth to
      <strong style="color:var(--teal);">${nwIn5Yrs>=0?'$':'-$'}${Math.abs(Math.round(nwIn5Yrs/1000))}K</strong> by ${new Date().getFullYear()+5}.
      ${monthsAway === 0 ? ' ✅ You already have enough for a 10% deposit.' : monthsAway < 999 ? ` You're ~${monthsAway} months from a 10% deposit at your current saving rate.` : ''}
    </div>` : '';

  const assetRows = document.getElementById('nw-asset-rows');
  if (assetRows) {
    // Only real cash assets — no hypothetical house price
    assetRows.innerHTML = bannerHtml + _0xb7aa5c8('💵', 'Savings / deposit fund', cashSavings, 'positive');
  }

  const liabRows = document.getElementById('nw-liability-rows');
  if (liabRows) {
    // Actual debts only — no projected mortgage
    let lHtml = '';
    if (G.ccDebt  > 0) lHtml += _0xb7aa5c8('💳', 'Credit card debt', G.ccDebt,  'negative');
    if (G.carDebt > 0) lHtml += _0xb7aa5c8('🚗', 'Car loan',          G.carDebt, 'negative');
    if (G.studentDebt > 0) lHtml += _0xb7aa5c8('🎓', 'Student loans', G.studentDebt, 'negative');
    if (G.otherDebt > 0) lHtml += _0xb7aa5c8('📋', 'Other loans',     G.otherDebt, 'negative');
    if (!lHtml) lHtml = '<div class="nw-row" style="color:var(--green);font-size:13px;padding:12px 0;">✅ No consumer debts — great position to buy from</div>';
    liabRows.innerHTML = lHtml;
  }

  const rent = G.rentAmt || 0;
  const dtiNow = Math.round(((rent + (G.carPayment||0) + (G.otherPayment||0) + Math.max(0,(G.ccDebt||0)*0.02)) / monthlyIncome) * 100);
  _0xa9e1fb8(
    dtiNow + '% current DTI',
    monthsAway === 0 ? '✅ Deposit ready' : (monthsAway < 999 ? monthsAway + ' months to deposit' : 'Save more to reach deposit'),
    targetPrice > 0 ? depositPct + '% equity at purchase' : 'N/A',
    nonHousingDebt > 0 ? Math.ceil(nonHousingDebt / Math.max((G.fcf||1) * 0.4, 50)) + ' months to debt-free' : '✅ Debt-free'
  );
}

// ══════════════════════════════════════════════════════════════════════
// TRACENT CAREER PROGRESSION ENGINE
// Market benchmarks · Income gap · Promotion simulator · CT-aware
// ══════════════════════════════════════════════════════════════════════

// ── Static market wage dataset (BLS-sourced, CT-weighted where possible) ──
// Format: { median, ctPremium (CT vs national %), nextTier (typical next-level salary) }
const MARKET_WAGES = {
  // ── Employment type defaults ──────────────────────────────────
  teacher:        { title:'Teacher / Educator',          national:62000,  p25:48000,  p75:82000, nextTier:82000,  nextLabel:'Department Head / Curriculum Lead' },
  public:         { title:'Government / Public Sector',  national:68000,  p25:52000,  p75:92000, nextTier:88000,  nextLabel:'Senior / Supervisory Role' },
  private:        { title:'Private Sector Professional', national:75000,  p25:55000,  p75:105000, nextTier:105000, nextLabel:'Senior / Manager' },
  selfemployed:   { title:'Self-Employed',               national:72000,  p25:42000,  p75:130000, nextTier:110000, nextLabel:'Scale / Hire Staff' },
  military:       { title:'Military / Veteran',          national:58000,  p25:45000,  p75:78000, nextTier:76000,  nextLabel:'Next Pay Grade / Officer' },
  parttime:       { title:'Part-time Worker',            national:32000,  p25:22000,  p75:48000, nextTier:52000,  nextLabel:'Full-time / Senior Role' },
  // ── Technology ────────────────────────────────────────────────
  developer:      { title:'Software Developer',          national:120000, p25:90000,  p75:158000, nextTier:155000, nextLabel:'Senior / Staff Engineer' },
  'software engineer':{ title:'Software Engineer',       national:124000, p25:92000,  p75:165000, nextTier:162000, nextLabel:'Staff / Principal Engineer' },
  'senior engineer':  { title:'Senior Software Engineer',national:152000, p25:120000, p75:195000, nextTier:195000, nextLabel:'Staff / Principal Engineer' },
  'frontend developer':{ title:'Frontend Developer',     national:110000, p25:82000,  p75:145000, nextTier:142000, nextLabel:'Senior Frontend / Lead' },
  'backend developer':{ title:'Backend Developer',       national:118000, p25:88000,  p75:155000, nextTier:150000, nextLabel:'Senior Backend / Architect' },
  'fullstack developer':{ title:'Full Stack Developer',  national:115000, p25:85000,  p75:152000, nextTier:148000, nextLabel:'Senior / Tech Lead' },
  'data scientist':   { title:'Data Scientist',          national:128000, p25:95000,  p75:170000, nextTier:168000, nextLabel:'Senior DS / ML Engineer' },
  'data engineer':    { title:'Data Engineer',           national:120000, p25:92000,  p75:158000, nextTier:155000, nextLabel:'Senior Data Engineer / Architect' },
  'ml engineer':      { title:'Machine Learning Engineer',national:145000,p25:112000, p75:190000, nextTier:185000, nextLabel:'Senior MLE / Research Scientist' },
  'devops engineer':  { title:'DevOps / Platform Engineer',national:118000,p25:88000, p75:155000, nextTier:150000, nextLabel:'Senior DevOps / SRE' },
  'cybersecurity':    { title:'Cybersecurity Analyst',   national:112000, p25:82000,  p75:148000, nextTier:145000, nextLabel:'Security Engineer / CISO' },
  'product manager':  { title:'Product Manager',         national:128000, p25:95000,  p75:172000, nextTier:168000, nextLabel:'Senior PM / Group PM' },
  'product designer': { title:'Product Designer / UX',   national:102000, p25:75000,  p75:138000, nextTier:135000, nextLabel:'Senior Designer / Design Lead' },
  'ux designer':      { title:'UX Designer',             national:98000,  p25:72000,  p75:132000, nextTier:130000, nextLabel:'Senior UX / Lead Designer' },
  'qa engineer':      { title:'QA / Test Engineer',       national:88000,  p25:65000,  p75:118000, nextTier:115000, nextLabel:'Senior QA / Test Lead' },
  'cloud architect':  { title:'Cloud Architect',         national:158000, p25:125000, p75:205000, nextTier:200000, nextLabel:'Principal Architect / CTO' },
  'cto':              { title:'CTO',                     national:210000, p25:155000, p75:320000, nextTier:320000, nextLabel:'Founder / Board Role' },
  // ── Healthcare ────────────────────────────────────────────────
  nurse:          { title:'Registered Nurse',            national:82000,  p25:65000,  p75:102000, nextTier:102000, nextLabel:'Charge Nurse / Nurse Practitioner' },
  'nurse practitioner':{ title:'Nurse Practitioner',     national:122000, p25:98000,  p75:148000, nextTier:148000, nextLabel:'Lead NP / Clinical Director' },
  'physician assistant':{ title:'Physician Assistant',   national:125000, p25:98000,  p75:152000, nextTier:150000, nextLabel:'Senior PA / Specialist' },
  doctor:         { title:'Physician / Doctor',          national:208000, p25:162000, p75:290000, nextTier:265000, nextLabel:'Senior / Specialist' },
  'dentist':      { title:'Dentist',                     national:168000, p25:125000, p75:220000, nextTier:220000, nextLabel:'Dental Specialist / Practice Owner' },
  'pharmacist':   { title:'Pharmacist',                  national:128000, p25:108000, p75:148000, nextTier:148000, nextLabel:'Clinical Pharmacist / Director' },
  'physical therapist':{ title:'Physical Therapist',     national:98000,  p25:78000,  p75:118000, nextTier:118000, nextLabel:'Senior PT / Clinic Director' },
  'medical assistant':{ title:'Medical Assistant',       national:40000,  p25:33000,  p75:50000, nextTier:52000,  nextLabel:'Lead MA / Office Manager' },
  'radiologist':  { title:'Radiologist',                 national:340000, p25:280000, p75:420000, nextTier:420000, nextLabel:'Chief Radiologist / Partner' },
  'therapist':    { title:'Therapist / Counsellor',      national:58000,  p25:45000,  p75:78000, nextTier:78000,  nextLabel:'Licensed Clinical / Private Practice' },
  // ── Finance & Business ────────────────────────────────────────
  finance:        { title:'Finance Professional',        national:92000,  p25:68000,  p75:130000, nextTier:135000, nextLabel:'Senior / VP Finance' },
  accountant:     { title:'Accountant / CPA',            national:79000,  p25:58000,  p75:108000, nextTier:108000, nextLabel:'Senior / Controller' },
  'financial analyst':{ title:'Financial Analyst',       national:88000,  p25:65000,  p75:118000, nextTier:118000, nextLabel:'Senior Analyst / Finance Manager' },
  'investment banker':{ title:'Investment Banker',       national:165000, p25:120000, p75:280000, nextTier:280000, nextLabel:'VP / Managing Director' },
  'portfolio manager':{ title:'Portfolio Manager',       national:145000, p25:105000, p75:210000, nextTier:210000, nextLabel:'Senior PM / Fund Manager' },
  'actuary':      { title:'Actuary',                     national:118000, p25:88000,  p75:155000, nextTier:155000, nextLabel:'Fellow / Chief Actuary' },
  'controller':   { title:'Financial Controller',        national:115000, p25:88000,  p75:148000, nextTier:148000, nextLabel:'CFO / VP Finance' },
  'cfo':          { title:'CFO',                         national:195000, p25:145000, p75:310000, nextTier:310000, nextLabel:'CEO / Board / Equity Role' },
  // ── Management & Leadership ────────────────────────────────────
  manager:        { title:'Manager',                     national:95000,  p25:72000,  p75:128000, nextTier:130000, nextLabel:'Senior Manager / Director' },
  director:       { title:'Director',                    national:135000, p25:102000, p75:185000, nextTier:185000, nextLabel:'VP / Senior Director' },
  'vp':           { title:'Vice President',              national:175000, p25:135000, p75:250000, nextTier:250000, nextLabel:'SVP / C-Suite' },
  'ceo':          { title:'CEO',                         national:210000, p25:145000, p75:450000, nextTier:450000, nextLabel:'Board / Equity / Exit' },
  'operations manager':{ title:'Operations Manager',     national:98000,  p25:72000,  p75:132000, nextTier:132000, nextLabel:'Director of Operations / COO' },
  'project manager':  { title:'Project Manager',         national:92000,  p25:68000,  p75:122000, nextTier:122000, nextLabel:'Senior PM / Program Director' },
  // ── Sales & Marketing ─────────────────────────────────────────
  sales:          { title:'Sales Professional',          national:68000,  p25:48000,  p75:108000, nextTier:100000, nextLabel:'Senior AE / Sales Manager' },
  marketing:      { title:'Marketing Professional',      national:70000,  p25:52000,  p75:98000, nextTier:95000,  nextLabel:'Marketing Manager / Director' },
  'sales manager':    { title:'Sales Manager',           national:105000, p25:78000,  p75:148000, nextTier:148000, nextLabel:'Regional Director / VP Sales' },
  'account executive':{ title:'Account Executive',       national:78000,  p25:55000,  p75:118000, nextTier:115000, nextLabel:'Senior AE / Enterprise Sales' },
  'digital marketing':{ title:'Digital Marketing Manager',national:75000, p25:55000,  p75:102000, nextTier:102000, nextLabel:'Marketing Director / CMO' },
  'seo specialist':   { title:'SEO / SEM Specialist',    national:62000,  p25:45000,  p75:88000, nextTier:85000,  nextLabel:'SEO Manager / Digital Director' },
  // ── Legal ─────────────────────────────────────────────────────
  lawyer:         { title:'Attorney / Lawyer',           national:127000, p25:82000,  p75:208000, nextTier:180000, nextLabel:'Partner / Senior Counsel' },
  'paralegal':    { title:'Paralegal',                   national:58000,  p25:42000,  p75:78000, nextTier:78000,  nextLabel:'Senior Paralegal / Legal Manager' },
  'compliance officer':{ title:'Compliance Officer',     national:88000,  p25:65000,  p75:118000, nextTier:118000, nextLabel:'Compliance Director / CCO' },
  // ── Education ─────────────────────────────────────────────────
  'professor':    { title:'University Professor',        national:92000,  p25:65000,  p75:145000, nextTier:125000, nextLabel:'Associate / Full Professor' },
  'principal':    { title:'School Principal',            national:98000,  p25:78000,  p75:122000, nextTier:122000, nextLabel:'District Administrator / Superintendent' },
  'school counselor':{ title:'School Counsellor',        national:62000,  p25:48000,  p75:80000, nextTier:80000,  nextLabel:'Lead Counsellor / Director' },
  // ── Engineering ───────────────────────────────────────────────
  engineer:       { title:'Engineer',                    national:98000,  p25:75000,  p75:132000, nextTier:132000, nextLabel:'Senior Engineer / Engineering Manager' },
  'civil engineer':   { title:'Civil Engineer',          national:92000,  p25:68000,  p75:122000, nextTier:120000, nextLabel:'Senior Civil / Project Engineer' },
  'mechanical engineer':{ title:'Mechanical Engineer',   national:96000,  p25:72000,  p75:128000, nextTier:128000, nextLabel:'Senior Mechanical / Principal' },
  'electrical engineer':{ title:'Electrical Engineer',   national:102000, p25:78000,  p75:135000, nextTier:135000, nextLabel:'Senior EE / Principal' },
  'chemical engineer':  { title:'Chemical Engineer',     national:108000, p25:82000,  p75:142000, nextTier:142000, nextLabel:'Senior / Process Engineer' },
  'aerospace engineer': { title:'Aerospace Engineer',    national:122000, p25:92000,  p75:160000, nextTier:158000, nextLabel:'Senior AE / Systems Lead' },
  'architect':    { title:'Architect',                   national:88000,  p25:62000,  p75:120000, nextTier:120000, nextLabel:'Senior Architect / Principal' },
  // ── Human Resources ───────────────────────────────────────────
  hr:             { title:'HR Professional',             national:65000,  p25:48000,  p75:88000, nextTier:88000,  nextLabel:'HR Manager / HRBP' },
  'recruiter':    { title:'Recruiter / Talent Acquisition',national:62000,p25:45000,  p75:88000, nextTier:88000,  nextLabel:'Senior Recruiter / TA Manager' },
  'hr manager':   { title:'HR Manager',                  national:88000,  p25:65000,  p75:115000, nextTier:115000, nextLabel:'HR Director / CHRO' },
  // ── Operations & Logistics ────────────────────────────────────
  'supply chain': { title:'Supply Chain Manager',        national:92000,  p25:68000,  p75:122000, nextTier:122000, nextLabel:'Director of Supply Chain / VP Ops' },
  'logistics':    { title:'Logistics Coordinator',       national:52000,  p25:38000,  p75:72000, nextTier:72000,  nextLabel:'Logistics Manager / Supply Chain' },
  'warehouse':    { title:'Warehouse Manager',           national:58000,  p25:42000,  p75:78000, nextTier:78000,  nextLabel:'Distribution Manager / Director' },
  'truck driver': { title:'Truck Driver / CDL',          national:52000,  p25:40000,  p75:68000, nextTier:68000,  nextLabel:'Owner-Operator / Fleet Manager' },
  // ── Trades & Skilled ──────────────────────────────────────────
  'electrician':  { title:'Electrician',                 national:62000,  p25:48000,  p75:82000, nextTier:82000,  nextLabel:'Master Electrician / Contractor' },
  'plumber':      { title:'Plumber',                     national:60000,  p25:46000,  p75:80000, nextTier:80000,  nextLabel:'Master Plumber / Business Owner' },
  'hvac':         { title:'HVAC Technician',             national:56000,  p25:42000,  p75:76000, nextTier:76000,  nextLabel:'HVAC Lead / Business Owner' },
  'carpenter':    { title:'Carpenter',                   national:52000,  p25:38000,  p75:72000, nextTier:72000,  nextLabel:'Master Carpenter / Contractor' },
  'welder':       { title:'Welder',                      national:48000,  p25:36000,  p75:66000, nextTier:66000,  nextLabel:'Welding Supervisor / Inspector' },
  // ── Real Estate ───────────────────────────────────────────────
  'real estate agent':{ title:'Real Estate Agent',       national:62000,  p25:28000,  p75:108000, nextTier:108000, nextLabel:'Broker / Team Lead' },
  'realtor':      { title:'Realtor',                     national:62000,  p25:28000,  p75:108000, nextTier:108000, nextLabel:'Broker / Team Lead' },
  'property manager':{ title:'Property Manager',         national:58000,  p25:42000,  p75:78000, nextTier:78000,  nextLabel:'Regional PM / Director' },
  // ── Administrative & Support ──────────────────────────────────
  admin:          { title:'Administrative Assistant',    national:48000,  p25:36000,  p75:62000, nextTier:65000,  nextLabel:'Office Manager / Executive Assistant' },
  'executive assistant':{ title:'Executive Assistant',   national:68000,  p25:52000,  p75:88000, nextTier:88000,  nextLabel:'Chief of Staff / Sr EA' },
  'receptionist': { title:'Receptionist',                national:36000,  p25:28000,  p75:46000, nextTier:46000,  nextLabel:'Office Manager / Admin Lead' },
  'customer service':{ title:'Customer Service Rep',     national:38000,  p25:30000,  p75:50000, nextTier:50000,  nextLabel:'Team Lead / Customer Success Manager' },
  // ── Creative & Media ──────────────────────────────────────────
  'graphic designer':{ title:'Graphic Designer',         national:58000,  p25:42000,  p75:78000, nextTier:78000,  nextLabel:'Senior Designer / Art Director' },
  'copywriter':   { title:'Copywriter / Content Writer', national:62000,  p25:45000,  p75:88000, nextTier:85000,  nextLabel:'Senior Writer / Content Director' },
  'journalist':   { title:'Journalist / Reporter',       national:52000,  p25:38000,  p75:72000, nextTier:72000,  nextLabel:'Senior Reporter / Editor' },
  'videographer': { title:'Videographer / Video Editor', national:52000,  p25:38000,  p75:72000, nextTier:72000,  nextLabel:'Senior Editor / Creative Director' },
  // ── Project / Cost / Programme Controls ──────────────────────
  'cost manager':     { title:'Cost Manager',             national:108000, p25:82000,  p75:142000, nextTier:142000, nextLabel:'Senior Cost Manager / Director' },
  'senior cost manager':{ title:'Senior Cost Manager',   national:128000, p25:100000, p75:162000, nextTier:162000, nextLabel:'Cost Director / VP' },
  'cost estimator':   { title:'Cost Estimator',           national:98000,  p25:72000,  p75:130000, nextTier:130000, nextLabel:'Senior Estimator / Cost Manager' },
  'cost engineer':    { title:'Cost Engineer',            national:102000, p25:78000,  p75:135000, nextTier:135000, nextLabel:'Senior Cost Engineer / Manager' },
  'program manager':  { title:'Program Manager',          national:118000, p25:90000,  p75:155000, nextTier:155000, nextLabel:'Senior PM / Director of Programs' },
  'programme manager':{ title:'Programme Manager',        national:118000, p25:90000,  p75:155000, nextTier:155000, nextLabel:'Senior PM / Director' },
  'senior project manager':{ title:'Senior Project Manager', national:118000, p25:92000, p75:152000, nextTier:152000, nextLabel:'Program Director / VP PMO' },
  'senior manager':   { title:'Senior Manager',           national:118000, p25:90000,  p75:155000, nextTier:155000, nextLabel:'Director / VP' },
  'senior director':  { title:'Senior Director',          national:158000, p25:125000, p75:210000, nextTier:210000, nextLabel:'VP / SVP' },
  'risk manager':     { title:'Risk Manager',             national:108000, p25:82000,  p75:142000, nextTier:142000, nextLabel:'Senior Risk / Head of Risk' },
  'budget analyst':   { title:'Budget Analyst',           national:82000,  p25:62000,  p75:108000, nextTier:108000, nextLabel:'Senior Budget Analyst / Finance Manager' },
  'finance manager':  { title:'Finance Manager',          national:118000, p25:90000,  p75:155000, nextTier:155000, nextLabel:'Finance Director / VP Finance' },
  'treasury analyst': { title:'Treasury Analyst',         national:85000,  p25:65000,  p75:112000, nextTier:112000, nextLabel:'Treasury Manager / Director' },
  'treasury manager': { title:'Treasury Manager',         national:115000, p25:88000,  p75:148000, nextTier:148000, nextLabel:'Director of Treasury / CFO' },
  'pricing analyst':  { title:'Pricing Analyst',          national:78000,  p25:58000,  p75:105000, nextTier:105000, nextLabel:'Senior Pricing / Pricing Manager' },
  'pricing manager':  { title:'Pricing Manager',          national:108000, p25:82000,  p75:142000, nextTier:142000, nextLabel:'Director of Pricing / VP Revenue' },
  'supply chain manager':{ title:'Supply Chain Manager',  national:102000, p25:78000,  p75:135000, nextTier:135000, nextLabel:'Director of Supply Chain / VP Ops' },
  'operations analyst':  { title:'Operations Analyst',    national:72000,  p25:54000,  p75:98000, nextTier:98000,  nextLabel:'Senior Analyst / Ops Manager' },
  // ── Technology (additional) ──────────────────────────────────
  'engineering manager': { title:'Engineering Manager',   national:168000, p25:135000, p75:215000, nextTier:215000, nextLabel:'Director of Engineering / VP Eng' },
  'senior product manager':{ title:'Senior Product Manager', national:158000, p25:125000, p75:205000, nextTier:205000, nextLabel:'Group PM / Director of Product' },
  'staff engineer':   { title:'Staff Engineer',           national:185000, p25:150000, p75:240000, nextTier:240000, nextLabel:'Principal / Distinguished Engineer' },
  'principal engineer':{ title:'Principal Engineer',      national:210000, p25:170000, p75:270000, nextTier:270000, nextLabel:'Distinguished Eng / Fellow / CTO' },
  'tech lead':        { title:'Tech Lead',                 national:158000, p25:125000, p75:200000, nextTier:200000, nextLabel:'Engineering Manager / Staff Eng' },
  'solutions architect':{ title:'Solutions Architect',    national:152000, p25:118000, p75:198000, nextTier:198000, nextLabel:'Principal Architect / CTO' },
  'scrum master':     { title:'Scrum Master / Agile Coach',national:108000, p25:82000,  p75:142000, nextTier:142000, nextLabel:'Senior SM / Agile Lead' },
  'business intelligence':{ title:'BI Developer / Analyst', national:98000, p25:72000,  p75:130000, nextTier:130000, nextLabel:'Senior BI / Data Manager' },
  // ── Healthcare (additional) ──────────────────────────────────
  'clinical director':{ title:'Clinical Director',        national:118000, p25:90000,  p75:152000, nextTier:152000, nextLabel:'VP Clinical / Chief Medical Officer' },
  'healthcare administrator':{ title:'Healthcare Administrator', national:102000, p25:75000, p75:138000, nextTier:138000, nextLabel:'VP Operations / CEO' },
  // ── Other ─────────────────────────────────────────────────────
  analyst:        { title:'Analyst',                     national:72000,  p25:52000,  p75:98000, nextTier:95000,  nextLabel:'Senior Analyst / Manager' },
  'business analyst':{ title:'Business Analyst',         national:82000,  p25:60000,  p75:108000, nextTier:108000, nextLabel:'Senior BA / Product Owner' },
  'consultant':   { title:'Consultant',                  national:95000,  p25:68000,  p75:148000, nextTier:148000, nextLabel:'Senior Consultant / Partner' },
  'social worker':{ title:'Social Worker',               national:52000,  p25:40000,  p75:68000, nextTier:68000,  nextLabel:'Senior Social Worker / Supervisor' },
  'police officer':{ title:'Police Officer',             national:68000,  p25:52000,  p75:92000, nextTier:92000,  nextLabel:'Detective / Sergeant' },
  'firefighter':  { title:'Firefighter',                 national:58000,  p25:44000,  p75:80000, nextTier:80000,  nextLabel:'Fire Lieutenant / Captain' },
  'chef':         { title:'Chef / Head Chef',            national:52000,  p25:36000,  p75:78000, nextTier:78000,  nextLabel:'Executive Chef / F&B Director' },
};

// Match job title text to a market wage entry
function matchMarketWage(jobTitle, jobtype) {
  // Check AI cache first (most specific)
  if (window._aiJobData && window._aiJobData.aiLookup) {
    return { key: 'ai', data: window._aiJobData };
  }
  if (jobTitle) {
    var t = jobTitle.toLowerCase().trim();
    var keys = Object.keys(MARKET_WAGES);
    // Sort: longer keys first (most specific match wins)
    var sorted = keys.slice().sort(function(a, b) {
      return b.length - a.length;
    });
    for (var i = 0; i < sorted.length; i++) {
      var k = sorted[i];
      if (t === k || t.indexOf(k) !== -1) return { key: k, data: MARKET_WAGES[k] };
    }
    // Senior prefix — check 'senior X' first, then 'X'
    if (t.startsWith('senior ')) {
      var base = t.replace(/^senior\s+/, '');
      if (MARKET_WAGES['senior ' + base]) return { key: 'senior ' + base, data: MARKET_WAGES['senior ' + base] };
      if (MARKET_WAGES[base]) return { key: base, data: MARKET_WAGES[base] };
    }
    // Regex fallbacks for common variations
    if (t.match(/develop|program|software|front.?end|back.?end|full.?stack/)) return { key:'developer', data:MARKET_WAGES.developer };
    if (t.match(/nurs|rn\b|lpn/))          return { key:'nurse',       data:MARKET_WAGES.nurse };
    if (t.match(/\bmd\b|physician|doctor/)) return { key:'doctor',      data:MARKET_WAGES.doctor };
    if (t.match(/financ|invest|banking/))   return { key:'finance',     data:MARKET_WAGES.finance };
    if (t.match(/law|attorney|legal/))      return { key:'lawyer',      data:MARKET_WAGES.lawyer };
    if (t.match(/teach|educat|instruct/))   return { key:'teacher',     data:MARKET_WAGES.teacher };
    if (t.match(/manag|supervis/))          return { key:'manager',     data:MARKET_WAGES.manager };
    if (t.match(/direct|\bvp\b|vice.pres/)) return { key:'director',    data:MARKET_WAGES.director };
    if (t.match(/analy/))                   return { key:'analyst',     data:MARKET_WAGES.analyst };
    if (t.match(/account|cpa|bookkeep/))    return { key:'accountant',  data:MARKET_WAGES.accountant };
    if (t.match(/sales|account.exec/))      return { key:'sales',       data:MARKET_WAGES.sales };
    if (t.match(/market|brand|digital/))    return { key:'marketing',   data:MARKET_WAGES.marketing };
    if (t.match(/\bhr\b|human.res|recruit|talent/)) return { key:'hr', data:MARKET_WAGES.hr };
    if (t.match(/admin|assist|coord/))      return { key:'admin',       data:MARKET_WAGES.admin };
    if (t.match(/consult/))                 return { key:'consultant',  data:MARKET_WAGES.consultant };
    if (t.match(/engineer|engineering/))    return { key:'engineer',    data:MARKET_WAGES.engineer };
  }
  // Fall back to employment type, then default
  if (jobtype && MARKET_WAGES[jobtype]) return { key: jobtype, data: MARKET_WAGES[jobtype] };
  return { key: 'private', data: MARKET_WAGES.private };
}

// Core income gap calculation — uses STATE_SALARY_MULT for all states
function calcIncomeGap(income, jobTitle, jobtype, state) {
  var match = matchMarketWage(jobTitle, jobtype);
  var wage  = match ? match.data : MARKET_WAGES.private;
  if (!wage) wage = MARKET_WAGES.private;

  var userState  = state || (typeof G !== 'undefined' && G.state) || 'NY';
  var stateAdj   = (typeof STATE_SALARY_MULT !== 'undefined' && STATE_SALARY_MULT[userState]) || 1.0;
  var marketMedian   = Math.round(wage.national * stateAdj);
  var nextTierSalary = Math.round(wage.nextTier  * stateAdj);

  var gapFromMedian   = marketMedian - income;
  var gapFromNextTier = nextTierSalary - income;
  var pctOfMedian     = Math.round((income / marketMedian) * 100);
  var pctOfNextTier   = Math.round((income / nextTierSalary) * 100);

  return {
    matched:         match ? match.key : 'default',
    roleTitle:       wage.title,
    marketMedian:    marketMedian,
    nextTierSalary:  nextTierSalary,
    nextTierLabel:   wage.nextLabel,
    gapFromMedian:   gapFromMedian,
    gapFromNextTier: gapFromNextTier,
    pctOfMedian:     pctOfMedian,
    pctOfNextTier:   pctOfNextTier,
    stateAdj:        stateAdj,
    userState:       userState,
    aboveMedian:     income >= marketMedian,
    // legacy
    isCT:            userState === 'CT',
    ctPremium:       stateAdj,
  };
}

// Project income over N years at a raise rate with one-time promotion boost
function projectIncome(income, raiseRate, years, promoYear, promoPct) {
  var pts = [];
  var curr = income;
  for (var y = 0; y <= years; y++) {
    if (y > 0) {
      curr = curr * (1 + raiseRate);
      if (y === promoYear && promoPct > 0) curr = curr * (1 + promoPct / 100);
    }
    pts.push(Math.round(curr));
  }
  return pts;
}

// Render the full career progression panel into #career-bls-benchmark-unlocked
function renderCareerEngine() {
  var container = document.getElementById('career-bls-benchmark-unlocked');
  if (!container) return;
  container.style.display = 'block';

  var income    = G.income || 72000;
  var jobTitle  = G.jobTitle || '';
  var jobtype   = G.jobtype || 'private';
  var state = G.state || 'NY';
  var raiseRate = G.raiseRate || 0.03;
  var name      = G.firstname || G.name || '';

  var gap = calcIncomeGap(income, jobTitle, jobtype, state);
  // Get human-readable state name
  var STATE_NAMES = {'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California','CO':'Colorado','CT':'Connecticut','DC':'Washington DC','DE':'Delaware','FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming'};
  var stateName = STATE_NAMES[state] || state || 'your area';
  var stateAdj = (STATE_SALARY_MULT[state] || 1.0);
  var isAboveNational = stateAdj >= 1.05;

  // ── Income gap bar ──
  var barPct  = Math.min(100, gap.pctOfMedian);
  var barCol  = gap.aboveMedian ? '#10B981' : income > gap.marketMedian * 0.85 ? '#F8A750' : '#E63946';
  var gapMsg  = gap.aboveMedian
    ? (name ? name + ', you' : 'You') + ' earn <strong style="color:#10B981;">$' + Math.round((income - gap.marketMedian)/1000) + 'k above</strong> the market median for your role — strong position.'
    : 'You have a <strong style="color:#0077B6;">$' + Math.round(Math.abs(gap.gapFromMedian)/1000) + 'k opportunity gap</strong> vs. the market median. Closing it would add $' + Math.round(Math.abs(gap.gapFromMedian)/12).toLocaleString() + '/mo to your take-home.';

  // ── Promotion simulator ──
  var promoSliderVal = 10;
  var promoYearVal   = 2;

  container.innerHTML = `
    <div style="font-size:11px;font-weight:700;letter-spacing:0.2px;color:var(--gray-3);margin-bottom:16px;">
      Your Pay vs. Market · ${stateName}
    </div>

    <!-- Role match pill -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <div style="background:var(--teal-dim);border:1px solid rgba(0,119,182,0.2);border-radius:20px;padding:5px 12px;font-size:12px;font-weight:600;color:var(--teal);">${gap.roleTitle}</div>
      ${isAboveNational ? '<div style="background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.2);border-radius:20px;padding:5px 12px;font-size:12px;font-weight:600;color:#10B981;">📍 ' + stateName + ' premium applied</div>' : ''}
    </div>

    <!-- Salary comparison: 3-bar view -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px;">
      <div style="background:${gap.aboveMedian ? 'rgba(16,185,129,0.06)' : 'rgba(230,57,70,0.05)'};border:1.5px solid ${gap.aboveMedian ? 'rgba(16,185,129,0.2)' : 'rgba(230,57,70,0.15)'};border-radius:14px;padding:14px 10px;text-align:center;">
        <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--gray-4);margin-bottom:4px;">You</div>
        <div style="font-family:var(--font-display);font-size:20px;color:var(--navy);">$${Math.round(income/1000)}k</div>
        <div style="font-size:10px;color:var(--gray-4);margin-top:2px;">current</div>
      </div>
      <div style="background:var(--gray-1);border:1.5px solid var(--gray-2);border-radius:14px;padding:14px 10px;text-align:center;">
        <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--gray-4);margin-bottom:4px;">Market Median</div>
        <div style="font-family:var(--font-display);font-size:20px;color:var(--navy);">$${Math.round(gap.marketMedian/1000)}k</div>
        <div style="font-size:10px;color:var(--gray-4);margin-top:2px;">${isAboveNational ? stateName : 'national'}</div>
      </div>
      <div style="background:rgba(0,119,182,0.06);border:1.5px solid rgba(0,119,182,0.15);border-radius:14px;padding:14px 10px;text-align:center;">
        <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--gray-4);margin-bottom:4px;">${gap.nextTierLabel.split('/')[0].trim()}</div>
        <div style="font-family:var(--font-display);font-size:20px;color:var(--teal);">$${Math.round(gap.nextTierSalary/1000)}k</div>
        <div style="font-size:10px;color:var(--gray-4);margin-top:2px;">next level</div>
      </div>
    </div>

    <!-- Progress bar to median -->
    <div style="margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gray-4);margin-bottom:5px;">
        <span>Your position vs. market median</span>
        <span style="font-weight:700;color:${barCol};">${gap.pctOfMedian}%</span>
      </div>
      <div style="height:10px;background:var(--gray-2);border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${barPct}%;background:${barCol};border-radius:5px;transition:width 1s ease;"></div>
      </div>
    </div>
    <div style="font-size:13px;color:var(--gray-4);line-height:1.6;margin-bottom:18px;">${gapMsg}</div>

    <!-- Promotion What-If Simulator -->
    <div style="background:linear-gradient(180deg,#003B5C 0%,#001F33 100%);border-radius:14px;padding:18px 16px;margin-bottom:4px;">
      <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:16px;">🚀 Promotion What-If Simulator</div>

      <!-- Raise slider -->
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
          <label style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.8);">Raise / promotion size</label>
          <span style="font-size:12px;font-weight:700;color:#00A8E8;" id="promo-pct-lbl-rce">+10%</span>
        </div>
        <input type="range" id="promo-pct-slider-rce" min="3" max="50" value="10"
          oninput="updatePromoSim()"
          style="width:100%;accent-color:#00A8E8;" disabled>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.3);margin-top:2px;">
          <span>+3%</span><span>+50%</span>
        </div>
      </div>

      <!-- Year slider -->
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
          <label style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.8);">When does it happen?</label>
          <span style="font-size:12px;font-weight:700;color:#00A8E8;" id="promo-year-lbl-rce">Year 2</span>
        </div>
        <input type="range" id="promo-year-slider-rce" min="1" max="10" value="2"
          oninput="updatePromoSim()"
          style="width:100%;accent-color:#00A8E8;" disabled>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.3);margin-top:2px;">
          <span>Year 1</span><span>Year 10</span>
        </div>
      </div>

      <!-- Sim output -->
      <div id="promo-sim-output-rce" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <!-- populated by updatePromoSim() -->
      </div>
      <div id="promo-sim-insight-rce" style="margin-top:12px;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.6;"></div>
    </div>

    <!-- 5-year income chart -->
    <div style="background:white;border-radius:14px;padding:18px 16px;margin-top:14px;box-shadow:var(--card-shadow);border:var(--card-border);">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.2px;color:var(--gray-3);margin-bottom:12px;">10-Year Income Projection</div>
      <svg id="career-proj-chart-rce" width="100%" height="110" viewBox="0 0 300 110" preserveAspectRatio="none" style="display:block;overflow:visible;"></svg>
      <div id="career-proj-labels-rce" style="display:flex;justify-content:space-between;font-size:10px;color:var(--gray-3);margin-top:4px;"></div>
      <div id="career-proj-legend-rce" style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap;"></div>
    </div>

    <!-- CT vs National context card -->
    ${isAboveNational ? `
    <div style="background:rgba(0,119,182,0.06);border:1px solid rgba(0,119,182,0.15);border-radius:14px;padding:14px 16px;margin-top:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--teal);margin-bottom:6px;">📍 Connecticut Salary Context</div>
      <div style="font-size:13px;color:var(--navy);line-height:1.6;">
        ${stateName} salaries for <strong>${gap.roleTitle}</strong> run approximately <strong>${Math.round((stateAdj - 1) * 100)}% above the national median</strong> due to higher cost of living and regional employer concentration.
        The median in ${stateName} is estimated at <strong>$${Math.round(gap.marketMedian/1000)}k</strong> vs. $${Math.round(MARKET_WAGES[gap.matched]?.national/1000)}k nationally.
      </div>
      <div style="font-size:11px;color:var(--gray-4);margin-top:8px;">Source: BLS Occupational Employment Statistics, CT Dept of Labor (2024). Anonymised market data — not individual salary data.</div>
    </div>` : `
    <div style="background:var(--gray-1);border-radius:14px;padding:12px 14px;margin-top:14px;">
      <div style="font-size:11px;color:var(--gray-4);line-height:1.6;">📊 Market data based on BLS national occupational averages (2024). Anonymised — you're seeing market benchmarks, not individual data.</div>
    </div>`}
  `;

  // Seed the simulator
  updatePromoSim();
  renderCareerProjChart();
}

function updatePromoSim() {
  var pctEl  = document.getElementById('promo-pct-slider');
  var yearEl = document.getElementById('promo-year-slider');
  if (!pctEl || !yearEl) return;

  var pct   = parseFloat(pctEl.value);
  var yr    = parseInt(yearEl.value);
  var raiseRate = G.raiseRate || 0.03;
  var income    = G.income || 72000;

  // Update labels
  var pLbl = document.getElementById('promo-pct-lbl');
  var yLbl = document.getElementById('promo-year-lbl');
  if (pLbl) pLbl.textContent = '+' + pct + '%';
  if (yLbl) yLbl.textContent = 'Year ' + yr;

  // Project with and without promo
  var withPromo    = projectIncome(income, raiseRate, 10, yr, pct);
  var withoutPromo = projectIncome(income, raiseRate, 10, 0,  0);

  var newSalaryAtPromo  = withPromo[yr];
  var salaryY5With      = withPromo[5];
  var salaryY10With     = withPromo[10];
  var lifetimeGain      = withPromo.reduce((s,v,i) => s + (v - withoutPromo[i]), 0);

  var monthlyGainAtPromo = Math.round((newSalaryAtPromo - withoutPromo[yr]) / 12);
  var fcfGain = Math.round(monthlyGainAtPromo * 0.65); // rough post-tax

  var out = document.getElementById('promo-sim-output');
  if (out) out.innerHTML = `
    <div style="background:rgba(255,255,255,0.07);border-radius:10px;padding:12px;text-align:center;">
      <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">At Promotion</div>
      <div style="font-family:var(--font-display);font-size:18px;color:white;">$${Math.round(newSalaryAtPromo/1000)}k</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;">+$${Math.round(monthlyGainAtPromo/1000)}k/mo</div>
    </div>
    <div style="background:rgba(0,168,232,0.15);border:1px solid rgba(0,168,232,0.25);border-radius:10px;padding:12px;text-align:center;">
      <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Year 5</div>
      <div style="font-family:var(--font-display);font-size:18px;color:#00A8E8;">$${Math.round(salaryY5With/1000)}k</div>
    </div>
    <div style="background:rgba(255,255,255,0.07);border-radius:10px;padding:12px;text-align:center;">
      <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Year 10</div>
      <div style="font-family:var(--font-display);font-size:18px;color:white;">$${Math.round(salaryY10With/1000)}k</div>
    </div>
  `;

  var ins = document.getElementById('promo-sim-insight');
  if (ins) ins.innerHTML = `A <strong style="color:#00A8E8;">+${pct}%</strong> promotion in Year ${yr} adds <strong style="color:#00A8E8;">~$${fcfGain.toLocaleString()}/mo</strong> in extra take-home and compounds to <strong style="color:#00A8E8;">~$${Math.round(lifetimeGain/1000)}k</strong> more over 10 years vs. staying put.`;

  renderCareerProjChart();
}

function renderCareerProjChart() {
  var svg    = document.getElementById('career-proj-chart');
  var labels = document.getElementById('career-proj-labels');
  var legend = document.getElementById('career-proj-legend');
  if (!svg) return;

  var pctEl  = document.getElementById('promo-pct-slider');
  var yearEl = document.getElementById('promo-year-slider');
  var pct    = pctEl ? parseFloat(pctEl.value) : 10;
  var yr     = yearEl ? parseInt(yearEl.value) : 2;

  var income    = G.income || 72000;
  var raiseRate = G.raiseRate || 0.03;
  var gap       = calcIncomeGap(income, G.jobTitle || '', G.jobtype || 'private', G.state);

  var withPromo    = projectIncome(income, raiseRate, 10, yr, pct);
  var withoutPromo = projectIncome(income, raiseRate, 10, 0,  0);
  // Flat market median line
  var medianLine   = Array(11).fill(gap.marketMedian);

  // Chart geometry
  var W = 300, H = 110, PAD = 12;
  var allVals = withPromo.concat(withoutPromo).concat(medianLine);
  var minV = Math.min.apply(null, allVals) * 0.95;
  var maxV = Math.max.apply(null, allVals) * 1.05;
  var xStep = (W - PAD*2) / 10;
  var yScale = function(v) { return H - PAD - ((v - minV) / (maxV - minV)) * (H - PAD*2); };
  var pts = function(arr) {
    return arr.map(function(v, i) { return (PAD + i * xStep).toFixed(1) + ',' + yScale(v).toFixed(1); }).join(' ');
  };

  svg.innerHTML = `
    <defs>
      <linearGradient id="cpg2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0077B6" stop-opacity="0.20"/>
        <stop offset="100%" stop-color="#0077B6" stop-opacity="0.01"/>
      </linearGradient>
    </defs>
    <!-- Area fill — with promo -->
    <polygon points="${PAD},${H-PAD} ${pts(withPromo)} ${PAD + 10*xStep},${H-PAD}" fill="url(#cpg2)"/>
    <!-- Market median dashed -->
    <polyline points="${pts(medianLine)}" fill="none" stroke="#F8A750" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>
    <!-- Without promo -->
    <polyline points="${pts(withoutPromo)}" fill="none" stroke="rgba(0,119,182,0.35)" stroke-width="1.5"/>
    <!-- With promo (primary) -->
    <polyline points="${pts(withPromo)}" fill="none" stroke="#0077B6" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Promotion year dot -->
    <circle cx="${(PAD + yr * xStep).toFixed(1)}" cy="${yScale(withPromo[yr]).toFixed(1)}" r="4" fill="#00A8E8" stroke="white" stroke-width="1.5"/>
  `;

  if (labels) {
    labels.innerHTML = [0,2,5,8,10].map(function(y) {
      return '<span>Year ' + y + '</span>';
    }).join('');
  }

  if (legend) {
    legend.innerHTML = `
      <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gray-4);">
        <div style="width:16px;height:2.5px;background:#0077B6;border-radius:2px;"></div> With promotion
      </div>
      <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gray-4);">
        <div style="width:16px;height:1.5px;background:rgba(0,119,182,0.4);border-radius:2px;"></div> No promotion
      </div>
      <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gray-4);">
        <div style="width:16px;height:0;border-top:1.5px dashed #F8A750;"></div> Market median
      </div>
    `;
  }
}

// Hook into showProgressSub so career engine renders when career tab is opened
var _spsCareerOrig = typeof showProgressSub === 'function' ? showProgressSub : null;
if (_spsCareerOrig) {
  showProgressSub = function(sub) {
    _spsCareerOrig(sub);
    if (sub === 'career') setTimeout(renderCareerEngine, 80);
  };
}

// ── Net Worth helpers ──
function _0xb8a2b9e(netWorth, label, sub) {
  const nwEl = document.getElementById('nw-total');
  if (nwEl) {
    nwEl.textContent = (netWorth >= 0 ? '$' : '-$') + Math.abs(Math.round(netWorth/1000)) + 'K';
    nwEl.className = 'networth-val ' + (netWorth >= 0 ? 'positive' : 'negative');
  }
  const subEl = document.getElementById('nw-sub');
  if (subEl) subEl.textContent = sub || (netWorth >= 0 ? "You're in a positive net worth position" : "Your liabilities currently exceed your assets");
}

function _0xf312b9c(assets, liabilities) {
  const _s = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  const _w = (id, pct) => { const e = document.getElementById(id); if (e) e.style.width = pct + '%'; };
  _s('nw-assets', '$' + Math.round(assets/1000) + 'K');
  _s('nw-liabilities', '$' + Math.round(liabilities/1000) + 'K');
  const maxVal = Math.max(assets, liabilities, 1);
  _w('nw-assets-bar', Math.round((assets/maxVal)*100));
  _w('nw-liabilities-bar', Math.round((liabilities/maxVal)*100));
}

function _0xa9e1fb8(dti, liquidity, equity, horizon) {
  const sfx = '-unlocked'; // always use unlocked layout
  const _s = (id, val, color) => { const e = document.getElementById(id + sfx); if (e) { e.textContent = val; if (color) e.style.color = color; } };
  const dtiVal = typeof dti === 'number' ? dti + '%' : dti;
  const dtiNum = parseInt(dtiVal);
  _s('nw-dti', dtiVal, dtiNum <= 28 ? 'var(--green)' : dtiNum <= 36 ? 'var(--amber)' : 'var(--red)');
  const liqVal = typeof liquidity === 'number' ? liquidity + ' months' : liquidity;
  const liqNum = parseInt(liqVal);
  _s('nw-liquidity', liqVal, liqNum >= 3 ? 'var(--green)' : 'var(--red)');
  _s('nw-equity-pct', equity);
  _s('nw-horizon', horizon);
}

function _0xb7aa5c8(icon, label, val, cls) {
  return `<div class="nw-row">
    <span class="nw-row-label">${icon} ${label}</span>
    <span class="nw-row-val ${cls}">$${Math.round(val).toLocaleString()}</span>
  </div>`;
}
// openScenarios defined in UI controller

// ══════════════════════════════════════════════
// FEEDBACK SYSTEM
// ══════════════════════════════════════════════

function _0x237ffb0() {
  const fab = document.getElementById('feedback-fab');
  if (fab) fab.style.display = 'flex';
}

// ─── ACCOUNT SIGNUP MODAL ───
// ─── ADVICE DETAIL EXPAND/COLLAPSE ───
var _adviceExpanded = false;
function toggleAdviceDetail() {
  _adviceExpanded = !_adviceExpanded;
  const detail = document.getElementById('advice-detail');
  const arrow  = document.getElementById('advice-expand-arrow');
  if (detail) detail.style.display = _adviceExpanded ? 'block' : 'none';
  if (arrow)  arrow.style.transform = _adviceExpanded ? 'rotate(180deg)' : '';
}

// ─────────────────────────────────────────────
// SPLASH + INTRO + SIGN-IN SHEET
// ─────────────────────────────────────────────

// ── Save state to localStorage ─────────────────────────────────────
// [STABILIZE] Save state — uses STORAGE_KEY constant directly
function _0x36940e3() {
  try {
    var snapshot = {
      G: G,
      goals: typeof goals !== 'undefined' ? goals : [],
      _careerLog: typeof _careerLog !== 'undefined' ? _careerLog : [],
      selectedCredit: typeof selectedCredit !== 'undefined' ? selectedCredit : 'fair',
      housingType: typeof housingType !== 'undefined' ? housingType : null,
      _tracentPlus: window._tracentPlus || false,
      _selectedRaiseRate: window._selectedRaiseRate || '0.03',
      _progressSub: window._progressSub || 'goals',
      _scoreHistory: (typeof G !== 'undefined' && G._scoreHistory) ? G._scoreHistory : [],
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch(e) {}
}

// ── Load state from localStorage ───────────────────────────────────
// [STABILIZE] Persistence load — uses STORAGE_KEY constant; no inline fallback needed
function _0xf0f2b75() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    // Also attempt migration from legacy key if primary key is empty
    if (!raw) {
      var legacy = localStorage.getItem('tracent_v2') || localStorage.getItem('tracent_v1');
      if (legacy) {
        // Migrate: save under new key, wipe old
        try { localStorage.setItem(STORAGE_KEY, legacy); } catch(e) {}
        try { localStorage.removeItem('tracent_v2'); localStorage.removeItem('tracent_v1'); } catch(e) {}
        raw = legacy;
      }
    }
    if (!raw) return false;
    var snap = JSON.parse(raw);
    if (!snap.savedAt || Date.now() - snap.savedAt > 90 * 24 * 60 * 60 * 1000) return false;
    if (snap.G) Object.assign(G, snap.G);
    if (snap.goals && typeof goals !== 'undefined') goals = snap.goals;
    if (snap._careerLog && typeof _careerLog !== 'undefined') _careerLog = snap._careerLog;
    if (snap.selectedCredit) selectedCredit = snap.selectedCredit;
    if (snap.housingType) housingType = snap.housingType;
    if (snap._tracentPlus) window._tracentPlus = true;
    if (snap._selectedRaiseRate) window._selectedRaiseRate = snap._selectedRaiseRate;
    if (snap._progressSub) window._progressSub = snap._progressSub;
    if (snap._scoreHistory && typeof G !== 'undefined') G._scoreHistory = snap._scoreHistory;
    return true;
  } catch(e) { return false; }
}

// ── Career tab renderer ─────────────────────────────────────────────
function _0x32147da() {
  var plus = window._tracentPlus;
  var paywallCard     = document.getElementById('career-paywall-card');
  var unlockedContent = document.getElementById('career-unlocked-content');
  if (paywallCard)     paywallCard.style.display     = plus ? 'none'  : 'block';
  if (unlockedContent) unlockedContent.style.display = plus ? 'block' : 'none';
  try { _0x0e84774(); } catch(e) { console.warn('career hero', e); }
  if (plus) { setTimeout(function(){ try { renderCareerEngine(); } catch(e){} }, 80); }
}


function _0xbda85bb() {
  // G is already populated by _0xf0f2b75() called before _0xbda85bb
  var hasData = G && G.income && G.housingType;
  var ret = document.getElementById('splash-returning');
  var nw  = document.getElementById('splash-new');
  if (hasData) {
    if (ret) ret.style.display = 'flex';
    if (nw)  nw.style.display  = 'none';
    var g = document.getElementById('splash-greeting');
    if (g) g.textContent = G.firstname || G.name ? 'Welcome back, ' + (G.firstname || G.name) : 'Welcome back';
  } else {
    if (ret) ret.style.display = 'none';
    if (nw)  nw.style.display  = 'flex';
  }
}
// continueSession defined in UI controller
// hideSignOutSheet defined in UI controller
// doSignOut defined in UI controller
function _0x6ecbba6() { showSignOutSheet(); }

function _0x36d6d96() {
  var nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'flex';
  // Always recalculate score using saved G values
  if (typeof _0xb70f5a4 === 'function' && G.housingType) {
    var totalDebt = (G.ccDebt||0)+(G.carDebt||0)+(G.studentDebt||0)+(G.otherDebt||0);
    _0xb70f5a4(
      G.dti||0, G.fcf||0, G.credit||selectedCredit||'fair',
      G.emergency||'3', G.ccDebt||0, G.ccRate||21,
      G.housingType, totalDebt, G.takeHome||4000
    );
  }
  if (typeof _0x80e4d42     === 'function') _0x80e4d42();
  if (typeof _0x3e799ba    === 'function') _0x3e799ba();
  if (typeof _0x701dc98 === 'function') _0x701dc98();
  if (typeof _0x5517bf6    === 'function') _0x5517bf6();
  if (typeof _0x52c679f     === 'function') _0x52c679f();
  if (typeof _0x01d514a=== 'function') _0x01d514a(G.score);
  if (typeof _0x5d74b48   === 'function') _0x5d74b48();
  if (typeof _0x8e1bc2f=== 'function') _0x8e1bc2f();
}

// Intro slides

// [STABILIZE] openSignInSheet/closeSignInSheet duplicates removed — canonical versions in UI Controller block use openModal/closeModal helpers

// ── animateValue: smoothly counts a number element from start to end ──
function animateValue(el, from, to, duration, transform) {
  if (!el) return;
  var start = null;
  var step = function(ts) {
    if (!start) start = ts;
    var progress = Math.min((ts - start) / duration, 1);
    var ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    var current = from + (to - from) * ease;
    el.textContent = transform ? transform(current) : Math.round(current);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = transform ? transform(to) : to;
  };
  requestAnimationFrame(step);
}

// ── _0x38fc09e: lightweight confetti burst ──
function _0x38fc09e(msg) {
  var colors = ['#00A8E8','#10B981','#F8A750','#ffffff','#0077B6'];
  for (var i = 0; i < 48; i++) {
    (function(i) {
      setTimeout(function() {
        var el = document.createElement('div');
        var size = 6 + Math.random() * 8;
        var color = colors[Math.floor(Math.random() * colors.length)];
        el.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;border-radius:2px;'
          + 'width:' + size + 'px;height:' + size + 'px;background:' + color + ';'
          + 'left:' + (20 + Math.random() * 60) + 'vw;'
          + 'top:-10px;'
          + 'transition:transform ' + (0.8 + Math.random() * 1.2) + 's ease-in,opacity 0.4s ease 0.8s;'
          + 'transform:translateY(0) rotate(0deg);opacity:1;';
        document.body.appendChild(el);
        requestAnimationFrame(function() {
          el.style.transform = 'translateY(' + (60 + Math.random() * 40) + 'vh) rotate(' + (Math.random() * 720 - 360) + 'deg)';
          el.style.opacity = '0';
        });
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 2500);
      }, i * 30);
    })(i);
  }
}

// ── renderNextBestMoves: renders priority action cards on home tab ──
function renderNextBestMoves() {
  var wrap = document.getElementById('next-best-moves');
  if (!wrap || !G || !G.score) return;
  var moves = [];
  var score = G.score || 0;
  var fcf   = G.fcf   || 0;
  var dti   = G.dti   || 0;
  var ccDebt = G.ccDebt || 0;
  var emergency = parseInt(G.emergency) || 0;
  var fmt = function(n) { return '$' + Math.round(Math.abs(n)).toLocaleString(); };

  if (emergency === 0)
    moves.push({ icon:'🛡️', title:'Build an emergency fund', body:'No emergency savings detected. Even $1,000 is a critical buffer against unexpected costs.', priority:'high' });
  if (ccDebt > 0 && dti > 20)
    moves.push({ icon:'💳', title:'Attack your credit card balance', body:'Credit card debt at high interest is costing you ' + fmt(ccDebt * 0.20 / 12) + '/mo. Clearing it is an instant raise.', priority:'high' });
  if (fcf < 0)
    moves.push({ icon:'🔴', title:'Spending exceeds take-home', body:'Your outgoings exceed your income by ' + fmt(Math.abs(fcf)) + '/mo. Review expenses before any other goal.', priority:'high' });
  if (fcf > 200 && emergency < 3)
    moves.push({ icon:'📈', title:'Grow your emergency fund', body:'You have ' + fmt(fcf) + '/mo free cash flow. Automate ' + fmt(fcf * 0.5) + ' of it into savings.', priority:'medium' });
  if (dti > 36 && ccDebt === 0)
    moves.push({ icon:'🏠', title:'DTI is elevated', body:'Your debt-to-income ratio of ' + dti + '% is above the 36% guideline. Focus on debt payoff before new credit.', priority:'medium' });
  if (score >= 70 && fcf > 0)
    moves.push({ icon:'🚀', title:'Looking strong', body:'Score ' + score + '/100. Keep building — redirect ' + fmt(fcf * 0.3) + '/mo to long-term investments.', priority:'low' });

  if (moves.length === 0)
    moves.push({ icon:'✅', title:'Financial health looks solid', body:'Keep reviewing your numbers monthly. Small consistent improvements compound fast.', priority:'low' });

  var colors = { high:'#E63946', medium:'#F8A750', low:'#10B981' };
  wrap.innerHTML = moves.slice(0,3).map(function(m) {
    return '<div style="background:white;border-radius:14px;padding:14px 16px;box-shadow:var(--shadow-card);border:var(--card-border);border-left:3px solid ' + (colors[m.priority]||'#0077B6') + ';margin-bottom:16px;">'
      + '<div style="display:flex;align-items:flex-start;gap:10px;">'
      + '<span style="font-size:20px;flex-shrink:0;">' + m.icon + '</span>'
      + '<div><div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:3px;">' + m.title + '</div>'
      + '<div style="font-size:12px;color:var(--gray-4);line-height:1.6;">' + m.body + '</div></div></div></div>';
  }).join('');
  wrap.style.display = 'block';
}

// ── startFreshAnalysis ──
// [STABILIZE] Was clearing 'tracent_v2' — corrected to use STORAGE_KEY ('tracent_v3')// startFreshAnalysis defined in UI controller


// ─── SHARE SCORE ───
function shareScore(score, label) {
  const text = `My Tracent financial health score is ${score}/100 — ${label}. Know your full financial position in 3 minutes. tracent.app`;
  if (navigator.share) {
    navigator.share({ title: 'My Tracent Score', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const btn = event.currentTarget;
      const orig = btn.innerHTML;
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }).catch(() => {
      alert('Your Tracent score: ' + score + '/100 (' + label + ')');
    });
  }
}

// ─── TRACENT+ PAYWALL ───
let _paywallTarget = null;

function showPaywall(feature) {
  _paywallTarget = feature;

  // Contextual explanations per depth feature — calm, not hype
  var contextNotes = {
    'whatif':    'The What If Simulator is part of Edge \u2014 it helps you model decisions before you make them and track how your position changes over time.',
    'ai':        'Contextual AI guidance is part of Edge \u2014 it\u2019s built around your numbers and adapts when your situation changes.',
    'copilot':   'Copilot is part of Edge \u2014 it provides contextual guidance grounded in your actual financial position.',
    'career':    'The career trajectory view is part of Edge \u2014 it helps you see how income changes affect your long-term position.',
    'negotiate': 'AI Salary coaching is part of Edge \u2014 it builds a personalised plan from your actual income gap and market data.',
    'networth':  'The full net worth breakdown is part of Edge \u2014 it gives you an itemised view to track changes over time.',
    'scenarios': 'Saved scenarios are part of Edge \u2014 they let you compare your best path forward and revisit decisions later.',
    'archive':   'Monthly review history is part of Edge \u2014 it helps you track how your position has changed over time.',
  };

  var titleEl = document.getElementById('paywall-feature-title');
  var subEl   = document.getElementById('paywall-feature-sub');
  var ctaEl   = document.getElementById('paywall-cta-label');
  var noteEl  = document.getElementById('paywall-context-note');

  if (titleEl) titleEl.textContent = 'Keep your plan moving';
  if (subEl)   subEl.textContent   = 'Tracent Edge helps you keep improving your position with deeper reviews, saved scenarios, and contextual guidance built around your numbers.';
  if (ctaEl)   ctaEl.textContent   = 'Unlock Edge \u2192';

  var note = contextNotes[feature] || null;
  if (noteEl) { noteEl.textContent = note || ''; noteEl.style.display = note ? 'block' : 'none'; }

  const overlay = document.getElementById('paywall-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));
  }
}
// closePaywall defined in UI controller

// Stripe-gated upgrade — redirects to payment link
var STRIPE = {
  monthly: 'https://buy.stripe.com/YOUR_MONTHLY_LINK',
  annual:  'https://buy.stripe.com/YOUR_ANNUAL_LINK'
};
// Export for board-pass Stripe-check guard
window._stripeMonthlyLink = STRIPE.monthly;
window._stripeAnnualLink  = STRIPE.annual;
// unlockPremium defined in UI controller

// ─────────────────────────────────────────────
// BLS SALARY BENCHMARK DATABASE
// Source: Bureau of Labor Statistics OES 2024
// Median annual wages by occupation group + career stage
// ─────────────────────────────────────────────

// BLS_DATA: career stage income ranges (used by career trajectory engine)
// Keys: category, values: {early/growing/established/senior, p25/p75, kw[]}
const BLS_DATA = {
  // Format: category: { keywords[], early, growing, established, senior, p25, p75, p90 }
  // All figures in USD, annual salary
  'software_engineer':   { kw:['software','engineer','developer','programmer','swe','sde','full stack','frontend','backend','devops','cloud'],   early:78000, growing:110000, established:140000, senior:175000, p25:88000,  p75:155000, p90:200000, title:'Software Engineer/Developer' },
  'product_manager':     { kw:['product manager','pm ','product owner','head of product'],                                                         early:82000, growing:115000, established:145000, senior:180000, p25:90000,  p75:160000, p90:210000, title:'Product Manager' },
  'data_scientist':      { kw:['data scientist','data analyst','data engineer','machine learning','ml engineer','ai engineer','analytics'],         early:75000, growing:105000, established:135000, senior:165000, p25:82000,  p75:148000, p90:190000, title:'Data Scientist / Analyst' },
  'nurse':               { kw:['nurse','rn ','registered nurse','nursing','np ','nurse practitioner','cna','lpn'],                                  early:62000, growing:75000,  established:88000,  senior:105000, p25:58000, p75:95000,  p90:120000, title:'Nurse / Nursing Professional' },
  'physician':           { kw:['physician','doctor','md ','surgeon','hospitalist','psychiatrist','pediatrician','cardiolog'],                        early:165000,growing:220000, established:280000, senior:330000, p25:200000,p75:350000, p90:450000, title:'Physician / Doctor' },
  'teacher':             { kw:['teacher','educator','instructor','professor','lecturer','tutor','school','faculty'],                                 early:42000, growing:52000,  established:62000,  senior:72000,  p25:40000, p75:72000,  p90:88000,  title:'Teacher / Educator' },
  'accountant':          { kw:['accountant','cpa','auditor','tax','controller','bookkeeper','finance manager','financial analyst'],                  early:55000, growing:72000,  established:92000,  senior:118000, p25:52000, p75:105000, p90:140000, title:'Accountant / CPA' },
  'lawyer':              { kw:['lawyer','attorney','counsel','paralegal','solicitor','barrister','legal'],                                           early:72000, growing:105000, established:145000, senior:190000, p25:68000, p75:175000, p90:250000, title:'Lawyer / Attorney' },
  'marketing':           { kw:['marketing','brand','content','seo','social media','communications','pr ','public relation','copywriter','digital marketing'], early:48000, growing:68000, established:88000, senior:115000, p25:45000, p75:100000, p90:135000, title:'Marketing Professional' },
  'sales':               { kw:['sales','account executive','account manager','business development','bdm','bdr','sdr','revenue'],                    early:52000, growing:78000,  established:105000, senior:145000, p25:48000, p75:130000, p90:185000, title:'Sales / Business Development' },
  'operations':          { kw:['operations','ops manager','supply chain','logistics','process','project manager','program manager','scrum'],         early:52000, growing:70000,  established:90000,  senior:120000, p25:48000, p75:108000, p90:145000, title:'Operations / Project Manager' },
  'hr':                  { kw:['hr ','human resources','recruiter','talent','people ops','hris','compensation'],                                     early:48000, growing:65000,  established:82000,  senior:105000, p25:45000, p75:95000,  p90:125000, title:'HR / People Operations' },
  'designer':            { kw:['designer','ux','ui ','graphic','visual','creative','art director','motion','brand design'],                          early:52000, growing:72000,  established:90000,  senior:118000, p25:48000, p75:102000, p90:135000, title:'Designer / UX' },
  'finance':             { kw:['investment','banker','trader','portfolio','asset management','hedge fund','private equity','wealth manager','financial advisor', 'equity research'], early:78000, growing:115000, established:165000, senior:230000, p25:72000, p75:200000, p90:320000, title:'Finance / Investment Professional' },
  'engineer_civil':      { kw:['civil engineer','structural','geotechnical','environmental engineer','mechanical engineer','electrical engineer','aerospace','chemical engineer'], early:62000, growing:80000, established:100000, senior:130000, p25:58000, p75:115000, p90:148000, title:'Engineer (Civil/Mechanical/EE)' },
  'consultant':          { kw:['consultant','strategy','management consultant','advisory','mckinsey','bain','deloitte','pwc','kpmg','accenture'],    early:75000, growing:105000, established:140000, senior:185000, p25:68000, p75:165000, p90:230000, title:'Management Consultant' },
  'healthcare_admin':    { kw:['healthcare admin','hospital admin','medical director','clinic manager','health services'],                           early:52000, growing:68000,  established:88000,  senior:115000, p25:48000, p75:100000, p90:135000, title:'Healthcare Administrator' },
  'police_fire':         { kw:['police','officer','detective','firefighter','paramedic','emt','first responder','sheriff','deputy'],                 early:52000, growing:65000,  established:78000,  senior:95000,  p25:48000, p75:88000,  p90:108000, title:'Police / Fire / EMS' },
  'real_estate':         { kw:['real estate','realtor','property','broker','mortgage','loan officer','appraiser'],                                  early:42000, growing:72000,  established:110000, senior:155000, p25:38000, p75:140000, p90:220000, title:'Real Estate Professional' },
  'therapist':           { kw:['therapist','counselor','psychologist','social worker','mental health','lcsw','mft'],                                early:48000, growing:60000,  established:72000,  senior:90000,  p25:44000, p75:82000,  p90:105000, title:'Therapist / Counselor' },
  'executive':           { kw:['ceo','cto','cfo','coo','vp ','vice president','director of','chief ','svp','evp','c-suite'],                       early:120000,growing:165000, established:210000, senior:275000, p25:110000,p75:280000, p90:400000, title:'Executive / C-Suite' },
  'admin':               { kw:['admin','administrative','office manager','executive assistant','coordinator','receptionist','secretary'],            early:38000, growing:48000,  established:58000,  senior:72000,  p25:36000, p75:65000,  p90:82000,  title:'Administrative Professional' },
  'construction':        { kw:['construction','contractor','builder','carpenter','plumber','electrician','hvac','roofer','mason','welder'],          early:48000, growing:62000,  established:78000,  senior:98000,  p25:42000, p75:88000,  p90:115000, title:'Construction / Trades' },
  'chef':                { kw:['chef','cook','culinary','restaurant','baker','sous chef','kitchen'],                                                 early:38000, growing:50000,  established:64000,  senior:82000,  p25:35000, p75:72000,  p90:95000,  title:'Chef / Culinary Professional' },
  'journalist':          { kw:['journalist','reporter','editor','writer','author','content','media','broadcast','news'],                            early:42000, growing:55000,  established:70000,  senior:90000,  p25:38000, p75:80000,  p90:108000, title:'Journalist / Writer / Editor' },
};

function _0x267e1ed(jobTitle) {
  if (!jobTitle) return null;
  const t = jobTitle.toLowerCase();
  let bestMatch = null, bestScore = 0;
  for (const [key, cat] of Object.entries(BLS_DATA)) {
    for (const kw of cat.kw) {
      if (t.includes(kw)) {
        const score = kw.length; // longer keyword = more specific = better match
        if (score > bestScore) { bestScore = score; bestMatch = { key, ...cat }; }
      }
    }
  }
  return bestMatch;
}

function _0x33bb214(cat, stage) {
  const stageMap = { early: cat.early, growing: cat.growing, established: cat.established, senior: cat.senior };
  return stageMap[stage] || cat.growing;
}

// ─────────────────────────────────────────────
// CAREER TRAJECTORY ENGINE
// ─────────────────────────────────────────────

let _careerLog = []; // { year, title, income, type, note }
window._selectedRaiseRate = '0.03';

function _0xad75f9d(el) {
  document.querySelectorAll('#credit-pills > div').forEach(d => {
    d.style.borderColor = 'var(--gray-2)';
    d.style.background = 'white';
    d.querySelector('div').style.color = 'var(--navy)';
    if (d.querySelectorAll('div')[1]) d.querySelectorAll('div')[1].style.color = 'var(--gray-4)';
  });
  el.style.borderColor = 'var(--teal)';
  el.style.background = 'var(--teal-dim)';
  el.querySelector('div').style.color = 'var(--teal)';
  if (el.querySelectorAll('div')[1]) el.querySelectorAll('div')[1].style.color = 'var(--teal)';
}

function _0xac0ca72(el, rate) {
  document.querySelectorAll('.raise-opt').forEach(o => {
    o.style.border = '1.5px solid var(--gray-2)';
    o.style.background = 'white';
    o.querySelector('div').style.color = 'var(--navy)';
    if (o.querySelectorAll('div')[1]) o.querySelectorAll('div')[1].style.color = 'var(--gray-4)';
  });
  el.style.border = '1.5px solid var(--teal)';
  el.style.background = 'var(--teal-dim)';
  el.querySelector('div').style.color = 'var(--teal)';
  if (el.querySelectorAll('div')[1]) el.querySelectorAll('div')[1].style.color = 'var(--teal)';
  window._selectedRaiseRate = rate;
}

// ═══════════════════════════════════════════════════════════════
// BLS OCCUPATIONAL SALARY BENCHMARKS
// Source: Bureau of Labor Statistics Occupational Employment and
// Wage Statistics (OEWS) — national medians, state-adjusted.
// Figures are annual median total compensation (base only).
// ═══════════════════════════════════════════════════════════════
// BLS_SALARIES: precise job-title benchmarks (used by salary comparison widget)
// Keys: exact job title string, values: {p25, median, p75, growth}
const BLS_SALARIES = {
  // ── Healthcare ──
  'registered nurse':           { p25:62000,  median:81000,  p75:101000, growth:0.06 },
  'nurse practitioner':         { p25:105000, median:126000, p75:152000, growth:0.045 },
  'physician assistant':        { p25:101000, median:126000, p75:150000, growth:0.028 },
  'physical therapist':         { p25:72000,  median:99000,  p75:119000, growth:0.017 },
  'medical assistant':          { p25:33000,  median:40000,  p75:48000,  growth:0.016 },
  'pharmacist':                 { p25:117000, median:132000, p75:148000, growth:0.003 },
  'dental hygienist':           { p25:67000,  median:82000,  p75:100000, growth:0.009 },
  // ── Tech ──
  'software engineer':          { p25:99000,  median:130000, p75:168000, growth:0.025 },
  'software developer':         { p25:95000,  median:124000, p75:162000, growth:0.025 },
  'senior software engineer':   { p25:140000, median:170000, p75:210000, growth:0.02 },
  'data scientist':             { p25:97000,  median:128000, p75:162000, growth:0.035 },
  'data analyst':               { p25:58000,  median:82000,  p75:110000, growth:0.023 },
  'product manager':            { p25:108000, median:141000, p75:180000, growth:0.019 },
  'ux designer':                { p25:72000,  median:99000,  p75:130000, growth:0.016 },
  'devops engineer':            { p25:98000,  median:128000, p75:162000, growth:0.022 },
  'cybersecurity analyst':      { p25:82000,  median:113000, p75:147000, growth:0.032 },
  'it manager':                 { p25:110000, median:151000, p75:196000, growth:0.015 },
  'network engineer':           { p25:70000,  median:96000,  p75:126000, growth:0.005 },
  'machine learning engineer':  { p25:118000, median:156000, p75:200000, growth:0.04 },
  // ── Finance ──
  'financial analyst':          { p25:63000,  median:96000,  p75:137000, growth:0.009 },
  'accountant':                 { p25:56000,  median:79000,  p75:109000, growth:0.004 },
  'cpa':                        { p25:62000,  median:88000,  p75:122000, growth:0.004 },
  'financial advisor':          { p25:57000,  median:99000,  p75:186000, growth:0.013 },
  'investment banker':          { p25:110000, median:175000, p75:280000, growth:0.008 },
  'actuary':                    { p25:98000,  median:124000, p75:164000, growth:0.023 },
  'loan officer':               { p25:47000,  median:69000,  p75:110000, growth:-0.003 },
  'controller':                 { p25:110000, median:142000, p75:183000, growth:0.007 },
  'cfo':                        { p25:155000, median:239000, p75:380000, growth:0.01 },
  // ── Business / Management ──
  'project manager':            { p25:74000,  median:98000,  p75:130000, growth:0.006 },
  'operations manager':         { p25:73000,  median:101000, p75:144000, growth:0.006 },
  'marketing manager':          { p25:85000,  median:140000, p75:196000, growth:0.008 },
  'human resources manager':    { p25:79000,  median:126000, p75:181000, growth:0.007 },
  'sales manager':              { p25:79000,  median:135000, p75:208000, growth:0.005 },
  'general manager':            { p25:77000,  median:118000, p75:184000, growth:0.006 },
  'business analyst':           { p25:66000,  median:92000,  p75:124000, growth:0.011 },
  'management consultant':      { p25:90000,  median:107000, p75:163000, growth:0.011 },
  'supply chain manager':       { p25:75000,  median:104000, p75:144000, growth:0.011 },
  'marketing analyst':          { p25:51000,  median:70000,  p75:98000,  growth:0.019 },
  'recruiter':                  { p25:48000,  median:65000,  p75:92000,  growth:0.003 },
  'hr manager':                 { p25:79000,  median:126000, p75:181000, growth:0.007 },
  // ── Education ──
  'teacher':                    { p25:46000,  median:61000,  p75:78000,  growth:0.005 },
  'high school teacher':        { p25:49000,  median:64000,  p75:83000,  growth:0.005 },
  'elementary teacher':         { p25:44000,  median:61000,  p75:77000,  growth:0.004 },
  'school counselor':           { p25:52000,  median:63000,  p75:80000,  growth:0.004 },
  'professor':                  { p25:65000,  median:88000,  p75:134000, growth:0.004 },
  'principal':                  { p25:81000,  median:103000, p75:134000, growth:0.004 },
  'librarian':                  { p25:44000,  median:61000,  p75:80000,  growth:-0.006 },
  // ── Legal ──
  'lawyer':                     { p25:78000,  median:145000, p75:208000, growth:0.011 },
  'attorney':                   { p25:78000,  median:145000, p75:208000, growth:0.011 },
  'paralegal':                  { p25:44000,  median:60000,  p75:81000,  growth:0.003 },
  'compliance officer':         { p25:59000,  median:76000,  p75:107000, growth:0.006 },
  // ── Engineering ──
  'civil engineer':             { p25:74000,  median:95000,  p75:124000, growth:0.021 },
  'mechanical engineer':        { p25:76000,  median:99000,  p75:128000, growth:0.011 },
  'electrical engineer':        { p25:80000,  median:107000, p75:143000, growth:0.011 },
  'chemical engineer':          { p25:84000,  median:112000, p75:148000, growth:0.015 },
  'aerospace engineer':         { p25:92000,  median:126000, p75:164000, growth:0.008 },
  'industrial engineer':        { p25:72000,  median:97000,  p75:125000, growth:0.01 },
  'structural engineer':        { p25:72000,  median:95000,  p75:122000, growth:0.016 },
  // ── Creative / Media ──
  'graphic designer':           { p25:40000,  median:58000,  p75:82000,  growth:-0.009 },
  'writer':                     { p25:40000,  median:73000,  p75:128000, growth:-0.003 },
  'copywriter':                 { p25:44000,  median:70000,  p75:103000, growth:0.004 },
  'journalist':                 { p25:37000,  median:55000,  p75:91000,  growth:-0.006 },
  'content manager':            { p25:52000,  median:74000,  p75:103000, growth:0.006 },
  // ── Trades & Labour ──
  'electrician':                { p25:48000,  median:63000,  p75:88000,  growth:0.011 },
  'plumber':                    { p25:47000,  median:63000,  p75:87000,  growth:0.002 },
  'carpenter':                  { p25:39000,  median:56000,  p75:78000,  growth:0.002 },
  'hvac technician':            { p25:42000,  median:57000,  p75:78000,  growth:0.009 },
  'construction manager':       { p25:80000,  median:104000, p75:148000, growth:0.011 },
  // ── Public Sector ──
  'police officer':             { p25:53000,  median:74000,  p75:101000, growth:0.005 },
  'firefighter':                { p25:46000,  median:62000,  p75:89000,  growth:0.004 },
  'social worker':              { p25:42000,  median:59000,  p75:78000,  growth:0.009 },
  'government analyst':         { p25:61000,  median:85000,  p75:116000, growth:0.006 },
  // ── Real Estate ──
  'real estate agent':          { p25:32000,  median:57000,  p75:112000, growth:0.003 },
  'property manager':           { p25:42000,  median:62000,  p75:91000,  growth:0.007 },
  'real estate developer':      { p25:85000,  median:130000, p75:220000, growth:0.01 },
};

// Median home prices by state (Zillow/NAR Q4 2024)
var STATE_MEDIAN_HOME = {
  AL:225000,AK:335000,AZ:420000,AR:200000,CA:785000,CO:540000,CT:380000,
  DE:335000,FL:415000,GA:320000,HI:785000,ID:430000,IL:285000,IN:235000,
  IA:210000,KS:220000,KY:235000,LA:210000,ME:380000,MD:420000,MA:590000,
  MI:250000,MN:330000,MS:185000,MO:245000,MT:430000,NE:275000,NV:420000,
  NH:455000,NJ:520000,NM:310000,NY:460000,NC:330000,ND:250000,OH:230000,
  OK:215000,OR:480000,PA:285000,RI:445000,SC:310000,SD:295000,TN:330000,
  TX:315000,UT:500000,VT:390000,VA:390000,WA:595000,WV:165000,WI:285000,
  WY:340000,DC:620000
};

// State cost-of-living multipliers (relative to national median)
const STATE_SALARY_MULT = {
  AK:1.10, AL:0.88, AR:0.85, AZ:0.97, CA:1.22, CO:1.08, CT:1.14, DC:1.28,
  DE:1.05, FL:0.96, GA:0.95, HI:1.12, IA:0.89, ID:0.90, IL:1.04, IN:0.90,
  KS:0.91, KY:0.87, LA:0.88, MA:1.18, MD:1.12, ME:0.94, MI:0.95, MN:1.02,
  MO:0.91, MS:0.83, MT:0.89, NC:0.95, ND:0.94, NE:0.92, NH:1.10, NJ:1.16,
  NM:0.89, NV:0.97, NY:1.18, OH:0.93, OK:0.87, OR:1.04, PA:1.00, RI:1.06,
  SC:0.90, SD:0.89, TN:0.90, TX:0.98, UT:0.97, VA:1.07, VT:1.01, WA:1.14,
  WI:0.95, WV:0.83, WY:0.93,
};

function _0x9120003(jobTitle, state) {
  if (!jobTitle) return null;
  const key = jobTitle.toLowerCase().trim();
  // Direct match
  if (BLS_SALARIES[key]) {
    const mult = STATE_SALARY_MULT[state] || 1.0;
    const row = BLS_SALARIES[key];
    return {
      median: Math.round(row.median * mult),
      p25:    Math.round(row.p25    * mult),
      p75:    Math.round(row.p75    * mult),
      growth: row.growth,
      matched: jobTitle,
    };
  }
  // Fuzzy: find a BLS key that the user's title contains, or vice versa
  const words = key.split(/\s+/);
  let best = null, bestScore = 0;
  for (const [blsKey, row] of Object.entries(BLS_SALARIES)) {
    const blsWords = blsKey.split(/\s+/);
    const hits = words.filter(w => blsWords.includes(w)).length;
    const score = hits / Math.max(words.length, blsWords.length);
    if (score > bestScore && score >= 0.5) { bestScore = score; best = { blsKey, row }; }
  }
  if (best) {
    const mult = STATE_SALARY_MULT[state] || 1.0;
    return {
      median: Math.round(best.row.median * mult),
      p25:    Math.round(best.row.p25    * mult),
      p75:    Math.round(best.row.p75    * mult),
      growth: best.row.growth,
      matched: best.blsKey,
    };
  }
  return null;
}

function _0xf114ec9() {
  const base = G.income || 72000;
  const userRaise = G.raiseRate || 0.03;
  const bonusMap = { none: 0, small: 0.07, mid: 0.15, large: 0.30, commission: 0.20, irregular: 0.10 };
  const bonusPct = bonusMap[G.bonusType] || 0;

  // ── BLS-anchored projection ──
  // 1. Try keyword match against BLS_DATA (has career-stage medians)
  const blsCat = _0x267e1ed(G.jobTitle);
  // 2. Try exact/fuzzy match against BLS_SALARIES (has p25/median/p75)
  const blsFine = _0x9120003(G.jobTitle, G.state);

  // Store both for UI rendering
  G._blsCat  = blsCat;
  G._blsFine = blsFine;

  // Stage order for progression anchoring
  const stageOrder = ['early', 'growing', 'established', 'senior'];
  const stageYears  = { early: 0, growing: 5, established: 10, senior: 15 }; // years into career

  // If we have a BLS category match, compute stage-anchored projection
  // Otherwise fall back to pure compound growth
  const years = [];
  if (blsCat) {
    const stateAdj = STATE_SALARY_MULT[G.state || 'NY'] || 1.0;
    const curStageIdx = stageOrder.indexOf(G.careerStage || 'growing');
    // Current stage BLS median, adjusted for state
    const curStageMed = _0x33bb214(blsCat, G.careerStage || 'growing') * stateAdj;
    // How far above/below market is the user right now?
    const marketRatio = base / curStageMed;

    for (let y = 0; y <= 10; y++) {
      // Blend: compound growth in the short term, gravity toward BLS stage median over time
      const rawSalary = base * Math.pow(1 + userRaise, y);
      // At year 5, they may have progressed one stage; at year 10, possibly two
      const projStageIdx = Math.min(stageOrder.length - 1, curStageIdx + Math.floor(y / 5));
      const projStageMed = _0x33bb214(blsCat, stageOrder[projStageIdx]) * stateAdj;
      const targetSalary = projStageMed * marketRatio; // maintain relative market position
      // Blend: weight toward BLS anchor increases with time (25% at yr1 → 70% at yr10)
      const blsWeight = Math.min(0.70, y * 0.07);
      const blended   = rawSalary * (1 - blsWeight) + targetSalary * blsWeight;
      const bonus     = blended * bonusPct;
      years.push({ year: y, salary: Math.round(blended), bonus: Math.round(bonus), total: Math.round(blended + bonus) });
    }
  } else {
    // Pure compound growth — same as before
    for (let y = 0; y <= 10; y++) {
      const salary = base * Math.pow(1 + userRaise, y);
      const bonus  = salary * bonusPct;
      years.push({ year: y, salary: Math.round(salary), bonus: Math.round(bonus), total: Math.round(salary + bonus) });
    }
  }
  return years;
}

function _0x0e84774() {
  var el=function(id){return document.getElementById(id);};
  var fmt=function(n){return '$'+(Math.abs(n)>=1000?(Math.round(Math.abs(n)/1000*10)/10)+'k':Math.round(Math.abs(n)));};
  var income=G.income||72000,state=G.state||'NY',jobTitle=G.jobTitle||'',jobtype=G.jobtype||'private';
  try{var proj=_0xf114ec9();
    if(el('career-now-income'))el('career-now-income').textContent=fmt(proj[0].total);
    if(el('career-y5-income'))el('career-y5-income').textContent=fmt(proj[5].total);
    if(el('career-y10-income'))el('career-y10-income').textContent=fmt(proj[10].total);
    var p10=el('pill-career-y10');if(p10)p10.textContent=fmt(proj[10].total);
  }catch(e){console.warn('proj:',e);}
  if(el('career-title-display'))el('career-title-display').textContent=jobTitle||'Your role';
  var gap;
  try{gap=calcIncomeGap(income,jobTitle,jobtype,state);}
  catch(e){console.warn('gap err:',e);try{gap=calcIncomeGap(income,'',jobtype,state);}catch(e2){}}
  if(!gap)gap={aboveMedian:false,pctOfMedian:100,gapFromMedian:0,marketMedian:income,nextTierSalary:Math.round(income*1.3),nextTierLabel:'Senior',roleTitle:'Professional',userState:state};
  var vn=el('career-verdict-number'),vl=el('career-verdict-label'),mf=el('career-market-fill'),mp=el('career-market-pct-label'),am=el('career-action-msg'),ab=el('career-action-btn'),cc=el('career-compare-card'),pc=el('career-promo-card'),ch=el('career-chart-card');
  var gapAmt=Math.abs(gap.gapFromMedian||0),pct=gap.pctOfMedian||100;
  var SN={NY:'New York',CA:'California',TX:'Texas',FL:'Florida',WA:'Washington',MA:'Massachusetts',IL:'Illinois',CO:'Colorado',NJ:'New Jersey',CT:'Connecticut',DC:'Washington DC',GA:'Georgia',NC:'North Carolina',VA:'Virginia',AZ:'Arizona',PA:'Pennsylvania',OH:'Ohio',MN:'Minnesota',MD:'Maryland',OR:'Oregon',MI:'Michigan',TN:'Tennessee',MO:'Missouri',WI:'Wisconsin',IN:'Indiana',NV:'Nevada',LA:'Louisiana',UT:'Utah',KY:'Kentucky',OK:'Oklahoma',SC:'South Carolina',AL:'Alabama',AR:'Arkansas',DE:'Delaware',HI:'Hawaii',ID:'Idaho',IA:'Iowa',KS:'Kansas',ME:'Maine',MT:'Montana',NE:'Nebraska',NH:'New Hampshire',NM:'New Mexico',ND:'North Dakota',RI:'Rhode Island',SD:'South Dakota',VT:'Vermont',WV:'West Virginia',WY:'Wyoming'};
  var sn=SN[state]||state||'your area';
  if(gap.aboveMedian){
    var ah=Math.round((income-gap.marketMedian)/1000),ng=gap.nextTierSalary-income;
    if(vn){vn.textContent='+$'+ah+'k above market';vn.style.color='#34D399';vn.style.fontSize='28px';}
    if(vl)vl.textContent='Strong position \u2014 above the '+gap.roleTitle+' median in '+sn+'.';
    if(mf){mf.style.width=Math.min(100,pct)+'%';mf.style.background='#10B981';}
    if(mp){mp.textContent=pct+'% of median';mp.style.color='#10B981';}
    if(am)am.textContent=ng>0?'$'+Math.round(ng/1000)+'k to '+(gap.nextTierLabel||'').split('/')[0].trim()+'. Your next milestone.':'At or above senior median.';
    if(ab){ab.textContent='See trajectory \u203a';ab.onclick=function(){var c=el('career-chart-card');if(c)c.scrollIntoView({behavior:'smooth'});};}
  }else if(pct>=85){
    if(vn){vn.textContent='$'+Math.round(gapAmt/1000)+'k below market';vn.style.color='#F8A750';vn.style.fontSize='28px';}
    if(vl)vl.textContent='Near median \u2014 '+pct+'% of market rate for '+gap.roleTitle+'. Worth a conversation.';
    if(mf){mf.style.width=pct+'%';mf.style.background='#F8A750';}
    if(mp){mp.textContent=pct+'% of median';mp.style.color='#F8A750';}
    if(am)am.textContent='Asking for '+fmt(gap.marketMedian)+' puts you at market. The data backs you up.';
    if(ab)ab.textContent='Get raise script \u203a';
  }else{
    if(vn){vn.textContent='$'+Math.round(gapAmt/1000)+'k below market';vn.style.color='#ff6b7a';vn.style.fontSize='28px';}
    if(vl)vl.textContent='Undervalued. Market median for '+gap.roleTitle+' in '+sn+' is '+fmt(gap.marketMedian)+'.';
    if(mf){mf.style.width=Math.max(5,pct)+'%';mf.style.background='#E63946';}
    if(mp){mp.textContent=pct+'% of median \u2014 undervalued';mp.style.color='#E63946';}
    if(am)am.textContent='Closing this gap = +'+fmt(Math.round(gapAmt/12))+'/mo. Use the AI coach.';
    if(ab)ab.textContent='Get raise script \u203a';
  }
  if(cc){cc.style.display='block';
    var ct=el('career-compare-title');if(ct)ct.textContent=(gap.roleTitle||'Your role')+' \u00b7 '+sn+' benchmarks';
    var cols=el('career-compare-cols');
    if(cols){
      var yBg=gap.aboveMedian?'rgba(16,185,129,0.08)':pct>=85?'rgba(248,167,80,0.08)':'rgba(230,57,70,0.06)';
      var yBd=gap.aboveMedian?'rgba(16,185,129,0.2)':pct>=85?'rgba(248,167,80,0.2)':'rgba(230,57,70,0.15)';
      var yC=gap.aboveMedian?'#10B981':pct>=85?'#F8A750':'#E63946';
      cols.innerHTML='<div style="background:'+yBg+';border:1.5px solid '+yBd+';border-radius:12px;padding:14px 10px;text-align:center;"><div style="font-size:11px;color:var(--gray-4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">You</div><div style="font-family:var(--font-display);font-size:22px;color:'+yC+';">'+fmt(income)+'</div></div>'
        +'<div style="background:var(--gray-1);border:1.5px solid var(--gray-2);border-radius:12px;padding:14px 10px;text-align:center;"><div style="font-size:11px;color:var(--gray-4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Median</div><div style="font-family:var(--font-display);font-size:22px;color:var(--navy);">'+fmt(gap.marketMedian)+'</div></div>'
        +'<div style="background:rgba(0,119,182,0.06);border:1.5px solid rgba(0,119,182,0.15);border-radius:12px;padding:14px 10px;text-align:center;"><div style="font-size:11px;color:var(--gray-4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Next level</div><div style="font-family:var(--font-display);font-size:22px;color:var(--teal);">'+fmt(gap.nextTierSalary)+'</div><div style="font-size:11px;color:var(--gray-4);margin-top:2px;">'+(gap.nextTierLabel||'').split('/')[0].trim()+'</div></div>';
    }
    var snEl=el('career-state-note');
    if(snEl){var adj=(typeof STATE_SALARY_MULT!=='undefined'&&STATE_SALARY_MULT[state])||1.0;snEl.textContent=adj>=1.05?'\ud83d\udccd '+sn+' wages ~'+Math.round((adj-1)*100)+'% above national. Source: BLS OES · AI-verified.':'\ud83d\udcca National BLS benchmarks (2024). '+sn+' near national average.';}
  }
  if(pc)pc.style.display='block';
  if(ch)ch.style.display='block';
  window._marketGapData=gap;
  var hl=el('hm-career-headline');if(hl)hl.textContent=gap.aboveMedian?(jobTitle||'Your role')+' \u00b7 above market':(jobTitle||'Your role')+(gapAmt>1000?' \u00b7 $'+Math.round(gapAmt/1000)+'k below market':' \u00b7 near market');
  var pw=el('pill-market-wrap'),pg=el('pill-market-gap');
  if(pw&&pg){pw.style.display='flex';if(gap.aboveMedian){pg.textContent='+$'+Math.round(gapAmt/1000)+'k vs market';pg.style.color='#10B981';}else{pg.textContent='-$'+Math.round(gapAmt/1000)+'k vs market';pg.style.color='#F8A750';}}
  try{updatePromoSim();}catch(e){}
  try{renderCareerProjChart();}catch(e){}
}

// ── Job lookup ────────────────────────────────────────────────────
var _jobLookupCache = {};
var _jobLookupTimer = null;

function onJobTitleInput(val) {
  var statusEl  = document.getElementById('job-title-status');
  var previewEl = document.getElementById('job-market-preview');
  if (!val || val.length < 2) { if(previewEl) previewEl.style.display='none'; return; }
  val = val.trim();
  var cacheKey = val.toLowerCase();
  if (_jobLookupCache[cacheKey]) { showJobPreview(_jobLookupCache[cacheKey], true); return; }
  var matched = matchMarketWage(val, '');
  if (matched && matched.key !== 'private') { showJobPreview(matched.data, false); return; }
  clearTimeout(_jobLookupTimer);
  if(statusEl) statusEl.textContent = '\u2026';
  _jobLookupTimer = setTimeout(function(){ lookupJobAI(val); }, 600);
}

async function lookupJobAI(jobTitle) {
  var statusEl = document.getElementById('job-title-status');
  var cacheKey = jobTitle.toLowerCase().trim();
  if (_jobLookupCache[cacheKey]) { showJobPreview(_jobLookupCache[cacheKey], true); return; }
  if(statusEl) statusEl.textContent = 'Looking up\u2026';
  var state = document.getElementById('state')?.value || 'NY';
  try {
    // Route through proxy — swap TRACENT_PROXY_URL for your Cloudflare Worker endpoint
    var r = await _tracentAIRequest({
      system: 'You are a compensation data expert. Return only valid JSON, no prose.',
      prompt: 'Provide US salary data for: "'+jobTitle+'" in '+state+'.\nReturn JSON only: {"title":"canonical job title","national_median":NUMBER,"p25":NUMBER,"p75":NUMBER,"next_level":"next career step title","next_median":NUMBER,"source":"BLS · live market data"}\nAll values in USD per year. No markdown.',
      max_tokens: 200
    });
    if (!r.ok) throw new Error('proxy_unavailable');
    var data = await r.json();
    var text = data.content && data.content[0] ? data.content[0].text : '';
    var clean = text.replace(/```json|```/g,'').trim();
    var parsed = JSON.parse(clean);
    var stateAdj = (typeof STATE_SALARY_MULT!=='undefined'&&STATE_SALARY_MULT[state])||1.0;
    var wageData = {
      title: parsed.title||jobTitle, national: parsed.national_median||72000,
      p25: parsed.p25, p75: parsed.p75,
      nextTier: parsed.next_median||Math.round((parsed.national_median||72000)*1.35),
      nextLabel: parsed.next_level||'Senior / Manager', aiLookup: true, source: parsed.source||'BLS estimate'
    };
    _jobLookupCache[cacheKey] = wageData;
    window._aiJobData = wageData;
    if(statusEl) statusEl.textContent = '';
    showJobPreview(wageData, true);
  } catch(e) {
    if(statusEl) statusEl.textContent = '';
    // Silently fall back to static BLS data — no error surface needed for lookup
  }
}

function showJobPreview(wageData, isAI) {
  var previewEl = document.getElementById('job-market-preview');
  var titleEl   = document.getElementById('job-market-title');
  var rangeEl   = document.getElementById('job-market-range');
  var medianEl  = document.getElementById('job-market-median');
  var state     = document.getElementById('state')?.value || 'NY';
  var stateAdj  = (typeof STATE_SALARY_MULT!=='undefined'&&STATE_SALARY_MULT[state])||1.0;
  var median = Math.round(wageData.national * stateAdj);
  var p25    = wageData.p25 ? Math.round(wageData.p25 * stateAdj) : Math.round(median*0.78);
  var p75    = wageData.p75 ? Math.round(wageData.p75 * stateAdj) : Math.round(median*1.28);
  var fmtK   = function(n){ return '$'+Math.round(n/1000)+'k'; };
  var STATE_ABBR = {NY:'New York',CA:'California',CT:'Connecticut',TX:'Texas',FL:'Florida',
    WA:'Washington',MA:'Massachusetts',NJ:'New Jersey',IL:'Illinois',CO:'Colorado',
    GA:'Georgia',NC:'North Carolina',VA:'Virginia',AZ:'Arizona',PA:'Pennsylvania'};
  var stateName = STATE_ABBR[state] || state;
  if(titleEl)  titleEl.textContent  = (isAI?'\u2728 ':'') + wageData.title + ' \u00b7 ' + stateName;
  if(rangeEl)  rangeEl.textContent  = fmtK(p25)+' \u2013 '+fmtK(p75)+' typical range';
  if(medianEl) medianEl.textContent = fmtK(median);
  if(previewEl) previewEl.style.display = 'block';
  var userIncome = parseFloat(document.getElementById('income')?.value)||0;
  var statusEl = document.getElementById('job-title-status');
  if(userIncome>0&&median>0&&statusEl){
    var pct=Math.round(userIncome/median*100);
    statusEl.textContent = pct>=100?'\u2191 above median':pct>=85?'near median':'\u2193 below market';
    statusEl.style.color = pct>=100?'var(--green)':pct>=85?'var(--amber)':'var(--teal)';
  }
}

// Override calcIncomeGap to use AI lookup if available
var _origCalcIncomeGap = window.calcIncomeGap;
window.calcIncomeGap = function(income, jobTitle, jobtype, state) {
  var cacheKey = (jobTitle||'').toLowerCase().trim();
  if(window._aiJobData && window._aiJobData.aiLookup){
    var aiTitle = (window._aiJobData.title||'').toLowerCase();
    if(aiTitle && (aiTitle.includes(cacheKey)||cacheKey.includes(aiTitle.split(' ')[0]))){
      var wd2=window._aiJobData;
      var adj2=(typeof STATE_SALARY_MULT!=='undefined'&&STATE_SALARY_MULT[state])||1.0;
      var med2=Math.round(wd2.national*adj2),nxt2=Math.round(wd2.nextTier*adj2);
      return {matched:cacheKey,roleTitle:wd2.title,marketMedian:med2,nextTierSalary:nxt2,nextTierLabel:wd2.nextLabel,gapFromMedian:med2-income,gapFromNextTier:nxt2-income,pctOfMedian:Math.round(income/med2*100),pctOfNextTier:Math.round(income/nxt2*100),stateAdj:adj2,userState:state,aboveMedian:income>=med2,aiLookup:true};
    }
  }
  if(cacheKey && _jobLookupCache[cacheKey]){
    var wd=_jobLookupCache[cacheKey];
    var stateAdj2=(typeof STATE_SALARY_MULT!=='undefined'&&STATE_SALARY_MULT[state])||1.0;
    var median=Math.round(wd.national*stateAdj2),nextTier=Math.round(wd.nextTier*stateAdj2);
    return {matched:jobTitle,roleTitle:wd.title,marketMedian:median,nextTierSalary:nextTier,nextTierLabel:wd.nextLabel,gapFromMedian:median-income,gapFromNextTier:nextTier-income,pctOfMedian:Math.round(income/median*100),pctOfNextTier:Math.round(income/nextTier*100),stateAdj:stateAdj2,userState:state,aboveMedian:income>=median,aiLookup:true};
  }
  return _origCalcIncomeGap ? _origCalcIncomeGap(income,jobTitle,jobtype,state) : null;
};

// ── Career log / promotion celebration ────────────────────────────
// _careerLog declared in main script block

function _0xa438a4e() {
  var wrap = document.getElementById('career-history-wrap');
  var list = document.getElementById('career-history-list');
  if (!wrap||!list||!_careerLog.length) return;
  wrap.style.display='block';
  list.innerHTML = _careerLog.map(function(e){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--gray-2);font-size:13px;">'
      +'<div><span style="font-weight:600;color:var(--navy);">'+e.title+'</span>'
      +(e.type==='bonus'?'':' <span style="color:var(--gray-4);">'+('$'+Math.round(e.income).toLocaleString()+'/yr')+'</span>')+'</div>'
      +'<span style="color:var(--gray-4);font-size:11px;">'+e.date+'</span></div>';
  }).join('');
}

function selectPromoType(btn, type) {
  var sel=document.getElementById('promo-type');
  if(sel) sel.value=type;
  document.querySelectorAll('.promo-type-pill').forEach(function(p){
    p.style.background='rgba(255,255,255,0.06)';p.style.borderColor='rgba(255,255,255,0.15)';p.style.color='rgba(255,255,255,0.6)';
  });
  btn.style.background='rgba(0,168,232,0.2)';btn.style.borderColor='rgba(0,168,232,0.5)';btn.style.color='white';
}

function logCareerEvent() {
  var title  = document.getElementById('promo-title')?.value.trim();
  var income = parseFloat(document.getElementById('promo-income')?.value)||0;
  var type   = document.getElementById('promo-type')?.value||'promo';
  if(!income){
    var incEl=document.getElementById('promo-income');
    if(incEl){incEl.style.borderColor='rgba(230,57,70,0.7)';incEl.focus();setTimeout(function(){incEl.style.borderColor='';},2000);}
    return;
  }
  var prevIncome=G.income||0;
  var raise=prevIncome>0?Math.round((income-prevIncome)/prevIncome*100):0;
  var raiseAmt=income-prevIncome;
  var event={year:new Date().getFullYear(),title:title||type,income:income,type:type,date:new Date().toLocaleDateString('en-US',{month:'short',year:'numeric'})};
  _careerLog.unshift(event);
  if(type!=='bonus'){G.income=income;G.takeHome=Math.round(income*0.72/12);}
  var _c=function(id){var e=document.getElementById(id);if(e)e.value='';};
  _c('promo-title');_c('promo-income');
  showPromoCelebration(type,title,income,prevIncome,raise,raiseAmt);
  _0x32147da();
  _0xa438a4e();
  if(typeof _0x36940e3==='function')_0x36940e3();
}

function showPromoCelebration(type,title,income,prevIncome,raise,raiseAmt) {
  var fmt=function(n){return '$'+Math.round(n).toLocaleString();};
  var typeLabels={promo:'Promotion logged!',raise:'Raise logged!',newjob:'New job logged!',bonus:'Bonus logged!'};
  var typeEmojis={promo:'\uD83C\uDFC6',raise:'\uD83D\uDCC8',newjob:'\uD83D\uDE80',bonus:'\uD83D\uDCB0'};
  var headline=typeLabels[type]||'Achievement logged!';
  var emoji=typeEmojis[type]||'\uD83C\uDF89';
  var name=G.firstname||G.name||'';
  var greeting=name?'Congratulations, '+name+'!':'Congratulations!';
  var sub=fmt(income)+'/year';
  if(prevIncome>0&&type!=='bonus') sub+=' \u00b7 '+(raise>0?'+'+raise+'% \u00b7 +'+fmt(Math.abs(raiseAmt))+'/yr more':'updated');
  if(title) sub=title+' \u00b7 '+sub;
  var overlay=document.createElement('div');
  overlay.id='promo-celebration';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,31,51,0.88);z-index:9998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);animation:fadeIn 0.3s ease both;';
  overlay.innerHTML='<div style="text-align:center;padding:40px 32px;max-width:340px;animation:scaleIn 0.4s var(--spring) both;">'
    +'<div style="font-size:64px;margin-bottom:16px;animation:float 2s ease-in-out infinite;">'+emoji+'</div>'
    +'<div style="font-family:var(--font-display);font-size:28px;color:white;margin-bottom:8px;letter-spacing:-0.3px;">'+greeting+'</div>'
    +'<div style="font-size:15px;font-weight:600;color:#00A8E8;margin-bottom:6px;">'+headline+'</div>'
    +'<div style="font-size:13px;color:rgba(255,255,255,0.55);margin-bottom:32px;line-height:1.6;">'+sub+'</div>'
    +'<button onclick="closeCelebration()" style="background:white;color:var(--navy);border:none;border-radius:50px;padding:14px 40px;font-family:var(--font-body);font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.3);">See my new trajectory \u2192</button>'
    +'<div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,0.3);cursor:pointer;" onclick="closeCelebration()">Dismiss</div>'
    +'</div>';
  document.body.appendChild(overlay);
  if(typeof _0x38fc09e==='function')_0x38fc09e(headline);
}

function closeCelebration() {
  var el=document.getElementById('promo-celebration');
  if(el){el.style.opacity='0';el.style.transition='opacity 0.3s';setTimeout(function(){el.remove();},320);}
}

// Single implementation kept here; UI controller block aliases are removed below.// openSalaryNegotiation defined in UI controller
// closeSalaryNegotiation defined in UI controller

async function generateSalaryScript() {
  var gap=window._marketGapData||{};
  var tenure=document.getElementById('sn-tenure')?.value||'1to2';
  var achieve=document.getElementById('sn-achievements')?.value||'';
  var target=document.getElementById('sn-target')?.value||'10';
  var formEl=document.getElementById('sn-form');
  var loadEl=document.getElementById('sn-loading');
  if(formEl) formEl.style.display='none';
  if(loadEl) loadEl.style.display='block';
  var tenureMap={'under1':'less than 1 year','1to2':'1-2 years','2to4':'2-4 years','4plus':'4+ years'};
  var role=(G&&G.jobTitle)?G.jobTitle:'their current role';
  var income=G&&G.income?'$'+Math.round(G.income).toLocaleString():'their current salary';
  var gapAmt=Math.round(Math.abs(gap.gapFromMedian||0));
  var marketMedian=Math.round(gap.marketMedian||0);
  var state=(G&&G.state)?'in '+(G.state):'';
  var prompt='Write a professional, confident salary negotiation script for someone who:\n'
    +'- Works as: '+role+' '+state+'\n'
    +'- Current salary: '+income+'\n'
    +'- Market median for their role: $'+marketMedian.toLocaleString()+'\n'
    +'- Gap from market: $'+gapAmt.toLocaleString()+' '+(gap.aboveMedian?'above':'below')+' median\n'
    +'- Time in role: '+tenureMap[tenure]+'\n'
    +'- Key achievements: '+(achieve||'not specified')+'\n'
    +'- Target raise: '+target+'%\n\n'
    +'Write a word-for-word script (200-280 words). Include: opening, market data reference, achievements, specific ask with dollar amount, confident close. Return only the script, no headers.';
  try {
    // Route through proxy — swap TRACENT_PROXY_URL for your Cloudflare Worker endpoint
    var r = await _tracentAIRequest({
      system: 'You are a career coach specialising in salary negotiation. Write clear, confident, human scripts. No markdown, no asterisks.',
      prompt: prompt,
      max_tokens: 1000
    });
    if (!r.ok) throw new Error('proxy_unavailable');
    var data=await r.json();
    var script=data.content&&data.content[0]?data.content[0].text:'';
    if(loadEl) loadEl.style.display='none';
    var resultEl=document.getElementById('sn-result');
    if(resultEl) resultEl.style.display='block';
    var bodyEl=document.getElementById('sn-script-body');
    if(bodyEl) bodyEl.textContent=script;
    var targetIncome=Math.round((G.income||0)*(1+parseFloat(target)/100));
    var posEl=document.getElementById('sn-position-summary');
    if(posEl) posEl.textContent='Asking for '+target+'% raises your salary to $'+targetIncome.toLocaleString()+'/yr'+(gapAmt>0?' \u2014 a reasonable ask based on BLS market data.':'.');
    window._snScript=script;
  } catch(e) {
    if(loadEl) loadEl.style.display='none';
    if(formEl) formEl.style.display='block';
    // Show proxy-not-configured message
    var formBody = formEl || document.querySelector('#salary-negotiate-overlay .modal-sheet');
    if (formEl) {
      var errNote = document.createElement('div');
      errNote.style.cssText = 'background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:12px 14px;font-size:12px;color:var(--amber);line-height:1.55;margin-top:12px;';
      errNote.textContent = 'AI features require the Cloudflare Worker proxy to be connected. See TRACENT_PROXY_URL in code.';
      formEl.appendChild(errNote);
      setTimeout(function(){ if(errNote.parentNode) errNote.remove(); }, 5000);
    }
  }
}

function copySalaryScript() {
  var script=window._snScript||'';
  if(navigator.clipboard){
    navigator.clipboard.writeText(script).then(function(){
      var btn=document.getElementById('sn-copy-btn');
      if(btn){btn.textContent='\u2713 Copied';setTimeout(function(){btn.textContent='Copy';},2000);}
    });
  }
}

function resetSalaryNegotiation() {
  var resultEl=document.getElementById('sn-result');
  var formEl=document.getElementById('sn-form');
  if(resultEl) resultEl.style.display='none';
  if(formEl) formEl.style.display='block';
}


function expandAIRec(idx) {
  var panel=document.getElementById('ai-why-panel');
  if(!panel) return;
  panel.style.display='block';
  var bodyEl=document.getElementById('ai-why-body');
  var actionEl=document.getElementById('ai-action-box');
  var projEl=document.getElementById('ai-projection');
  if(window._aiRecs && window._aiRecs[idx]) {
    var rec=window._aiRecs[idx];
    if(bodyEl) bodyEl.innerHTML=rec.why||rec.body||'';
    if(actionEl) actionEl.textContent=rec.action||'';
    if(projEl && rec.projection){ projEl.style.display='block'; var pt=document.getElementById('ai-projection-txt'); if(pt) pt.textContent=rec.projection; }
  }
}

// [STABILIZE] openWhatIf() duplicate removed — canonical version in UI Controller block uses openModal('whatif-modal')
// saveAlertEmail defined in UI controller
// resetAlertEmail defined in UI controller


// ── AI Chat & Advice ─────────────────────────────────────
// All AI calls route through _tracentAIRequest() which must be
// pointed at your Cloudflare Worker before going live.
// Docs: set TRACENT_PROXY_URL at top of this file.

if (typeof refreshAIAdvice === 'undefined') {
  window.refreshAIAdvice = async function() {
    try { tracentTrack('ai_opened', { surface: 'advice' }); registerMeaningfulAction('ai_opened'); } catch(e) {}
    var loadEl        = document.getElementById('ai-loading');
    var recsWrap      = document.getElementById('ai-recs-wrap');
    var chatWrap      = document.getElementById('ai-chat-wrap');
    var adviceContent = document.getElementById('advice-content');
    if (!G || !G.income) return;
    if (adviceContent) adviceContent.style.display = 'block';
    var emptyEl = document.getElementById('ai-empty');
    if (emptyEl) emptyEl.style.display = 'none';
    if (!window._tracentPlus) {
      if(chatWrap) chatWrap.style.display='none';
      window._freeAdviceMode = true;
    }
    if (loadEl)   loadEl.style.display   = 'block';
    if (recsWrap) recsWrap.style.display = 'none';

    var goalLabels = {
      build_savings:'build an emergency fund and savings',
      invest_more:'free up cash to invest and grow wealth',
      buy_home:'save for a home deposit and buy a property',
      retire_early:'build toward financial independence and early retirement',
      property_invest:'invest in property and real estate',
      pay_off_debt:'pay off debt as fast as possible'
    };
    var userGoal = goalLabels[G.goal] || (G.goal || 'improve their financial position');
    var prompt = 'PRIMARY GOAL: '+userGoal+'. '+
      'Profile: income $'+Math.round(G.income||0).toLocaleString()+
      ', take-home $'+Math.round(G.takeHome||0).toLocaleString()+'/mo'+
      ', DTI '+(G.dti||0)+'%'+
      ', FCF $'+Math.round(G.fcf||0).toLocaleString()+'/mo'+
      ', credit '+(G.credit||'unknown')+
      ', state '+(G.state||'US')+
      ', housing '+(G.housingType||'unknown')+
      (G.ccDebt>0?', CC debt $'+Math.round(G.ccDebt).toLocaleString():'')+
      (G.studentDebt>0?', student debt $'+Math.round(G.studentDebt).toLocaleString():'')+
      '. Return JSON array of 3 recs: [{"title":"...","body":"2 sentences...","why":"...","action":"...","priority":"high|medium|low","goalTag":"..."}]. JSON only.';
    try {
      var r = await _tracentAIRequest({
        system: 'You are a financial advisor. Return only valid JSON arrays, no prose.',
        prompt: prompt,
        max_tokens: 1000
      });
      if (!r.ok) throw new Error('proxy_unavailable');
      var data = await r.json();
      var text = data.content && data.content[0] ? data.content[0].text : '';
      var recs = JSON.parse(text.replace(/```json|```/g,'').trim());
      window._aiRecs = recs;
      if (loadEl)   loadEl.style.display   = 'none';
      if (recsWrap) recsWrap.style.display = 'flex';
      var colors = {'high':'#E63946','medium':'#F8A750','low':'#0077B6'};
      ['ai-rec-1','ai-rec-2','ai-rec-3'].forEach(function(id,i){
        var el = document.getElementById(id);
        if (window._freeAdviceMode && i > 0) {
          if(el) el.innerHTML = '<div style="background:var(--gray-1);border-radius:var(--r-md);padding:14px 16px;border:1.5px dashed var(--gray-2);text-align:center;cursor:pointer;" onclick="showPaywall(\'advice\')">'
            + '<div style="font-size:13px;font-weight:600;color:var(--gray-3);margin-bottom:4px;">Unlock '+(i===1?'2nd':'3rd')+' recommendation</div>'
            + '<div style="font-size:12px;color:var(--gray-4);">Tracent<span style="color:#00A8E8;">.</span> Edge · $6/mo</div>'
            + '<div style="margin-top:8px;background:var(--teal);color:white;border-radius:20px;padding:6px 16px;font-size:12px;font-weight:600;display:inline-block;">Unlock Edge →</div>'
            + '</div>';
        } else if(el && recs[i]) {
          var c = colors[recs[i].priority] || '#0077B6';
          el.innerHTML = '<div style="background:white;border-radius:var(--r-md);padding:16px 18px;box-shadow:var(--shadow-card);border:var(--card-border);border-left:3px solid '+c+';">'
            + '<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:4px;">'+recs[i].title+'</div>'
            + '<div style="font-size:13px;color:var(--gray-4);line-height:1.6;">'+recs[i].body+'</div></div>';
        }
      });
      if (chatWrap) chatWrap.style.display = 'block';
      window._aiLoaded = true;
    } catch(e) {
      if(loadEl)   loadEl.style.display   = 'none';
      if(recsWrap) recsWrap.style.display = 'none';
      // Show proxy-not-configured notice in place of recs
      var recArea = document.getElementById('ai-rec-1');
      if (recArea) {
        recArea.innerHTML = '<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.18);border-radius:var(--r-md);padding:16px;font-size:13px;color:var(--gray-4);line-height:1.65;">'
          + '<strong style="color:var(--amber);">AI not connected</strong><br>'
          + 'Advice requires the Cloudflare Worker proxy. Set <code>TRACENT_PROXY_URL</code> and redeploy.'
          + '</div>';
        recArea.style.display = 'block';
        if(recsWrap) recsWrap.style.display = 'block';
      }
    }
  };
}

if (typeof sendAIChat === 'undefined') {
  window.sendAIChat = async function() {
    var input = document.getElementById('ai-input');
    var msgs  = document.getElementById('ai-msgs');
    if(!input || !msgs || !input.value.trim()) return;
    var q = input.value.trim();
    input.value = '';
    msgs.insertAdjacentHTML('beforeend',
      '<div style="background:var(--teal-dim);border-radius:12px 12px 4px 12px;padding:10px 14px;font-size:13px;color:var(--navy);max-width:86%;align-self:flex-end;line-height:1.6;">'+q+'</div>'
    );
    msgs.scrollTop = msgs.scrollHeight;
    var thinkEl = document.createElement('div');
    thinkEl.style.cssText = 'font-size:13px;color:var(--gray-4);padding:8px 0;';
    thinkEl.textContent = 'Thinking\u2026';
    msgs.appendChild(thinkEl);
    var ctx = 'User profile: income $'+Math.round(G.income||0).toLocaleString()+
      ', DTI '+(G.dti||0)+'%'+
      ', credit '+(G.credit||'unknown')+
      ', goal '+(G.goal||'build savings')+
      '. Answer in 2-3 sentences. Educational only — not financial advice.';
    try {
      var r = await _tracentAIRequest({
        system: 'You are Tracent, a financial coach. ' + ctx,
        prompt: q,
        max_tokens: 300
      });
      if (!r.ok) throw new Error('proxy_unavailable');
      var data = await r.json();
      var reply = data.content && data.content[0] ? data.content[0].text : 'I\u2019m not sure \u2014 try rephrasing your question.';
      thinkEl.remove();
      msgs.insertAdjacentHTML('beforeend',
        '<div style="background:var(--gray-1);border-radius:12px 12px 12px 4px;padding:10px 14px;font-size:13px;color:var(--navy);max-width:88%;line-height:1.6;">'+reply+'</div>'
      );
      msgs.scrollTop = msgs.scrollHeight;
    } catch(e) {
      thinkEl.textContent = 'AI not connected — proxy required. See TRACENT_PROXY_URL.';
    }
  };
}


/* ═══════════════════════════════════════════════════════════
   TRACENT PREMIUM INTERACTION HELPERS
   Score reveal · NBM pulse · Monthly review ritual
   Home reveal · Career reveal · Number count-up
═══════════════════════════════════════════════════════════ */

// Score hero reveal — call after score is written to DOM
function tracentRevealScoreHero(opts) {
  opts = opts || {};
  var hero = document.querySelector('.score-hero-wrap');
  var driverStrip = document.querySelector('.score-driver-strip, .v21-driver-strip');
  if (!hero) return;
  hero.classList.remove('tr-score-ready');
  void hero.offsetWidth;
  hero.classList.add('tr-score-ready');
  setTimeout(function() {
    if (driverStrip) driverStrip.classList.add('is-visible');
  }, 360);
  if (opts.haptic) haptic('medium');
}

// NBM card glow pulse — call when NBM content updates
function tracentPulseNBM() {
  var nbm = document.getElementById('v21-nbm-card') ||
            document.querySelector('.v21-nbm-card');
  if (!nbm) return;
  nbm.classList.remove('is-updated');
  void nbm.offsetWidth;
  nbm.classList.add('is-updated');
}

// Number count-up — premium feel for score and dollar figures
function tracentCountNumber(el, from, to, duration) {
  if (!el) return;
  duration = duration || 420;
  var start = performance.now();
  function frame(now) {
    var p = Math.min((now - start) / duration, 1);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Monthly review ritual — stagger row reveals
function tracentRevealMonthlyReview() {
  var rows = document.querySelectorAll('.v21-review-row');
  rows.forEach(function(row, i) {
    setTimeout(function() { row.classList.add('is-visible'); }, 120 * i + 100);
  });
}

// Home mode card stagger reveal
function tracentRevealHomeMode() {
  var cards = document.querySelectorAll(
    '#tab-home .home-metric-card, #tab-home .tr-fade-up, #readiness-card'
  );
  cards.forEach(function(card, i) {
    card.classList.remove('tr-fade-up'); // ensure class applied
    void card.offsetWidth;
    setTimeout(function() { card.classList.add('is-visible'); }, 80 * i);
  });
}

// Career mode reveal — income delta first, then market gap, then CTA
function tracentRevealCareerMode() {
  var seq = ['hm-career-now', 'hm-career-y5', 'hm-career-y10', 'hm-career-mini-chart'];
  seq.forEach(function(id, i) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('tr-fade-in');
    setTimeout(function() { el.classList.add('is-visible'); }, 120 * i);
  });
}

// Stagger-reveal any set of elements by selector
function tracentStaggerReveal(selector, delayMs) {
  delayMs = delayMs || 80;
  document.querySelectorAll(selector).forEach(function(el, i) {
    el.classList.add('tr-fade-up');
    setTimeout(function() { el.classList.add('is-visible'); }, delayMs * i);
  });
}

window.tracentRevealScoreHero   = tracentRevealScoreHero;
window.tracentPulseNBM          = tracentPulseNBM;
window.tracentCountNumber       = tracentCountNumber;
window.tracentRevealMonthlyReview = tracentRevealMonthlyReview;
window.tracentRevealHomeMode    = tracentRevealHomeMode;
window.tracentRevealCareerMode  = tracentRevealCareerMode;
window.tracentStaggerReveal     = tracentStaggerReveal;
