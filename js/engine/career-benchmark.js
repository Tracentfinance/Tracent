/* ═══ Tracent Career Benchmark Layer ═══
   Computes G.careerBenchmark on demand.
   Tries BLS fine-match (_0x9120003) first — high confidence.
   Falls back to MARKET_WAGES title match — medium confidence.
   Returns null confidence for jobtype-only fallbacks.
   Suppresses all "above/below market" claims when confidence is null.

   Requires: legacy-calculations.js (provides STATE_SALARY_MULT,
             MARKET_WAGES, matchMarketWage, _0x9120003)

   Public API: window.computeCareerBenchmark()
═══════════════════════════════════════════════ */

(function () {
  'use strict';

  // Employment-type-only fallback keys in MARKET_WAGES — not real title matches
  var _JOBTYPE_KEYS = ['teacher','public','private','selfemployed','military','parttime'];

  var _STATE_NAMES = {
    AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
    CO:'Colorado',CT:'Connecticut',DC:'Washington DC',DE:'Delaware',FL:'Florida',
    GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
    KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
    MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
    MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
    NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
    OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
    SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
    WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'
  };

  function computeCareerBenchmark() {
    var g        = window.G || {};
    var jobTitle = (g.jobTitle || '').trim();
    var jobtype  = g.jobtype   || 'private';
    var state    = g.state     || 'NY';
    var income   = g.income    || 0;

    // ── BLS fine-match (high confidence) ──────────────────────────
    var blsFine = (typeof _0x9120003 === 'function')
      ? _0x9120003(jobTitle, state)
      : null;

    // ── MARKET_WAGES title match ───────────────────────────────────
    var mwMatch = (typeof matchMarketWage === 'function')
      ? matchMarketWage(jobTitle, jobtype)
      : null;

    // ── Confidence tier ────────────────────────────────────────────
    // high   = BLS fine-match found
    // medium = MARKET_WAGES matched a real title (not a jobtype fallback)
    // null   = no title provided, or only a jobtype-category fallback
    var confidence;
    if (!jobTitle) {
      confidence = null;
    } else if (blsFine) {
      confidence = 'high';
    } else if (mwMatch && _JOBTYPE_KEYS.indexOf(mwMatch.key) === -1) {
      confidence = 'medium';
    } else {
      confidence = null;
    }

    // ── Build benchmark values ─────────────────────────────────────
    var stateAdj = (typeof STATE_SALARY_MULT !== 'undefined' && STATE_SALARY_MULT[state]) || 1.0;
    var median, p25, p75, growth, roleTitle, nextTierSalary, nextTierLabel, matched;

    if (blsFine) {
      median  = blsFine.median;
      p25     = blsFine.p25;
      p75     = blsFine.p75;
      growth  = blsFine.growth;
      matched = blsFine.matched;
      // Supplement with MARKET_WAGES for next-tier data if title matched
      if (mwMatch && mwMatch.data && _JOBTYPE_KEYS.indexOf(mwMatch.key) === -1) {
        roleTitle      = mwMatch.data.title;
        nextTierSalary = Math.round((mwMatch.data.nextTier || 0) * stateAdj) || Math.round(p75 * 1.15);
        nextTierLabel  = mwMatch.data.nextLabel || 'Next level';
      } else {
        roleTitle      = jobTitle;
        nextTierSalary = Math.round(p75 * 1.15);
        nextTierLabel  = 'Next level';
      }
    } else if (mwMatch && mwMatch.data) {
      var wage       = mwMatch.data;
      median         = Math.round(wage.national * stateAdj);
      p25            = Math.round(wage.p25 * stateAdj);
      p75            = Math.round(wage.p75 * stateAdj);
      growth         = null;
      matched        = mwMatch.key;
      roleTitle      = wage.title;
      nextTierSalary = Math.round(wage.nextTier * stateAdj);
      nextTierLabel  = wage.nextLabel || 'Next level';
    } else {
      g.careerBenchmark = null;
      return;
    }

    // ── Derived positioning ────────────────────────────────────────
    var gapFromMedian = median - income;
    var pctOfMedian   = income > 0 ? Math.round((income / median) * 100) : 0;
    var aboveMedian   = income > 0 && income >= median;

    // ── Plain-English lineage string ───────────────────────────────
    // Honest about basis (base salary only), state-aware, no overclaiming
    var stateName = _STATE_NAMES[state] || state || 'your area';
    var roleFor   = roleTitle || jobTitle || 'your role';
    var amtK      = Math.round(Math.abs(income - median) / 1000);
    var lineage;
    if (confidence === null) {
      lineage = 'Add or refine your title and work location to see your market positioning.';
    } else if (aboveMedian && amtK > 0) {
      lineage = 'About $' + amtK + 'k above the midpoint for ' + roleFor + ' roles in ' + stateName + ', base salary only.';
    } else if (!aboveMedian && amtK > 0) {
      lineage = 'About $' + amtK + 'k below the midpoint for ' + roleFor + ' roles in ' + stateName + ', base salary only.';
    } else {
      lineage = 'At the market midpoint for ' + roleFor + ' roles in ' + stateName + ', base salary only.';
    }

    g.careerBenchmark = {
      matched:        matched,
      roleTitle:      roleTitle,
      state:          state,
      stateAdj:       stateAdj,
      median:         median,
      p25:            p25,
      p75:            p75,
      growth:         growth,
      nextTierSalary: nextTierSalary,
      nextTierLabel:  nextTierLabel,
      gapFromMedian:  gapFromMedian,
      pctOfMedian:    pctOfMedian,
      aboveMedian:    aboveMedian,
      basis:          'state-adjusted benchmark',
      compBasis:      'base salary',
      confidence:     confidence,
      lineage:        lineage,
    };
  }

  window.computeCareerBenchmark = computeCareerBenchmark;

}());
