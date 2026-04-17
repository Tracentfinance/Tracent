/* ═══ Tracent Render: Home Tab ═══
   Board pass, modes, dashboard verdict, score alignment,
   next-best-move engine, score band display.
═══════════════════════════════════════════════ */

/* ═══ MODULE: Board Pass — onboarding completion + dashboard init ═══ */
(function(){
  if (window.__TRACENT_BOARD_PASS__) return;
  window.__TRACENT_BOARD_PASS__ = true;

  var style = document.createElement('style');
  style.textContent = `
    .tracent-authority-card,
    .tracent-mode-card{
      background: var(--white);
      border: 1px solid var(--gray-2);
      border-radius: var(--r-md);
      box-shadow: var(--shadow-sm);
      padding: 16px;
      margin-bottom: var(--s3);
    }
    .tracent-authority-head{
      display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;
    }
    .tracent-authority-title{
      font-size:15px;font-weight:700;color:var(--navy);margin-bottom:4px;
    }
    .tracent-authority-sub{
      font-size:12px;color:var(--gray-4);line-height:1.55;
    }
    .tracent-chip-row{display:flex;flex-wrap:wrap;gap:8px;}
    .tracent-mini-chip{
      padding:7px 10px;border-radius:999px;background:var(--gray-1);
      border:1px solid var(--gray-2);font-size:11px;font-weight:700;color:var(--gray-4);
    }
    .tracent-proof-list{display:flex;flex-direction:column;gap:10px;margin-top:14px;}
    .tracent-proof-row{
      display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;
      padding:12px 0;border-top:1px solid var(--gray-1);
    }
    .tracent-proof-row:first-child{border-top:none;padding-top:0;}
    .tracent-proof-meta{min-width:0;}
    .tracent-proof-label{font-size:13px;font-weight:700;color:var(--navy);margin-bottom:2px;}
    .tracent-proof-desc{font-size:12px;color:var(--gray-4);line-height:1.55;}
    .tracent-proof-score{
      min-width:54px;text-align:center;padding:8px 10px;border-radius:12px;background:var(--gray-1);
      font-size:12px;font-weight:700;color:var(--navy);
    }
    .tracent-mode-grid{
      display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px;
    }
    .tracent-mode-metric{
      background:var(--off-white);border:1px solid var(--gray-2);border-radius:14px;padding:12px;
    }
    .tracent-mode-metric-label{font-size:11px;font-weight:700;color:var(--gray-3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;}
    .tracent-mode-metric-value{font-size:15px;font-weight:700;color:var(--navy);}
    .tracent-mode-metric-note{font-size:12px;color:var(--gray-4);line-height:1.45;margin-top:4px;}
    .tracent-soft-note{
      font-size:12px;color:var(--gray-4);line-height:1.6;margin-top:12px;
    }
  `;
  document.head.appendChild(style);

  function fmtCurrency(n){
    var v = Number(n || 0);
    var abs = Math.round(Math.abs(v));
    return (v < 0 ? '-$' : '$') + abs.toLocaleString('en-US');
  }
  function safeText(el, text){ if (el) el.textContent = text; }

  function buildAuthorityCard(){
    if (!window.G || !G.scoreCategories) return;
    var host = document.getElementById('v21-authority-card');
    if (!host) {
      host = document.createElement('div');
      host.id = 'v21-authority-card';
      host.className = 'tracent-authority-card';
      // Insert after driver strip; fall back to appending to home tab panel
      var anchor = document.getElementById('v21-driver-strip');
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(host, anchor.nextSibling);
      } else {
        var tabHome = document.getElementById('tab-home');
        if (tabHome) tabHome.appendChild(host);
        else return; // truly cannot place — bail cleanly
      }
    }
    // Idempotency guard: skip re-render if score hasn't changed
    var lastScore = host.getAttribute('data-score');
    if (lastScore && lastScore === String(G.score || '')) return;
    host.setAttribute('data-score', String(G.score || ''));

    var cats = Object.values(G.scoreCategories || {});
    cats.sort(function(a,b){ return (b.weight||0) - (a.weight||0); });
    var top = cats.slice(0,5).map(function(cat){
      return `
        <div class="tracent-proof-row">
          <div class="tracent-proof-meta">
            <div class="tracent-proof-label">${cat.icon || '•'} ${cat.label} · ${cat.weight}% weight</div>
            <div class="tracent-proof-desc">${cat.value || ''}${cat.desc ? ' — ' + cat.desc : ''}</div>
          </div>
          <div class="tracent-proof-score">${cat.score}/100</div>
        </div>
      `;
    }).join('');

    var inferredArr = (Array.isArray(G._inferredFields) && G._inferredFields.length)
      ? G._inferredFields : [];
    // Filter to only show meaningful inferences (not trivial zeros or defaults for unused paths)
    var meaningfulInferences = inferredArr.filter(function(f){
      return f && f.indexOf('(entered as zero)') === -1;
    });
    var inferred = meaningfulInferences.length
      ? 'Inferred: ' + meaningfulInferences.length + ' field' + (meaningfulInferences.length === 1 ? '' : 's')
      : 'All inputs are real values';
    host.innerHTML = `
      <div class="tracent-authority-head">
        <div>
          <div class="tracent-authority-title">Why this score looks the way it does</div>
          <div class="tracent-authority-sub">Tracent should prove its logic, not ask for blind trust. This score is weighted from five visible factors below.</div>
        </div>
        <button onclick="openScoreBreakdown()" style="background:var(--sky-dim);border:1.5px solid var(--sky-border);color:var(--teal);padding:8px 12px;border-radius:999px;font:700 12px var(--font-body);cursor:pointer;white-space:nowrap;">Open score logic</button>
      </div>
      <div class="tracent-proof-list">${top}</div>
      <div class="tracent-soft-note">This is a Tracent planning score, not a lender credit score. Use it as a decision aid, not a guaranteed approval signal.</div>
    `;
  }

  function activeMode(){
    if (typeof G !== 'undefined' && G && G.v21Mode) return G.v21Mode;
    var active = document.querySelector('.v21-mode-btn.active');
    return active ? active.id.replace('mode-btn-','') : 'today';
  }

  function buildModeCard(mode){
    if (!window.G) return;
    var host = document.getElementById('v21-mode-context-card');
    if (!host) {
      host = document.createElement('div');
      host.id = 'v21-mode-context-card';
      host.className = 'tracent-mode-card';
      var rail = document.getElementById('v21-mode-rail');
      if (rail && rail.parentNode) rail.parentNode.insertBefore(host, rail.nextSibling);
      else return;
    }

    // Idempotency guard: skip re-render if mode hasn't changed
    var lastMode = host.getAttribute('data-mode');
    if (lastMode && lastMode === mode) return;
    host.setAttribute('data-mode', mode);

    var data = {
      today: {
        title:'Today mode',
        sub:'Lead with the single move that changes your near-term position the most.',
        metrics:[
          ['Score', (G.scoreFinal && G.score ? String(G.score) : (G.previewScoreMid ? 'Preview ~' + G.previewScoreMid : '—')), 'Real planning score (post-analysis)'],
          ['Free cash flow', (_hasTrustedCashflowInputs(G) ? fmtCurrency(G.fcf || 0) + '/mo' : '—'), 'Money left after core obligations'],
          ['Emergency fund', (G.emergency || 0) + ' mo', 'Shock absorber'],
          ['Debt pressure', fmtCurrency((G.ccDebt||0)+(G.carDebt||0)+(G.studentDebt||0)+(G.otherDebt||0)), 'Outstanding non-housing debt']
        ],
        note:'This mode should feel like mission control, not a static dashboard.'
      },
      home: {
        title:'Home mode',
        sub:'Make housing readiness explicit: affordability, cash-to-close, and stability.',
        metrics:[
          ['Housing status', G.housingType || '—', 'Current position'],
          ['Target price', (G.homePrice || G.targetHomePrice || G.purchasePrice ? fmtCurrency(G.homePrice || G.targetHomePrice || G.purchasePrice) : '—'), 'Tracked home target'],
          ['Saved for move', (G.depositSaved || G.downPayment ? fmtCurrency(G.depositSaved || G.downPayment) : '—'), 'Deposit / accessible cash'],
          ['DTI', (G.dti!=null ? G.dti + '%' : '—'), 'Debt-to-income pressure']
        ],
        note:'Home should feel like readiness engineering, not a generic score tab.'
      },
      debt: {
        title:'Debt mode',
        sub:'Make payoff order, payment pressure, and relief velocity obvious.',
        metrics:[
          ['Card debt', (G.ccDebt ? fmtCurrency(G.ccDebt) : '—'), 'Highest-interest pressure'],
          ['Total debt', fmtCurrency((G.ccDebt||0)+(G.carDebt||0)+(G.studentDebt||0)+(G.otherDebt||0)), 'Non-housing debt load'],
          ['Free cash flow', (_hasTrustedCashflowInputs(G) ? fmtCurrency(G.fcf || 0) + '/mo' : '—'), 'Amount available to attack balances'],
          ['Current DTI', (G.dti!=null ? G.dti + '%' : '—'), 'Lender pressure indicator']
        ],
        note:'Debt mode should feel like a pressure-release plan with ranked urgency.'
      },
      grow: {
        title:'Grow mode',
        sub:'Separate true investable surplus from money that still needs to become safety.',
        metrics:[
          ['Investable cash', (_hasTrustedCashflowInputs(G) ? fmtCurrency(Math.max(0, Math.round((G.fcf||0) * 0.35))) + '/mo' : '—'), 'Conservative deployable estimate'],
          ['Cash saved', (G.savingsAmt || G.depositSaved ? fmtCurrency((G.savingsAmt||0)+(G.depositSaved||0)) : '—'), 'Current liquid base'],
          ['Employer match', G.retMatch || 'unknown', 'Retirement capture status'],
          ['Net worth', fmtCurrency((G.savingsAmt||0)+(G.depositSaved||0)+(G.homeValue||0)-(G.balance||0)-(G.ccDebt||0)-(G.carDebt||0)-(G.studentDebt||0)-(G.otherDebt||0)), 'Assets minus liabilities']
        ],
        note:'Grow should feel like capital allocation, not vague encouragement.'
      },
      retire: {
        title:'Retire mode',
        sub:'Show whether short-term pressure is stealing from long-term compounding.',
        metrics:[
          ['Retirement match', G.retMatch || 'unknown', 'Contribution footing'],
          ['Liquid savings', (G.savingsAmt || G.depositSaved || G.retirementSavings ? fmtCurrency((G.savingsAmt||0)+(G.depositSaved||0)+(G.retirementSavings||0)) : '—'), 'Current reserve base'],
          ['Free cash flow', (_hasTrustedCashflowInputs(G) ? fmtCurrency(G.fcf || 0) + '/mo' : '—'), 'Capacity to increase contributions'],
          ['Debt load', fmtCurrency((G.ccDebt||0)+(G.carDebt||0)+(G.studentDebt||0)+(G.otherDebt||0)), 'Competes with retirement funding']
        ],
        note:'Retire should feel like long-horizon security planning, not a generic goal label.'
      }
    };

    var view = data[mode] || data.today;
    host.innerHTML = `
      <div class="tracent-authority-title">${view.title}</div>
      <div class="tracent-authority-sub">${view.sub}</div>
      <div class="tracent-mode-grid">
        ${view.metrics.map(function(m){
          return `<div class="tracent-mode-metric">
            <div class="tracent-mode-metric-label">${m[0]}</div>
            <div class="tracent-mode-metric-value">${m[1]}</div>
            <div class="tracent-mode-metric-note">${m[2]}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="tracent-soft-note">${view.note}</div>
    `;

    // If strategy block is the active surface, keep context card hidden
    var strat = document.getElementById('v21-mode-strategy');
    if (strat && strat.style.display !== 'none') {
      host.style.display = 'none';
      return;
    }
  }

  function shouldShowPremium(){
    try{
      var key = 'tracent_dashboard_seen_count';
      var count = Number(localStorage.getItem(key) || '0');
      return count >= 2;
    }catch(e){ return false; }
  }
  // Expose globally so the core render path can call it
  window.shouldShowPremium = shouldShowPremium;
  function incrementDashboardCount(){
    try{
      var key = 'tracent_dashboard_seen_count';
      var count = Number(localStorage.getItem(key) || '0') + 1;
      localStorage.setItem(key, String(count));
      return count;
    }catch(e){ return 1; }
  }

  var originalSetMode = window.v21SetMode;
  window.v21SetMode = function(mode, btn){
    if (typeof originalSetMode === 'function') originalSetMode(mode, btn);
    try { buildModeCard(mode || activeMode()); } catch(e) {}
  };

  window.v21ComputeRange = function(){
    var intent = (typeof G !== 'undefined' && G.primaryIntent) || 'stable';
    var signal = (typeof G !== 'undefined' && G.financialResilienceSignal) || 'somewhat';

    var baseMap = { stable:58, debt:52, home:57, grow:64, retire:60 };
    var signalShift = { completely:+12, very_well:+7, somewhat:+2, very_little:-6, not_at_all:-12 };
    var center = (baseMap[intent] || 58) + (signalShift[signal] || 0);
    var spread = signal === 'somewhat' ? 7 : ((signal === 'not_at_all' || signal === 'completely') ? 5 : 6);
    var rMin = Math.max(0, center - Math.floor(spread / 2));
    var rMax = Math.min(100, center + Math.ceil(spread / 2));
    var mid = Math.round((rMin + rMax) / 2);

    if (typeof G !== 'undefined') {
      G.previewScoreRangeMin = rMin;
      G.previewScoreRangeMax = rMax;
      G.previewScoreMid = mid;
      G.previewBand = (window.v21BandForScore ? v21BandForScore(mid).label : 'Estimated');
      G.scoreEstimated = true;
      G.scoreFinal = false;
      if (!G.scoreFinal) delete G.score;
    }

    if (typeof window.v21BuildPositionPreview === 'function') window.v21BuildPositionPreview(intent, signal);

    document.dispatchEvent(new CustomEvent('tracent:scoreComputed', {
      detail: { previewScore: mid, min: rMin, max: rMax, estimated: true, final: false }
    }));
  };

  window.v21ComputeDrivers = function(){
    if (window.G && G.scoreCategories) {
      var cats = Object.values(G.scoreCategories).sort(function(a,b){ return (b.score||0)-(a.score||0); });
      var strong = cats.filter(function(c){ return (c.score||0) >= 70; }).slice(0,2).map(function(c){
        return { text: '+' + Math.round((c.weight||0)/10) + ' ' + c.label.toLowerCase(), type: 'positive' };
      });
      var weak = cats.filter(function(c){ return (c.score||0) < 60; }).slice(0,2).map(function(c){
        return { text: '-' + Math.max(2, Math.round((c.weight||0)/10)) + ' ' + c.label.toLowerCase(), type: 'negative' };
      });
      var drivers = strong.concat(weak);
      if (!drivers.length) drivers.push({ text: '± score stable across factors', type: 'neutral' });
      return drivers.slice(0,4);
    }
    return [{ text: '± waiting for full inputs', type: 'neutral' }];
  };

  var originalRenderPost = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function(){
    if (typeof originalRenderPost === 'function') originalRenderPost();
    incrementDashboardCount();

    if (window.G) { G.lastComputedAt = Date.now(); G._bridgeRanAt = Date.now(); }
    try { buildAuthorityCard(); } catch(e) {}
    try { buildModeCard(activeMode()); } catch(e) {}

    // Premium teaser already handled by core v21RenderPostAnalysis (via shouldShowPremium).
    // The override only needs to increment the counter — display is already set correctly.
    // (No-op here — avoids double-setting and keeps a single source of truth.)

    var retentionCard = document.getElementById('v21-retention-card');
    if (retentionCard) {
      var title = retentionCard.querySelector('.card-title, .card-eyebrow + .card-title');
      if (!title) {
        var eyebrow = retentionCard.querySelector('.card-eyebrow');
        if (eyebrow) eyebrow.textContent = 'Keep your position moving';
      }
    }
  };

  window.showPaywall = function(feature){
    var overlay = document.getElementById('paywall-overlay');
    var titleEl = document.getElementById('paywall-feature-title');
    var subEl = document.getElementById('paywall-feature-sub');
    var ctaEl = document.getElementById('paywall-cta-label');
    if (titleEl) titleEl.textContent = 'Tracent Edge';
    if (subEl) subEl.textContent = 'Keep the free dashboard focused first. Edge should extend continuity: saved scenarios, deeper reviews, guided planning, and AI explanations.';
    if (ctaEl) ctaEl.textContent = 'Join Edge waitlist →';
    if (overlay) {
      overlay.style.display = 'flex';
      requestAnimationFrame(function(){ overlay.classList.add('open'); });
    }
    window._paywallTarget = feature || 'edge';
  };

  window.unlockPremium = function(){
    var hasRealStripe = typeof window._stripeMonthlyLink === 'string' && window._stripeMonthlyLink && window._stripeMonthlyLink !== 'YOUR_MONTHLY_LINK';
    if (hasRealStripe) {
      window.open(window._stripeMonthlyLink, '_blank');
      return;
    }
    var subEl = document.getElementById('paywall-feature-sub');
    if (subEl) subEl.textContent = 'No live checkout is configured in this build. Replace the Stripe link before selling Edge, or swap this CTA to a waitlist / request-access action.';
    if (typeof window.v21ShowToast === 'function') window.v21ShowToast('No live checkout configured in this build');
  };

  document.addEventListener('DOMContentLoaded', function(){
    var signTitle = document.querySelector('#signin-overlay .signin-title');
    var signSub = document.querySelector('#signin-overlay .signin-sub');
    if (signTitle) signTitle.textContent = 'Use Tracent locally';
    if (signSub) signSub.textContent = 'This build stores your data on this device. Cloud sync and real accounts are not enabled yet.';
    var signBtns = document.querySelectorAll('#signin-overlay button');
    if (signBtns[0]) signBtns[0].textContent = 'Start locally →';
    if (signBtns[1]) signBtns[1].textContent = 'Close';

    var disclaimer = document.querySelector('#v21-phase-range .v21-disclaimer');
    if (disclaimer) disclaimer.textContent = 'This preview is directional. Your real dashboard score is calculated only after you enter actual numbers.';

    var premiumSub = document.querySelector('#v21-premium-teaser .v21-premium-sub');
    if (premiumSub) premiumSub.textContent = 'Tracent Edge helps you keep improving your position with deeper reviews, saved scenarios, and contextual guidance built around your numbers.';
  });
})();


/* ═══ MODULE: Modes Pass — mode rail + mode switching logic ═══ */
(function(){
  if (window.__TRACENT_MODES_PASS__) return;
  window.__TRACENT_MODES_PASS__ = true;

  /* ── helpers ────────────────────────────────────────── */
  function fmt(n, compact){
    var v = Number(n||0), abs = Math.abs(Math.round(v));
    var sign = v < 0 ? '-$' : '$';
    if (compact && abs >= 1000000) return sign + (abs/1000000).toFixed(1) + 'M';
    if (compact && abs >= 1000)    return sign + (abs/1000).toFixed(1)    + 'k';
    return sign + abs.toLocaleString('en-US');
  }
  function months(n){ n = Math.round(n||0); return n <= 0 ? '—' : n < 12 ? n+'mo' : (n/12).toFixed(1)+'yr'; }
  function pct(n)   { return n == null ? '—' : Math.round(n) + '%'; }

  function _g(){ return window.G || null; }

  /* ── Trust guards ──────────────────────────────────────────────────────
     The legacy engine uses $1500 rent and $800 expense fallbacks when inputs are empty.
     FCF and DTI derived from those fallbacks must never reach the user as real numbers.
     Use these helpers to gate every visible FCF / DTI / readiness display. */
  function _hasTrustedCashflowInputs(g) {
    g = g || {};
    var hasIncome    = Number(g.income || 0) > 0 || Number(g.takeHome || 0) > 0;
    var rentMissing  = g.rentAmount_meta === 'missing' ||
                       g.currentRent_meta === 'missing' ||
                       g.rent_meta === 'missing';
    var expMissing   = g.expenses_meta === 'missing';
    return !!hasIncome && !rentMissing && !expMissing;
  }
  function _hasTrustedDTIInputs(g) {
    g = g || {};
    return Number(g.income || 0) > 0;
  }

  /* ── Home metrics helper — shared by buildHomeStrategy + _buildHomeHero ── */
  function _calcHomeMetrics(g) {
    var takeHome = (g.homeIncomeMode === 'household' && g.homeHouseholdTakeHome > 0)
      ? g.homeHouseholdTakeHome
      : g.takeHome || (function(){var i=g.income||0;if(!i)return 0;var s=(window.STATE_TAX&&g.state)?((window.STATE_TAX)[g.state]||0):0,f=i<=11600?i*0.10:i<=47150?1160+(i-11600)*0.12:i<=100525?5426+(i-47150)*0.22:i<=191950?17169+(i-100525)*0.24:39111+(i-191950)*0.32;f=Math.max(0,f-14600*0.12);var c=Math.min(i,168600)*0.062+i*0.0145;return Math.round(Math.max(i*0.5,i-f-c-i*s)/12)})();
    var targetPrice  = g.homePrice || g.targetHomePrice || g.purchasePrice || 0;
    var depositSaved = g.depositSaved || g.downPayment || 0;
    var depositNeed  = targetPrice * 0.10;
    var closingEst   = Math.round(targetPrice * 0.03);
    var cashToClose  = Math.max(0, depositNeed + closingEst - depositSaved);
    var depositGap   = Math.max(0, depositNeed - depositSaved);
    var creditRates  = { excellent:0, good:0.20, fair:0.50, below:1.20, poor:2.10, unknown:0.35 };
    var creditPrem   = creditRates[g.credit || 'unknown'] || 0;
    var estRate      = (g.marketRate || 6.72) + creditPrem;
    var loanAmt      = Math.max(0, targetPrice - Math.max(depositSaved, depositNeed));
    var pi = loanAmt > 0 ? (function(){
      var r = (estRate/100)/12, n = 360;
      return Math.round((loanAmt * r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1));
    })() : 0;
    var dtiAfter = takeHome > 0 ? Math.round(((pi + (g.carPayment||0) + (g.otherPayment||0) + Math.max(0,(g.ccDebt||0)*0.02)) / takeHome)*100) : 0;
    return { takeHome:takeHome, targetPrice:targetPrice, depositSaved:depositSaved,
             depositNeed:depositNeed, depositGap:depositGap, closingEst:closingEst,
             cashToClose:cashToClose, creditPrem:creditPrem, estRate:estRate,
             loanAmt:loanAmt, pi:pi, dtiAfter:dtiAfter };
  }
  window._calcHomeMetrics = _calcHomeMetrics;

  /* ═══════════════════════════════════════════════════════
     SECTION 1 — MODE STRATEGY BLOCKS
     Each builder returns an HTML string for the top card.
  ═══════════════════════════════════════════════════════ */

  function buildHomeStrategy(){
    var g = _g(); if(!g) return '';
    var m            = _calcHomeMetrics(g);
    var takeHome     = m.takeHome;
    var targetPrice  = m.targetPrice;
    var depositSaved = m.depositSaved;
    var depositNeed  = m.depositNeed;
    var depositGap   = m.depositGap;
    var closingEst   = m.closingEst;
    var cashToClose  = m.cashToClose;
    var creditPrem   = m.creditPrem;
    var estRate      = m.estRate;
    var pi           = m.pi;
    var dtiAfter     = m.dtiAfter;
    var fcf          = g.fcf || 0;
    var _trustedCFHome = _hasTrustedCashflowInputs(g);
    var _trustedDTIHome = _hasTrustedDTIInputs(g);
    var savingCapacity = _trustedCFHome ? Math.max(0, Math.round(fcf * 0.50)) : 0;
    var moToReady    = savingCapacity > 0 && cashToClose > 0 ? Math.ceil(cashToClose / savingCapacity) : 0;
    var depositPct   = depositNeed > 0 ? Math.min(100, Math.round((depositSaved / depositNeed)*100)) : 0;
    var dtiOk    = _trustedDTIHome && dtiAfter <= 43;
    var readinessSignal = (!_trustedDTIHome) ? 'Add income to show readiness' :
                          depositPct >= 100 && dtiOk ? 'Ready to apply' :
                          depositPct >= 75  ? 'Almost there' :
                          depositPct >= 50  ? 'Building momentum' : 'Early stage';
    var readinessColor  = (!_trustedDTIHome) ? 'var(--gray-3)' :
                          depositPct >= 100 && dtiOk ? 'var(--green)' :
                          depositPct >= 50 ? 'var(--amber)' : 'var(--red)';

    var whatChangesReadiness = (function(){
      if (!_trustedDTIHome) return 'Add income to show lender-style DTI and readiness timeline.';
      if (dtiAfter > 50) return 'Lowering your debt load is the single fastest path — at '+pct(dtiAfter)+' DTI, lenders will pause the application.';
      if (depositPct < 50) return 'Deposit is the bottleneck. You need '+fmt(cashToClose,true)+' more.' + (_trustedCFHome && savingCapacity > 0 ? ' At '+fmt(savingCapacity,true)+'/mo — that\'s '+months(moToReady)+' away.' : ' Add spending details to estimate timeline.');
      if (creditPrem > 0.5) return 'Improving your credit band by one tier cuts your rate by ~'+creditPrem.toFixed(1)+'% — saving '+fmt(Math.round(pi * creditPrem / estRate))+'/mo.';
      if (dtiAfter > 36 && dtiAfter <= 43) return 'You qualify now but at '+pct(dtiAfter)+' DTI lenders will offer tighter terms. Clearing one debt before applying improves both rate and approval confidence.';
      return 'Your readiness position is solid. Get three lender quotes before committing to any rate.';
    })();

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="background:rgba(0,119,182,0.10);color:var(--teal);">Home Mode — Readiness Engineering</div>' +
      '<div class="tracent-mode-readiness-bar"><div class="tracent-mode-readiness-label">Deposit progress</div>' +
        '<div class="tracent-mode-bar-track"><div class="tracent-mode-bar-fill" style="width:'+depositPct+'%;background:'+readinessColor+'"></div></div>' +
        '<div class="tracent-mode-bar-meta"><span style="color:'+readinessColor+';font-weight:700;">'+depositPct+'%</span> of 10% target · <span style="font-weight:700;">'+readinessSignal+'</span></div>' +
      '</div>' +
      '<div class="tracent-mode-grid-3">' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Cash-to-close gap</div><div class="tracent-mode-cell-value" style="color:'+(cashToClose>0?'var(--red)':'var(--green)')+'">'+fmt(cashToClose,true)+'</div><div class="tracent-mode-cell-note">'+(cashToClose>0?'Deposit + closing costs still needed':'Fully funded')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">DTI if you buy</div><div class="tracent-mode-cell-value" style="color:'+(_trustedDTIHome?(dtiOk?'var(--teal)':'var(--red)'):'var(--gray-3)')+'">'+(_trustedDTIHome?pct(dtiAfter):'—')+'</div><div class="tracent-mode-cell-note">'+(_trustedDTIHome?(dtiOk?'Lender-qualifying':'Above 43% threshold'):'Add income to calculate')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Months to ready</div><div class="tracent-mode-cell-value">'+(_trustedCFHome?months(moToReady):'—')+'</div><div class="tracent-mode-cell-note">'+(_trustedCFHome?(moToReady>0?'At current saving pace':'Already there'):'Add housing &amp; spending details')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Est. monthly PITI</div><div class="tracent-mode-cell-value">'+(targetPrice > 0 ? fmt(pi,true)+'/mo' : '\u2014')+'</div><div class="tracent-mode-cell-note">'+(targetPrice > 0 ? 'At '+estRate.toFixed(2)+'% \u00b7 '+g.credit+' credit' : 'Add a target price to estimate')+'</div></div>' +
      '</div>' +
      '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">What changes readiness fastest</div><div class="tracent-mode-insight-text">'+whatChangesReadiness+'</div></div>' +
      (g.homeIncomeMode === 'household' && g.homeHouseholdTakeHome > 0
        ? '<div class="tracent-mode-income-ctx">Based on the income supporting this purchase</div>'
        : '') +
    '</div>';
  }

  function buildDebtStrategy(){
    var g = _g(); if(!g) return '';
    var debts = [];
    if ((g.ccDebt||0)>0)      debts.push({ name:'Credit card',   bal:g.ccDebt,     rate:g.ccRate||21, pmt:Math.max(25,Math.round((g.ccDebt||0)*0.02)) });
    if ((g.carDebt||0)>0)     debts.push({ name:'Car loan',      bal:g.carDebt,    rate:7.5,           pmt:g.carPayment||300 });
    if ((g.studentDebt||0)>0) debts.push({ name:'Student loan',  bal:g.studentDebt,rate:5.5,           pmt:g.studentPayment||Math.max(g.studentDebt*0.01,100) });
    if ((g.otherDebt||0)>0)   debts.push({ name:'Other',         bal:g.otherDebt,  rate:9.0,           pmt:g.otherPayment||150 });
    debts.sort(function(a,b){ return b.rate - a.rate; }); // avalanche

    var totalDebt    = debts.reduce(function(s,d){ return s+d.bal; }, 0);
    var totalPmt     = debts.reduce(function(s,d){ return s+d.pmt; }, 0);
    var annualInt    = debts.reduce(function(s,d){ return s + d.bal*(d.rate/100); }, 0);
    var fcf          = g.fcf || 0;
    var takeHome     = g.takeHome || 0;
    var debtPctIncome= takeHome > 0 ? Math.round((totalPmt / takeHome)*100) : null;
    var _trustedCFDebt = _hasTrustedCashflowInputs(g);
    var extraCapacity= _trustedCFDebt ? Math.max(0, Math.round(fcf * 0.40)) : 0;
    var top          = debts[0] || null;
    var cashFreedNext= top ? top.pmt : 0;
    var moToPayTop   = top && (top.pmt + extraCapacity) > 0 ? Math.ceil(top.bal / (top.pmt + extraCapacity)) : 0;

    var cashFreedInsight = top
      ? 'Clearing your '+top.name+' ('+fmt(top.bal,true)+' at '+top.rate+'%) frees '+fmt(cashFreedNext)+'/mo permanently. At current pace that\'s '+months(moToPayTop)+'.'
      : 'No consumer debt recorded — all free cash flow is available to deploy toward goals.';

    var rankRows = debts.slice(0,4).map(function(d,i){
      var moToGo = d.pmt > 0 ? Math.ceil(d.bal / (d.pmt + (i===0 ? extraCapacity : 0))) : 999;
      return '<div class="tracent-debt-row">' +
        '<div class="tracent-debt-rank" style="background:'+(i===0?'rgba(0,168,232,0.15)':'var(--gray-1)')+';color:'+(i===0?'var(--teal)':'var(--gray-4)')+'">'+String(i+1)+'</div>' +
        '<div class="tracent-debt-body"><div class="tracent-debt-name">'+d.name+'</div><div class="tracent-debt-detail">'+d.rate+'% APR · '+fmt(d.pmt)+'/mo minimum</div></div>' +
        '<div class="tracent-debt-right"><div class="tracent-debt-bal">'+fmt(d.bal,true)+'</div><div class="tracent-debt-time">'+months(moToGo)+'</div></div>' +
      '</div>';
    }).join('');

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="background:rgba(239,68,68,0.10);color:var(--red);">Debt Mode — Pressure-Release Plan</div>' +
      '<div class="tracent-debt-summary">' +
        '<div class="tracent-mode-grid-3">' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Total debt</div><div class="tracent-mode-cell-value">'+fmt(totalDebt,true)+'</div><div class="tracent-mode-cell-note">Non-housing only</div></div>' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Monthly drag</div><div class="tracent-mode-cell-value" style="color:var(--red)">'+(g.takeHome > 0 ? pct(debtPctIncome)+' of income' : fmt(totalPmt)+'/mo')+'</div><div class="tracent-mode-cell-note">'+fmt(totalPmt)+'/mo minimums</div></div>' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Annual interest</div><div class="tracent-mode-cell-value" style="color:var(--red)">'+fmt(annualInt,true)+'</div><div class="tracent-mode-cell-note">Cost of carrying this debt</div></div>' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Extra capacity</div><div class="tracent-mode-cell-value" style="color:'+(_trustedCFDebt?'var(--teal)':'var(--gray-3)')+'">'+(_trustedCFDebt?fmt(extraCapacity)+'/mo':'—')+'</div><div class="tracent-mode-cell-note">'+(_trustedCFDebt?'40% of free cash flow':'Add spending details to calculate')+'</div></div>' +
        '</div>' +
      '</div>' +
      (debts.length > 0 ? '<div class="tracent-debt-list"><div class="tracent-mode-section-label">Ranked payoff order (avalanche)</div>'+rankRows+'</div>' : '') +
      '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">Cash freed next</div><div class="tracent-mode-insight-text">'+cashFreedInsight+'</div></div>' +
    '</div>';
  }

  function buildGrowStrategy(){
    var g = _g(); if(!g) return '';
    var takeHome     = g.takeHome || 0;
    var fcf          = g.fcf || 0;
    var efMonths     = parseInt(g.emergency || '0');
    var efTarget     = 3;
    var efSufficient = efMonths >= efTarget;
    var totalDebt    = (g.ccDebt||0)+(g.carDebt||0)+(g.studentDebt||0)+(g.otherDebt||0);
    var debtFree     = totalDebt === 0;
    var matchStatus  = g.retMatch || 'none';
    var matchCapture = matchStatus === 'full' || matchStatus === 'maxed';
    var savings      = (g.savingsAmt||0)+(g.depositSaved||0);

    // True investable surplus: FCF minus what should go to safety/debt first
    var _trustedCFGrow = _hasTrustedCashflowInputs(g);
    var debtDrag     = (_trustedCFGrow && totalDebt > 0) ? Math.min(fcf * 0.4, Math.max((g.ccDebt||0)*0.02 + (g.carPayment||0), 0)) : 0;
    var efBuild      = (_trustedCFGrow && !efSufficient) ? Math.min(fcf * 0.5, Math.max(0, (takeHome * efTarget) - savings)) / 6 : 0;
    var investable   = _trustedCFGrow ? Math.max(0, Math.round(fcf - debtDrag - efBuild)) : 0;
    var investablePct= (takeHome > 0 && _trustedCFGrow) ? Math.round((investable/takeHome)*100) : 0;

    var safetyGrade = efSufficient && debtFree ? 'Safety sufficient' :
                      efSufficient && !debtFree ? 'Safety ok, debt drag present' :
                      'Build safety first';
    var safetyColor = efSufficient && debtFree ? 'var(--green)' :
                      efSufficient ? 'var(--amber)' : 'var(--red)';

    var allocationInsight = (function(){
      if (!efSufficient) return 'Emergency fund is at '+efMonths+' months — reach '+efTarget+' before committing capital elsewhere. Every $1 invested with no buffer is borrowed risk.';
      if (!matchCapture && matchStatus !== 'none') return 'Employer match is not fully captured. That\'s an immediate 50–100% return — no investment beats it. Capture the full match before allocating anywhere else.';
      if (!debtFree && (g.ccDebt||0) > 0) return 'Credit card debt at '+(g.ccRate||21)+'% is a guaranteed negative return. Paying it off is equivalent to a '+(g.ccRate||21)+'% risk-free investment. Clear it before building an investment position.';
      if (!_trustedCFGrow) return 'Complete your housing and spending details to see how much is genuinely deployable.';
      if (investable > 0) return 'After safety and debt obligations, '+fmt(investable)+'/mo is genuinely deployable. A low-cost index fund with this amount, invested monthly, compounds meaningfully over time without taking on unnecessary complexity.';
      return 'Your cash flow is tight right now. The highest-leverage move is reducing a fixed obligation — even small FCF improvements compound quickly into investable capacity.';
    })();

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="background:rgba(16,185,129,0.10);color:var(--green);">Grow Mode — Capital Allocation</div>' +
      '<div class="tracent-mode-grid-3">' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Safety check</div><div class="tracent-mode-cell-value" style="color:'+safetyColor+'">'+safetyGrade+'</div><div class="tracent-mode-cell-note">Emergency fund: '+efMonths+' of '+efTarget+' months</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">True investable</div><div class="tracent-mode-cell-value" style="color:'+(investable>0?'var(--teal)':'var(--red)')+'">'+fmt(investable)+'/mo</div><div class="tracent-mode-cell-note">After safety + debt obligations</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Employer match</div><div class="tracent-mode-cell-value" style="color:'+(matchCapture?'var(--green)':'var(--amber)')+'">'+matchStatus+'</div><div class="tracent-mode-cell-note">'+(matchCapture?'Fully captured — max free return':'Check contribution rate')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Liquid base</div><div class="tracent-mode-cell-value">'+fmt(savings,true)+'</div><div class="tracent-mode-cell-note">Cash available before investing</div></div>' +
      '</div>' +
      '<div class="tracent-mode-grow-tiers">' +
        '<div class="tracent-mode-section-label">Allocation priority order</div>' +
        '<div class="tracent-grow-tier '+(efSufficient?'done':'active')+'"><span class="tracent-grow-tier-n">1</span><span>Emergency fund to '+efTarget+' months</span><span class="tracent-grow-tier-status">'+(efSufficient?'Done':'Current priority')+'</span></div>' +
        '<div class="tracent-grow-tier '+(matchCapture?'done':efSufficient?'active':'locked')+'"><span class="tracent-grow-tier-n">2</span><span>Capture full employer match</span><span class="tracent-grow-tier-status">'+(matchCapture?'Done':efSufficient?'Next':'Locked')+'</span></div>' +
        '<div class="tracent-grow-tier '+(debtFree?'done':(efSufficient&&matchCapture)?'active':'locked')+'"><span class="tracent-grow-tier-n">3</span><span>Clear high-rate debt</span><span class="tracent-grow-tier-status">'+(debtFree?'Done':(efSufficient&&matchCapture)?'Next':'Locked')+'</span></div>' +
        '<div class="tracent-grow-tier '+(investable>0&&debtFree&&efSufficient?'active':'locked')+'"><span class="tracent-grow-tier-n">4</span><span>Deploy '+fmt(investable)+'/mo into index fund</span><span class="tracent-grow-tier-status">'+(investable>0&&debtFree&&efSufficient?'Ready to start':'Locked')+'</span></div>' +
      '</div>' +
      '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">Capital allocation logic</div><div class="tracent-mode-insight-text">'+allocationInsight+'</div></div>' +
      '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--gray-2);">' +
        '<button onclick="if(typeof openSettingsEdit===\'function\')openSettingsEdit(\'assets\')" style="width:100%;padding:11px;background:var(--navy);color:white;border:none;border-radius:var(--r-sm);font-family:var(--font-body);font-size:13px;font-weight:700;cursor:pointer;letter-spacing:0.01em;">' +
          (savings > 0 ? 'Edit assets &amp; capacity \u2192' : 'Add assets &amp; capacity \u2192') +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function buildRetireStrategy(){
    var g = _g(); if(!g) return '';
    var income       = g.income || 0;
    var fcf          = g.fcf || 0;
    var matchStatus  = g.retMatch || 'none';
    var matchCapture = matchStatus === 'full' || matchStatus === 'maxed';
    var totalDebt    = (g.ccDebt||0)+(g.carDebt||0)+(g.studentDebt||0)+(g.otherDebt||0);
    var annualInt    = totalDebt > 0 ? Math.round((g.ccDebt||0)*(g.ccRate||21)/100 + (g.carDebt||0)*0.075 + (g.studentDebt||0)*0.055 + (g.otherDebt||0)*0.09) : 0;
    var isRetired    = g.retirementStage === 'retired';

    // Projection gate: income alone does not support accumulation projections
    var hasProjectionData = (g.retireSavings > 0) || (g.retirementSavings > 0)
      || (g.savingsAmt > 0) || (g.depositSaved > 0)
      || (g.pensionIncome > 0);
    var canProject = !isRetired && income > 0 && hasProjectionData;

    // FV helper — only called when canProject
    function fv(monthlyPmt, years){ var r = 0.07/12, n = years*12; return Math.round(monthlyPmt * ((Math.pow(1+r,n)-1)/r)); }

    var debtDragFV = (annualInt > 0 && !isRetired) ? fv(Math.round(annualInt/12), 30) : 0;

    // ── Already-retired branch ─────────────────────────────────
    if (isRetired) {
      var efMonths = parseInt(g.emergency || '0');
      var incSrc   = g.retirementIncomeSource || null;
      var incSrcLabel = { social_security:'Social Security', pension:'Pension income', withdrawals:'Savings / investments', combination:'Multiple sources' }[incSrc] || '—';
      var stabilityLabel = totalDebt === 0 ? 'Stable' : 'Debt present — review';
      var stabilityColor = totalDebt === 0 ? 'var(--green)' : 'var(--amber)';
      var insight = totalDebt > 0
        ? 'Your debt costs '+fmt(annualInt,true)+'/yr in interest. In retirement, this directly reduces available income. Clearing it improves monthly cash flow by '+fmt(Math.round(annualInt/12))+'.'
        : efMonths < 6
        ? 'Maintain at least 6 months of liquid savings as a buffer. This protects your portfolio from forced drawdowns during unexpected costs.'
        : 'Your position is stable. Consistent withdrawal discipline and an annual review are the most important things now.';

      return '<div class="tracent-mode-header">' +
        '<div class="tracent-mode-badge" style="background:rgba(0,119,182,0.10);color:#0077B6;">Retire Mode — Retirement Stability</div>' +
        '<div class="tracent-mode-grid-3">' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Income source</div><div class="tracent-mode-cell-value">'+incSrcLabel+'</div><div class="tracent-mode-cell-note">Primary retirement income</div></div>' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Position</div><div class="tracent-mode-cell-value" style="color:'+stabilityColor+'">'+stabilityLabel+'</div><div class="tracent-mode-cell-note">Overall stability signal</div></div>' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Emergency buffer</div><div class="tracent-mode-cell-value" style="color:'+(efMonths>=6?'var(--green)':efMonths>=3?'var(--amber)':'var(--red)')+'">'+efMonths+' mo</div><div class="tracent-mode-cell-note">'+(efMonths>=6?'Strong buffer':'Build to 6+ months')+'</div></div>' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Debt drag (annual)</div><div class="tracent-mode-cell-value" style="color:'+(annualInt>0?'var(--red)':'var(--green)')+'">'+fmt(annualInt,true)+'</div><div class="tracent-mode-cell-note">'+(annualInt>0?'Reduces monthly income':'No debt drag')+'</div></div>' +
        '</div>' +
        '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">What matters most now</div><div class="tracent-mode-insight-text">'+insight+'</div></div>' +
      '</div>';
    }

    // ── Pre-retirement / working branch ────────────────────────
    var trajectoryLabel = matchCapture && !totalDebt ? 'On track' :
                          matchCapture ? 'Debt drag present' :
                          'Below ideal pace';
    var trajectoryColor = matchCapture && !totalDebt ? 'var(--green)' :
                          matchCapture ? 'var(--amber)' : 'var(--red)';

    var currentContrib = income > 0 ? Math.round(income * 0.06) : 0;
    var idealContrib   = income > 0 ? Math.round(income * 0.15) : 0;
    var monthlyContrib = Math.round(currentContrib / 12);
    var monthlyIdeal   = Math.round(idealContrib / 12);
    var fvCurrent      = canProject ? fv(monthlyContrib, 30) : 0;
    var fvIdeal        = canProject ? fv(monthlyIdeal, 30) : 0;
    var contribGap     = Math.max(0, idealContrib - currentContrib);

    var futureImpact = (function(){
      if (!matchCapture && matchStatus !== 'none') {
        var matchExtra = canProject ? ' Over 30 years at 7%, capturing it fully could add significantly to your projected balance.' : '';
        return 'Your employer match is not fully captured. That\'s an immediate 50–100% guaranteed return.' + matchExtra;
      }
      if (totalDebt > 0 && annualInt > 500) {
        return 'Your debt costs '+fmt(annualInt,true)+'/yr in interest.'+(debtDragFV > 0 ? ' That same capital invested monthly would compound to '+fmt(debtDragFV,true)+' over 30 years.' : ' Clearing it frees capital for compounding.');
      }
      if (canProject && contribGap > 0) return 'At your current rate, you\'re on a path toward ~'+fmt(fvCurrent,true)+' in 30 years. At the 15% ideal rate, that grows to ~'+fmt(fvIdeal,true)+'. The gap is '+fmt(contribGap,true)+'/yr.';
      if (!canProject && income > 0) return 'Add your retirement savings or portfolio balance to see a projection of where your plan is heading.';
      if (income === 0) return 'Add your income and retirement savings to see how your plan is tracking.';
      return 'Your retirement trajectory looks solid. Consistency over time is the most important lever now.';
    })();

    var projCell = canProject
      ? '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Est. 30-yr projection</div><div class="tracent-mode-cell-value">'+fmt(fvCurrent,true)+'</div><div class="tracent-mode-cell-note">Illustrative \u00b7 at current pace \u00b7 7% avg</div></div>'
      : '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Est. 30-yr projection</div><div class="tracent-mode-cell-value">\u2014</div><div class="tracent-mode-cell-note">Add retirement savings to project</div></div>';

    var contribBars = income > 0
      ? '<div class="tracent-retire-compare">' +
          '<div class="tracent-mode-section-label">Contribution comparison</div>' +
          '<div class="tracent-retire-bar-row"><span>Current rate</span><div class="tracent-retire-bar-track"><div class="tracent-retire-bar-fill" style="width:'+Math.min(100,Math.round((currentContrib/Math.max(idealContrib,1))*100))+'%;background:var(--teal)"></div></div><span>'+fmt(currentContrib,true)+'/yr</span></div>' +
          '<div class="tracent-retire-bar-row"><span>Ideal (15%)</span><div class="tracent-retire-bar-track"><div class="tracent-retire-bar-fill" style="width:100%;background:var(--green)"></div></div><span>'+fmt(idealContrib,true)+'/yr</span></div>' +
        '</div>'
      : '';

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="background:rgba(0,119,182,0.10);color:#0077B6;">Retire Mode — Long-Horizon Security</div>' +
      '<div class="tracent-mode-grid-3">' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Trajectory signal</div><div class="tracent-mode-cell-value" style="color:'+trajectoryColor+'">'+trajectoryLabel+'</div><div class="tracent-mode-cell-note">Based on match + debt position</div></div>' +
        projCell +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Employer match</div><div class="tracent-mode-cell-value" style="color:'+(matchCapture?'var(--green)':'var(--amber)')+'">'+matchStatus+'</div><div class="tracent-mode-cell-note">'+(matchCapture?'Fully captured':'Not fully captured')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Debt drag (annual)</div><div class="tracent-mode-cell-value" style="color:'+(annualInt>0?'var(--red)':'var(--green)')+'">'+fmt(annualInt,true)+'</div><div class="tracent-mode-cell-note">'+(annualInt>0?'Competing with contributions':'No debt drag')+'</div></div>' +
      '</div>' +
      contribBars +
      '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">Future impact</div><div class="tracent-mode-insight-text">'+futureImpact+'</div></div>' +
    '</div>';
  }

  function buildTodayStrategy(){
    var g = _g(); if(!g) return '';
    var score    = (g.scoreFinal && g.score) ? g.score : null;
    var fcf      = g.fcf || 0;
    var efMonths = parseInt(g.emergency || '0');
    var totalDebt= (g.ccDebt||0)+(g.carDebt||0)+(g.studentDebt||0)+(g.otherDebt||0);
    var dtiVal   = g.dti != null ? g.dti : 0;

    var topPriority = (function(){
      if (fcf < 0 && _hasTrustedCashflowInputs(g)) return { label:'Budget deficit', desc:'Spending exceeds take-home by '+fmt(Math.abs(fcf))+'/mo. This must be resolved before any other goal.', color:'var(--red)' };
      if (efMonths === 0 && g.emergency != null) return { label:'Build emergency fund', desc:'No buffer means any unexpected cost becomes a financial crisis. Even $1,000 changes the risk profile.', color:'var(--amber)' };
      if ((g.ccDebt||0)>2000) return { label:'Attack credit card balance', desc:fmt(g.ccDebt||0)+' at '+(g.ccRate != null ? g.ccRate : '—')+'% APR'+( g.ccRate != null ? ' costs '+fmt(Math.round((g.ccDebt||0)*(g.ccRate)/100/12))+'/mo in interest' : '')+'. Clearing it is a guaranteed return.', color:'var(--amber)' };
      if (dtiVal > 43)      return { label:'DTI above lender threshold', desc:'At '+pct(dtiVal)+' DTI, mortgage applications will be challenged. Reduce debt before applying.', color:'var(--amber)' };
      if (score && score >= 70) return { label:'Strong position — optimise', desc:'Your financial foundation is solid. The next move is directing surplus toward your primary goal.', color:'var(--green)' };
      return { label:'Tighten cash flow', desc:'Your position has room to improve. Start by mapping where every dollar of FCF actually goes each month.', color:'var(--teal)' };
    })();

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="color:rgba(0,119,182,0.65);font-size:0.62rem;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;">Today Mode — Mission Control</div>' +
      '<div class="tracent-mode-grid-3">' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Planning score</div><div class="tracent-mode-cell-value">'+(score ? score+'/100' : '—')+'</div><div class="tracent-mode-cell-note">'+(score ? 'Real weighted score' : 'Complete analysis to see')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Free cash flow</div><div class="tracent-mode-cell-value" style="color:'+(_hasTrustedCashflowInputs(g)?(fcf>=0?'var(--teal)':'var(--red)'):'var(--gray-3)')+'">'+(_hasTrustedCashflowInputs(g)?fmt(fcf)+'/mo':'—')+'</div><div class="tracent-mode-cell-note">'+(_hasTrustedCashflowInputs(g)?'After obligations':'Add housing &amp; spending to calculate')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Emergency fund</div><div class="tracent-mode-cell-value" style="color:'+(efMonths>=3?'var(--green)':efMonths>=1?'var(--amber)':'var(--red)')+'">'+efMonths+' months</div><div class="tracent-mode-cell-note">'+(efMonths>=3?'Sufficient':'Build to 3 months')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Debt pressure</div><div class="tracent-mode-cell-value" style="color:'+(totalDebt===0?'var(--green)':'var(--navy)')+'">'+fmt(totalDebt,true)+'</div><div class="tracent-mode-cell-note">'+(totalDebt===0?'Debt-free':'Non-housing total')+'</div></div>' +
      '</div>' +
      '<div class="tracent-mode-insight" style="border-left:3px solid '+topPriority.color+'"><div class="tracent-mode-insight-label">'+topPriority.label+'</div><div class="tracent-mode-insight-text">'+topPriority.desc+'</div></div>' +
    '</div>';
  }

  /* ═══════════════════════════════════════════════════════
     SECTION 2 — MODE-SPECIFIC NBM COPY
     Patches the text in the existing NBM card to match mode.
  ═══════════════════════════════════════════════════════ */

  function patchNBM(mode){
    // Delegate to the scoring engine (home.js NBM Engine module).
    // The engine accounts for mode alignment via per-candidate modeAlignment scores,
    // so re-running it on mode switch produces the correct mode-aware answer.
    // buildModeNBMCopy() predates the scoring engine and is now superseded by it.
    try { if (typeof window.v21RenderNBMCard === 'function') window.v21RenderNBMCard(); } catch(e){}
  }

  /* ═══════════════════════════════════════════════════════
     SECTION 3 — RENDER ORCHESTRATOR
  ═══════════════════════════════════════════════════════ */

  function renderMode(mode){
    if (!_g()) return;
    buildStrategyBlock(mode);
    patchNBM(mode);
  }

  function buildStrategyBlock(mode){
    var g = _g(); if(!g) return;

    var host = document.getElementById('v21-mode-strategy');
    if (!host) {
      host = document.createElement('div');
      host.id = 'v21-mode-strategy';
      // Insert before the existing mode-context card if it exists, else after the mode rail
      var ctx  = document.getElementById('v21-mode-context-card');
      var rail = document.getElementById('v21-mode-rail');
      if (ctx && ctx.parentNode)       ctx.parentNode.insertBefore(host, ctx);
      else if (rail && rail.parentNode) rail.parentNode.insertBefore(host, rail.nextSibling);
      else {
        var tabHome = document.getElementById('tab-home');
        if (tabHome) tabHome.insertBefore(host, tabHome.firstChild);
        else return;
      }
    }

    var html = '';
    try {
      if (mode === 'home')   html = buildHomeStrategy();
      else if (mode === 'debt')  html = buildDebtStrategy();
      else if (mode === 'grow')  html = buildGrowStrategy();
      else if (mode === 'retire')html = (typeof window.buildRetireStrategyHTML === 'function') ? window.buildRetireStrategyHTML() : buildRetireStrategy();
      else                       html = buildTodayStrategy();
    } catch(e) { console.error('[Tracent] buildStrategyBlock failed for mode:', mode, e); html = ''; }

    host.innerHTML = html;
    host.style.display = html ? 'block' : 'none';

    // Hide the old mode-context card when we have a strategy block
    var ctx = document.getElementById('v21-mode-context-card');
    if (ctx) ctx.style.display = 'none';
  }

  /* ═══════════════════════════════════════════════════════
     SECTION 4 — CSS
  ═══════════════════════════════════════════════════════ */
  var style = document.createElement('style');
  style.textContent = `
    #v21-mode-strategy { margin-bottom: var(--s3); }
    .tracent-mode-header { margin-top: 32px; margin-bottom: 12px; padding-top: 4px; padding-bottom: 4px; }
    .tracent-mode-badge {
      display: inline-block;
      padding: 0 0 8px 0; border-radius: 0;
      background: none;
      font-size: 10px; font-weight: 700;
      margin-bottom: 10px;
    }
    .tracent-mode-grid-3 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }
    .tracent-mode-cell {
      background: var(--off-white);
      border: 1px solid rgba(0,31,51,0.08);
      border-radius: 6px;
      padding: 8px 10px;
    }
    .tracent-mode-cell-label {
      font-size: 9px; font-weight: 700;
      color: var(--gray-3); text-transform: uppercase;
      letter-spacing: .5px; margin-bottom: 2px;
    }
    .tracent-mode-cell-value {
      font-size: 15px; font-weight: 700; color: var(--navy);
      margin-bottom: 2px; line-height: 1.15;
    }
    .tracent-mode-cell-note {
      font-size: 10px; color: var(--gray-4); line-height: 1.3;
    }
    .tracent-mode-insight {
      background: var(--gray-1);
      border-radius: var(--r-sm);
      border-left: 3px solid var(--sky);
      padding: 12px 14px;
      margin-top: 4px;
    }
    .tracent-mode-insight-label {
      font-size: 11px; font-weight: 700;
      color: var(--navy); margin-bottom: 5px;
      text-transform: uppercase; letter-spacing: .4px;
    }
    .tracent-mode-insight-text {
      font-size: 13px; color: var(--gray-4); line-height: 1.6;
    }
    .tracent-mode-income-ctx {
      font-size: 11px; color: rgba(255,255,255,0.38); margin-top: 10px;
    }
    .tracent-mode-section-label {
      font-size: 10px; font-weight: 700;
      color: var(--gray-3); text-transform: uppercase;
      letter-spacing: .6px; margin-bottom: 10px;
    }
    /* Readiness bar */
    .tracent-mode-readiness-bar { margin-bottom: 14px; }
    .tracent-mode-readiness-label {
      font-size: 11px; font-weight: 700;
      color: var(--gray-4); margin-bottom: 6px;
    }
    .tracent-mode-bar-track {
      height: 8px; background: var(--gray-2);
      border-radius: 4px; overflow: hidden; margin-bottom: 5px;
    }
    .tracent-mode-bar-fill {
      height: 100%; border-radius: 4px;
      transition: width 0.6s var(--spring);
    }
    .tracent-mode-bar-meta {
      font-size: 12px; color: var(--gray-4);
    }
    /* Debt rows */
    .tracent-debt-list { margin-bottom: 14px; }
    .tracent-debt-row {
      display: grid;
      grid-template-columns: 28px 1fr auto;
      gap: 10px; align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--gray-1);
    }
    .tracent-debt-row:last-child { border-bottom: none; }
    .tracent-debt-rank {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .tracent-debt-name { font-size: 13px; font-weight: 600; color: var(--navy); }
    .tracent-debt-detail { font-size: 11px; color: var(--gray-4); }
    .tracent-debt-right { text-align: right; }
    .tracent-debt-bal { font-size: 13px; font-weight: 700; color: var(--navy); }
    .tracent-debt-time { font-size: 11px; color: var(--gray-4); }
    /* Grow tiers */
    .tracent-mode-grow-tiers { margin-bottom: 14px; }
    .tracent-grow-tier {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 10px;
      margin-bottom: 6px;
      font-size: 13px; font-weight: 500;
    }
    .tracent-grow-tier.active {
      background: rgba(0,168,232,0.08);
      border: 1.5px solid rgba(0,168,232,0.20);
      color: var(--navy); font-weight: 700;
    }
    .tracent-grow-tier.done {
      background: rgba(16,185,129,0.06);
      border: 1px solid rgba(16,185,129,0.15);
      color: var(--gray-4);
    }
    .tracent-grow-tier.locked {
      background: var(--gray-1);
      border: 1px solid var(--gray-2);
      color: var(--gray-3);
    }
    .tracent-grow-tier-n {
      width: 22px; height: 22px; border-radius: 50%;
      background: rgba(0,0,0,0.06);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .tracent-grow-tier-status {
      margin-left: auto; font-size: 11px;
      font-weight: 700; white-space: nowrap;
    }
    /* Retire compare */
    .tracent-retire-compare { margin-bottom: 14px; }
    .tracent-retire-bar-row {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 8px; font-size: 12px; color: var(--gray-4);
    }
    .tracent-retire-bar-row span:first-child { min-width: 90px; }
    .tracent-retire-bar-row span:last-child  { min-width: 70px; text-align: right; font-weight: 600; color: var(--navy); }
    .tracent-retire-bar-track {
      flex: 1; height: 6px; background: var(--gray-2);
      border-radius: 3px; overflow: hidden;
    }
    .tracent-retire-bar-fill {
      height: 100%; border-radius: 3px;
    }
  `;
  document.head.appendChild(style);

  /* ═══════════════════════════════════════════════════════
     SECTION 5 — WIRE INTO EXISTING OVERRIDE CHAIN
  ═══════════════════════════════════════════════════════ */

  // Override v21SetMode (chains on the board-pass override which chained on the V21 block)
  var _prevSetMode = window.v21SetMode;
  window.v21SetMode = function(mode, btn){
    if (typeof _prevSetMode === 'function') _prevSetMode(mode, btn);
    try { renderMode(mode || 'today'); } catch(e) {}
  };

  // Override v21RenderPostAnalysis (chains on board-pass override)
  var _prevRenderPost = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function(){
    if (typeof _prevRenderPost === 'function') _prevRenderPost();
    var mode = (typeof G !== 'undefined' && G && G.v21Mode) ? G.v21Mode : 'today';
    try { renderMode(mode); } catch(e) {}
  };

  window.__tracent_renderMode = renderMode;

})();


/* ═══ MODULE: Dashboard Pass — verdict, score band, UI assembly ═══ */
/* ── Dashboard Redesign Pass ────────────────────────────────
   Adds: emotional verdict, compact score, enhanced authority
   card, NBM elevation, mode rail repositioned, stagger motion.
   Does NOT touch data logic, telemetry, or existing engine.
─────────────────────────────────────────────────────────── */
(function(){
  if (window.__TRACENT_DASH_PASS__) return;
  window.__TRACENT_DASH_PASS__ = true;

  /* ── utils ─────────────────────────────────────────────── */
  function fmt(n,c){var v=Number(n||0),a=Math.abs(Math.round(v)),s=v<0?'-$':'$';if(c&&a>=1e6)return s+(a/1e6).toFixed(1)+'M';if(c&&a>=1e3)return s+(a/1e3).toFixed(1)+'k';return s+a.toLocaleString('en-US');}
  function g(){return window.G||null;}

  /* ── 1. EMOTIONAL VERDICT ──────────────────────────────── */
  function buildVerdict(){
    var gv = g(); if(!gv||!gv.score||!gv.scoreFinal) return;
    var score   = gv.score;
    var intent  = gv.primaryIntent || 'stable';
    var fcf     = gv.fcf || 0;
    var efMo    = parseInt(gv.emergency||'0');
    var ccDebt  = gv.ccDebt  || 0;
    var totDebt = (gv.ccDebt||0)+(gv.carDebt||0)+(gv.studentDebt||0)+(gv.otherDebt||0);
    var depPct  = (function(){
      var tp = gv.homePrice||gv.targetHomePrice||gv.purchasePrice||0;
      var ds = gv.depositSaved||gv.downPayment||0;
      return tp>0 ? Math.min(100,Math.round((ds/(tp*0.10))*100)) : 0;
    })();

    /* Headline logic */
    var fmt2 = function(n){ return '$'+(Number(n)||0).toLocaleString('en-US',{maximumFractionDigits:0}); };
    /* Band label — mirrors compact score row vocabulary */
    var _bandLabel = (typeof v21BandForScore === 'function')
      ? v21BandForScore(score).label.replace(/[⬤●🔴🟡🔵🟢⬡]\s*/,'')
      : '';
    /* Primary constraint suffix — fires when FCF data is unavailable */
    var _dti = Number(gv.dti || 0);
    var _efMo = efMo; // already computed above
    var _constraintSuffix = _dti > 43 ? ' DTI is your main constraint.'
      : _dti > 36 ? ' DTI is approaching the lender limit.'
      : (_efMo < 1 && String(gv.emergency || '') !== '') ? ' Emergency fund is the gap.'
      : '';
    /* Verdict is a compact supporting line — NBM is the primary decision. */
    var ctxLine;
    if(fcf < 0 && _hasTrustedCashflowInputs(gv)){
      ctxLine = 'Running a ' + fmt2(Math.abs(fcf)) + '/mo deficit \u2014 fix this first, everything else waits.';
    } else if(ccDebt > 5000 || (totDebt > 0 && (totDebt/(gv.takeHome||1)) > 0.5)){
      var _debtLbl = ccDebt > 5000 ? fmt2(ccDebt) + ' CC debt' : fmt2(totDebt) + ' total debt';
      ctxLine = _debtLbl + ' is your biggest drag \u2014 the plan below addresses this directly.';
    } else if(intent === 'home' && depPct < 70){
      var _tp = gv.homePrice||gv.targetHomePrice||gv.purchasePrice||0;
      var _ds = gv.depositSaved||gv.downPayment||0;
      var _gap = _tp > 0 ? Math.max(0, Math.round(_tp * 0.13 - _ds)) : 0;
      ctxLine = _gap > 0 ? fmt2(_gap) + ' away from deposit + closing \u2014 here\u2019s the fastest path.' : 'Deposit is your current constraint.';
    } else if(score < 55){
      var _fcfSuffix55 = (_hasTrustedCashflowInputs(gv) && fcf > 0) ? ' ' + fmt2(fcf) + '/mo to work with.' : _constraintSuffix;
      ctxLine = 'Score ' + score + ' \u2014 ' + (_bandLabel || 'Fragile') + '. Foundation needs work.' + _fcfSuffix55;
    } else if(score < 70){
      var _fcfSuffix70 = (_hasTrustedCashflowInputs(gv) && fcf > 0) ? ' ' + fmt2(fcf) + '/mo surplus.' : _constraintSuffix;
      ctxLine = 'Score ' + score + ' \u2014 ' + (_bandLabel || 'Stabilizing') + '.' + _fcfSuffix70;
    } else if(score < 85){
      var _fcfSuffix85 = (_hasTrustedCashflowInputs(gv) && fcf > 0) ? ' ' + fmt2(fcf) + '/mo to deploy.' : _constraintSuffix;
      ctxLine = 'Score ' + score + ' \u2014 ' + (_bandLabel || 'Advancing') + '.' + _fcfSuffix85;
    } else {
      var _fcfSuffix99 = (_hasTrustedCashflowInputs(gv) && fcf > 0) ? ' ' + fmt2(fcf) + '/mo surplus.' : _constraintSuffix;
      ctxLine = 'Score ' + score + ' \u2014 ' + (_bandLabel || 'Compounding') + '.' + _fcfSuffix99;
    }

    /* Trust / continuity signal */
    var _trustMsg = (function(){
      try {
        var count = Number(localStorage.getItem('tracent_dashboard_seen_count') || '0');
        if (count <= 1) {
          // First session — store baseline hash, show provenance label
          var _h0 = [gv.income||0, gv.score||0, gv.savingsAmt||0, gv.ccDebt||0].join('|');
          localStorage.setItem('tracent_input_hash', _h0);
          return 'Based on your current inputs';
        }
        // Returning session — compare hash
        var _hash = [gv.income||0, gv.score||0, gv.savingsAmt||0, gv.ccDebt||0].join('|');
        var _stored = localStorage.getItem('tracent_input_hash');
        localStorage.setItem('tracent_input_hash', _hash);
        return (_stored && _stored !== _hash)
          ? 'Updated based on your latest inputs'
          : 'No changes since your last visit';
      } catch(e) { return ''; }
    })();

    var el = document.getElementById('v21-verdict-block');
    if(!el) return;
    el.innerHTML =
      '<div class="v21-verdict-inner tdp-fade-item">' +
        '<div class="v21-verdict-ctx" id="v21-verdict-headline">' + ctxLine + '</div>' +
        (_trustMsg ? '<div class="v21-verdict-trust">' + _trustMsg + '</div>' : '') +
      '</div>';
    el.style.display = 'block';
  }

  /* ── 2. COMPACT SCORE ROW ──────────────────────────────── */
  function buildCompactScore(){
    var gv = g(); if(!gv||!gv.score||!gv.scoreFinal) return;
    var score   = gv.score;
    var band    = (typeof v21BandForScore==='function') ? v21BandForScore(score) : {label:'Score',color:'var(--sky)'};
    var label   = band.label.replace(/[⬤●🔴🟡🔵🟢⬡]\s*/,'');
    var color   = band.color || 'var(--sky)';

    var el = document.getElementById('v21-compact-score');
    if(!el) return;
    el.innerHTML =
      '<div class="v21-cs-row tdp-fade-item" onclick="openScoreBreakdown()" style="cursor:pointer;">' +
        '<div class="v21-cs-left">' +
          '<div class="v21-cs-num" id="v21-cs-num" style="color:'+color+'">'+score+'</div>' +
          '<div class="v21-cs-band">'+label+'</div>' +
        '</div>' +
        '<div class="v21-cs-right">' +
          '<div class="v21-cs-meta">Tracent planning score</div>' +
          '<div class="v21-cs-action">Tap to see full breakdown \u203a</div>' +
        '</div>' +
      '</div>';
    el.style.display = 'block';
  }

  /* ── 3. AUTHORITY CARD ENHANCEMENT ────────────────────── */
  function enhanceAuthorityCard(){
    var gv = g(); if(!gv) return;
    var host = document.getElementById('v21-authority-card');
    if(!host) return;

    // Confidence level
    var completeness = Number(gv.profileCompleteness||0);
    var inferred     = Array.isArray(gv._inferredFields) ? gv._inferredFields.length : 0;
    var confidence   = completeness>=80&&inferred===0 ? 'High' : completeness>=60&&inferred<=2 ? 'Medium' : 'Low';
    var confColor    = confidence==='High'?'var(--green)':confidence==='Medium'?'var(--amber)':'var(--red)';

    // Input count (rough: score categories)
    var cats = Object.values(gv.scoreCategories||{});
    var inputCount = cats.length * 2; // each category ~2 real inputs
    var inferredCount = inferred;

    // Last updated
    var ts = gv.lastComputedAt||Date.now();
    var updated;
    try{
      var diff = Math.round((Date.now()-ts)/60000);
      updated = diff<1?'just now':diff<60?diff+'m ago':new Date(ts).toLocaleDateString([],{month:'short',day:'numeric'});
    }catch(e){ updated='just now'; }

    // Confidence/meta bar suppressed — internal engine data only, not user-facing.
    // Values (confidence, inputCount, inferredCount, updated) remain available
    // in G.profileCompleteness / G._inferredFields for engine/debug use.
  }

  /* ── 4. MOVE MODE RAIL INTO tab-home ───────────────────── */
  function relocateModeRail(){
    var source   = document.getElementById('v21-mode-rail');
    var target   = document.getElementById('v21-mode-rail-home');
    if(!source||!target||target._populated) return;
    target._populated = true;
    // Clone the rail into the tab-home slot so it appears below NBM
    var clone = source.cloneNode(true);
    clone.id = 'v21-mode-rail-clone';
    clone.classList.add('v21-mode-rail-in-tab');
    target.appendChild(clone);
    target.style.display = 'block';
    // Sync active state from original to clone
    syncRailClone();
    // Mirror clicks on clone back to original rail (so v21SetMode fires on original)
    clone.querySelectorAll('.v21-mode-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        var mode = btn.id.replace('mode-btn-','');
        // Dedup clone IDs by renaming
        var origBtn = source.querySelector('#mode-btn-'+mode);
        if(origBtn) origBtn.click();
      });
    });
  }

  function syncRailClone(){
    var source = document.getElementById('v21-mode-rail');
    var clone  = document.getElementById('v21-mode-rail-clone');
    if(!source||!clone) return;
    var active = source.querySelector('.v21-mode-btn.active');
    if(!active) return;
    var mode   = active.id.replace('mode-btn-','');
    clone.querySelectorAll('.v21-mode-btn').forEach(function(b){ b.classList.remove('active'); });
    var cloneActive = clone.querySelector('[id]');
    clone.querySelectorAll('.v21-mode-btn').forEach(function(b){
      if(b.id === 'mode-btn-'+mode) b.classList.add('active');
    });
  }

  /* ── 5. STAGGER ENTRANCE ───────────────────────────────── */
  var STAGGER_ORDER = [
    'v21-nbm-card',
    'v21-verdict-block',
    'v21-authority-card',
    'v21-mode-rail-home',
    'v21-driver-strip',
    'v21-mode-strategy',
    'v21-mode-context-card',
    'v21-retention-card',
    'v21-premium-teaser'
  ];
  var STAGGER_DELAY_MS = 80; // between each item

  function runDashboardEntrance(){
    STAGGER_ORDER.forEach(function(id, idx){
      var el = document.getElementById(id);
      if(!el||el.style.display==='none') return;
      el.classList.remove('tdp-enter');
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = 'none';
      setTimeout(function(){
        el.style.transition = 'opacity 0.36s ease, transform 0.36s ease';
        el.style.opacity    = '1';
        el.style.transform  = 'translateY(0)';
        el.classList.add('tdp-enter');
      }, 60 + idx * STAGGER_DELAY_MS);
    });
  }

  /* ── 6. NBM ELEVATION ──────────────────────────────────── */
  function elevateNBM(){
    var el = document.getElementById('v21-nbm-card');
    if(el) el.classList.add('v21-nbm-elevated');
  }

  /* ── 7. SCORE RING COMPACTION ──────────────────────────── */
  function compactScoreRing(){
    // Collapse the score-hero-wrap ring area to reduced visual weight
    // We keep it functional but shrink it so verdict/NBM dominate
    var heroWrap = document.getElementById('score-hero-wrap');
    if(heroWrap) heroWrap.classList.add('v21-score-compact');
    // Hide the eyebrow "Your Tracent Score" text — verdict replaces it
    var eyebrow = document.getElementById('v21-score-reveal-eyebrow');
    if(eyebrow) eyebrow.style.display = 'none';
  }

  /* ── 8. GUIDED INPUT (empty state replacement) ─────────── */
  function _giEfMonths(savings, takeHome) {
    var mo   = takeHome > 0 ? savings / takeHome : 0;
    var opts = [0, 1, 2, 3, 6, 9, 12];
    var best = 0, bestDist = Infinity;
    opts.forEach(function(o){ var d=Math.abs(o-mo); if(d<bestDist){bestDist=d;best=o;} });
    return best;
  }

  function _giSetHiddenInput(id, val) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') {
      var t = String(val), found = false;
      for (var i=0;i<el.options.length;i++){
        if(el.options[i].value===t){el.value=t;found=true;break;}
      }
      if (!found) el.value = el.options[0] ? el.options[0].value : '0';
    } else {
      el.value = val;
    }
    try { el.dispatchEvent(new Event('change',{bubbles:true})); } catch(e) {}
  }

  function _giParseNum(str) {
    if (!str) return 0;
    return parseFloat(String(str).replace(/[$,\s]/g,'')) || 0;
  }

  function _giFormatInput(inp) {
    var n = _giParseNum(inp.value);
    if (n > 0) inp.value = '$' + Math.round(n).toLocaleString('en-US');
  }

  function _giTriggerRecompute() {
    if (typeof window.runLegacyCalculations === 'function') {
      try { window.runLegacyCalculations(); } catch(e) {}
    }
    if (typeof window.runBSE === 'function') {
      try { window.runBSE(); } catch(e) {}
    }
    if (typeof window.v21RenderPostAnalysis === 'function') {
      try { window.v21RenderPostAnalysis(); } catch(e) {}
    }
  }

  function _renderGuidedInput() {
    var el = document.getElementById('v21-guided-input');
    var dh = document.getElementById('dash-header');
    var vb = document.getElementById('v21-verdict-block');
    if (!el) return;

    var g = (typeof G !== 'undefined' && G) || (typeof window.G !== 'undefined' && window.G) || {};
    var needsGuide = !g.income || Number(g.income) <= 0;

    if (!needsGuide) {
      el.style.display = 'none';
      if (dh) dh.classList.remove('guided-mode');
      return;
    }

    // Guided state — suppress score hero, hide verdict
    if (dh) dh.classList.add('guided-mode');
    if (vb) vb.style.display = 'none';

    var intent = g.primaryIntent || '';
    var isRetire = !!(g.isRetirementMode);
    var isHome = (intent==='home'||intent==='buy_home');
    var isDebt = (intent==='debt'||intent==='debtrank');
    var field3Label = isRetire ? 'Retirement savings'
                    : isHome  ? 'Target home price'
                    : isDebt  ? 'Credit card debt'
                    : 'Monthly expenses';
    var field3Id = isRetire ? 'gi-retirement'
                 : isHome  ? 'gi-home-price'
                 : isDebt  ? 'gi-cc-debt'
                 : 'gi-expenses';
    var field3Placeholder = isHome ? '$400,000' : '$0';

    // Only rebuild DOM if intent changed or card is hidden
    if (el.getAttribute('data-gi-intent') === intent && el.style.display !== 'none') return;
    el.setAttribute('data-gi-intent', intent);

    el.innerHTML =
      '<div class="v21-gi-card">' +
        '<p class="v21-gi-title">To see your plan, add these:</p>' +
        '<p class="v21-gi-sub">Takes 30 seconds.</p>' +
        '<div class="v21-gi-field">' +
          '<label class="v21-gi-label" for="gi-income">Monthly income</label>' +
          '<input class="v21-gi-input" id="gi-income" type="tel" inputmode="numeric" placeholder="$5,000" autocomplete="off">' +
        '</div>' +
        '<div class="v21-gi-field">' +
          '<label class="v21-gi-label" for="gi-savings">Savings</label>' +
          '<input class="v21-gi-input" id="gi-savings" type="tel" inputmode="numeric" placeholder="$0" autocomplete="off">' +
        '</div>' +
        '<div class="v21-gi-field">' +
          '<label class="v21-gi-label" for="'+field3Id+'">'+field3Label+'</label>' +
          '<input class="v21-gi-input" id="'+field3Id+'" type="tel" inputmode="numeric" placeholder="'+field3Placeholder+'" autocomplete="off">' +
        '</div>' +
        '<button class="v21-gi-cta" id="gi-submit-btn">Calculate my plan \u2192</button>' +
      '</div>';

    el.style.display = 'block';

    function _wireField(inputId, onValue) {
      var inp = document.getElementById(inputId);
      if (!inp) return;
      inp.addEventListener('blur',  function(){ _giFormatInput(inp); });
      inp.addEventListener('focus', function(){
        var n = _giParseNum(inp.value);
        if (n > 0) inp.value = String(Math.round(n));
      });
      inp.addEventListener('input', function(){ onValue(_giParseNum(inp.value)); });
    }

    _wireField('gi-income', function(val){
      g.income   = val;
      g.takeHome = Math.round(val * 0.72);
      _giSetHiddenInput('income',   Math.round(val));
      _giSetHiddenInput('takehome', Math.round(val * 0.72));
    });
    _wireField('gi-savings', function(val){
      g.savingsAmt = val;
      var th = Number(g.takeHome || Math.round((g.income||0)*0.72));
      var efMoVal = _giEfMonths(val, th);
      g.emergency = efMoVal;
      _giSetHiddenInput('emergency', efMoVal);
    });
    if (isDebt) {
      _wireField('gi-cc-debt', function(val){
        g.ccDebt = val;
        _giSetHiddenInput('cc-debt', Math.round(val));
      });
    } else if (isHome) {
      _wireField('gi-home-price', function(val){
        g.homePrice = val;
        _giSetHiddenInput('home-price', Math.round(val));
      });
    } else if (isRetire) {
      _wireField('gi-retirement', function(val){
        g.retirementSavings = val;
      });
    } else {
      _wireField('gi-expenses', function(val){
        g.monthlyExpenses = val;
      });
    }

    var submitBtn = document.getElementById('gi-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function(){
        var incEl   = document.getElementById('gi-income');
        var savEl   = document.getElementById('gi-savings');
        var f3El    = document.getElementById(field3Id);
        var income  = _giParseNum(incEl  ? incEl.value  : '');
        var savings = _giParseNum(savEl  ? savEl.value  : '');
        var f3Val   = _giParseNum(f3El   ? f3El.value   : '');

        if (income > 0) {
          g.income   = income;
          g.takeHome = Math.round(income * 0.72);
          _giSetHiddenInput('income',   Math.round(income));
          _giSetHiddenInput('takehome', Math.round(income * 0.72));
        }
        if (savings >= 0) {
          g.savingsAmt = savings;
          var efMoVal  = _giEfMonths(savings, Number(g.takeHome||0));
          g.emergency  = efMoVal;
          _giSetHiddenInput('emergency', efMoVal);
        }
        if (isDebt && f3Val > 0) {
          g.ccDebt = f3Val;
          _giSetHiddenInput('cc-debt', Math.round(f3Val));
        } else if (isHome && f3Val > 0) {
          g.homePrice = f3Val;
          _giSetHiddenInput('home-price', Math.round(f3Val));
        } else if (isRetire && f3Val > 0) {
          g.retirementSavings = f3Val;
        }
        _giTriggerRecompute();
      });
    }
  }

  /* ── WIRE INTO v21RenderPostAnalysis ───────────────────── */
  var _prevRPA = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function(){
    /* [SCORE TRACE] — MutationObserver wired before any render pass */
    (function(){
      var hero = document.getElementById('score-hero-wrap');
      var zone = document.getElementById('bse-score-zone');
      var dh   = document.getElementById('dash-header');
      if (!hero && !zone && !dh) return;
      if (window.__scoreObs) { try { window.__scoreObs.disconnect(); } catch(e){} }
      var obs = new MutationObserver(function(){
        console.log('[SCORE MUTATION]', {
          headerClass: dh ? dh.className : null,
          zoneStyle:   zone ? zone.getAttribute('style') : null,
          heroStyle:   hero ? hero.getAttribute('style') : null,
          heroComputedDisplay:   hero ? getComputedStyle(hero).display    : null,
          heroComputedOpacity:   hero ? getComputedStyle(hero).opacity    : null,
          heroComputedMaxHeight: hero ? getComputedStyle(hero).maxHeight  : null
        });
      });
      if (hero) obs.observe(hero, { attributes:true, attributeFilter:['style','class'] });
      if (zone) obs.observe(zone, { attributes:true, attributeFilter:['style','class'] });
      if (dh)   obs.observe(dh,   { attributes:true, attributeFilter:['style','class'] });
      window.__scoreObs = obs;
    })();

    if(typeof _prevRPA === 'function') _prevRPA();

    // Build/update dashboard components
    try { _renderGuidedInput();   } catch(e) {}
    try { buildVerdict();         } catch(e) {}
    try { enhanceAuthorityCard(); } catch(e) {}
    try { relocateModeRail();     } catch(e) {}
    try { syncRailClone();        } catch(e) {}
    try { elevateNBM();           } catch(e) {}

    // Stagger entrance after a brief settling pause
    setTimeout(runDashboardEntrance, 80);
  };

  /* Also sync clone when mode changes */
  var _prevSetMode = window.v21SetMode;
  window.v21SetMode = function(mode, btn){
    if(typeof _prevSetMode === 'function') _prevSetMode(mode, btn);
    setTimeout(syncRailClone, 40);
  };

  /* ── CSS ────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    /* ── Verdict block — context line only, NOT a headline ── */
    '#v21-verdict-block { margin-bottom: 8px; }',
    '.v21-verdict-inner {',
    '  padding: 12px 20px 10px;',
    '}',
    '.v21-verdict-ctx {',
    '  font-size: 12px;',
    '  font-weight: 500;',
    '  color: rgba(255,255,255,0.42);',
    '  line-height: 1.5;',
    '  letter-spacing: 0.1px;',
    '}',
    '.v21-verdict-trust {',
    '  font-size: 10px;',
    '  font-weight: 400;',
    '  color: rgba(255,255,255,0.22);',
    '  margin-top: 4px;',
    '  letter-spacing: 0.15px;',
    '}',
    /* ── Compact score ── */
    '#v21-compact-score { margin: 0 var(--s2) var(--s2); }',
    '.v21-cs-row {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 14px;',
    '  background: rgba(255,255,255,0.05);',
    '  border: 1px solid rgba(255,255,255,0.09);',
    '  border-radius: var(--r-sm);',
    '  padding: 12px 16px;',
    '  transition: background 0.15s;',
    '}',
    '.v21-cs-row:active { background: rgba(255,255,255,0.08); }',
    '.v21-cs-left { display: flex; align-items: baseline; gap: 8px; }',
    '.v21-cs-num {',
    '  font-family: var(--font-display);',
    '  font-size: 36px;',
    '  font-weight: 700;',
    '  line-height: 1;',
    '}',
    '.v21-cs-band {',
    '  font-size: 11px;',
    '  font-weight: 700;',
    '  text-transform: uppercase;',
    '  letter-spacing: 0.8px;',
    '  color: rgba(255,255,255,0.45);',
    '}',
    '.v21-cs-right { flex: 1; }',
    '.v21-cs-meta {',
    '  font-size: 12px;',
    '  color: rgba(255,255,255,0.45);',
    '  margin-bottom: 2px;',
    '}',
    '.v21-cs-action {',
    '  font-size: 12px;',
    '  color: rgba(0,168,232,0.75);',
    '  font-weight: 600;',
    '}',
    /* Score ring renders at full natural size — no compaction rules */
    /* ── Authority card meta bar ── */
    '.v21-auth-meta-bar { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--gray-1); }',
    '.v21-auth-meta-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }',
    '.v21-auth-meta-chip {',
    '  display: inline-flex; align-items: center;',
    '  padding: 4px 10px; border-radius: 999px;',
    '  border: 1px solid var(--gray-2);',
    '  font-size: 11px; font-weight: 600; color: var(--gray-4);',
    '  background: var(--gray-1);',
    '}',
    '.v21-auth-refine-note {',
    '  font-size: 12px;',
    '  color: var(--gray-4);',
    '  line-height: 1.55;',
    '}',
    /* ── NBM elevation ── */
    '.v21-nbm-elevated {',
    '  box-shadow: 0 4px 24px rgba(0,0,0,0.18), 0 1px 6px rgba(0,0,0,0.12) !important;',
    '  border-color: rgba(0,168,232,0.22) !important;',
    '  transform: translateZ(0);',
    '}',
    /* ── Mode rail in tab (clone) ── */
    '#v21-mode-rail-home { margin-bottom: var(--s3); }',
    '.v21-mode-rail-in-tab {',
    '  display: flex !important;',
    '  overflow-x: auto;',
    '  gap: 8px;',
    '  padding: 0;',
    '  scrollbar-width: none;',
    '}',
    '.v21-mode-rail-in-tab::-webkit-scrollbar { display: none; }',
    /* ── Stagger entrance ── */
    '.tdp-fade-item {',
    '  /* Base state set inline by JS, transition applied there too */',
    '}',
  ].join('\n');
  document.head.appendChild(style);

})();


/* ═══ MODULE: Align Pass — score alignment + consistency checks ═══ */
/* ── Psychological Alignment Pass ──────────────────────────
   Overrides v21BuildPositionPreview.
   Maps intent × emotional signal → empathetic headline.
   Runs staggered entrance animation on screen entry.
   Adds press animation to the CTA.
   Does NOT read, store, or display any score value.
────────────────────────────────────────────────────────── */
(function(){
  if (window.__TRACENT_ALIGN_PASS__) return;
  window.__TRACENT_ALIGN_PASS__ = true;

  /* ── Tone mapping ───────────────────────────────────────── */
  function toneFromSignal(signal){
    if (signal === 'completely' || signal === 'very_well') return 'confident';
    if (signal === 'somewhat')                             return 'uncertain';
    if (signal === 'very_little')                         return 'stressed';
    if (signal === 'not_at_all')                          return 'anxious';
    return 'uncertain';
  }

  /* ── Copy matrix ────────────────────────────────────────── */
  var HEADLINES = {
    home: {
      confident: 'Buying a home can feel overwhelming',
      uncertain:  'Buying a home can feel overwhelming',
      stressed:   'Buying a home can feel overwhelming',
      anxious:    'Buying a home can feel overwhelming'
    },
    debt: {
      confident: 'Debt can feel heavy \u2014 you\u2019re not alone',
      uncertain:  'Debt can feel heavy \u2014 you\u2019re not alone',
      stressed:   'Debt can feel heavy \u2014 you\u2019re not alone',
      anxious:    'Debt can feel heavy \u2014 you\u2019re not alone'
    },
    grow: {
      confident: 'Figuring out your next financial move isn\u2019t easy',
      uncertain:  'Figuring out your next financial move isn\u2019t easy',
      stressed:   'Figuring out your next financial move isn\u2019t easy',
      anxious:    'Figuring out your next financial move isn\u2019t easy'
    },
    retire: {
      confident: 'Planning ahead can feel unclear \u2014 we\u2019ll simplify it',
      uncertain:  'Planning ahead can feel unclear \u2014 we\u2019ll simplify it',
      stressed:   'Planning ahead can feel unclear \u2014 we\u2019ll simplify it',
      anxious:    'Planning ahead can feel unclear \u2014 we\u2019ll simplify it'
    },
    stable: {
      confident: 'You\u2019re in the right place',
      uncertain:  'You\u2019re in the right place',
      stressed:   'You\u2019re in the right place',
      anxious:    'You\u2019re in the right place'
    }
  };

  var SUPPORT_OVERRIDE = {
    debt_stressed: 'We\u2019ll guide you step by step \u2014 starting with the one move that matters most right now.',
    debt_anxious:  'We\u2019ll guide you step by step \u2014 starting with the one move that matters most right now.'
  };

  var MARKS = {
    home: '\uD83C\uDFE0', debt: '\u2693', grow: '\uD83C\uDF31',
    retire: '\uD83C\uDF05', stable: '\u2736'
  };

  /* ── Stagger entrance ───────────────────────────────────── */
  function runStagger(){
    var items = document.querySelectorAll('#v21-phase-range .v21-align-item');
    // Delays: mark=0, headline=100ms, support+final=200ms, CTA=300ms
    var delays = [0, 100, 200, 200, 300];
    items.forEach(function(el, idx){
      el.classList.remove('v21-align-in');
      // Reset inline style to ensure transition re-runs
      el.style.transitionDelay = '0ms';
      void el.offsetWidth; // reflow
    });
    items.forEach(function(el, idx){
      var delay = delays[idx] !== undefined ? delays[idx] : 300;
      setTimeout(function(){
        el.style.transitionDelay = '0ms';
        el.classList.add('v21-align-in');
      }, delay);
    });
    // Container fade
    var wrap = document.getElementById('v21-align-screen');
    if (wrap){
      wrap.classList.remove('v21-align-ready');
      void wrap.offsetWidth;
      wrap.classList.add('v21-align-ready');
    }
  }

  /* ── CTA press animation + advance ─────────────────────── */
  function wireCtaPress(){
    var btn = document.getElementById('v21-align-cta');
    if (!btn || btn._alignWired) return;
    btn._alignWired = true;
    btn.addEventListener('pointerdown', function(){
      btn.classList.add('v21-cta-press');
    });
    btn.addEventListener('pointerup', function(){
      setTimeout(function(){ btn.classList.remove('v21-cta-press'); }, 140);
    });
    btn.addEventListener('pointerleave', function(){
      btn.classList.remove('v21-cta-press');
    });
  }

  /* ── CTA action (wired from onclick) ───────────────────── */
  window.v21AlignContinue = function(){
    var btn = document.getElementById('v21-align-cta');
    function _buildAndScroll(){
      try { v21BuildRefinePhase(); } catch(e) {}
      // Scroll the onboarding container to the refine phase after layout settles
      setTimeout(function(){
        var scrollEl = document.getElementById('onboarding-scroll');
        var refineEl = document.getElementById('v21-phase-refine');
        if (refineEl){
          // Prefer scrolling the container; fall back to window
          if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight){
            var offsetTop = refineEl.offsetTop;
            scrollEl.scrollTo({ top: offsetTop, behavior: 'smooth' });
          } else {
            refineEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          // Optionally focus the first text/number input in the refine form
          setTimeout(function(){
            var firstInput = refineEl.querySelector('input[type="text"],input[type="number"],input[inputmode]');
            if (firstInput) { try { firstInput.focus({ preventScroll: true }); } catch(e){} }
          }, 420);
        }
      }, 180);
    }
    if (btn){
      btn.classList.add('v21-cta-press');
      setTimeout(function(){
        btn.classList.remove('v21-cta-press');
        _buildAndScroll();
      }, 120);
    } else {
      _buildAndScroll();
    }
  };

  /* ── Override v21BuildPositionPreview ───────────────────── */
  window.v21BuildPositionPreview = function(intent, signal){
    var tone      = toneFromSignal(signal);
    var intentKey = intent || 'stable';
    var matrix    = HEADLINES[intentKey] || HEADLINES.stable;
    var headline  = matrix[tone] || matrix.uncertain;
    var mark      = MARKS[intentKey] || '\u2736';
    var overrideKey = intentKey + '_' + tone;
    var support   = 'We\u2019ll guide you step by step based on where you are today \u2014 no pressure, no judgment.';

    var headEl = document.getElementById('v21-align-headline');
    var markEl = document.getElementById('v21-align-mark');
    var supEl  = document.getElementById('v21-align-support');

    if (headEl) headEl.textContent = headline;
    if (markEl) markEl.textContent = mark;
    if (supEl)  supEl.textContent  = support;

    /* Run entrance animation */
    runStagger();

    /* Wire CTA press effect */
    wireCtaPress();

    /* Telemetry — identical hooks to original, non-destructive */
    try {
      watchCtaIgnore('preview_cta', 6000);
      tracentTrack('onboarding_preview_seen');
      window.TRACENT_TELEMETRY.flowState.previewSeen = true;
    } catch(e) {}

    /*
     * IMPORTANT: v21ComputeRange() runs upstream before this function
     * and writes G.previewScoreRangeMin/Max/Mid, G.scoreEstimated, etc.
     * We deliberately ignore all of those fields here.
     * G.score is NOT read, displayed, or modified by this function.
     */
  };

  /* ── Keep disclaimer hidden (board-pass compatibility) ─── */
  document.addEventListener('DOMContentLoaded', function(){
    var disc = document.querySelector('#v21-phase-range .v21-disclaimer');
    if (disc) disc.style.display = 'none';
  });

})();


/* ═══ MODULE: NBM Engine — next best move ranking + rendering ═══ */
/* ── NBM Decision Engine ────────────────────────────────────
   Replaces v21GetRankedMoves + v21RenderNBMCard with a proper
   multi-candidate scoring system. Does not touch data logic,
   telemetry, or any other module.
─────────────────────────────────────────────────────────── */
(function(){
  if (window.__TRACENT_NBM_ENGINE__) return;
  window.__TRACENT_NBM_ENGINE__ = true;

  /* ═══════════════════════════════════════════════════════
     1. NORMALIZED STATE
  ═══════════════════════════════════════════════════════ */
  function buildState(){
    var gv = window.G || {};
    var active = (function(){
      if (gv.v21Mode) return gv.v21Mode;
      var btn = document.querySelector('.v21-mode-btn.active');
      return btn ? btn.id.replace('mode-btn-','') : (gv.primaryIntent || 'today');
    })();
    var income    = gv.income    || 0;
    var takeHome  = (active === 'home' && gv.homeIncomeMode === 'household' && gv.homeHouseholdTakeHome > 0)
      ? gv.homeHouseholdTakeHome
      : gv.takeHome || (function(){if(!income)return 0;var s=(window.STATE_TAX&&gv.state)?((window.STATE_TAX)[gv.state]||0):0,f=income<=11600?income*0.10:income<=47150?1160+(income-11600)*0.12:income<=100525?5426+(income-47150)*0.22:income<=191950?17169+(income-100525)*0.24:39111+(income-191950)*0.32;f=Math.max(0,f-14600*0.12);var c=Math.min(income,168600)*0.062+income*0.0145;return Math.round(Math.max(income*0.5,income-f-c-income*s)/12)})();
    var totalDebt = (gv.ccDebt||0)+(gv.carDebt||0)+(gv.studentDebt||0)+(gv.otherDebt||0);
    var minPmts   = Math.round(
      Math.max(25,(gv.ccDebt||0)*0.02) +
      (gv.carPayment||0) +
      (gv.studentPayment||Math.max(0,(gv.studentDebt||0)*0.01)) +
      (gv.otherPayment||0)
    );
    var housing   = gv.mortgagePayment||gv.rentAmount||gv.rent||0;
    var fixedSpend= minPmts + housing;
    var fcf       = gv.fcf!=null ? gv.fcf : (takeHome - fixedSpend);
    var _efRaw    = gv.emergency;
    var efProvided= _efRaw !== undefined && _efRaw !== null && _efRaw !== '';
    var efMonths  = efProvided ? parseInt(_efRaw, 10) : 0;
    var efTarget  = 3;
    var ccDebt    = gv.ccDebt||0;
    var ccRate    = gv.ccRate||21;
    var carDebt   = gv.carDebt||0;
    var studDebt  = gv.studentDebt||0;
    var othDebt   = gv.otherDebt||0;
    var dti       = gv.dti!=null ? gv.dti : (takeHome>0?Math.round((minPmts/takeHome)*100):0);
    var homePrice = gv.homePrice||gv.targetHomePrice||gv.purchasePrice||0;
    var depSaved  = gv.depositSaved||gv.downPayment||0;
    var depNeed   = homePrice>0 ? homePrice*0.10 : 0;
    var closingEst= homePrice>0 ? Math.round(homePrice*0.03) : 0;
    var depositGap= Math.max(0, depNeed+closingEst-depSaved);
    var saveCap   = Math.max(0, Math.round(fcf*0.50));
    var retMatch  = gv.retMatch||'unknown';
    var matchMissed = retMatch!=='full'&&retMatch!=='maxed'&&retMatch!=='none';
    var completeness = Number(gv.profileCompleteness||0);
    var inferred  = Array.isArray(gv._inferredFields)?gv._inferredFields.length:0;
    var confidence= completeness>=80&&inferred===0?'high':completeness>=60&&inferred<=2?'medium':'low';
    var currentAge = parseInt(gv.currentAge||gv.age||'0');
    var isRetirementMode = !!(gv.isRetirementMode) ||
      (window.BSE && window.BSE.navStyle === 'retirement');
    // ── cashflow structure (from cashflow.js, if computed) ────────
    var _cf = gv.cashflow || null;
    var effectiveFCF  = _cf ? _cf.effectiveFCF  : fcf;
    var leakRisk      = _cf ? _cf.leakRisk      : 'low';
    var leakItems     = _cf ? _cf.leakItems      : [];
    var nmMonthly     = _cf ? _cf.nonMonthlyMonthly : 0;
    var subEst        = _cf ? _cf.subscriptionEst   : 0;
    return {
      active:active,income:income,takeHome:takeHome,fixedSpend:fixedSpend,fcf:fcf,efMonths:efMonths,efTarget:efTarget,efProvided:efProvided,
      ccDebt:ccDebt,ccRate:ccRate,carDebt:carDebt,studDebt:studDebt,othDebt:othDebt,totalDebt:totalDebt,minPmts:minPmts,dti:dti,
      homePrice:homePrice,depSaved:depSaved,depNeed:depNeed,closingEst:closingEst,depositGap:depositGap,saveCap:saveCap,
      retMatch:retMatch,matchMissed:matchMissed,
      score:gv.scoreFinal?(gv.score||0):0,intent:gv.primaryIntent||'stable',
      completeness:completeness,inferred:inferred,confidence:confidence,
      currentAge:currentAge,isRetirementMode:isRetirementMode,
      effectiveFCF:effectiveFCF,leakRisk:leakRisk,leakItems:leakItems,nmMonthly:nmMonthly,subEst:subEst
    };
  }

  /* ═══════════════════════════════════════════════════════
     2. CANDIDATE POOL
  ═══════════════════════════════════════════════════════ */
  function buildCandidates(s){
    var c=[];
    var fmt=function(n){ return '$'+(Number(n)||0).toLocaleString('en-US',{maximumFractionDigits:0}); };
    var mos=function(n){ return n<12?n+'mo':(n/12).toFixed(1)+'yr'; };

    /* SAFETY: deficit — only fire when FCF is real (not engine-default artifact) */
    if(s.fcf<0 && _hasTrustedCashflowInputs(window.G || {})){
      c.push({id:'deficit',
        title:'Close the monthly deficit — spending exceeds income by '+fmt(-s.fcf),
        why:'You are currently spending more than you earn. Every other financial goal is impossible until this gap closes.',
        action:'List every fixed obligation. Find the single highest non-essential cost and reduce or eliminate it this week. Even '+fmt(Math.round(-s.fcf*0.5))+'/mo improvement changes the trajectory.',
        impact:'Stops the bleed; clears the path for all downstream actions',timing:'This week',
        confidenceNote:'Calculated from your inputs — verify with actual bank statements.',
        scoreImpact:10,cashImpact:'+'+fmt(-s.fcf)+'/mo',timeToStart:'This week',
        category:'safety',
        scores:{urgency:10,impact:10,feasibility:6,confidence:8,modeAlignment:10}
      });
    }

    /* SAFETY: zero EF — only when emergency was explicitly provided */
    if(s.efProvided&&s.efMonths===0&&s.fcf>=0){
      var efAmt=s.takeHome>0?Math.round(s.takeHome):2000;
      c.push({id:'ef_zero',
        title:'Open a dedicated emergency account — target '+fmt(efAmt)+' to start',
        why:'Zero emergency savings means any unexpected cost — a car repair, medical bill, or job gap — immediately becomes debt. This is the highest-return financial action available to you.',
        action:'Open a separate high-yield savings account today (takes 10 minutes). Set up an automatic transfer of '+fmt(Math.round(s.fcf*0.40))+'/mo. Name it "Emergency Only" to reduce the urge to spend it.',
        impact:'Absorbs shocks without triggering a debt spiral',timing:'Today',
        confidenceNote:'Based on your free cash flow — adjust if income is variable.',
        scoreImpact:8,cashImpact:'Buffer: '+fmt(efAmt),timeToStart:'Today',
        category:'safety',
        scores:{urgency:10,impact:9,feasibility:8,confidence:9,modeAlignment:9}
      });
    }

    /* SAFETY: low EF — only when emergency was explicitly provided */
    if(s.efProvided&&s.efMonths>0&&s.efMonths<s.efTarget&&s.fcf>0){
      var efShortfall=s.takeHome>0?Math.round(s.takeHome*(s.efTarget-s.efMonths)):2000;
      var moToEf=s.fcf>0?Math.ceil(efShortfall/(s.fcf*0.40)):0;
      c.push({id:'ef_low',
        title:'Grow emergency fund from '+s.efMonths+' to '+s.efTarget+' months — '+fmt(efShortfall)+' needed',
        why:s.efMonths===1
          ?'One month of buffer is better than zero, but a single missed paycheck would exhaust it.'
          :'At '+s.efMonths+' months you have partial protection. Reaching 3 months removes most short-term financial risk.',
        action:'Direct '+fmt(Math.round(s.fcf*0.40))+'/mo to your emergency account. At that rate you reach 3 months in roughly '+mos(moToEf*4)+'. Automate the transfer on payday.',
        impact:'Reduces financial fragility significantly',timing:'This month',
        confidenceNote:'Based on current FCF — adjust if income varies month to month.',
        scoreImpact:5,cashImpact:'Grows buffer',timeToStart:'This month',
        category:'safety',
        scores:{urgency:7,impact:7,feasibility:8,confidence:8,modeAlignment:8}
      });
    }

    /* DEBT: credit card */
    if(s.ccDebt>500){
      var intMo=Math.round(s.ccDebt*(s.ccRate/100)/12);
      var extra=Math.max(0,Math.round(s.fcf*0.40));
      var minCC=Math.max(25,Math.round(s.ccDebt*0.02));
      var moOff=(minCC+extra)>0?Math.ceil(s.ccDebt/(minCC+extra)):0;
      c.push({id:'cc_attack',
        title:'Put '+fmt(extra)+'/mo extra at '+fmt(s.ccDebt)+' credit card balance ('+s.ccRate+'% APR)',
        why:'This balance costs '+fmt(intMo)+'/mo in interest — money that disappears with no benefit. At '+s.ccRate+'% this is the highest guaranteed return available to you.',
        action:'Add '+fmt(extra)+'/mo on top of your minimum, directed entirely at this balance. This clears it in approximately '+mos(moOff)+' and permanently frees '+fmt(minCC)+'/mo in minimum payments.',
        impact:'Saves '+fmt(intMo)+'/mo in interest; frees '+fmt(minCC)+'/mo after payoff',timing:'Next payment cycle',
        confidenceNote:'APR used: '+s.ccRate+'%. Verify your actual rate on your statement.',
        scoreImpact:7,cashImpact:'+'+fmt(minCC)+'/mo freed',timeToStart:'Next billing cycle',
        category:'debt',
        scores:{urgency:9,impact:9,feasibility:7,confidence:9,modeAlignment:s.active==='debt'?10:7}
      });
    }

    /* DEBT: DTI too high */
    if(s.dti>43&&s.totalDebt>0){
      var dtiTarget=Math.round(s.takeHome*0.36);
      var pmtReduction=Math.max(0,s.minPmts-dtiTarget);
      c.push({id:'dti_reduce',
        title:'Reduce monthly debt payments by '+fmt(pmtReduction)+' to bring DTI under 43%',
        why:'Your DTI of '+s.dti+'% exceeds the standard lender threshold. Until this falls, mortgage applications face higher rates, stricter terms, or rejections.',
        action:'Identify the debt with the highest minimum payment relative to remaining balance. Accelerate payoff of that one debt specifically — not spread across all of them.',
        impact:'Opens lender qualification; improves credit profile',timing:'1–3 months',
        confidenceNote:'DTI estimated from inputs — verify with actual statements for lender applications.',
        scoreImpact:6,cashImpact:'Lender-ready DTI',timeToStart:'This month',
        category:'debt',
        scores:{urgency:8,impact:8,feasibility:6,confidence:7,modeAlignment:s.active==='home'||s.active==='debt'?10:7}
      });
    }

    /* DEBT: car paydown (when no CC) */
    if(s.carDebt>3000&&s.ccDebt===0){
      var carInt=Math.round(s.carDebt*(7.5/100)/12);
      c.push({id:'car_paydown',
        title:'Add '+fmt(Math.round(s.fcf*0.30))+'/mo to car loan to accelerate payoff',
        why:'Your car loan is your highest remaining debt. At an estimated 7.5% (verify your actual rate) it costs ~'+fmt(carInt)+'/mo in interest on a depreciating asset.',
        action:'Round up your car payment by '+fmt(Math.round(s.fcf*0.30))+'/mo applied specifically to principal. This shortens payoff and reduces total interest paid.',
        impact:'Reduces total interest; frees payment sooner',timing:'Next payment',
        confidenceNote:'Rate estimated at 7.5% — adjust for your actual loan terms.',
        scoreImpact:4,cashImpact:'Frees payment',timeToStart:'Next payment',
        category:'debt',
        scores:{urgency:5,impact:6,feasibility:8,confidence:6,modeAlignment:s.active==='debt'?9:5}
      });
    }

    /* HOME: deposit gap */
    if(s.homePrice>0&&s.depositGap>0){
      var moToClose=s.saveCap>0?Math.ceil(s.depositGap/s.saveCap):0;
      c.push({id:'home_deposit',
        title:'Automate '+fmt(s.saveCap)+'/mo to close the '+fmt(s.depositGap)+' deposit gap',
        why:'You need '+fmt(s.depositGap)+' more to cover your deposit and closing costs on your '+fmt(s.homePrice)+' target (based on typical 10% down + ~3% closing cost assumptions). At your current saving rate, that\'s '+mos(moToClose)+' away.',
        action:'Create a dedicated "House deposit" savings account. Set an automatic transfer of '+fmt(s.saveCap)+'/mo on the same day as income arrives. Keep this separate from your emergency fund.',
        impact:'On track to close gap in ~'+mos(moToClose),timing:'This week',
        confidenceNote:'Based on 50% of FCF directed to savings. Adjust if income is irregular.',
        scoreImpact:5,cashImpact:'Gap closed in '+mos(moToClose),timeToStart:'This week',
        category:'home',
        scores:{urgency:7,impact:8,feasibility:7,confidence:7,modeAlignment:s.active==='home'?10:5}
      });
    }

    /* HOME: pre-qualify DTI */
    if(s.homePrice>0&&s.dti>36&&s.dti<=43){
      c.push({id:'home_dti_prep',
        title:'Reduce DTI from '+s.dti+'% to under 36% before applying — qualify for a better rate tier',
        why:'You qualify at 43% DTI, but the best mortgage rates are reserved for borrowers under 36%. One extra debt payoff before application changes the rate you get.',
        action:'Identify your smallest remaining debt by balance. Pay it off in full before submitting a mortgage application. The freed minimum payment improves your DTI immediately.',
        impact:'Better rate tier; stronger application',timing:'Before application',
        confidenceNote:'Rate impact varies by lender. Get quotes at both DTI levels to quantify.',
        scoreImpact:4,cashImpact:'Better rate',timeToStart:'1–2 months',
        category:'home',
        scores:{urgency:6,impact:7,feasibility:7,confidence:7,modeAlignment:s.active==='home'?10:4}
      });
    }

    /* HOME: overstretched purchase — post-purchase DTI > 50% */
    if(s.active==='home'&&s.homePrice>0){
      var _hm=(typeof window._calcHomeMetrics==='function'&&window.G)?window._calcHomeMetrics(window.G):null;
      if(_hm&&_hm.dtiAfter>50){
        c.push({id:'home_overstretch',
          title:'At '+_hm.dtiAfter+'% DTI, this purchase would be hard to sustain — let\'s find the workable number',
          why:'Lenders cap approval at 43–45% DTI, and at '+_hm.dtiAfter+'% your application is likely to be declined or require a co-signer. More importantly, a payment at this level leaves very little room for any unexpected cost.',
          action:'Work backward from a comfortable monthly payment — typically 28–30% of take-home. That number determines your real price ceiling. You may need a lower target price, a larger deposit, or to build income before applying.',
          impact:'Prevents a purchase that strains cash flow for years',timing:'Before applying',
          confidenceNote:'DTI calculated using your estimated mortgage, existing debt payments, and current take-home.',
          scoreImpact:8,cashImpact:'Avoids payment stress',timeToStart:'Now',
          category:'home',
          scores:{urgency:10,impact:10,feasibility:9,confidence:9,modeAlignment:10}
        });
      }
    }

    /* HOME: missing target price */
    if(s.homePrice===0&&(s.intent==='home'||s.intent==='buy_home')){
      c.push({id:'home_research',
        title:'Enter a target home price to calculate your readiness numbers',
        why:'Without a target price, Tracent cannot calculate your deposit gap, DTI after buying, or monthly payment. All home readiness metrics depend on this single number.',
        action:'Go to Settings and enter a realistic target price for your area. Use current listing prices, not aspirational ones. Update it as the market moves.',
        impact:'Enables deposit gap, DTI projection, and readiness score',timing:'Today',
        confidenceNote:'Any estimate is better than none — refine it as you research.',
        scoreImpact:3,cashImpact:'Enables analysis',timeToStart:'Today',
        category:'home',
        scores:{urgency:6,impact:6,feasibility:10,confidence:5,modeAlignment:s.active==='home'?10:4}
      });
    }

    /* GROW: employer match */
    if(s.matchMissed&&s.retMatch!=='unknown'){
      var matchGain=s.takeHome>0?fmt(Math.round(s.takeHome*0.03)):'$200';
      c.push({id:'match_capture',
        title:'Capture your full employer match — estimated '+matchGain+'/mo in guaranteed return',
        why:'Employer match is an immediate 50–100% return with zero market risk. Not capturing it is the equivalent of declining a guaranteed salary increase.',
        action:'Log into your HR or payroll portal. Increase your contribution percentage to at least the match threshold. This takes less than 5 minutes and the benefit is permanent.',
        impact:'Immediate 50–100% return on contributions; compounding from today',timing:'This week',
        confidenceNote:'Match rate varies by employer. Confirm your specific match formula in your benefits documentation.',
        scoreImpact:6,cashImpact:matchGain+'/mo matched',timeToStart:'This week',
        category:'grow',
        scores:{urgency:8,impact:9,feasibility:9,confidence:7,modeAlignment:s.active==='grow'||s.active==='retire'?10:6}
      });
    }

    /* GROW: deploy surplus */
    if(s.efMonths>=s.efTarget&&s.ccDebt===0&&s.fcf>100){
      var investAmt=Math.round(s.fcf*0.35);
      c.push({id:'invest_surplus',
        title:'Deploy '+fmt(investAmt)+'/mo of surplus into a low-cost index fund',
        why:'Your safety base is in place and you have no high-rate debt. Consistent capital into the market now beats waiting for the perfect moment.',
        action:'Open or top up a brokerage or ISA account. Set a recurring monthly investment of '+fmt(investAmt)+' into a broad market index fund. Automate it — do not decide each month.',
        impact:'Builds long-term wealth through consistent compounding',timing:'This month',
        confidenceNote:'Amount based on 35% of FCF. Adjust if income is variable.',
        scoreImpact:4,cashImpact:fmt(investAmt)+'/mo deployed',timeToStart:'This month',
        category:'grow',
        scores:{urgency:4,impact:8,feasibility:8,confidence:6,modeAlignment:s.active==='grow'?10:5}
      });
    }

    /* RETIRE: increase contribution — excluded at draw age (65+) */
    if(s.income>0&&s.efMonths>=2&&s.currentAge<65){
      var curAmt=Math.round(s.income*0.06/12);
      var idealAmt=Math.round(s.income*0.15/12);
      var gap=Math.max(0,idealAmt-curAmt);
      if(gap>0){
        var yearsLeft=s.currentAge>0?Math.max(5,Math.min(35,65-s.currentAge)):30;
        var r=0.07/12,n=yearsLeft*12;
        var fvGap=Math.round(gap*((Math.pow(1+r,n)-1)/r));
        c.push({id:'retire_contrib',
          title:'Increase retirement contribution by 1% — worth ~'+fmt(fvGap)+' over '+yearsLeft+' years',
          why:'Assuming a 6% contribution rate. Reaching 15% requires incremental increases. A single 1% raise today compounds for decades.',
          action:'Log into your retirement account portal. Raise your contribution by exactly 1 percentage point. This takes 5 minutes. Set a calendar reminder to raise it again in 6 months.',
          impact:'~'+fmt(fvGap)+' additional projected value at 7% average over '+yearsLeft+' years',timing:'This week',
          confidenceNote:'Projection uses 7% average return — actual returns vary. This is illustrative, not a guarantee.',
          scoreImpact:5,cashImpact:fmt(gap)+'/mo more invested',timeToStart:'This week',
          category:'retire',
          scores:{urgency:5,impact:8,feasibility:9,confidence:6,modeAlignment:s.active==='retire'?10:5}
        });
      }
    }

    /* CAREER: income below market — only when benchmark is confident */
    var _cbm = window.G && window.G.careerBenchmark;
    if (_cbm && _cbm.confidence !== null && !_cbm.aboveMedian && (_cbm.gapFromMedian || 0) > 5000) {
      var _gapK   = Math.round(_cbm.gapFromMedian / 1000);
      var _moGain = Math.round(_cbm.gapFromMedian / 12);
      c.push({id:'career_gap',
        title:'You\'re $'+_gapK+'k below market for '+(_cbm.roleTitle||'your role')+' — build the case for your next review',
        why:'Market median for '+(_cbm.roleTitle||'your role')+' in '+(window.G.state||'your area')+' is '+fmt(_cbm.median)+'. Your income is '+_cbm.pctOfMedian+'% of that — a $'+_gapK+'k gap. Closing it adds '+fmt(_moGain)+'/mo; income growth is the highest-leverage financial lever available to you.',
        action:'Your benchmark data is in the Career tab. Request the conversation 4–6 weeks before your review. Come with the market number, a list of wins from the past 12 months, and a specific dollar ask.',
        impact:'$'+_gapK+'k income increase shifts debt payoff, savings rate, and long-term wealth simultaneously',timing:'Next review cycle',
        confidenceNote:'Benchmark: '+(_cbm.confidence==='high'?'BLS direct match (high confidence)':'Market data match (medium confidence)')+'. Base salary comparison only.',
        scoreImpact:7,cashImpact:'+'+fmt(_moGain)+'/mo',timeToStart:'4–6 weeks out',
        category:'grow',
        scores:{urgency:7,impact:9,feasibility:5,confidence:_cbm.confidence==='high'?9:7,modeAlignment:s.active==='today'||s.active==='grow'?9:6}
      });
    }

    /* RECURRING LEAK: high leak risk detected by cashflow engine */
    if(s.leakRisk==='high'&&s.efMonths>=1&&s.fcf>0&&s.ccDebt===0){
      var _leakAmt=s.subEst+Math.round(s.nmMonthly*0.3); // subscriptions + 30% of non-monthly as recoverable
      var _topLeaks=s.leakItems.slice(0,3).map(function(l){return l.label.split('(')[0].trim();}).join(', ');
      c.push({id:'recurring_leak',
        title:'Recurring charges may be absorbing '+fmt(_leakAmt)+'/mo of your cash flow',
        why:'Your estimated non-monthly and subscription costs are reducing real cash flow significantly. The gap between your stated free cash and your effective free cash is '+fmt(s.fcf-s.effectiveFCF)+'/mo.',
        action:'Pull your last two bank statements and highlight every recurring charge. Focus on: '+(_topLeaks||'subscriptions, insurance, memberships')+'. Cancel anything unused. Redirect recovered cash to your top priority.',
        impact:'Recovering '+fmt(_leakAmt)+'/mo'+(s.takeHome>0?' improves effective FCF by '+Math.round(_leakAmt/s.takeHome*100)+'% of take-home':''),timing:'This week',
        confidenceNote:'Estimates based on income-band averages — actual amounts will vary. Check your statements to confirm.',
        scoreImpact:3,cashImpact:'+'+fmt(_leakAmt)+'/mo recovered',timeToStart:'This week',
        category:'grow',
        scores:{urgency:6,impact:5,feasibility:9,confidence:4,modeAlignment:s.active==='today'||s.active==='grow'?8:5}
      });
    }

    /* STABLE: subscription audit (when cashflow engine not available or leak risk not high) */
    if(s.score>=70&&s.ccDebt===0&&s.efMonths>=s.efTarget&&s.leakRisk!=='high'){
      var _auditAmt=s.subEst>0?Math.round(s.subEst*0.25):Math.round(s.fcf*0.08);
      c.push({id:'optimize_fcf',
        title:'Audit recurring subscriptions — recover '+fmt(_auditAmt)+'/mo to redirect',
        why:'Your position is strong. Most people overpay on subscriptions, insurance, and utilities by 5–10% of take-home. That money redeploys more productively elsewhere.',
        action:'Pull your last two bank statements. Highlight every recurring charge under $30. Cancel any you have not actively used in 30 days. Redirect what you save to your primary goal.',
        impact:'Frees '+fmt(_auditAmt)+'/mo to deploy intentionally',timing:'This week',
        confidenceNote:s.subEst>0?'Estimated recurring charges: '+fmt(s.subEst)+'/mo (subscriptions + memberships). Actual amounts will vary.':'Estimate based on 8% of FCF — actual recovery depends on your subscription mix.',
        scoreImpact:2,cashImpact:'+'+fmt(_auditAmt)+'/mo',timeToStart:'This week',
        category:'grow',
        scores:{urgency:3,impact:4,feasibility:9,confidence:5,modeAlignment:7}
      });
    }

    return c;
  }

  /* ═══════════════════════════════════════════════════════
     3. SCORING + SAFETY FILTERS + RANKING
  ═══════════════════════════════════════════════════════ */
  function scoreCandidate(c,s){
    var sc=c.scores;
    var modeMap={today:['safety','debt'],home:['home','safety'],debt:['debt','safety'],grow:['grow','retire'],retire:['retire','grow']};
    var modeBoost=(modeMap[s.active]||[]).indexOf(c.category)>-1?1:0;
    var raw=sc.urgency*0.275+sc.impact*0.275+sc.feasibility*0.20+sc.confidence*0.10+(sc.modeAlignment+modeBoost)*0.15;
    var confMult=s.confidence==='high'?1:s.confidence==='medium'?0.92:0.82;
    // ── BSE archetype weighting ──────────────────────────────────────
    // BSE's behavioral signal (archetype + stage) amplifies or suppresses
    // candidates so the engine's output aligns with the user's actual state.
    var _bse  = window.BSE || {};
    var _arch = _bse.archetype || '';
    var _archMult = 1;
    if      (_arch === 'anxious_overwhelmed' && c.category !== 'safety')  _archMult = 0.72;
    else if (_arch === 'avoider'             && c.scores.feasibility <= 7) _archMult = 0.85;
    else if (_arch === 'optimizer'           && (c.category === 'grow' || c.category === 'retire')) _archMult = 1.12;
    else if (_arch === 'in_retirement' || _arch === 'pre_retirement') {
      if (c.category === 'retire')                     _archMult = 1.18;
      else if (c.id === 'cc_attack' || c.id === 'car_paydown') _archMult = 0.88;
    }
    return raw * confMult * _archMult;
  }

  function applySafetyFilters(candidates,s){
    var criticalEF=s.efProvided&&s.efMonths<1;
    var highDebt=s.totalDebt>5000;
    var severeCC=s.ccDebt>8000;
    var tightCash=s.fcf<200;
    var nearZero=s.fcf<50;
    return candidates.filter(function(c){
      if(criticalEF&&highDebt&&(c.id==='invest_surplus'||c.id==='optimize_fcf')) return false;
      if(severeCC&&(c.id==='home_deposit'||c.id==='home_dti_prep')) return false;
      if(tightCash&&(c.id==='retire_contrib'||c.id==='invest_surplus')) return false;
      if(nearZero&&c.id!=='deficit'&&c.id!=='ef_zero') return false;
      // Retirement mode: home-buying and career advancement are never the right NBM
      if(s.isRetirementMode&&(c.category==='home'||c.id==='career_gap')) return false;
      return true;
    });
  }

  function rankCandidates(candidates,s){
    return candidates
      .map(function(c){ return {c:c,score:scoreCandidate(c,s)}; })
      .sort(function(a,b){
        if(b.score!==a.score) return b.score-a.score;          // 1. final score desc
        var ia=a.c.scores.impact, ib=b.c.scores.impact;
        if(ib!==ia) return ib-ia;                              // 2. impact desc
        var ua=a.c.scores.urgency, ub=b.c.scores.urgency;
        if(ub!==ua) return ub-ua;                              // 3. urgency desc
        return (a.c.id<b.c.id?-1:a.c.id>b.c.id?1:0);         // 4. alpha by id (stable)
      })
      .map(function(item){ return item.c; });
  }

  /* ═══════════════════════════════════════════════════════
     4. PUBLIC: replaces v21GetRankedMoves
  ═══════════════════════════════════════════════════════ */
  function getEngineRankedMoves(){
    if(typeof G==='undefined'||!G.scoreFinal) return [_fallback()];
    // Completeness gate — require meaningful data before running engine
    var _gComp = Number((window.G||{}).profileCompleteness||0);
    var _gInf  = Array.isArray((window.G||{})._inferredFields)?(window.G||{})._inferredFields.length:0;
    if(_gComp < 60 || _gInf > 5) return [_insufficientData()];
    var s=buildState();
    var raw=buildCandidates(s);
    if(!raw.length) return [_fallback()];
    var filtered=applySafetyFilters(raw,s);
    if(!filtered.length) filtered=raw;
    var ranked=rankCandidates(filtered,s);
    if(ranked.length>1){
      ranked[0]._alternatives=ranked.slice(1,4).map(function(alt){
        return {title:alt.title, whyLower:_whyLower(ranked[0],alt,s)};
      });
    } else { ranked[0]._alternatives=[]; }
    ranked[0]._rankingReason=_rankingReason(ranked[0],s);
    return ranked;
  }

  function _fallback(){
    return {
      id:'fallback',
      title:'Keep reviewing your position monthly',
      why:'No high-priority actions identified for your current position — small consistent improvements compound over time.',
      action:'Check in weekly and update your numbers when anything changes.',
      impact:'Steady progress',timing:'Weekly',
      confidenceNote:'Run a full analysis to get specific recommendations.',
      scoreImpact:1,cashImpact:'Steady',timeToStart:'Weekly',
      category:'safety',scores:{urgency:1,impact:1,feasibility:10,confidence:8,modeAlignment:5},
      _alternatives:[],_rankingReason:'No specific high-priority actions identified for current position.'
    };
  }

  function _insufficientData(){
    return {
      id:'insufficient_data',
      title:'Add a few more details to get your plan',
      why:'Your next best move will appear once your income, housing cost, and debt balances are on file.',
      action:'Tap Settings to complete your profile — it takes under 2 minutes.',
      impact:'—',timing:'Now',
      confidenceNote:'Recommendations only appear when your numbers are complete enough to be meaningful.',
      scoreImpact:0,cashImpact:'—',timeToStart:'Now',
      category:'setup',scores:{urgency:10,impact:10,feasibility:10,confidence:0,modeAlignment:5},
      _alternatives:[],_rankingReason:'Profile completion required before engine recommendations can be generated.'
    };
  }

  function _whyLower(winner,alt,s){
    var reasons=[];
    if(winner.scores.urgency>alt.scores.urgency+1) reasons.push('lower urgency given current position');
    else if(winner.scores.impact>alt.scores.impact+1) reasons.push('lower projected impact on your position');
    else if(winner.scores.feasibility<alt.scores.feasibility-1) reasons.push('more feasible but less impactful right now');
    else { var diff=(scoreCandidate(winner,s)-scoreCandidate(alt,s)).toFixed(1); reasons.push('ranked '+diff+' points lower in composite score'); }
    return reasons[0].charAt(0).toUpperCase()+reasons[0].slice(1)+'.';
  }

  function _rankingReason(move,s){
    var parts=[];
    if(move.scores.urgency>=9) parts.push('highest urgency given current position');
    if(move.scores.impact>=9)  parts.push('highest projected impact on score and cash flow');
    if(move.scores.feasibility>=8) parts.push('immediately actionable without new accounts or approvals');
    if(move.category==='safety') parts.push('safety actions always rank first until the foundation is secure');
    if(!parts.length) parts.push('highest composite score across urgency, impact, feasibility, and mode alignment');
    return 'This action ranked first because: '+parts.join('; ')+'.';
  }

  /* First-move: one executable sentence derived from FCF and move id */
  function _computeFirstMove(move, gv) {
    var fcf       = Number(gv.fcf    || 0);
    var ccDebt    = Number(gv.ccDebt || 0);
    var savings   = Number(gv.savingsAmt || 0);
    var hasFcf    = (typeof _hasTrustedCashflowInputs === 'function') && _hasTrustedCashflowInputs(gv) && fcf > 0;

    // High-FCF mode: FCF > $2,000/mo — scale proportionally, no $400 ceiling
    var highFcf   = hasFcf && fcf > 2000;

    var deploy;
    if (!hasFcf) {
      deploy = 150; // fallback when no trusted cashflow data
    } else if (highFcf) {
      deploy = Math.max(500, Math.round(fcf * 0.15 / 100) * 100); // 15% of FCF, nearest $100, min $500
    } else {
      deploy = Math.max(75, Math.min(Math.round(fcf * 0.40 / 25) * 25, 400)); // standard: 40%, $75–$400
    }

    var fmt = function(n){ return '$' + Math.round(n).toLocaleString('en-US'); };

    switch(move.id || '') {
      case 'deficit':
        return 'List every fixed bill this week and reduce or cancel one.';

      case 'ef_zero':
        return 'Open a separate savings account and move ' + fmt(Math.min(deploy, highFcf ? 1000 : 250)) + ' in this month.';

      case 'ef_low':
        return 'Add ' + fmt(deploy) + ' to your emergency fund this month.';

      case 'cc_attack':
        // High FCF + balance clearable within 4 months → add payoff horizon
        if (highFcf && ccDebt > 0 && ccDebt <= deploy * 4) {
          return 'Put ' + fmt(deploy) + ' toward your highest-rate card this month — at this rate you clear the balance in ' + Math.ceil(ccDebt / deploy) + ' months.';
        }
        return 'Put ' + fmt(deploy) + ' toward your highest-rate card this month.';

      case 'dti_reduce':
        return 'Apply ' + fmt(deploy) + ' to your smallest balance to free up a minimum payment.';

      case 'car_paydown':
        return 'Add ' + fmt(Math.min(deploy, highFcf ? 500 : 200)) + ' to your car payment this month.';

      case 'home_deposit':
        // High FCF + already strong deposit position → pivot to strategic advice
        if (highFcf && savings > 50000) {
          return 'Your deposit position is solid — focus on clearing high-rate debt before application to remove DTI friction.';
        }
        return 'Move ' + fmt(deploy) + ' into a dedicated deposit savings account this month.';

      case 'home_dti_prep':
        // High FCF + balance is clearable → specific clearance framing
        if (highFcf && ccDebt > 0 && ccDebt <= deploy * 6) {
          return 'Apply ' + fmt(deploy) + ' to your highest-rate debt — clearing it in full before application eliminates all lender DTI friction.';
        }
        return 'Apply ' + fmt(deploy) + ' to your highest-rate debt before submitting your mortgage application.';

      case 'home_research':
        return 'Add your target home price in settings so your readiness numbers are calculated.';

      case 'home_overstretch':
        return 'Model a lower target price in settings and compare the monthly payment.';

      case 'match_capture':
        return 'Log into your 401k portal today and raise your contribution to the match threshold.';

      case 'invest_surplus':
        var _inv;
        if (!hasFcf) {
          _inv = 0;
        } else if (highFcf) {
          _inv = Math.max(500, Math.round(fcf * 0.20 / 100) * 100); // 20% of FCF, nearest $100
        } else {
          _inv = Math.max(75, Math.min(Math.round(fcf * 0.35 / 25) * 25, 400));
        }
        return _inv > 0
          ? 'Set up a ' + fmt(_inv) + '/mo recurring transfer to a low-cost index fund.'
          : 'Set up a recurring transfer to a low-cost index fund this month.';

      case 'retire_contrib':
        return 'Increase your retirement contribution by ' + fmt(Math.min(deploy, highFcf ? 1000 : 200)) + ' this month.';

      case 'career_gap':
        return 'Find one comparable role paying above your current rate and save the listing this week.';

      case 'recurring_leak':
        return 'Review your bank statement and cancel one subscription you haven\u2019t used this month.';

      case 'optimize_fcf':
        return 'Identify your largest discretionary spend and cut it by ' + fmt(Math.min(deploy, highFcf ? 500 : 150)) + ' this month.';

      default:
        return hasFcf ? 'Redirect ' + fmt(deploy) + ' from discretionary spending toward this goal this month.' : '';
    }
  }

  /* ═══════════════════════════════════════════════════════
     5. UPDATED RENDER FUNCTION
  ═══════════════════════════════════════════════════════ */
  window.v21RenderNBMCard = function(){
    var card=document.getElementById('v21-nbm-card');
    if(!card||typeof G==='undefined'||!G.scoreFinal) return;
    // Home mode is handled entirely by renderDecisionFlow() — skip old card render
    if(G.primaryIntent==='home'||G.primaryIntent==='buy_home') return;
    // If DFR is active and this card has already been suppressed/hidden, don't force visible
    var _dfrEl = document.getElementById('bse-focus-mode');
    if (_dfrEl && _dfrEl.style.display !== 'none' && (card.style.display === 'none' || card.style.visibility === 'hidden')) return;

    // Decision gate — tell/ask/hold before running the engine
    var _dm = typeof window.getDecisionMode === 'function' ? window.getDecisionMode(G, G.primaryIntent) : { mode: 'tell' };
    if (_dm.mode === 'hold') {
      var f=function(id){ return document.getElementById(id); };
      var _holdIntent = (G && G.primaryIntent) || '';
      var _holdWhy = (G && G.isRetirementMode)
        ? 'Add your retirement savings to calculate your runway.'
        : (_holdIntent === 'home' || _holdIntent === 'buy_home')
          ? 'Add your target home price to calculate your readiness.'
          : (_holdIntent === 'debt' || _holdIntent === 'debtrank')
            ? 'Add your credit card balance to build your payoff plan.'
            : 'Add your monthly expenses to assess your cash flow.';
      if(f('v21-nbm-title'))      f('v21-nbm-title').textContent      = 'Too early to make a call';
      if(f('v21-nbm-why'))        f('v21-nbm-why').textContent        = _holdWhy;
      if(f('v21-nbm-desc'))       f('v21-nbm-desc').textContent       = '';
      if(f('v21-nbm-impact'))     f('v21-nbm-impact').textContent     = '—';
      if(f('v21-nbm-cash'))       f('v21-nbm-cash').textContent       = '—';
      if(f('v21-nbm-time'))       f('v21-nbm-time').textContent       = '—';
      if(f('v21-nbm-first-move')) f('v21-nbm-first-move').textContent = '';
      var _wb=f('v21-nbm-why-btn'); if(_wb) _wb.style.display='none';
      var _eb=f('v21-nbm-easier-btn'); if(_eb) _eb.style.display='none';
      card.style.display='block';
      return;
    }
    if (_dm.mode === 'ask') {
      var _field = (_dm.missing && _dm.missing[0]) || 'a key detail';
      var _isAssumed = _dm.reason === 'assumed';
      var _isHomeAsk = G.primaryIntent === 'home';
      var f=function(id){ return document.getElementById(id); };
      if(f('v21-nbm-title'))      f('v21-nbm-title').textContent      = _isAssumed
        ? (_isHomeAsk ? 'Before I call this, confirm one thing about your home plan' : 'Before I call this, confirm one thing')
        : (_isHomeAsk ? 'Before I call this, confirm one thing about your home plan' : 'One more detail \u2014 then I can give you a real recommendation');
      if(f('v21-nbm-why'))        f('v21-nbm-why').textContent        = _isAssumed
        ? 'Before I call this, confirm: ' + _field + '.'
        : 'I need one more thing to give you a real recommendation: ' + _field + '.';
      if(f('v21-nbm-desc'))       f('v21-nbm-desc').textContent       = _isHomeAsk ? 'Update your home details to calculate your readiness.' : 'Update your details to get your next best move.';
      if(f('v21-nbm-impact'))     f('v21-nbm-impact').textContent     = '—';
      if(f('v21-nbm-cash'))       f('v21-nbm-cash').textContent       = '—';
      if(f('v21-nbm-time'))       f('v21-nbm-time').textContent       = '—';
      var _wb=f('v21-nbm-why-btn'); if(_wb) _wb.style.display='none';
      var _eb=f('v21-nbm-easier-btn'); if(_eb) _eb.style.display='none';
      card.style.display='block';
      return;
    }

    // mode === 'tell' — proceed to engine
    var moves=getEngineRankedMoves();
    var idx=Math.min(window._v21MoveIndex||0,moves.length-1);
    var move=moves[idx]||moves[0];
    var f=function(id){ return document.getElementById(id); };

    // Incomplete profile — show completion-oriented state, not an engine recommendation
    if(move.id==='insufficient_data'){
      if(f('v21-nbm-title'))      f('v21-nbm-title').textContent      = move.title;
      if(f('v21-nbm-why'))        f('v21-nbm-why').textContent        = move.why;
      if(f('v21-nbm-desc'))       f('v21-nbm-desc').textContent       = move.action;
      if(f('v21-nbm-impact'))     f('v21-nbm-impact').textContent     = '—';
      if(f('v21-nbm-cash'))       f('v21-nbm-cash').textContent       = '—';
      if(f('v21-nbm-time'))       f('v21-nbm-time').textContent       = '—';
      if(f('v21-nbm-first-move')) f('v21-nbm-first-move').textContent = '';
      var whyBtnId=f('v21-nbm-why-btn');
      if(whyBtnId) whyBtnId.style.display='none';
      var easierBtnId=f('v21-nbm-easier-btn');
      if(easierBtnId) easierBtnId.style.display='none';
      card.style.display='block';
      return;
    }

    // P3: action first — imperative action becomes the headline
    var _act1 = (move.action||'').split(/[.!?]\s/)[0] || move.action || move.title;
    if(f('v21-nbm-title'))      f('v21-nbm-title').textContent      = _act1;
    if(f('v21-nbm-why'))        f('v21-nbm-why').textContent        = move.why||'';
    if(f('v21-nbm-desc'))       f('v21-nbm-desc').textContent       = '';
    if(f('v21-nbm-impact'))     f('v21-nbm-impact').textContent     = move.scoreImpact>0?'+'+move.scoreImpact:String(move.scoreImpact||'—');
    if(f('v21-nbm-cash'))       f('v21-nbm-cash').textContent       = move.cashImpact||'—';
    if(f('v21-nbm-time'))       f('v21-nbm-time').textContent       = move.timeToStart||move.timing||'—';
    if(f('v21-nbm-first-move')) f('v21-nbm-first-move').textContent = _computeFirstMove(move, G);
    var whyBtn=f('v21-nbm-why-btn');
    if(whyBtn) whyBtn.style.display=(move._rankingReason||(move._alternatives&&move._alternatives.length))?'inline-flex':'none';
    _populateDisclosure(move);
    var easierBtn=f('v21-nbm-easier-btn');
    if(easierBtn) easierBtn.style.display=moves.length>1?'inline-flex':'none';
    card.style.display='block';
    try { pbfdeState.nbmViewCount++; } catch(e){}
    try { tracentPulseNBM(); } catch(e){}
  };

  function _populateDisclosure(move){
    var rankEl=document.getElementById('v21-nbm-disc-ranking');
    var altsEl=document.getElementById('v21-nbm-disc-alts');
    if(rankEl) rankEl.textContent=move._rankingReason||'';
    if(altsEl){
      var alts=move._alternatives||[];
      if(!alts.length){
        altsEl.innerHTML='<div class="v21-nbm-disc-noalt">No alternatives met the safety and relevance thresholds for your current position.</div>';
      } else {
        altsEl.innerHTML=alts.map(function(alt){
          return '<div class="v21-nbm-disc-alt">'+
            '<div class="v21-nbm-disc-alt-title">'+alt.title+'</div>'+
            '<div class="v21-nbm-disc-alt-reason">Why it ranked lower: '+alt.whyLower+'</div>'+
          '</div>';
        }).join('');
      }
    }
  }

  /* ═══════════════════════════════════════════════════════
     6. DISCLOSURE TOGGLE
  ═══════════════════════════════════════════════════════ */
  window.v21ToggleNBMDisclosure=function(){
    var panel=document.getElementById('v21-nbm-disclosure');
    var btn=document.getElementById('v21-nbm-why-btn');
    if(!panel) return;
    var open=panel.style.display!=='none';
    panel.style.display=open?'none':'block';
    if(btn) btn.textContent=open?'Why this? ↓':'Why this? ↑';
    try { tracentTrack('nbm_disclosure_'+(open?'close':'open'),{}); } catch(e){}
  };

  /* ═══════════════════════════════════════════════════════
     7. OVERRIDE v21GetRankedMoves
  ═══════════════════════════════════════════════════════ */
  window.v21GetRankedMoves=getEngineRankedMoves;

  /* ═══════════════════════════════════════════════════════
     8. CSS
  ═══════════════════════════════════════════════════════ */
  // ── Internal export for debug layer (no production side-effects) ──
  window.__nbmEngine__ = {
    buildState:          buildState,
    buildCandidates:     buildCandidates,
    applySafetyFilters:  applySafetyFilters,
    scoreCandidate:      scoreCandidate,
    rankCandidates:      rankCandidates,
    getEngineRankedMoves: getEngineRankedMoves
  };

  var style=document.createElement('style');
  style.textContent=[
    '.v21-nbm-why{font-size:14px;color:rgba(255,255,255,0.80);line-height:1.6;margin-bottom:10px;}',
    '.v21-nbm-action-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.35);margin-bottom:4px;}',
    '.v21-nbm-confidence{display:none;}', /* internal engine metadata — not user-facing */
    '.v21-nbm-why-btn.active,.v21-nbm-why-btn:focus{background:rgba(0,168,232,0.15)!important;}',
    '.v21-nbm-disclosure{margin-top:14px;border-top:1px solid rgba(255,255,255,0.08);padding-top:14px;}',
    '.v21-nbm-disc-section{margin-bottom:14px;}',
    '.v21-nbm-disc-section:last-child{margin-bottom:0;}',
    '.v21-nbm-disc-heading{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.35);margin-bottom:6px;}',
    '.v21-nbm-disc-body{font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6;}',
    '.v21-nbm-disc-alt{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:11px 13px;margin-bottom:8px;}',
    '.v21-nbm-disc-alt:last-child{margin-bottom:0;}',
    '.v21-nbm-disc-alt-title{font-size:12px;font-weight:600;color:rgba(255,255,255,0.70);margin-bottom:4px;line-height:1.4;}',
    '.v21-nbm-disc-alt-reason{font-size:11px;color:rgba(255,255,255,0.40);line-height:1.5;}',
    '.v21-nbm-disc-noalt{font-size:12px;color:rgba(255,255,255,0.38);font-style:italic;}',
  ].join('\n');
  document.head.appendChild(style);

})();


/* ═══ MODULE: NBM Debug + Scenario Validator ═══
   Dev-only. Zero UI. Zero production rendering changes.
   Entry points (browser console):
     window.nbmDebug()                        — run against live G/BSE
     window.nbmTest()                         — run all 12 scenarios
     window.nbmScenario(mockG, mockBSE, label)— run one custom scenario
   All output to console only. G and BSE are restored after each run.
═══════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__TRACENT_NBM_DBG__) return;
  window.__TRACENT_NBM_DBG__ = true;

  var _eng = window.__nbmEngine__;
  if (!_eng) {
    console.warn('[NBM Debug] __nbmEngine__ not exposed — debug layer inactive.');
    return;
  }

  /* ── Score decomposition (mirrors scoreCandidate maths, returns parts) ── */
  function _decompose(c, s, arch) {
    var sc = c.scores;
    var modeMap = {today:['safety','debt'],home:['home','safety'],debt:['debt','safety'],grow:['grow','retire'],retire:['retire','grow']};
    var modeBoost = (modeMap[s.active]||[]).indexOf(c.category) > -1 ? 1 : 0;
    var raw = sc.urgency*0.275 + sc.impact*0.275 + sc.feasibility*0.20 + sc.confidence*0.10 + (sc.modeAlignment+modeBoost)*0.15;
    var confMult = s.confidence==='high' ? 1 : s.confidence==='medium' ? 0.92 : 0.82;
    var archMult = 1;
    if      (arch==='anxious_overwhelmed' && c.category!=='safety')              archMult = 0.72;
    else if (arch==='avoider'             && sc.feasibility <= 7)                archMult = 0.85;
    else if (arch==='optimizer'           && (c.category==='grow'||c.category==='retire')) archMult = 1.12;
    else if (arch==='in_retirement'||arch==='pre_retirement') {
      if   (c.category==='retire')                         archMult = 1.18;
      else if (c.id==='cc_attack'||c.id==='car_paydown')   archMult = 0.88;
    }
    return { raw:+raw.toFixed(3), confMult:confMult, archMult:archMult, final:+(raw*confMult*archMult).toFixed(3) };
  }

  /* ── Filter reason (mirrors applySafetyFilters conditions) ── */
  function _filterReason(c, s) {
    var criticalEF = s.efMonths < 1, highDebt = s.totalDebt > 5000;
    var severeCC   = s.ccDebt > 8000, tightCash = s.fcf < 200, nearZero = s.fcf < 50;
    if (criticalEF && highDebt && (c.id==='invest_surplus'||c.id==='optimize_fcf')) return 'criticalEF+highDebt';
    if (severeCC   && (c.id==='home_deposit'||c.id==='home_dti_prep'))              return 'severeCC';
    if (tightCash  && (c.id==='retire_contrib'||c.id==='invest_surplus'))           return 'tightCash';
    if (nearZero   && c.id!=='deficit' && c.id!=='ef_zero')                         return 'nearZero';
    return null;
  }

  /* ── Anomaly detection ── */
  function _anomalies(rows, s) {
    var out = [];
    var winner  = rows.find(function(r){ return !r.filtered; });
    // Safety candidate filtered — always wrong
    rows.filter(function(r){ return r.filtered && r.category==='safety'; }).forEach(function(r){
      out.push('ANOMALY: safety candidate "'+r.id+'" was filtered out (reason: '+r.filterReason+')');
    });
    // invest_surplus / optimize_fcf survived criticalEF+highDebt
    rows.filter(function(r){ return !r.filtered && (r.id==='invest_surplus'||r.id==='optimize_fcf'); }).forEach(function(r){
      if (s.efMonths<1 && s.totalDebt>5000) out.push('ANOMALY: "'+r.id+'" survived filter despite criticalEF+highDebt — safety filter broken');
    });
    // career_gap present but benchmark confidence is null
    rows.filter(function(r){ return r.id==='career_gap'; }).forEach(function(){
      var _cbm = window.G && window.G.careerBenchmark;
      if (!_cbm || _cbm.confidence===null) out.push('ANOMALY: career_gap candidate appeared despite null/missing benchmark confidence');
    });
    // Non-winner has materially higher impact AND score close to winner
    if (winner) {
      rows.filter(function(r){ return !r.filtered && r.id!==winner.id; }).forEach(function(r){
        if (r.scores.impact > winner.scores.impact+2 && r.final >= winner.final*0.90)
          out.push('NOTE: "'+r.id+'" (impact='+r.scores.impact+') ranked below winner "'+winner.id+'" (impact='+winner.scores.impact+') — verify archMult/modeAlignment suppression is intentional');
      });
    }
    return out.length ? out : ['None detected'];
  }

  /* ── Core run function — saves/restores G and BSE ── */
  function _run(label, mockG, mockBSE) {
    var savedG = window.G, savedBSE = window.BSE;
    try {
      if (mockG)   window.G   = Object.assign({}, mockG,   {scoreFinal:true, score:mockG.score||55});
      if (mockBSE) window.BSE = Object.assign({}, savedBSE||{archetype:'stable_confident'}, mockBSE);
      var s    = _eng.buildState();
      var arch = (window.BSE && window.BSE.archetype) || '';
      var raw  = _eng.buildCandidates(s);
      var kept = _eng.applySafetyFilters(raw, s);
      var keptIds = kept.map(function(c){ return c.id; });
      var rows = raw.map(function(c){
        var d  = _decompose(c, s, arch);
        var fr = _filterReason(c, s);
        var filtered = keptIds.indexOf(c.id) === -1;
        return {
          id:c.id, category:c.category, scores:c.scores,
          title55: c.title.slice(0,55)+(c.title.length>55?'…':''),
          raw:d.raw, confMult:d.confMult, archMult:d.archMult, final:d.final,
          filtered:filtered, filterReason: filtered ? (fr||'all-filtered-fallback') : ''
        };
      }).sort(function(a,b){ return b.final-a.final; });

      var ranked = _eng.rankCandidates(kept.length ? kept : raw, s);
      var winner = ranked[0];
      var anomalies = _anomalies(rows, s);

      console.group('[NBM] ' + label);
      console.log('State  →', {mode:s.active, fcf:s.fcf, efMo:s.efMonths, ccDebt:s.ccDebt, totDebt:s.totalDebt, dti:s.dti, score:s.score, conf:s.confidence, arch:arch});
      console.log('Winner →', winner ? winner.id+' | '+winner.title.slice(0,60) : '(fallback)');
      console.table(rows.map(function(r){
        return {id:r.id, cat:r.category, raw:r.raw, 'confX':r.confMult, 'archX':r.archMult, final:r.final, filtered:r.filtered, reason:r.filterReason};
      }));
      anomalies[0]!=='None detected' ? console.warn('Anomalies →', anomalies) : console.log('Anomalies → none');
      console.groupEnd();
      return {label:label, state:s, arch:arch, rows:rows, winner:winner?winner.id:null, anomalies:anomalies};
    } finally {
      window.G   = savedG;
      window.BSE = savedBSE;
    }
  }

  /* ═══════════════════════════════════════════════════════
     SCENARIO DEFINITIONS — 12 representative states
  ═══════════════════════════════════════════════════════ */
  var SCENARIOS = [
    { label:'S01 deficit — neg FCF, no EF, CC debt',
      g:{income:54000,takeHome:3240,fcf:-280,ccDebt:4500,ccRate:22,carDebt:0,studentDebt:0,otherDebt:0,emergency:'0',dti:52,score:38,primaryIntent:'today'},
      bse:{archetype:'anxious_overwhelmed'} },

    { label:'S02 zero EF, positive FCF, debt-free',
      g:{income:72000,takeHome:4320,fcf:420,ccDebt:0,carDebt:0,studentDebt:0,otherDebt:0,emergency:'0',dti:18,score:52,primaryIntent:'today'},
      bse:{archetype:'stable_confident'} },

    { label:'S03 low EF (1mo) + severe CC debt, debt mode',
      g:{income:65000,takeHome:3900,fcf:310,ccDebt:9500,ccRate:21,carDebt:0,studentDebt:0,otherDebt:0,emergency:'1',dti:44,score:46,primaryIntent:'debt'},
      bse:{archetype:'anxious_overwhelmed'} },

    { label:'S04 nearZero FCF — only deficit/ef_zero should survive',
      g:{income:48000,takeHome:2880,fcf:35,ccDebt:12000,ccRate:24,carDebt:0,studentDebt:0,otherDebt:0,emergency:'0',dti:58,score:31,primaryIntent:'today'},
      bse:{archetype:'anxious_overwhelmed'} },

    { label:'S05 EF adequate, CC cleared, employer match missed, grow mode',
      g:{income:85000,takeHome:5100,fcf:850,ccDebt:0,carDebt:0,studentDebt:0,otherDebt:0,emergency:'4',dti:22,score:68,retMatch:'partial',primaryIntent:'grow'},
      bse:{archetype:'stable_confident'} },

    { label:'S06 home buyer — deposit gap + marginal DTI, home mode',
      g:{income:95000,takeHome:5700,fcf:700,ccDebt:2000,ccRate:18,carDebt:8000,carPayment:350,studentDebt:0,otherDebt:0,emergency:'3',dti:38,score:61,homePrice:420000,depositSaved:18000,primaryIntent:'home'},
      bse:{archetype:'stable_confident'} },

    { label:'S07 career gap — confident BLS benchmark, 28% below market',
      g:{income:72000,takeHome:4320,fcf:600,ccDebt:0,carDebt:0,studentDebt:0,otherDebt:0,emergency:'4',dti:20,score:70,
         careerBenchmark:{confidence:'high',aboveMedian:false,gapFromMedian:28000,pctOfMedian:72,median:100000,roleTitle:'Senior Engineer',state:'NY'},
         primaryIntent:'today'},
      bse:{archetype:'optimizer'} },

    { label:'S08 optimizer — EF full, debt-free, surplus to deploy, grow mode',
      g:{income:120000,takeHome:7200,fcf:2100,ccDebt:0,carDebt:0,studentDebt:0,otherDebt:0,emergency:'6',dti:15,score:82,retMatch:'full',primaryIntent:'grow'},
      bse:{archetype:'optimizer'} },

    { label:'S09 pre-retirement — student debt remaining, retire mode',
      g:{income:88000,takeHome:5280,fcf:920,ccDebt:0,carDebt:0,studentDebt:5000,studentRate:5.5,otherDebt:0,emergency:'5',dti:24,score:74,retMatch:'partial',primaryIntent:'retire',currentAge:58},
      bse:{archetype:'pre_retirement'} },

    { label:'S10 in-retirement — no career/invest candidates expected',
      g:{income:36000,takeHome:3000,fcf:280,ccDebt:0,carDebt:0,studentDebt:0,otherDebt:0,emergency:'8',dti:12,score:78,primaryIntent:'retire',currentAge:67},
      bse:{archetype:'in_retirement'} },

    { label:'S11 avoider — feasibility penalty suppresses complex moves',
      g:{income:58000,takeHome:3480,fcf:180,ccDebt:3200,ccRate:21,carDebt:0,studentDebt:8000,studentRate:5.5,otherDebt:0,emergency:'1',dti:36,score:49,primaryIntent:'today'},
      bse:{archetype:'avoider'} },

    { label:'S12 car loan only (no CC), EF adequate, debt mode',
      g:{income:70000,takeHome:4200,fcf:580,ccDebt:0,carDebt:11000,carPayment:320,studentDebt:0,otherDebt:0,emergency:'3',dti:28,score:65,primaryIntent:'debt'},
      bse:{archetype:'stable_confident'} }
  ];

  /* ── Public entry points ── */
  window.nbmDebug = function(){
    return _run('Live — '+new Date().toLocaleTimeString());
  };

  window.nbmScenario = function(mockG, mockBSE, label){
    return _run(label||'Custom', mockG, mockBSE);
  };

  window.nbmTest = function(){
    console.group('[NBM Test Suite] '+SCENARIOS.length+' scenarios — '+new Date().toLocaleTimeString());
    var results = SCENARIOS.map(function(sc){ return _run(sc.label, sc.g, sc.bse); });
    var summary = results.map(function(r){
      return {
        scenario: r.label.slice(0,48),
        arch: r.arch,
        winner: r.winner||'(fallback)',
        candidates: r.rows.length,
        filtered: r.rows.filter(function(x){return x.filtered;}).length,
        anomalies: r.anomalies[0]==='None detected' ? 0 : r.anomalies.length
      };
    });
    console.log('\n── SUMMARY ──');
    console.table(summary);
    var total = results.reduce(function(n,r){ return n+(r.anomalies[0]==='None detected'?0:r.anomalies.length); },0);
    console.log('Total anomalies: '+total+(total===0?' — all clear':''));
    console.groupEnd();
    return results;
  };

})();


/* ═══ MODULE: Score Band Display — band colors, labels, ring ═══ */
/* ── Score Breakdown Enhancement Pass ──────────────────────
   Upgrades the score breakdown modal to a 6-part authority
   layer. Preserves all existing IDs, what-if interactions,
   and scoring logic. Does not touch telemetry or data engine.
─────────────────────────────────────────────────────────── */
(function(){
  if (window.__TRACENT_SBD_PASS__) return;
  window.__TRACENT_SBD_PASS__ = true;

  var circ = 163.4;

  /* ── helpers ─────────────────────────────────────────── */
  function gv(){ return window.G || {}; }
  function fmt(n){ return '$'+(Number(n)||0).toLocaleString('en-US',{maximumFractionDigits:0}); }
  function scoreCol(s){ return s>=85?'#10B981':s>=70?'#0077B6':s>=55?'#F4A261':'#E63946'; }
  function confLabel(s){ return s>=85?'Excellent':s>=70?'Good':s>=55?'Fair':s>=40?'Poor':'Very Poor'; }

  function getConfidence(){
    var g = gv();
    var c = Number(g.profileCompleteness||0);
    var inf = Array.isArray(g._inferredFields)?g._inferredFields.length:0;
    if(c>=80&&inf===0) return {label:'High',color:'var(--green)'};
    if(c>=60&&inf<=2)  return {label:'Medium',color:'var(--amber)'};
    return {label:'Low',color:'var(--red)'};
  }

  function getInputCounts(){
    var g = gv();
    var inf = Array.isArray(g._inferredFields)?g._inferredFields.length:0;
    var comp = Number(g.profileCompleteness||50);
    var total = Math.max(5, Math.round(comp/10));
    var entered = Math.max(1, total-inf);
    return {entered:entered, estimated:inf, total:total};
  }

  function getLastUpdated(){
    var g = gv();
    var ts = g.lastComputedAt;
    if(!ts) return 'Not yet computed';
    try{
      var diff = Math.round((Date.now()-ts)/60000);
      if(diff<1) return 'just now';
      if(diff<60) return diff+'m ago';
      return new Date(ts).toLocaleDateString([],{month:'short',day:'numeric'});
    }catch(e){ return 'just now'; }
  }

  /* ── PART 1: header ring + meta chips ─────────────────── */
  function populateHeader(total, hasOverrides){
    var col = scoreCol(total);
    var arc = document.getElementById('sbd-ring-arc');
    if(arc){ arc.style.strokeDashoffset = circ - (total/100)*circ; arc.style.stroke = col; }
    var numEl = document.getElementById('sbd-score-num');
    if(numEl){ numEl.textContent = total; numEl.style.color = col; }
    var titleEl = document.getElementById('sbd-title');
    if(titleEl) titleEl.textContent = (hasOverrides?'Adjusted: ':'')+confLabel(total);
    var subEl = document.getElementById('sbd-subtitle');
    if(subEl) subEl.textContent = hasOverrides
      ? 'What-if mode \u2014 adjust any factor to see impact'
      : 'A planning score built from 5 visible factors';

    var conf = getConfidence();
    var ic   = getInputCounts();
    var meta = document.getElementById('sbd-meta-chips');
    if(meta){
      meta.innerHTML =
        '<div class="sbd-meta-chip" style="border-color:'+conf.color+';color:'+conf.color+'">Confidence: '+conf.label+'</div>'+
        '<div class="sbd-meta-chip">'+ic.entered+' entered'+(ic.estimated>0?' · '+ic.estimated+' estimated':'')+'</div>'+
        '<div class="sbd-meta-chip">Updated '+getLastUpdated()+'</div>';
    }
  }

  /* ── PART 2: one-sentence verdict ─────────────────────── */
  function populateVerdict(categories, score){
    var section = document.getElementById('sbd-verdict-section');
    var textEl  = document.getElementById('sbd-verdict-text');
    if(!section||!textEl) return;

    var lowestCat = categories.slice().sort(function(a,b){
      return (a.score*a.weight)-(b.score*b.weight);
    })[0];

    var g = gv();
    var verdict;
    if(score>=85){
      verdict = 'Your position is excellent. The priority now is protecting it and compounding steadily.';
    } else if(score>=70){
      var nextGain = categories.filter(function(c){ return c.score<70; }).sort(function(a,b){ return b.weight-a.weight; })[0];
      verdict = nextGain
        ? 'Your score is solid, but '+nextGain.label.toLowerCase()+' weakness is the remaining gap to address.'
        : 'Your position is strong. Small consistent improvements will keep compounding from here.';
    } else if(lowestCat&&lowestCat.weight>=25){
      verdict = 'Your score is being held back most by '+lowestCat.label.toLowerCase()+' \u2014 that factor carries the most weight.';
    } else if((g.ccDebt||0)>3000){
      verdict = 'Revolving debt pressure is the single biggest drag on your position right now.';
    } else if(g.emergency != null && g.emergency !== '' && parseInt(g.emergency, 10) < 3){
      verdict = 'Your score is solid, but cash buffer weakness is reducing your resilience and readiness.';
    } else {
      verdict = 'Your position is stable. The biggest remaining gains come from consistency and targeted optimisation.';
    }

    textEl.textContent = verdict;
    section.style.display = 'block';
  }

  /* ── PART 3: factor list (calls existing _0xdbcabb1) ──── */
  function populateFactors(){
    try { _0xdbcabb1(); } catch(e){
      // Fallback if obfuscated fn unavailable
      var list = document.getElementById('sbd-factor-list');
      if(list) list.innerHTML = '<div style="padding:16px;text-align:center;font-size:13px;color:var(--gray-4);">Run a full analysis to see factor breakdown.</div>';
    }
  }

  /* ── PART 4: why this won ──────────────────────────────── */
  function populateWhyThisWon(){
    var section = document.getElementById('sbd-why-won-section');
    var body    = document.getElementById('sbd-why-won-body');
    if(!section||!body) return;

    var moves;
    try { moves = window.v21GetRankedMoves(); } catch(e){ moves = []; }
    if(!moves||!moves.length){ section.style.display='none'; return; }

    var top  = moves[0];
    var alts = (top._alternatives||[]).slice(0,2);

    var reasonEl = '<div style="background:var(--sky-dim);border:1px solid var(--sky-border);border-radius:var(--r-sm);padding:13px 14px;margin-bottom:12px;">' +
      '<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:5px;line-height:1.35;">'+top.title+'</div>' +
      '<div style="font-size:12px;color:var(--gray-4);line-height:1.6;margin-bottom:8px;">'+top.why+'</div>' +
      '<div style="font-size:11px;color:var(--teal);font-weight:600;">'+(top._rankingReason||'Ranked highest across urgency, impact, and feasibility.')+'</div>'+
    '</div>';

    var altsEl = '';
    if(alts.length){
      altsEl = '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--gray-3);margin-bottom:8px;">Alternatives considered</div>';
      altsEl += alts.map(function(alt){
        return '<div style="border:1px solid var(--gray-2);border-radius:var(--r-sm);padding:11px 13px;margin-bottom:8px;background:var(--white);">'+
          '<div style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:3px;line-height:1.35;">'+alt.title+'</div>'+
          '<div style="font-size:11px;color:var(--gray-4);">Ranked lower: '+alt.whyLower+'</div>'+
        '</div>';
      }).join('');
    }

    body.innerHTML = reasonEl + altsEl;
    section.style.display = 'block';
  }

  /* ── PART 5: what-if banner (keep existing logic) ──────── */
  function updateWhatIfBanner(total, baseTotal, hasOverrides){
    var banner  = document.getElementById('sbd-whatif-banner');
    var wt      = document.getElementById('sbd-whatif-title');
    var ws      = document.getElementById('sbd-whatif-sub');
    var wsc     = document.getElementById('sbd-whatif-score');
    var wfn     = document.getElementById('sbd-whatif-factor-note');
    if(!banner) return;

    if(!hasOverrides){ banner.style.display='none'; return; }

    var diff = total - baseTotal;
    var col  = scoreCol(total);
    banner.style.display = 'block';
    if(wt) wt.textContent = diff>0?'+'+diff+' points from this change':diff<0?diff+' points \u2014 reviewing impact':'No change yet';
    if(ws) ws.textContent = diff>0&&total>=70&&baseTotal<70 ? 'Crosses into the Good band!'
      : diff>0&&total>=85&&baseTotal<85 ? 'Crosses into Excellent!'
      : diff>0 ? 'Getting closer to '+(total<70?'Good (70)':'Excellent (85)')
      : 'Adjust a factor to model a scenario';
    if(wsc){ wsc.textContent = total; wsc.style.color = col; }
    // Factor note: which factor improved most
    if(wfn){
      try{
        var cats = _0xf056049(window._sbdWhatIfState||{}).categories;
        var baseCats = _0xf056049({}).categories;
        var maxDelta = 0; var bestLabel = '';
        cats.forEach(function(c,i){
          var d = c.score - (baseCats[i]?baseCats[i].score:c.score);
          if(d>maxDelta){ maxDelta=d; bestLabel=c.label; }
        });
        wfn.textContent = bestLabel&&maxDelta>0 ? bestLabel+' improves most (+'+maxDelta+' pts)' : '';
      }catch(e){ wfn.textContent=''; }
    }
  }

  /* ── MAIN: full populate ───────────────────────────────── */
  function sbdFullPopulate(){
    var g = gv();
    if(!g.scoreFinal) return;

    var hasOverrides = Object.keys(window._sbdWhatIfState||{}).length>0;
    var result; try{ result = _0xf056049(window._sbdWhatIfState||{}); } catch(e){ return; }
    var total = result.total;
    var baseTotal = hasOverrides ? (function(){ try{ return _0xf056049({}).total; }catch(e){ return total; } })() : total;

    populateHeader(total, hasOverrides);
    populateVerdict(result.categories, total);
    populateFactors();
    populateWhyThisWon();
    updateWhatIfBanner(total, baseTotal, hasOverrides);
    runSBDEntrance();
  }

  /* ── STAGGER ENTRANCE ──────────────────────────────────── */
  function runSBDEntrance(){
    var ids = ['sbd-header','sbd-verdict-section','sbd-factor-section','sbd-why-won-section','sbd-whatif-banner','sbd-trust-note'];
    ids.forEach(function(id, i){
      var el = document.getElementById(id);
      if(!el||el.style.display==='none') return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      el.style.transition = 'none';
      setTimeout(function(){
        el.style.transition = 'opacity 0.30s ease, transform 0.30s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 40 + i*70);
    });
    // Stagger factor rows
    setTimeout(function(){
      var rows = document.querySelectorAll('#sbd-factor-list > div[id^="sbd-card-"]');
      rows.forEach(function(row,i){
        row.style.opacity = '0';
        row.style.transform = 'translateY(6px)';
        row.style.transition = 'none';
        setTimeout(function(){
          row.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
          row.style.opacity = '1';
          row.style.transform = 'translateY(0)';
        }, i*50);
      });
    }, 280);
  }

  /* ── OVERRIDE openScoreBreakdown ───────────────────────── */
  var _prevOpenSBD = window.openScoreBreakdown;
  window.openScoreBreakdown = function(){
    window._sbdWhatIfState = window._sbdWhatIfState || {};
    // Reset what-if state when opening fresh
    if(typeof window._sbdWhatIfState !== 'object') window._sbdWhatIfState = {};
    if(typeof _prevOpenSBD === 'function') _prevOpenSBD();
    setTimeout(sbdFullPopulate, 60);
  };

  /* Keep what-if interactions working — patch _0xdbcabb1 to also update new sections */
  var _origDBCABB1 = window._0xdbcabb1 || (typeof _0xdbcabb1 !== 'undefined' ? _0xdbcabb1 : null);
  if(_origDBCABB1){
    window._sbdDbcabb1Patched = true;
    // Wrap so that whatif changes also update banner and header
    var _patchWhatIf = function(){
      var hasOv = Object.keys(window._sbdWhatIfState||{}).length>0;
      try{
        var r = _0xf056049(window._sbdWhatIfState||{});
        var base = hasOv ? _0xf056049({}).total : r.total;
        populateHeader(r.total, hasOv);
        updateWhatIfBanner(r.total, base, hasOv);
      }catch(e){}
    };
    var _origSbdApply = window.sbdApply;
    if(typeof _origSbdApply === 'function'){
      window.sbdApply = function(catId, key, val, unit){
        _origSbdApply(catId, key, val, unit);
        _patchWhatIf();
      };
    }
    var _origSbdApplySelect = window.sbdApplySelect;
    if(typeof _origSbdApplySelect === 'function'){
      window.sbdApplySelect = function(catId, key, val){
        _origSbdApplySelect(catId, key, val);
        _patchWhatIf();
      };
    }
  }

  /* ── CSS ─────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '#score-breakdown-sheet { border-radius: var(--r-lg) var(--r-lg) 0 0; }',
    '#sbd-header { border-radius: var(--r-lg) var(--r-lg) 0 0; }',
    '.sbd-meta-chip {',
    '  display: inline-flex; align-items: center;',
    '  padding: 4px 9px; border-radius: 999px;',
    '  border: 1px solid rgba(255,255,255,0.15);',
    '  font-size: 11px; font-weight: 600;',
    '  color: rgba(255,255,255,0.55);',
    '  background: rgba(255,255,255,0.07);',
    '}',
    /* Factor cards — light theme in the scroll body */
    '#sbd-factor-list > div { background: var(--white); border: 1px solid var(--gray-2); border-radius: 14px; overflow: hidden; }',
    /* Factor fast-improvement line */
    '.sbd-factor-fastest {',
    '  font-size:11px; color: var(--teal); font-weight:600;',
    '  margin-top:5px; padding-top:5px;',
    '  border-top: 1px solid var(--gray-1);',
    '}',
    /* What-if banner flex alignment */
    '#sbd-whatif-banner { display:none; flex-direction:column; }',
    '#sbd-whatif-banner[style*="block"] { display:block!important; }',
    /* Smooth open transition on factor cards */
    '#sbd-factor-list [id^="sbd-card-"] { transition: opacity 0.28s ease, transform 0.28s ease; }',
  ].join('\n');
  document.head.appendChild(style);

})();


/* ═══════════════════════════════════════════════════════════
   BSE FOCUS CARD RENDERER — extracted from core/bse.js
   BSE decides WHEN to show the focus card. This function decides HOW.
   Reads: window.BSE (archetype, show, focusOnly), window.G (financial data)
═══════════════════════════════════════════════════════════ */
window.bseRenderFocusCard = function() {
  var fmtMoney = function(n){ return '$'+(Number(n)||0).toLocaleString('en-US',{maximumFractionDigits:0}); };
  var el = document.getElementById('bse-focus-mode');
  if (!el) return;
  var BSE = window.BSE || {};
  var g = window.G || {};

  // State gate: don't render if no analysis has run
  if (!g.scoreFinal) return;

  // Partial-data gate: if completeness < 60, show a neutral completion prompt
  var _bseComp = Number(g.profileCompleteness || 0);
  if (_bseComp < 60) {
    el.innerHTML =
      '<div class="bse-focus-wrap">' +
        '<div class="bse-focus-eyebrow">Getting started</div>' +
        '<div class="bse-action-card">' +
          '<div class="bse-action-label">Complete your profile to get your plan</div>' +
          '<div class="bse-action-why">Add your income, housing cost, and debt balances so Tracent can give you a meaningful, specific recommendation.</div>' +
          '<button class="bse-action-cta" onclick="openSettingsEdit(\'income\')">Update your details \u2192</button>' +
        '</div>' +
      '</div>';
    el.style.display = 'block';
    return;
  }

  var fcf = g.fcf||0;
  var _efRaw = g.emergency; var _efProvided = _efRaw != null && _efRaw !== '';
  var efMo = _efProvided ? parseInt(_efRaw, 10) : 0;
  var cc = g.ccDebt||0;
  var dti = g.dti||0, score = g.score||0, at = BSE.archetype;

  /* One primary action */
  var action, why, proof, ctaFn, ctaLabel;
  if (fcf < 0 && _hasTrustedCashflowInputs(g)) {
    action = 'Find one expense to reduce this week';
    why = 'Your spending is outpacing your income. Everything else depends on fixing this first.';
    proof = 'Even a small reduction creates real forward movement.';
    ctaLabel = 'Show me where \u2192'; ctaFn = 'bseOpenPlan()';
  } else if (_efProvided && efMo === 0) {
    var tgt = fcf > 0 ? Math.max(100, Math.round(fcf * 0.3)) : 100;
    action = fcf > 0 ? 'Set aside ' + fmtMoney(tgt) + ' this month as an emergency start' : 'Start building a small emergency buffer';
    why = 'No emergency buffer means one unexpected event becomes a financial crisis. This one step protects you.';
    proof = 'Even ' + fmtMoney(500) + ' changes your risk profile meaningfully.';
    ctaLabel = 'How to start \u2192'; ctaFn = 'bseOpenPlan()';
  } else if (cc > 3000) {
    var extra = fcf > 0 ? Math.max(25, Math.round(Math.min(fcf * 0.25, 200))) : 25;
    action = 'Add ' + fmtMoney(extra) + '/mo to your credit card payment';
    why = 'Your card balance costs real money every month in interest. This is the highest-return action available right now.';
    proof = 'This saves hundreds in total interest.';
    ctaLabel = 'See the debt plan \u2192'; ctaFn = "switchTab('debtrank');setNav(document.getElementById('nav-debt'))";
  } else if (dti > 43) {
    action = 'Direct extra payments to your highest monthly debt payment';
    why = 'Your debt-to-income ratio is above the lender threshold. Reducing it keeps your financial options open.';
    proof = 'One payment reduced shifts your DTI faster than any other single move.';
    ctaLabel = 'See debt plan \u2192'; ctaFn = "switchTab('debtrank');setNav(document.getElementById('nav-debt'))";
  } else {
    try {
      var moves = window.v21GetRankedMoves ? window.v21GetRankedMoves() : [];
      if (moves && moves[0]) { action = moves[0].title || moves[0].action; why = moves[0].why || ''; proof = moves[0].confidenceNote || ''; }
    } catch(e) {}
    if (!action) {
      if (at === 'in_retirement') {
        action = 'Your plan is on track this week';
        why = 'No action needed. Your position is stable and your plan is working. Consistency and low disruption are the best strategy now.';
        proof = 'Stability is a strength, not a gap.';
        ctaLabel = 'Review your position \u2192'; ctaFn = 'bseOpenRetirementReview()';
      } else if (at === 'pre_retirement') {
        action = 'Check that contributions are maximised this month';
        why = 'In the final stretch before retirement, every month of full contributions counts significantly.';
        proof = 'Time-value impact is highest in the years closest to your target.';
        ctaLabel = 'See retirement plan \u2192'; ctaFn = "switchTab('progress');showProgressSub('retirement');setNav(document.getElementById('nav-progress'))";
      } else {
        action = 'Review your free cash flow this week';
        why = 'Your position is stable. Consistency is what compounds it.';
        proof = 'Small regular habits outperform big irregular decisions.';
      }
    }
    if (!ctaLabel) { ctaLabel = 'Open your plan \u2192'; ctaFn = 'bseOpenPlan()'; }
  }

  /* Archetype tone */
  var pre = {
    anxious_overwhelmed: '<span class="bse-tone-pre">One calm step: </span>',
    avoider: '<span class="bse-tone-pre">The simplest next step: </span>',
    pre_retirement: '<span class="bse-tone-pre">For your retirement readiness: </span>',
    in_retirement: '<span class="bse-tone-pre">To protect your plan: </span>'
  }[at] || '';

  /* Progress signal */
  var sig = '';
  if (score > 0) sig = score >= 70 ? 'Your position is solid (' + score + '/100)' : score >= 55 ? 'Stabilizing (' + score + '/100)' : 'Building (' + score + '/100)';
  else if (efMo > 0) sig = 'You have ' + efMo + ' month' + (efMo !== 1 ? 's' : '') + ' of emergency savings.';

  var scoreColor = score >= 70 ? '#4CAF7D' : score >= 55 ? '#D4954A' : '#C0645C';

  el.innerHTML =
    '<div class="bse-focus-wrap">'
      + '<div class="bse-focus-eyebrow">Right now, one thing matters</div>'
      + '<div class="bse-action-card">'
        + '<div class="bse-action-label">' + pre + action + '</div>'
        + '<div class="bse-action-why">' + why + '</div>'
        + '<button class="bse-action-cta" onclick="' + ctaFn + '">' + (ctaLabel || 'See how \u2192') + '</button>'
      + '</div>'
      + (proof ? '<div class="bse-proof">' + proof + '</div>' : '')
      + (sig ? '<div class="bse-sig">' + sig + '</div>' : '')
      + (BSE.show && BSE.show.compactScore && score > 0
        ? '<div class="bse-score-tap" onclick="openScoreBreakdown()">Planning score: <span style="color:' + scoreColor + ';font-weight:700;">' + score + '</span> <span class="bse-score-note">\u2014 tap to understand this number</span></div>'
        : '')
      + (BSE.focusOnly === false
        ? '<button class="bse-expand-link" onclick="bseToggleDetail()">See full dashboard</button>'
        : '')
    + '</div>';
  el.style.display = 'block';
};


/* ═══════════════════════════════════════════════════════════
   BSE NBM TONE RENDERER — extracted from core/bse.js
   BSE decides the nbmStyle. This function applies it to the DOM.
   Reads: window.BSE.nbmStyle, window.BSE.show.nbmCard
═══════════════════════════════════════════════════════════ */
window.bseApplyNBMTone = function() {
  var BSE = window.BSE || {};
  var card = document.getElementById('v21-nbm-card');
  if (!card || !(BSE.show && BSE.show.nbmCard)) return;
  var eye  = card.querySelector('.v21-nbm-eyebrow');
  var meta = card.querySelector('.v21-nbm-meta');
  var acts = card.querySelector('.v21-nbm-actions');
  var s = BSE.nbmStyle;
  if (s === 'calm_single' || s === 'micro_step') {
    if (meta) meta.style.display = 'none';
    if (eye)  eye.innerHTML = '<span class="v21-live-dot"></span>One step for right now';
    if (acts) acts.querySelectorAll('button').forEach(function(b) {
      if (b.textContent.indexOf('What if') >= 0 || b.textContent.indexOf('Why?') >= 0) b.style.display = 'none';
    });
    card.style.boxShadow = 'none';
    card.style.border = '1px solid rgba(255,255,255,0.08)';
  } else if (s === 'ranked_detail') {
    if (eye) eye.innerHTML = '<span class="v21-live-dot"></span>Highest-leverage action';
  } else if (s === 'readiness_first' || s === 'stability_first') {
    if (meta) meta.style.display = 'none';
    if (eye)  eye.innerHTML = '<span class="v21-live-dot"></span>Next step for your plan';
  }
};

/* ═══════════════════════════════════════════════════════════
   BSE HOME STAGGER — extracted from core/bse.js
   BSE decides homeOrder. This function animates the entrance.
   Reads: window.BSE.homeOrder
═══════════════════════════════════════════════════════════ */
window.bseStaggerHome = function() {
  var BSE = window.BSE || {};
  var ORDER_IDS = {
    focusCard:'bse-focus-mode', verdictBlock:'v21-verdict-block',
    compactScore:'v21-compact-score', nbmCard:'v21-nbm-card',
    modeRail:'v21-mode-rail-home', modeStrategy:'v21-mode-strategy',
    retentionCard:'v21-retention-card', premiumTeaser:'v21-premium-teaser',
    driverStrip:'v21-driver-strip'
  };
  var delay = 50;
  if (!BSE.homeOrder) return;
  BSE.homeOrder.forEach(function(key, idx) {
    var el = document.getElementById(ORDER_IDS[key]);
    if (!el || el.style.display === 'none') return;
    el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; el.style.transition = 'none';
    setTimeout(function() {
      el.style.transition = 'opacity 0.32s ease, transform 0.32s ease';
      el.style.opacity = '1'; el.style.transform = 'translateY(0)';
    }, delay + idx * 70);
  });
};


/* ═══════════════════════════════════════════════════════════
   BSE SCORE HERO RENDERER — extracted from core/bse.js
   BSE decides: showScore, scoreProminent.
   This function applies those decisions to the score zone DOM.
   Reads: window.BSE.showScore, window.BSE.scoreProminent, window.G.score
═══════════════════════════════════════════════════════════ */
window.bseApplyScoreHero = function() {
  var BSE = window.BSE || {};
  var dh = document.getElementById('dash-header') || document.body;
  var sz = document.getElementById('bse-score-zone');
  var strip = document.getElementById('bse-stat-strip');

  /* Remove previously-applied classes */
  dh.classList.remove('bse-score-hidden', 'bse-score-deemphasized');

  var _g = window.G || {};
  var hasScore = !!(_g && (_g.score || _g.score === 0));

  if (!BSE.showScore && !hasScore) {
    /* No computed score yet — hide zone for new/empty sessions */
    dh.classList.add('bse-score-hidden');
    dh.classList.remove('force-show-score');
    if (sz)    sz.style.display    = 'none';
    if (strip) strip.style.display = 'none';
  } else if (!BSE.showScore) {
    /* Score exists but archetype says hide — keep zone visible, hide strip */
    dh.classList.remove('bse-score-hidden');
    if (sz)    sz.style.display    = 'flex';
    if (strip) strip.style.display = 'none';
  } else if (!BSE.scoreProminent) {
    dh.classList.remove('bse-score-hidden');
    dh.classList.add('bse-score-deemphasized');
    if (sz)    sz.style.display    = 'flex';
    if (strip) strip.style.display = 'none';
    /* Add planning indicator note */
    var note = document.getElementById('bse-planning-note');
    if (!note) {
      note = document.createElement('div');
      note.id = 'bse-planning-note';
      note.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.30);padding:2px 0 8px;';
      note.textContent   = 'Planning indicator \u2014 not a credit score';
      if (sz && sz.parentNode) sz.parentNode.insertBefore(note, sz.nextSibling);
    }
  } else {
    /* Full score: show zone + strip */
    dh.classList.remove('bse-score-hidden');
    if (sz)    sz.style.display    = 'flex';
    if (strip) strip.style.display = '';
    /* Trigger score ring draw animation */
    var ring = document.querySelector('.score-ring-bg');
    if (ring) {
      var score = (window.G || {}).score || 0;
      var offset = Math.round(283 - (283 * score / 100));
      ring.style.setProperty('--ring-offset', offset);
      ring.classList.add('score-ring-animated');
    }
  }

  /* Guard: if Home tab is active, force score visible regardless of prior render passes */
  (function () {
    var homeTab = document.getElementById('tab-home');
    if (!dh || !homeTab) return;
    if (homeTab.classList.contains('active')) {
      dh.classList.remove('compact');
      dh.classList.remove('bse-score-hidden');
      dh.classList.add('force-show-score');
    } else {
      dh.classList.remove('force-show-score');
    }
  })();
};

/* ═══════════════════════════════════════════════════════════
   BSE MODULE VISIBILITY RENDERER — extracted from core/bse.js
   BSE decides: BSE.show (per-module visibility), BSE.focusOnly, BSE.debtLayer.
   This function applies those decisions to home tab DOM.
   Reads: window.BSE.show, window.BSE.focusOnly, window.BSE.debtLayer
═══════════════════════════════════════════════════════════ */
window.bseApplyModuleVis = function() {
  var BSE = window.BSE || {};
  var show = BSE.show || {};

  var ID = {
    verdictBlock:'v21-verdict-block', compactScore:'v21-compact-score',
    modeRail:'v21-mode-rail', modeRailHome:'v21-mode-rail-home',
    nbmCard:'v21-nbm-card', retentionCard:'v21-retention-card',
    premiumTeaser:'v21-premium-teaser', metricsStrip:'home-metrics',
    modeStrategy:'v21-mode-strategy', driverStrip:'v21-driver-strip',
    readinessCard:'hm-readiness-card', posLabel:'v21-position-label',
    focusCard:'bse-focus-mode', debtRelief:'bse-debt-relief',
    dashContextBar:'v21-dash-context-bar'
  };

  /* Map BSE.show keys to element IDs */
  var SHOW_MAP = {
    verdictBlock:['verdictBlock'], compactScore:['compactScore'],
    modeRail:['modeRail','modeRailHome'], nbmCard:['nbmCard'],
    retentionCard:['retentionCard'], premiumTeaser:['premiumTeaser'],
    metricsStrip:['metricsStrip'], modeStrategy:['modeStrategy'],
    driverStrip:['driverStrip'], focusCard:['focusCard'],
    debtRelief:['debtRelief']
  };

  Object.keys(SHOW_MAP).forEach(function(key) {
    var visible = show[key];
    SHOW_MAP[key].forEach(function(elKey) {
      var el = document.getElementById(ID[elKey]);
      if (!el) return;
      if (visible === false) el.style.display = 'none';
      /* Don't force-show here — only suppress. Other passes render content. */
    });
  });

  /* Always hide: readiness card for focused users, context bar clutter */
  var rc = document.getElementById(ID.readinessCard);
  if (rc) rc.style.display = (!BSE.focusOnly && show.verdictBlock !== false) ? '' : 'none';
  var dcb = document.getElementById(ID.dashContextBar);
  if (dcb && BSE.focusOnly) dcb.style.display = 'none';
  var pl = document.getElementById(ID.posLabel);
  if (pl && BSE.focusOnly) pl.style.display = 'none';

  /* Apply focus-active class to home tab for CSS-driven suppression */
  var tabHome = document.getElementById('tab-home');
  if (tabHome) {
    if (BSE.focusOnly) tabHome.classList.add('bse-focus-active');
    else tabHome.classList.remove('bse-focus-active');
  }

  /* Debt tab: apply strategy-hidden class when debtLayer <= 2,
     BUT never while the tab is active — the user has explicitly navigated here. */
  var tabDebt = document.getElementById('tab-debtrank');
  if (tabDebt) {
    var debtIsActive = tabDebt.classList.contains('active');
    if ((BSE.debtLayer || 1) <= 2 && !debtIsActive) tabDebt.classList.add('bse-debt-strategy-hidden');
    else tabDebt.classList.remove('bse-debt-strategy-hidden');
  }
};


/* ═══ MODULE: Decision Flow Renderer ═══
   Transforms the Focus screen into a single-thread decision flow
   with context sufficiency checks and micro input collection.

   Modes:
     DECISION MODE        — sufficient context, renders full 6-block flow
     CONTEXT REQUEST MODE — decision-type inputs missing, prompts inline

   Confidence levels:
     high        — full data, shows NBM + outcome projections
     medium      — most data present, shows NBM without projections
     low         — decision-type inputs missing (≥2), shows context request
     directional — global data too sparse (engine: insufficient_data)

   Blocks (in order):
     A. Situation         — factual snapshot of current position
     B. Interpretation    — what this means given archetype
     C. NBM / Context Req — single action OR targeted input request
     D. Outcome Preview   — expected impact (high confidence only)
     E. Confidence        — badge + explanation
     F. System Reasoning  — why this ranked first (high/medium only)

   Rules:
     - One CTA only. No "What if?" or "Next option" buttons.
     - Retirement mode: engine already filters home/career.
     - Respects BSE.show.focusCard === false.
     - Runs last in the v21RenderPostAnalysis chain.
     - Also overrides bseRenderFocusCard so tab switches stay consistent.

   Required inputs per decision type (defined in CTX_REQ):
     home    — homePrice, depositSaved, currentRent
     debt    — ccDebt, ccRate (studentDebt optional)
     retire  — retMatch, savingsAmt
     general — income, expenses, emergency
═══════════════════════════════════════════════ */
(function() {
  'use strict';
  if (window.__TRACENT_DECISION_FLOW__) return;
  window.__TRACENT_DECISION_FLOW__ = true;

  // ═══════════════════════════════════════════════════════
  // REQUIRED INPUTS PER DECISION TYPE
  // ═══════════════════════════════════════════════════════
  var CTX_REQ = {
    home: {
      context:    'Home buying is your stated priority \u2014 here\u2019s what we need.',
      limitation: 'We need a few more details to estimate your real monthly cost and readiness timeline.',
      actionLabel:'This takes under a minute \u2014 then we can show you a real plan.',
      inputs: [
        { key:'homePrice',    label:'Target home price',         type:'money',   placeholder:'400000', hint:'e.g. $400,000' },
        { key:'depositSaved', label:'Down payment saved so far', type:'money',   placeholder:'20000',  hint:'e.g. $20,000'  },
        { key:'currentRent',  label:'Current monthly rent',      type:'money',   placeholder:'1800',   hint:'e.g. $1,800'   }
      ]
    },
    debt: {
      context:    'Reducing debt is your highest-leverage action right now.',
      limitation: 'Add your balances so we can show you a specific paydown plan with real savings numbers.',
      actionLabel:'This takes 30 seconds \u2014 then you\u2019ll see exactly what to do.',
      inputs: [
        { key:'ccDebt',      label:'Credit card balance',        type:'money',   placeholder:'3500',   hint:'e.g. $3,500'    },
        { key:'ccRate',      label:'Card interest rate',          type:'percent', placeholder:'22',     hint:'e.g. 22%'       },
        { key:'studentDebt', label:'Student loan balance',        type:'money',   placeholder:'25000',  hint:'optional \u2014 e.g. $25,000', optional:true }
      ]
    },
    retire: {
      context:    'Your retirement readiness is the priority focus at this stage.',
      limitation: 'A few more details will let us give you specific contribution and withdrawal guidance.',
      actionLabel:'Add these to see your retirement readiness picture clearly.',
      inputs: [
        // retMatch is optional: in_retirement users have no employer — only savingsAmt is required
        { key:'retMatch',   label:'Employer match (%)',          type:'percent', placeholder:'3',      hint:'e.g. 3%', optional:true },
        { key:'savingsAmt', label:'Current retirement savings',  type:'money',   placeholder:'150000', hint:'e.g. $150,000'  }
      ]
    },
    general: {
      context:    'A real recommendation needs these numbers.',
      limitation: 'A few more details will enable a specific, targeted recommendation.',
      actionLabel:'Add your key numbers to get a real recommendation.',
      inputs: [
        { key:'income',    label:'Monthly gross income',         type:'money',   placeholder:'6000',   hint:'e.g. $6,000'    },
        { key:'rent',      label:'Monthly rent / housing cost',  type:'money',   placeholder:'1800',   hint:'e.g. $1,800'    },
        { key:'emergency', label:'Emergency savings (months)',   type:'number',  placeholder:'2',      hint:'e.g. 3 months'  },
        { key:'ccDebt',    label:'Credit card balance',          type:'money',   placeholder:'0',      hint:'e.g. $3,500 — enter 0 if none', optional:true }
      ]
    }
  };

  // ── Suppress secondary cards ──────────────────────────────
  // Whitelist-based: hide every direct child of #tab-home except the DFR container.
  // More durable than a blacklist — new injected blocks are suppressed automatically.
  var FOCUS_WHITELIST = { 'bse-focus-mode': true };
  function _suppressSecondaryCards() {
    var tabHome = document.getElementById('tab-home');
    if (tabHome) {
      Array.prototype.forEach.call(tabHome.children, function(child) {
        if (!FOCUS_WHITELIST[child.id]) child.style.display = 'none';
      });
    }
    if (typeof TracentRenderAdaptiveDashboard !== 'undefined' && TracentRenderAdaptiveDashboard.hide) {
      try { TracentRenderAdaptiveDashboard.hide(); } catch(e) {}
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function _fmt(n) { return '$'+(Number(n)||0).toLocaleString('en-US',{maximumFractionDigits:0}); }

  // ═══════════════════════════════════════════════════════
  // CONTEXT ASSESSMENT
  // ═══════════════════════════════════════════════════════

  function _determineDecisionType(g, BSE, move) {
    var intent = g.primaryIntent || '';
    var goal   = g.goal          || '';
    var cat    = (move && move.id !== 'insufficient_data' && move.category) || '';
    var at     = (BSE && BSE.archetype) || '';
    // G.isRetirementMode is the authoritative flag — check before any secondary signal
    if (g.isRetirementMode)                                                                return 'retire';
    if (intent==='home' || intent==='buy_home' || goal==='buy_home' || cat==='home')        return 'home';
    if (at==='pre_retirement' || at==='in_retirement' ||
        g.ageRange==='55_64'  || g.ageRange==='65plus' || intent==='retire')               return 'retire';
    if (cat==='debt' || (g.ccDebt||0) > 3000)                                             return 'debt';
    return 'general';
  }

  function _checkMissingInputs(g, decisionType) {
    var reqs = CTX_REQ[decisionType] || CTX_REQ.general;
    return reqs.inputs.filter(function(inp) {
      if (inp.optional) return false;
      var v = g[inp.key];
      if (v===null || v===undefined || v==='') return true;
      if ((inp.type==='money'||inp.type==='percent') && Number(v)===0) return true;
      return false;
    });
  }

  /**
   * _assessContext(g, BSE, move)
   * Returns: { confidence, decisionType, missingInputs }
   *
   * confidence:
   *   'directional' — engine returned insufficient_data (global data too sparse)
   *   'low'         — 2+ decision-type inputs missing  -> Context Request Mode
   *   'medium'      — 1 input missing OR comp 60-79 OR inferred fields present
   *   'high'        — all decision-type inputs present AND comp >= 80
   */
  function _assessContext(g, BSE, move) {
    if (!move || move.id==='insufficient_data') {
      return { confidence:'directional', decisionType:'general', missingInputs:[] };
    }
    var comp    = Number(g.profileCompleteness||0);
    var infer   = Array.isArray(g._inferredFields) ? g._inferredFields.length : 0;
    var dt      = _determineDecisionType(g, BSE, move);
    var missing = _checkMissingInputs(g, dt);

    var conf;
    if      (missing.length >= 2)                    conf = 'low';
    else if (missing.length===1 || comp<80 || infer) conf = 'medium';
    else                                             conf = 'high';

    return { confidence:conf, decisionType:dt, missingInputs:missing };
  }

  // ═══════════════════════════════════════════════════════
  // BLOCK BUILDERS
  // ═══════════════════════════════════════════════════════

  function _buildSituation(g) {
    var rows = [];
    if (g.takeHome||g.income)
      rows.push({ label:g.takeHome ? 'Take-home' : 'Income', value:_fmt(g.takeHome||g.income)+'/mo' });
    var td = (g.ccDebt||0)+(g.studentDebt||0)+(g.carDebt||0)+(g.otherDebt||0);
    var hasDebt = td > 0 || (g.carPayment||0) > 0;
    if (hasDebt) rows.push({ label:'Total debt', value: td > 0 ? _fmt(td) : _fmt(g.carPayment||0)+'/mo obligations' });
    var _efRaw2 = g.emergency; var _efProvided2 = _efRaw2 != null && _efRaw2 !== '';
    var ef = _efProvided2 ? parseInt(_efRaw2, 10) : 0;
    // Only show emergency buffer row when we have other financial data (avoids orphaned row for empty-state users)
    if (_efProvided2 || rows.length > 0)
      rows.push({ label:'Emergency buffer', value:!_efProvided2 ? 'Not entered' : ef>0 ? ef+' month'+(ef!==1?'s':'') : 'None' });
    var risk='', fcf=g.fcf||0;
    if      (fcf<0 && _hasTrustedCashflowInputs(g)) risk='Cash flow negative \u2014 spending exceeds income';
    else if ((g.ccDebt||0)>3000) risk='High-rate debt is your biggest cost drag';
    // DTI threshold is a lending/mortgage signal — not relevant in retirement mode
    else if (!g.isRetirementMode && (g.dti||0)>43) risk='DTI above lender threshold';
    else if (_efProvided2 && ef<1) risk='No emergency buffer \u2014 high fragility';
    return { rows:rows, risk:risk };
  }

  function _buildInterpretation(g, BSE) {
    var at = BSE.archetype||'';
    var MAP = {
      anxious_overwhelmed:'Your position shows stress signals. One small, manageable step is more valuable than a full restructure right now.',
      avoider:            'You have the data. The main barrier is getting started \u2014 one concrete action is enough to break the pattern.',
      stable_confident:   'Your position is solid. The focus is maintaining momentum and staying ahead of the next transition.',
      optimizer:          'Your fundamentals are sound. Targeted optimisation in one area will have the clearest compounding effect.',
      pre_retirement:     'You\u2019re in the window where contributions carry maximum weight. Protect your runway and maximise consistency.',
      in_retirement:      'Stability and longevity protection are the priority. Income reliability outweighs growth at this stage.',
      first_job:          'You\u2019re at the start of the compounding curve. Building a foundation now is the highest-return action available.',
      career_climber:     'Income trajectory is strong. Directing the new cash flow intentionally is what matters most.',
      homebuyer_ready:    'Your financial position supports a home purchase path. The focus is qualification and deposit readiness.',
      debt_overwhelmed:   'Debt load is the dominant constraint. Reducing it directly improves every other metric.',
      rebuilding:         'You\u2019re in recovery mode. Consistent small wins restore both your position and your confidence.'
    };
    if (MAP[at]) return MAP[at];
    var s=g.score||0;
    if (s>=70) return 'Your position is stable. Targeted action in one area will drive the next phase of progress.';
    if (s>=55) return 'You\u2019re making progress. One focused action will accelerate the trajectory.';
    return 'Your position has room to improve. The engine has identified where to focus first.';
  }

  function _buildOutcome(move, conf) {
    if (conf!=='high') return null;
    if (!move||move.id==='insufficient_data'||move.id==='fallback') return null;
    var si=move.scoreImpact, ci=move.cashImpact;
    if (!si&&(!ci||ci==='—'||ci==='\u2014')) return null;
    return {
      scoreImpact: si>0?'+'+si+' pts':si<0?si+' pts':null,
      cashImpact:  (ci&&ci!=='—'&&ci!=='\u2014')?ci:null
    };
  }

  // ── Confidence metadata ───────────────────────────────────
  var CONF_LABEL = {
    high:'High confidence', medium:'Medium confidence',
    low:'More data needed', directional:'More data needed'
  };
  var CONF_SUB = {
    high:        'Based on complete financial data. Recommendations are specific and reliable.',
    medium:      'Based on most key inputs. Projected numbers are directional estimates.',
    low:         'Decision-type details are incomplete. The direction is correct; numbers sharpen once you add them.',
    directional: 'Add your key financial details to get a specific recommendation.'
  };
  // low and directional share the same label ("More data needed") — same color for consistency
  var CONF_COLOR = { high:'#4CAF7D', medium:'#D4954A', low:'#9e9e9e', directional:'#9e9e9e' };

  // ═══════════════════════════════════════════════════════
  // MICRO INPUT FLOW
  // ═══════════════════════════════════════════════════════

  function _buildMicroInputHTML(missingInputs, decisionType) {
    if (!missingInputs||!missingInputs.length) return '';
    var fieldsHtml = missingInputs.map(function(inp) {
      var inner;
      if (inp.type==='money') {
        inner = '<div class="tdf-mi-field-wrap">'+
          '<span class="tdf-mi-affix tdf-mi-prefix">$</span>'+
          '<input id="tdf-input-'+inp.key+'" class="tdf-mi-input" type="tel" inputmode="numeric" placeholder="'+inp.placeholder+'" />'+
          '</div>';
      } else if (inp.type==='percent') {
        inner = '<div class="tdf-mi-field-wrap">'+
          '<input id="tdf-input-'+inp.key+'" class="tdf-mi-input" type="tel" inputmode="numeric" placeholder="'+inp.placeholder+'" />'+
          '<span class="tdf-mi-affix tdf-mi-suffix">%</span>'+
          '</div>';
      } else {
        inner = '<input id="tdf-input-'+inp.key+'" class="tdf-mi-input tdf-mi-input-solo" type="tel" inputmode="numeric" placeholder="'+inp.placeholder+'" />';
      }
      return '<div class="tdf-mi-field">'+
        '<label class="tdf-mi-label" for="tdf-input-'+inp.key+'">'+inp.label+'</label>'+
        inner+
        (inp.hint ? '<div class="tdf-mi-hint">'+inp.hint+'</div>' : '')+
      '</div>';
    }).join('');

    return '<div id="tdf-micro-input" class="tdf-micro-input" style="display:none;" '+
      'data-decision-type="'+decisionType+'" '+
      'data-keys="'+missingInputs.map(function(i){return i.key;}).join(',')+'">'+
      '<div class="tdf-mi-fields">'+fieldsHtml+'</div>'+
      '<button class="tdf-mi-submit" onclick="window._tdfSubmitMicroInput()">Save &amp; show my plan &#x2192;</button>'+
    '</div>';
  }

  // ── Toggle micro input expand ─────────────────────────────
  window._tdfToggleMicroInput = function(btn) {
    var mi = document.getElementById('tdf-micro-input');
    if (!mi) return;
    var isOpen = mi.style.display !== 'none';
    mi.style.display = isOpen ? 'none' : 'block';
    if (btn) {
      if (isOpen) {
        var n = (mi.getAttribute('data-keys')||'').split(',').filter(Boolean).length;
        btn.textContent = 'Add '+n+' quick detail'+(n!==1?'s':'')+' \u2192';
      } else {
        btn.textContent = 'Cancel';
      }
    }
    if (!isOpen) {
      var first = mi.querySelector('input');
      if (first) setTimeout(function(){ first.focus(); }, 50);
    }
  };

  // ── Submit micro inputs — save to G and re-render ─────────
  window._tdfSubmitMicroInput = function() {
    var mi = document.getElementById('tdf-micro-input');
    if (!mi) return;
    var keys   = (mi.getAttribute('data-keys')||'').split(',').filter(Boolean);
    var g      = window.G || {};
    var saved  = 0;

    var FIELD_RANGES = {
      income:       { min:0,    max:1000000 },
      takeHome:     { min:0,    max:1000000 },
      rent:         { min:0,    max:50000   },
      currentRent:  { min:0,    max:50000   },
      expenses:     { min:0,    max:500000  },
      ccDebt:       { min:0,    max:500000  },
      studentDebt:  { min:0,    max:500000  },
      carDebt:      { min:0,    max:200000  },
      homePrice:    { min:0,    max:50000000},
      depositSaved: { min:0,    max:10000000},
      emergency:    { min:0,    max:120     },
      ccRate:       { min:0,    max:100     },
      retMatch:     { min:0,    max:100     },
      savingsAmt:   { min:0,    max:50000000}
    };

    keys.forEach(function(key) {
      var el  = document.getElementById('tdf-input-'+key);
      if (!el) return;
      var raw = (el.value||'').replace(/[^0-9.]/g,'');
      if (!raw) return;
      var val = parseFloat(raw);
      var range = FIELD_RANGES[key];
      if (range && (val < range.min || val > range.max)) return;
      g[key] = val; saved++;
    });

    if (!saved) {
      var _btn = mi.querySelector('.tdf-mi-submit');
      if (_btn) { var _orig = _btn.textContent; _btn.textContent = 'Please enter a valid value'; setTimeout(function(){ _btn.textContent = _orig; }, 2000); }
      return;
    }

    // Aliases — keep engine happy with both name variants
    if (g.homePrice    && !g.targetHomePrice) g.targetHomePrice = g.homePrice;
    if (g.depositSaved && !g.downPayment)     g.downPayment     = g.depositSaved;
    if (g.currentRent  && !g.rent)            g.rent            = g.currentRent;
    if (g.currentRent  && !g.rentAmount)      g.rentAmount      = g.currentRent;
    if (g.rent         && !g.currentRent)     g.currentRent     = g.rent;
    window.G = g;

    // Persist to Supabase/localStorage
    if (window.TracentHydration && typeof TracentHydration.scheduleSave==='function') {
      TracentHydration.scheduleSave();
    }

    // Re-trigger full engine if available — cascades RPA chain -> renderDecisionFlow
    if (window.TracentHydration && typeof TracentHydration.triggerRecalculation==='function') {
      try { TracentHydration.triggerRecalculation(); return; } catch(e) {}
    }
    // Fallback: direct re-render
    renderDecisionFlow();
  };


  // ═══════════════════════════════════════════════════════
  // NBM PROGRESSION SPINE
  // ═══════════════════════════════════════════════════════

  /** Module-local continuity state — no persistence, no globals. */
  var _lastNBMId        = null;
  var _lastTier         = null;   // for tier-transition detection
  var _lastMissingCount = null;   // for input-added micro-feedback

  /**
   * TIER MAP — move id → tier classification.
   * 'stabilize'  → immediate fragility / acute pressure
   * 'unlock'     → blocker / missing prerequisite
   * 'optimize'   → improve an already-stable position
   * 'advance'    → execute on a cleared goal
   *
   * Rule: when ambiguous, choose the more conservative tier.
   */
  var TIER_BY_ID = {
    deficit:        'stabilize',
    ef_zero:        'stabilize',
    ef_low:         'stabilize',
    cc_attack:      'stabilize',
    car_paydown:    'stabilize',    // re-assessed below when position is stable
    home_research:  'unlock',
    home_dti_prep:  'unlock',
    dti_reduce:     'unlock',       // re-assessed by decisionType
    home_deposit:   'advance',
    match_capture:  'optimize',
    retire_contrib: 'optimize',
    invest_surplus: 'optimize',
    optimize_fcf:   'optimize',
    recurring_leak: 'optimize',
    career_gap:      'optimize',
    home_overstretch:'stabilize'
  };

  var TIER_BY_CAT = {
    safety: 'stabilize',
    debt:   'stabilize',
    home:   'unlock',
    grow:   'optimize',
    retire: 'optimize'
  };

  var TIER_ORDER = ['stabilize', 'unlock', 'optimize', 'advance'];

  /**
   * _getProgressionTier(move, g, decisionType, assessment)
   * Returns the progression tier for the current validated move.
   * No write side-effects.
   */
  function _getProgressionTier(move, g, decisionType, assessment) {
    if (!move || move.id === 'insufficient_data') {
      return 'unlock';
    }
    if (move.id === 'fallback') {
      return 'optimize';
    }

    var id  = move.id  || '';
    var cat = move.category || '';

    // Look up in id map first
    var tier = TIER_BY_ID[id];

    // Contextual overrides — same id can be different tiers depending on state
    if (id === 'car_paydown') {
      // Only stabilize when cash is tight; otherwise it's optimization
      tier = (g.fcf || 0) < 400 ? 'stabilize' : 'optimize';
    }
    if (id === 'dti_reduce') {
      // Unlock for home mode (lender blocker); stabilize for general debt drag
      tier = decisionType === 'home' ? 'unlock' : 'stabilize';
    }
    if (id === 'home_deposit') {
      // Only advance when no missing inputs remain; otherwise still unlock
      var missing = assessment && assessment.missingInputs ? assessment.missingInputs.length : 0;
      tier = missing === 0 ? 'advance' : 'unlock';
    }
    if (id === 'invest_surplus' && (window.pbfdeState || {}).stage === 'habit') {
      tier = 'advance';
    }

    // Fall back to category map if id not in map
    if (!tier) tier = TIER_BY_CAT[cat];

    // Final safe default
    return tier || 'optimize';
  }

  /**
   * _getProgressionContext(move, g, assessment, signals)
   * Infers where the user is in their progression journey.
   * Returns { currentTier, nextLikelyTier, isBlocked, isStalled, isAdvancing, progressionReason }
   */
  function _getProgressionContext(move, g, assessment, signals) {
    var conf         = assessment ? assessment.confidence : 'directional';
    var decisionType = assessment ? assessment.decisionType : 'general';
    var missingCount = assessment && assessment.missingInputs ? assessment.missingInputs.length : 0;

    var currentTier = _getProgressionTier(move, g, decisionType, assessment);

    var tierIdx = TIER_ORDER.indexOf(currentTier);
    var nextLikelyTier = tierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[tierIdx + 1] : 'advance';

    var isBlocked   = missingCount > 0;
    // Stalled: avoidance flag, or repeated ignores of same tier move as last session
    var avoidance   = !!(window.pbfdeState && window.pbfdeState.psych && window.pbfdeState.psych.avoidance);
    var isStalled   = avoidance || signals.hesit >= 4;
    // Same-tier stall: last NBM was same id or same category, user hasn't acted
    var sameTier    = _lastNBMId && move && (_lastNBMId === move.id);
    if (sameTier && signals.ignored >= 2) isStalled = true;

    var isAdvancing = !isBlocked && !isStalled && conf === 'high' &&
                      (currentTier === 'optimize' || currentTier === 'advance');

    var progressionReason;
    if      (currentTier === 'stabilize') progressionReason = 'fragility';
    else if (currentTier === 'unlock')    progressionReason = isBlocked ? 'blocked' : 'prerequisite';
    else if (currentTier === 'optimize')  progressionReason = isStalled ? 'stalled_optimize' : 'improvement';
    else                                  progressionReason = isAdvancing ? 'executing' : 'ready';

    return {
      currentTier:       currentTier,
      nextLikelyTier:    nextLikelyTier,
      isBlocked:         isBlocked,
      isStalled:         isStalled,
      isAdvancing:       isAdvancing,
      progressionReason: progressionReason
    };
  }

  /**
   * _shouldHoldTier(context, signals)
   * Returns true when the system should stay in the current tier
   * rather than allowing assertive/forward-pushing CTA language.
   *
   * Rule A: stabilize conditions unresolved → hold
   * Rule B: unlock blocker present → hold
   * Rule C: user is stalled → hold regardless of tier
   */
  function _shouldHoldTier(context, signals) {
    if (context.isStalled) return true;
    if (context.currentTier === 'stabilize') return true;   // always hold until stabilized
    if (context.currentTier === 'unlock' && context.isBlocked) return true;
    return false;
  }

  /**
   * _getProgressionSupportLine(context)
   * Returns a short, calm support line based on current progression context.
   * Returns '' if no line is warranted.
   * Caller merges this with the formatter's behavioral support line:
   *   effectiveSupport = copy.supportLine || _getProgressionSupportLine(context)
   * Formatter's behavioral line takes priority (it is more specific).
   */
  function _getProgressionSupportLine(context) {
    if (context.isStalled) {
      if (context.currentTier === 'stabilize') return 'This is still the first thing to clear.';
      if (context.currentTier === 'unlock')    return 'This removes the main blocker.';
      return 'This remains the strongest move available in your position.';
    }
    if (context.currentTier === 'stabilize') return 'This reduces the pressure first.';
    if (context.currentTier === 'unlock')    return 'This enables the next reliable step.';
    if (context.currentTier === 'optimize')  return 'This improves an already-stable position.';
    if (context.currentTier === 'advance')   return 'You\u2019re in a position to move this forward.';
    return '';
  }

  // ═══════════════════════════════════════════════════════
  // EMOTIONAL CONTINUITY LAYER
  // ═══════════════════════════════════════════════════════

  /**
   * _getTierTransitionLine(prevTier, currentTier, context)
   * Returns a single short line when a genuine tier shift has occurred.
   * Returns '' if no shift, or if the shift cannot be confirmed.
   * Never implies completion of something the system hasn't verified.
   */
  function _getTierTransitionLine(prevTier, currentTier, context) {
    if (!prevTier || prevTier === currentTier) return '';
    var from = prevTier, to = currentTier;

    // Only allow forward transitions — do not acknowledge regression
    var fi = TIER_ORDER.indexOf(from), ti = TIER_ORDER.indexOf(to);
    if (ti <= fi) return '';

    if (from === 'stabilize' && to === 'unlock')   return 'The immediate pressure is lower. The focus now is removing what is blocking progress.';
    if (from === 'stabilize' && to === 'optimize') return 'The fragile part is resolved. This step improves the position from here.';
    if (from === 'unlock'    && to === 'optimize') return 'The main blocker is cleared. The next step improves the position.';
    if (from === 'unlock'    && to === 'advance')  return 'The prerequisites are in place. You are in a position to move forward.';
    if (from === 'optimize'  && to === 'advance')  return 'You are no longer just preparing. You are in a position to act on this.';
    return '';
  }

  /**
   * _getMicroFeedback(context, assessment, g)
   * Returns a single short micro-feedback line when the system can
   * truthfully acknowledge a change — e.g. fewer missing inputs.
   * Returns '' when nothing concrete can be said.
   */
  function _getMicroFeedback(context, assessment, g) {
    var missing = assessment && assessment.missingInputs ? assessment.missingInputs.length : 0;

    // Input was added this session: missing count went down
    if (_lastMissingCount !== null && missing < _lastMissingCount) {
      var reduced = _lastMissingCount - missing;
      if (reduced >= 2) return 'That adds two key details. The recommendation is more reliable now.';
      return 'That sharpens the picture.';
    }

    // Moved from context/refine state to a real decision (not tracked by tier alone)
    // Safe signal: last tier was unlock due to blockers, now it isn't blocked
    if (_lastTier === 'unlock' && context.currentTier !== 'unlock' && !context.isBlocked) {
      return 'One less blocker. The next step is clearer.';
    }

    return '';
  }

  /**
   * _getEmotionalContinuityLine(context, signals, assessment, move, g)
   * The single entry point for the emotional continuity layer.
   * Returns one short line or '' — never stacks multiple lines.
   *
   * Internal priority:
   *   1. Stall-sensitive reassurance (context.isStalled)
   *   2. Tier transition language (prev → current)
   *   3. Micro-feedback (input added / blocker cleared)
   *   4. Tier-active ambient line (what stage the user is in)
   *   5. '' — nothing
   *
   * The caller uses this only as fallback when formatter + progression
   * support lines are both empty, so this function does not duplicate
   * those checks.
   */
  function _getEmotionalContinuityLine(context, signals, assessment, move, g) {
    var tier = context.currentTier;
    var dt   = assessment ? assessment.decisionType : 'general';

    // ── 1. Stall-sensitive reassurance ───────────────────────────────
    if (context.isStalled) {
      if (dt === 'retire' || (g && g.isRetirementMode)) {
        if (tier === 'stabilize') return 'This needs attention before the rest of the plan works.';
        return 'No change needed right now. Your plan is still on track.';
      }
      if (tier === 'stabilize') return 'We can keep this focused. Start with this part.';
      if (tier === 'unlock')    return 'Reviewing the numbers is enough for now.';
      return 'You do not need to solve everything today.';
    }

    // ── 2. Tier transition ────────────────────────────────────────────
    var transLine = _getTierTransitionLine(_lastTier, tier, context);
    if (transLine) return transLine;

    // ── 3. Micro-feedback ────────────────────────────────────────────
    var feedbackLine = _getMicroFeedback(context, assessment, g);
    if (feedbackLine) return feedbackLine;

    // ── 4. Tier-active ambient line ──────────────────────────────────
    // Mode-specific where meaningful; generic otherwise.
    // Only shown on second+ render to avoid being on-screen from first load.
    if (_lastNBMId === null) return ''; // first render — stay silent

    if (tier === 'stabilize') {
      if (dt === 'debt') return 'Reduce the pressure here first.';
      return 'Pressure first. The rest follows.';
    }
    if (tier === 'unlock') {
      if (dt === 'home')   return 'Clarity before commitment.';
      if (dt === 'retire' || (g && g.isRetirementMode)) return 'This gives your retirement picture more clarity.';
      return 'This removes a blocker.';
    }
    if (tier === 'optimize') {
      if (dt === 'retire' || (g && g.isRetirementMode)) return 'The base is in place. This protects the plan from here.';
      return 'The base is in place. This improves the position.';
    }
    if (tier === 'advance') {
      if (!context.isAdvancing) return ''; // don't claim advance unless earned
      if (dt === 'home') return 'Readiness is clearer from here.';
      return 'The preparation is there. This is the next step.';
    }

    return '';
  }

  // ═══════════════════════════════════════════════════════
  // BEHAVIORAL SIGNAL READER
  // ═══════════════════════════════════════════════════════

  /**
   * _readBehavioralSignals()
   * Reads safely from pbfdeState and session storage.
   * Returns a clean signal object; all fields have safe defaults.
   * Never throws — used in the render path.
   */
  function _readBehavioralSignals() {
    var ps = {};
    try { ps = window.pbfdeState || {}; } catch(e) {}
    var psych   = ps.psych || {};
    var anxiety = psych.anxiety  || 'unknown';   // 'high' | 'low' | 'unknown'
    var avoid   = !!(psych.avoidance);            // boolean
    var stage   = ps.stage || 'observe';          // 'observe'|'insight'|'action'|'habit'
    var ignored = Number(ps.nbmIgnoreCount || 0); // times NBM was shown but not clicked
    var hesit   = Number(ps.hesitationCount || 0);// pauses detected
    // Return session: ≥2 sessions means user has been here before
    var returnSession = false;
    try { returnSession = Number(localStorage.getItem('tracent_seen') || '0') >= 2; } catch(e) {}
    return { anxiety:anxiety, avoid:avoid, stage:stage, ignored:ignored, hesit:hesit, returnSession:returnSession };
  }

  // ═══════════════════════════════════════════════════════
  // NBM COPY FORMATTER
  // ═══════════════════════════════════════════════════════

  /**
   * _formatNBMCopy(move, g, conf, decisionType, signals)
   * Returns { why, ctaText, supportLine } for the validated decision card.
   *
   * Strategy:
   *   - Engine `move.why` is already data-anchored — use it as the base.
   *   - When a behavioral or mode signal meaningfully changes the emphasis,
   *     return a tone-adjusted why instead.
   *   - ctaText and supportLine are always copy-layer decisions.
   *   - Never invents facts. If no real anchor justifies tone adjustment,
   *     passes move.why through unchanged.
   */
  function _formatNBMCopy(move, g, conf, decisionType, signals) {
    var cat    = move.category || '';
    var arch   = (window.BSE || {}).archetype || '';
    var why    = move.why || '';       // engine base — always data-anchored
    var support = '';                  // optional support line — empty by default

    // ── 1. CTA text — confidence + mode based ────────────────────────
    var ctaText;
    if (conf === 'medium') {
      if (cat === 'debt')                 ctaText = 'See the payoff plan \u2192';
      else if (cat === 'home')            ctaText = 'Update my numbers \u2192';
      else if (decisionType === 'retire') ctaText = 'Refine this plan \u2192';
      else                                ctaText = 'Take this step \u2192';
    } else {
      // High confidence — specific, imperative CTA
      if (cat === 'safety' && move.id === 'deficit')       ctaText = 'Fix this first \u2192';
      else if (cat === 'safety')                            ctaText = 'Build this buffer \u2192';
      else if (cat === 'debt')                              ctaText = 'See the payoff plan \u2192';
      else if (cat === 'home')                              ctaText = 'Update my numbers \u2192';
      else if (cat === 'retire')                            ctaText = 'See retirement view \u2192';
      else if (cat === 'grow' && move.id === 'career_gap')      ctaText = 'See income benchmark \u2192';
      else if (cat === 'grow' && move.id === 'recurring_leak')  ctaText = 'Review recurring charges \u2192';
      else if (cat === 'grow')                                   ctaText = 'Start investing \u2192';
      else                                                  ctaText = 'Take this step \u2192';
    }

    // ── 2. Tone + why adjustment by archetype ─────────────────────────
    // Only applied when archetype provides a meaningful signal.
    // Falls through to engine why if no clear adjustment is warranted.

    if (arch === 'anxious_overwhelmed') {
      // Keep the data-anchored why (numbers must stay) — framing goes to support line only
      why = move.why;
      var _tier22 = TIER_BY_ID[move.id] || TIER_BY_CAT[cat] || 'optimize';
      if (_tier22 === 'stabilize' || _tier22 === 'unlock') {
        support = 'This is the single most important step right now \u2014 one move at a time.';
      } else {
        support = 'One step at a time. This is the most direct improvement available.';
      }

    } else if (arch === 'avoider') {
      // Keep the data-anchored why (numbers must stay) — framing goes to support line only
      why = move.why;
      var _tier22b = TIER_BY_ID[move.id] || TIER_BY_CAT[cat] || 'optimize';
      if (_tier22b === 'stabilize' || _tier22b === 'unlock') {
        support = 'This is the one action that removes the most financial risk right now.';
      } else {
        support = 'This is the most direct improvement available right now.';
      }

    } else if (arch === 'optimizer') {
      // Keep engine why — it is precise. Add efficiency framing to support line only.
      why = move.why;
      if (cat === 'debt' || cat === 'grow') {
        support = 'This ranks above the alternatives on both impact and feasibility.';
      }

    } else if (arch === 'pre_retirement') {
      // Contributions carry maximum weight in this window
      if (cat === 'retire') {
        why = 'You are in the window where contributions carry maximum compounding weight. ' + move.why;
      } else {
        why = move.why;
      }

    } else if (g.isRetirementMode || arch === 'in_retirement') {
      // Calm + protective framing
      if (cat === 'retire') {
        why = 'At this stage, income durability matters more than growth. ' + move.why;
      } else if (cat === 'safety') {
        why = 'A stable cash reserve is the foundation for everything else in retirement. ' + move.why;
      } else {
        why = move.why;
      }

    } else if (arch === 'debt_overwhelmed') {
      // Focus on relief, not optimization
      if (cat === 'debt') {
        why = 'Reducing one balance changes the monthly pressure immediately. ' + move.why;
      } else {
        why = move.why;
      }

    } else if (arch === 'homebuyer_ready') {
      if (cat === 'home') {
        why = 'Your position supports the path to home ownership. ' + move.why;
      } else {
        why = move.why;
      }

    } else {
      why = move.why; // all other archetypes: pass engine why through unchanged
    }

    // ── 3. Hesitation / ignore signal ────────────────────────────────
    // Only applied if a reliable ignore or hesitation count exists.
    // Does NOT fabricate intent — only fires when the signal clearly exists.
    if (signals.ignored >= 3 || signals.hesit >= 4) {
      if (!support) {
        support = 'This remains the strongest move available in your position.';
      }
    }

    // ── 4. Return session: slightly softer CTA for new return visitors ─
    // (not for hesitators — they get the support line instead)
    if (signals.returnSession && conf === 'medium' && signals.ignored < 3) {
      if (!support) {
        support = 'Based on your current data, this is the most direct path.';
      }
    }

    // ── 5. Clamp why length ──────────────────────────────────────────
    // Never allow why to become a paragraph — two short sentences max.
    // Retirement prepended strings get a wider allowance (280) due to preamble.
    // If the adjusted why is still too long, fall back to the engine's original.
    var _whyLimit = (why !== move.why && why.length > move.why.length) ? 280 : 220;
    if (why && why.length > _whyLimit) why = move.why;

    return { why:why, ctaText:ctaText, supportLine:support };
  }

  // ═══════════════════════════════════════════════════════
  // NBM VALIDITY VALIDATOR
  // ═══════════════════════════════════════════════════════

  /**
   * _validateNBM(move, g, conf, decisionType)
   * Evaluates whether a move has earned the right to render as a real financial decision.
   *
   * Returns: { isValidDecision:bool, reason:string, fallbackType:string|null }
   *
   * reason:       'ok' | 'insufficient_data' | 'wrong_mode' | 'missing_support' | 'generic'
   * fallbackType: 'profile' | 'refine' | 'context' | null
   *
   * Rules:
   *   A. Weak confidence (low/directional) → never render a real financial move
   *   B. Medium confidence → only valid if FCF-dependent move has confirmed income
   *   C. Mode conflict (retirement) → reject wrong-domain moves at render layer
   *   D. Missing support inputs for the move's category → downgrade to context
   *   E. Data-collection stubs are not financial decisions
   */
  function _validateNBM(move, g, conf, decisionType) {
    // Defensive: upstream should have caught these, but guard here too
    if (!move || move.id === 'insufficient_data' || move.id === 'fallback') {
      return { isValidDecision:false, reason:'insufficient_data', fallbackType:'profile' };
    }

    // Rule A — weak confidence cannot render a real financial decision
    if (conf === 'low' || conf === 'directional') {
      return { isValidDecision:false, reason:'insufficient_data', fallbackType:'context' };
    }

    var cat  = move.category || '';
    var arch = (window.BSE || {}).archetype || '';

    // Rule C — retirement mode purity (render-layer defence, engine already filters most)
    if (g.isRetirementMode) {
      // Home moves should never reach retirement users
      if (cat === 'home') {
        return { isValidDecision:false, reason:'wrong_mode', fallbackType:'refine' };
      }
      // Employer-match framing is meaningless for in_retirement users — no employer
      if (arch === 'in_retirement' && move.id === 'match_capture') {
        return { isValidDecision:false, reason:'wrong_mode', fallbackType:'refine' };
      }
      // DTI / lender framing is mortgage-domain — not relevant in retirement
      if (move.id === 'dti_reduce') {
        return { isValidDecision:false, reason:'wrong_mode', fallbackType:'refine' };
      }
    }

    // Rule D — missing support inputs for category-specific moves
    if (cat === 'home') {
      // Any home move requires at minimum a target price to produce real numbers
      if (!(g.homePrice || g.targetHomePrice || g.purchasePrice)) {
        return { isValidDecision:false, reason:'missing_support', fallbackType:'context' };
      }
    }
    if (move.id === 'retire_contrib') {
      // Contribution projection excluded at draw age — engine gates this but render defends
      var _age = parseInt(g.currentAge || g.age || '0');
      if (_age >= 65) {
        return { isValidDecision:false, reason:'wrong_mode', fallbackType:'refine' };
      }
      // Requires income to project any meaningful increase amount
      if (!(g.income || g.takeHome)) {
        return { isValidDecision:false, reason:'missing_support', fallbackType:'context' };
      }
    }

    // Rule E — data-collection stubs are preparation steps, not financial decisions
    // home_research prompts the user to set a target price — it is setup, not an NBM
    if (move.id === 'home_research') {
      return { isValidDecision:false, reason:'generic', fallbackType:'context' };
    }

    // Rule B — medium confidence: FCF-dependent moves require confirmed income
    // Safety, debt, and grow moves all use FCF amounts in their calculations
    if (conf === 'medium') {
      var _fcfDependent = (cat === 'safety' || cat === 'grow' || cat === 'debt');
      if (_fcfDependent && !(g.income || g.takeHome)) {
        return { isValidDecision:false, reason:'missing_support', fallbackType:'profile' };
      }
    }

    return { isValidDecision:true, reason:'ok', fallbackType:null };
  }

  /**
   * _buildRefineCard(g, decisionType)
   * Shown when a move fails validation due to mode conflict or domain mismatch.
   * Mode-aware, calm, no fake precision. CTA routes to settings, not onboarding.
   */
  function _buildRefineCard(g, decisionType) {
    var COPY = {
      retire:  { title:'Refine your retirement picture',
                 why:  'Add your retirement savings to calculate your runway.',
                 cta:  'Refine this plan \u2192' },
      home:    { title:'Add your target home details',
                 why:  'We need your target price and savings to show you a specific readiness plan.',
                 cta:  'Add home details \u2192' },
      debt:    { title:'Add the debt details needed to rank your next move',
                 why:  'Your balance and rate are needed before we can recommend a specific paydown strategy.',
                 cta:  'Add debt details \u2192' },
      general: { title:'Add key financial details',
                 why:  'Add your monthly expenses to assess your cash flow.',
                 cta:  'Add your details \u2192' }
    };
    var copy = (g.isRetirementMode ? COPY.retire : COPY[decisionType]) || COPY.general;
    var _rfSection = g.isRetirementMode ? 'assets'
                   : decisionType === 'home' ? 'home'
                   : decisionType === 'debt' ? 'debt'
                   : 'income';
    return '<div class="nbm-card nbm-card-fallback">'+
      '<div class="nbm-eyebrow">Your next move</div>'+
      '<div class="nbm-title">'+copy.title+'</div>'+
      '<div class="nbm-why">'+copy.why+'</div>'+
      '<button class="nbm-cta" onclick="openSettingsEdit(\''+_rfSection+'\')">'+copy.cta+'</button>'+
    '</div>';
  }

  // ═══════════════════════════════════════════════════════
  // RENDER-LAYER COPY CONDENSERS (no engine changes)
  // ═══════════════════════════════════════════════════════

  // Condense a title to ≤7 words. Splits at em-dash or colon first.
  function _toHeadline(title) {
    if (!title) return '';
    var t = title.split(' \u2014 ')[0].split(': ')[0].trim();
    var words = t.split(/\s+/);
    if (words.length <= 7) return t;
    return words.slice(0, 6).join(' ');
  }

  // Return only the first sentence of a text block.
  function _firstSentence(text) {
    if (!text) return '';
    var m = text.match(/^.+?[.!?](?:\s|$)/);
    return m ? m[0].trim() : text;
  }

  // ═══════════════════════════════════════════════════════
  // CONSEQUENCE LINE BUILDER (P3 forcing function)
  // ═══════════════════════════════════════════════════════

  // Returns one short line: what happens if user doesn't act.
  // max 1 line, no fear language, just reality.
  function _buildConsequence(move, g) {
    if (!move) return '';
    var g2   = g || {};
    var cc   = g2.ccDebt || 0;
    var ccR  = g2.ccRate || 21;
    var dti  = g2.dti || 0;
    var moInt;

    // Resolve category — explicit field first, fall back to title keyword inference
    var cat = move.category || '';
    if (!cat) {
      var t = (move.title || '').toLowerCase();
      if (t.indexOf('buffer') !== -1 || t.indexOf('emergency') !== -1) cat = 'safety';
      else if (t.indexOf('debt') !== -1 || t.indexOf('balance') !== -1 || t.indexOf('payoff') !== -1) cat = 'debt';
      else if (t.indexOf('home') !== -1 || t.indexOf('deposit') !== -1) cat = 'home';
      else if (t.indexOf('retire') !== -1 || t.indexOf('pension') !== -1) cat = 'retire';
      else if (t.indexOf('invest') !== -1 || t.indexOf('contribution') !== -1 || t.indexOf('automate') !== -1) cat = 'grow';
    }

    if (cat === 'safety' && move.id === 'deficit') {
      return 'Unchecked, any unexpected cost goes straight to credit.';
    }
    if (cat === 'safety') {
      return 'Without a buffer, one unexpected cost puts you back in debt.';
    }
    if (cat === 'debt' && move.id === 'dti_reduce' && dti > 0) {
      return 'At ' + dti + '% DTI, lenders will flag this position \u2014 cost of borrowing goes up.';
    }
    if (cat === 'debt') {
      var _ccRateProvided = g2.ccRate != null && g2.ccRate !== '' && Number(g2.ccRate) > 0;
      moInt = cc > 0 ? Math.round(cc * (ccR / 100) / 12) : 0;
      if (moInt > 30) {
        var _rateNote = _ccRateProvided ? '' : ' (est. at 21%)';
        return 'Each month this runs costs ~\u0024' + moInt.toLocaleString('en-US') + _rateNote + ' in avoidable interest.';
      }
      return 'Debt pressure is the main drag on your financial flexibility.';
    }
    if (cat === 'home') {
      return 'This is the main constraint on your buying power right now.';
    }
    if (cat === 'retire') {
      return 'Each month of delay reduces the compounding window permanently.';
    }
    if (cat === 'grow') {
      return 'Every month this waits is compounding time you don\u2019t get back.';
    }
    if (cat === 'stable') {
      return 'Without a spending limit, surplus cash disappears into untracked spending.';
    }
    return '';
  }

  // ═══════════════════════════════════════════════════════
  // PRIMARY CARD BUILDERS
  // ═══════════════════════════════════════════════════════

  /**
   * _buildPrimaryNBMCard(move, conf, g, assessment)
   * Builds the dominant NBM card HTML for three states:
   *   1. Fallback (no move / directional) — profile prompt
   *   2. Context Request Mode (low conf)  — micro input flow
   *   3. Decision Mode (medium/high)      — full NBM card
   */
  function _buildPrimaryNBMCard(move, conf, g, assessment) {
    // ── 1. Fallback ───────────────────────────────────────
    if (!move || move.id === 'insufficient_data') {
      var isRetire = !!(g.isRetirementMode);
      var isHome   = g.primaryIntent === 'home' || g.primaryIntent === 'buy_home';
      var isDebt   = g.primaryIntent === 'debt' || g.primaryIntent === 'debtrank';
      var fbTitle  = isRetire ? 'Add your retirement savings to calculate your runway'
                  : isHome   ? 'Add your target home price to calculate your readiness'
                  : isDebt   ? 'Add your credit card balance to build your payoff plan'
                  : 'Add your monthly expenses to assess your cash flow';
      var fbWhy = isRetire ? 'Income, savings rate, and target age are needed to give you specific guidance.'
                : isHome   ? 'Target price + deposit + income = your real readiness number.'
                : isDebt   ? 'Your balance and rate determine the fastest path to debt-free.'
                : 'Income and expenses are the minimum needed for a grounded recommendation.';
      var fbCta = isRetire ? 'Add your details \u2192' : 'Complete your profile \u2192';
      var fbSection = isRetire ? 'assets' : isHome ? 'home' : isDebt ? 'debt' : 'income';
      return '<div class="nbm-card nbm-card-fallback">'+
        '<div class="nbm-eyebrow">Your next move</div>'+
        '<div class="nbm-title">'+fbTitle+'</div>'+
        '<div class="nbm-why">'+fbWhy+'</div>'+
        '<button class="nbm-cta" onclick="openSettingsEdit(\''+fbSection+'\')">'+fbCta+'</button>'+
      '</div>';
    }

    // ── 2. Context Request Mode ───────────────────────────
    if (conf === 'low') {
      var reqs     = CTX_REQ[assessment.decisionType] || CTX_REQ.general;
      var n        = assessment.missingInputs.length;
      var ctaLabel = n > 0
        ? 'Add ' + n + ' quick detail' + (n !== 1 ? 's' : '') + ' \u2192'
        : 'Complete your details \u2192';
      return '<div class="nbm-card nbm-card-ctx">'+
        '<div class="nbm-eyebrow">To give you a real recommendation</div>'+
        '<div class="nbm-title">'+reqs.context+'</div>'+
        '<div class="nbm-why">'+reqs.limitation+'</div>'+
        '<div class="nbm-action">'+reqs.actionLabel+'</div>'+
        '<button class="nbm-cta" onclick="window._tdfToggleMicroInput(this)">'+ctaLabel+'</button>'+
        _buildMicroInputHTML(assessment.missingInputs, assessment.decisionType)+
      '</div>';
    }

    // ── 3. Decision Mode (medium / high) — validate before rendering ──
    var validation = _validateNBM(move, g, conf, assessment.decisionType);
    if (!validation.isValidDecision) {
      // Failed validation: route to the appropriate safe fallback
      if (validation.fallbackType === 'context') {
        if (typeof _buildContextRequestSection === 'function') {
          try { return _buildContextRequestSection(assessment); } catch(e) {}
        }
        return _buildRefineCard(g, assessment ? assessment.decisionType : 'general');
      }
      return _buildRefineCard(g, assessment ? assessment.decisionType : 'general');
    }

    var ctaFn   = move.category === 'debt'   ? "switchTab('debtrank');setNav(document.getElementById('nav-debt'))" :
                  move.category === 'retire' ? "bseOpenRetirementReview()" :
                  move.category === 'home'   ? "openSettingsEdit('home')" :
                                               'bseOpenPlan()';
    var outcome = _buildOutcome(move, conf);

    // Copy formatter — tone + CTA + optional support line
    var signals = _readBehavioralSignals();
    var copy    = _formatNBMCopy(move, g, conf, assessment.decisionType, signals);

    // ── Progression context ──────────────────────────────────
    var progCtx  = _getProgressionContext(move, g, assessment, signals);
    var holdTier = _shouldHoldTier(progCtx, signals);

    // Rule: if system should hold tier, replace assertive CTAs with tier-appropriate ones.
    var _assertiveCTAs = { 'Fix this first \u2192':true, 'Build this buffer \u2192':true, 'Start investing \u2192':true };
    if (holdTier && _assertiveCTAs[copy.ctaText]) {
      copy.ctaText = progCtx.currentTier === 'stabilize'
        ? 'Address this first \u2192'
        : 'Review this move \u2192';
    }

    // ── Single support line — 4-level priority ──────────────────────
    // 1. Hesitation/reassurance (in copy.supportLine when ignored>=3 or hesit>=4)
    // 2. Copy formatter behavioral line (archetype/return-session)
    // 3. Progression support line (tier-based)
    // 4. Emotional continuity line (transition/micro-feedback/ambient)
    // Only the highest-priority non-empty line is shown.
    var progSupportLine  = _getProgressionSupportLine(progCtx);
    var emotionLine      = _getEmotionalContinuityLine(progCtx, signals, assessment, move, g);
    var effectiveSupport = copy.supportLine || progSupportLine || emotionLine;

    // Record continuity state for next render
    try {
      _lastNBMId        = move.id;
      _lastTier         = progCtx.currentTier;
      _lastMissingCount = assessment && assessment.missingInputs ? assessment.missingInputs.length : 0;
    } catch(e) {}

    // Inline impact line (high confidence only)
    var impactHtml = '';
    if (outcome) {
      var parts = [];
      if (outcome.scoreImpact) parts.push(
        '<span class="nbm-impact-val nbm-impact-score">'+outcome.scoreImpact+'</span>'+
        '<span class="nbm-impact-lbl">\u00a0score</span>'
      );
      if (outcome.cashImpact) parts.push(
        '<span class="nbm-impact-val nbm-impact-cash">'+outcome.cashImpact+'</span>'+
        '<span class="nbm-impact-lbl">\u00a0cash flow</span>'
      );
      if (parts.length) impactHtml =
        '<div class="nbm-impact">'+
          parts.join('<span class="nbm-impact-sep">&nbsp;&middot;&nbsp;</span>')+
        '</div>';
    }

    var _hasMissing  = assessment && assessment.missingInputs && assessment.missingInputs.length > 0;
    var _hasInferred = Array.isArray(g._inferredFields) && g._inferredFields.length > 0;
    var medNote = (conf === 'medium' && (_hasMissing || _hasInferred))
      ? '<div class="nbm-conf-note">Est. \u2014 numbers sharpen as you add more details</div>'
      : '';

    var supportHtml = effectiveSupport
      ? '<div class="nbm-support">'+effectiveSupport+'</div>'
      : '';

    // P3 order: ACTION → CONSEQUENCE → REASON
    var _actionLine  = _firstSentence(move.action || '');
    var _reasonLine  = _firstSentence(copy.why || move.why || '');
    var _consequence = _buildConsequence(move, g);

    // ── Observation: NBM_SHOWN ──────────────────────────────
    try { tracentTrack('nbm_shown', { move_id: move.id || '', category: move.category || '', confidence: conf }); } catch(e) {}

    // ── Observation: NBM_CLICKED — prepend track to CTA onclick ─
    var _trackClick = 'try{tracentTrack(\'nbm_clicked\',{move_id:\'' + (move.id||'') + '\'});}catch(e){}';

    var _headlineTitle = _toHeadline(move.title || '');
    var _subActionLine = (_actionLine && _actionLine !== _headlineTitle) ? _actionLine : '';

    return '<div class="nbm-card">'+
      '<div class="nbm-eyebrow">Your next move</div>'+
      '<div class="nbm-title">'+(_headlineTitle || _actionLine || '')+'</div>'+
      (_subActionLine ? '<div class="nbm-action-line">'+_subActionLine+'</div>' : '')+
      (_consequence ? '<div class="nbm-consequence">'+_consequence+'</div>' : '')+
      (_reasonLine  ? '<div class="nbm-why">'+_reasonLine+'</div>'         : '')+
      medNote+
      impactHtml+
      supportHtml+
      '<button class="nbm-cta" onclick="'+_trackClick+ctaFn+'">'+copy.ctaText+'</button>'+
    '</div>';
  }

  /**
   * _buildConfidenceLayer(conf)
   * One-line confidence indicator shown directly below the NBM card.
   * Directional state shows "More data needed" — not Medium.
   */
  function _buildConfidenceLayer(conf) {
    var LABEL = {
      high:'High confidence', medium:'Medium confidence',
      low:'More data needed', directional:'More data needed'
    };
    var COLOR = {
      high:'#4CAF7D', medium:'#D4954A',
      low:'#9e9e9e',  directional:'#9e9e9e'
    };
    var label = LABEL[conf] || LABEL.medium;
    var color = COLOR[conf]  || COLOR.medium;
    return '<div class="nbm-confidence" style="color:'+color+';">'+label+'</div>';
  }

  /**
   * _buildFullPicture(sit, interp, outcome, rankReason, alts, conf)
   * Collapsible panel containing all secondary detail sections.
   * Hidden by default — toggled by nbm-expand-toggle button.
   */
  function _buildFullPicture(sit, interp, outcome, rankReason, alts, conf) {
    // Situation
    var sitHtml = '<div class="tdf-section tdf-section-situation">'+
      '<div class="tdf-eyebrow">Your situation</div>'+
      '<div class="tdf-sit-grid">'+
        sit.rows.map(function(r){
          return '<div class="tdf-sit-row">'+
            '<span class="tdf-sit-label">'+r.label+'</span>'+
            '<span class="tdf-sit-value">'+r.value+'</span>'+
          '</div>';
        }).join('')+
      '</div>'+
      (sit.risk ? '<div class="tdf-risk-flag">'+sit.risk+'</div>' : '')+
    '</div>';

    // Interpretation
    var interpHtml = '<div class="tdf-section tdf-section-interp">'+
      '<div class="tdf-eyebrow">What this means</div>'+
      '<div class="tdf-interp-body">'+interp+'</div>'+
    '</div>';

    // Outcome detail
    var outcomeHtml = '';
    if (outcome) {
      var items = [];
      if (outcome.scoreImpact) items.push(
        '<div class="tdf-outcome-item">'+
          '<div class="tdf-outcome-val">'+outcome.scoreImpact+'</div>'+
          '<div class="tdf-outcome-lbl">Score impact</div>'+
        '</div>'
      );
      if (outcome.cashImpact) items.push(
        '<div class="tdf-outcome-item">'+
          '<div class="tdf-outcome-val tdf-outcome-cash">'+outcome.cashImpact+'</div>'+
          '<div class="tdf-outcome-lbl">Cash flow impact</div>'+
        '</div>'
      );
      if (items.length) outcomeHtml =
        '<div class="tdf-section tdf-section-outcome">'+
          '<div class="tdf-eyebrow">Expected outcome</div>'+
          '<div class="tdf-outcome-row">'+items.join('')+'</div>'+
        '</div>';
    }

    // Confidence detail
    var confHtml = '<div class="tdf-section tdf-section-conf">'+
      '<div class="tdf-eyebrow">Confidence</div>'+
      '<div class="tdf-conf-badge" style="color:'+(CONF_COLOR[conf]||'#9e9e9e')+';">'+CONF_LABEL[conf]+'</div>'+
      '<div class="tdf-conf-sub">'+CONF_SUB[conf]+'</div>'+
    '</div>';

    // System Reasoning
    var reasoningHtml = '';
    if ((conf==='high'||conf==='medium') && (rankReason||alts.length)) {
      var altsHtml = alts.length
        ? '<div class="tdf-alts-label">Considered but ranked lower:</div>'+
          alts.map(function(a){
            return '<div class="tdf-alt-row">'+
              '<span class="tdf-alt-title">'+a.title+'</span> \u2014 '+
              '<span class="tdf-alt-why">'+a.whyLower+'</span>'+
            '</div>';
          }).join('')
        : '';
      reasoningHtml = '<div class="tdf-section tdf-section-reasoning">'+
        '<div class="tdf-eyebrow">How this was chosen</div>'+
        (rankReason ? '<div class="tdf-reasoning-body">'+rankReason+'</div>' : '')+
        altsHtml+
      '</div>';
    }

    return '<div id="nbm-full-picture" class="nbm-full-picture" style="display:none;">'+
      sitHtml + interpHtml + outcomeHtml + confHtml + reasoningHtml +
    '</div>';
  }

  // ═══════════════════════════════════════════════════════
  // HOME HERO (home intent only — prepended above NBM)
  // ═══════════════════════════════════════════════════════

  function _buildHomeHero(g) {
    var _f = function(n,c){ var v=Number(n||0),a=Math.abs(Math.round(v)),s=v<0?'-$':'$';if(c&&a>=1e6)return s+(a/1e6).toFixed(1)+'M';if(c&&a>=1e3)return s+(a/1e3).toFixed(1)+'k';return s+a.toLocaleString('en-US'); };
    if (!_hasTrustedDTIInputs(g)) return ''; // no income — readiness state is meaningless
    var m = typeof window._calcHomeMetrics === 'function' ? window._calcHomeMetrics(g) : null;
    if (!m || m.targetPrice === 0) return '';
    var pi         = m.pi;
    var dtiAfter   = m.dtiAfter;
    var cashToClose= m.cashToClose;
    var takeHome   = m.takeHome;
    var fcf        = g.fcf || 0;

    var _trustedCF = _hasTrustedCashflowInputs(g);
    var state = ((fcf < 0 && _trustedCF) || dtiAfter > 50) ? 'NOT_READY'
              : (cashToClose <= 0 && dtiAfter <= 43 && takeHome > 0) ? 'READY'
              : 'NEAR_READY';

    var stateText;
    if (state === 'NOT_READY') {
      if (fcf < 0 && _trustedCF) {
        stateText = 'Cash flow is negative \u2014 resolve this before committing to a purchase.';
      } else {
        stateText = 'DTI after purchase would be ' + dtiAfter + '% \u2014 above the safe threshold for this price.';
      }
    } else if (state === 'NEAR_READY') {
      if (cashToClose > 0 && dtiAfter > 43) {
        stateText = 'Need ' + _f(cashToClose, true) + ' more to close and DTI needs to reach 43% or below.';
      } else if (cashToClose > 0) {
        stateText = 'Need ' + _f(cashToClose, true) + ' more to cover deposit and closing costs.';
      } else if (dtiAfter > 43) {
        stateText = 'DTI after purchase would be ' + dtiAfter + '% \u2014 reduce debt to reach lender threshold.';
      } else {
        stateText = 'Close to ready \u2014 one adjustment needed.';
      }
    } else {
      stateText = 'Proceed with lenders \u2014 numbers support this purchase.';
    }

    var dtiCls  = dtiAfter <= 36 ? 'hh-val--ok' : dtiAfter <= 43 ? 'hh-val--caution' : 'hh-val--high';
    var cashCls = cashToClose <= 0 ? 'hh-val--ok' : 'hh-val--caution';
    var sharedLine = (g.homeIncomeMode === 'household' && g.homeHouseholdTakeHome > 0)
      ? '<div class="hh-shared">Based on the income supporting this purchase</div>' : '';

    return '<div class="hh-hero">'+
      '<div class="hh-state">'+stateText+'</div>'+
      '<div class="hh-rows">'+
        (pi > 0 ? '<div class="hh-row"><span class="hh-lbl">Estimated monthly payment</span><span class="hh-val">'+_f(pi)+'/mo</span></div>' : '')+
        '<div class="hh-row"><span class="hh-lbl">Cash needed to close</span><span class="hh-val '+cashCls+'">'+(cashToClose > 0 ? _f(cashToClose,true) : 'Covered')+'</span></div>'+
        (dtiAfter > 0 ? '<div class="hh-row"><span class="hh-lbl">DTI after purchase</span><span class="hh-val '+dtiCls+'">'+dtiAfter+'%<span class="hh-sub"> \u00b7 includes estimated mortgage</span></span></div>' : '')+
      '</div>'+
      sharedLine+
    '</div>';
  }

  // ═══════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════

  function renderDecisionFlow() {
    var el  = document.getElementById('bse-focus-mode');
    if (!el) return;
    var g   = window.G   || {};
    var BSE = window.BSE || {};

    if (BSE.show && BSE.show.focusCard===false) return; // BSE suppression
    if (!g.scoreFinal) return;                          // state gate

    // Per-cycle double-render guard
    var _cycleKey = g.lastComputedAt || Date.now();
    if (renderDecisionFlow._lastCycleKey === _cycleKey) return;
    renderDecisionFlow._lastCycleKey = _cycleKey;

    // Build all HTML first — only suppress secondary cards if build succeeds
    var _builtHtml;
    try {
      // Home Hero — only in home intent, only when score is final
      var homeHeroHtml = (g.primaryIntent === 'home' || g.primaryIntent === 'buy_home') ? _buildHomeHero(g) : '';

      // NBM move from engine
      var move = null;
      try {
        var moves = window.v21GetRankedMoves ? window.v21GetRankedMoves() : [];
        move = moves[0] || null;
      } catch(e) {}

      // Unified context assessment
      var assessment = _assessContext(g, BSE, move);
      var conf       = assessment.confidence;

      // Data for full-picture collapsible
      var sit        = _buildSituation(g);
      var interp     = _buildInterpretation(g, BSE);
      var outcome    = _buildOutcome(move, conf);
      var alts       = (move && move._alternatives)  ? move._alternatives.slice(0,2)  : [];
      var rankReason = (move && move._rankingReason) ? move._rankingReason            : '';

      // ── PRIMARY: NBM card ────────────────────────────────
      var primaryHtml = _buildPrimaryNBMCard(move, conf, g, assessment);

      // ── CONFIDENCE LAYER ─────────────────────────────────
      var confLayerHtml = _buildConfidenceLayer(conf);

      // ── EXPAND TOGGLE + FULL PICTURE (when detail exists) ─
      var hasDetail = sit.rows.length > 0;
      var toggleHtml = hasDetail
        ? '<button class="nbm-expand-toggle" onclick="window._tdfExpandToggle(this)">See full picture</button>'
        : '';
      var fullPictureHtml = hasDetail
        ? _buildFullPicture(sit, interp, outcome, rankReason, alts, conf)
        : '';

      _builtHtml = '<div class="tdf-wrap nbm-wrap">'+
        homeHeroHtml+
        primaryHtml+
        toggleHtml+
        fullPictureHtml+
      '</div>';
    } catch(e) {
      console.warn('[Tracent:DecisionFlow] build failed — skipping render:', e);
      renderDecisionFlow._lastCycleKey = null; // allow retry next cycle
      return;
    }

    // Build succeeded — now safe to suppress secondary cards and write DOM
    _suppressSecondaryCards();
    el.innerHTML = _builtHtml;
    el.style.display = 'block';
  }

  // ── Toggle full-picture collapsible ──────────────────────
  window._tdfExpandToggle = function(btn) {
    var panel = document.getElementById('nbm-full-picture');
    if (!panel) return;
    var isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (btn) btn.textContent = isOpen ? 'See full picture' : 'Hide details';
  };

  // ── Wire into bseRenderFocusCard (tab switch path) ────────
  window.bseRenderFocusCard = function() {
    if ((window.G||{}).scoreFinal) {
      try { renderDecisionFlow(); return; } catch(e) {
        console.warn('[Tracent:DecisionFlow] render failed:', e);
      }
    }
    // scoreFinal not set — fall through to completion/profile prompt path
    var el = document.getElementById('bse-focus-mode');
    if (!el) return;
    var _comp = Number((window.G||{}).profileCompleteness || 0);
    if (_comp < 60) {
      el.innerHTML =
        '<div class="bse-focus-wrap">' +
          '<div class="bse-focus-eyebrow">Getting started</div>' +
          '<div class="bse-action-card">' +
            '<div class="bse-action-label">Complete your profile to get your plan</div>' +
            '<div class="bse-action-why">Add your income, housing cost, and debt balances so Tracent can give you a meaningful, specific recommendation.</div>' +
            '<button class="bse-action-cta" onclick="openSettingsEdit(\'income\')">Update your details \u2192</button>' +
          '</div>' +
        '</div>';
      el.style.display = 'block';
    }
  };

  // ── Wire into v21RenderPostAnalysis (analysis path) ──────
  var _prevRPA = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function() {
    if (typeof _prevRPA==='function') _prevRPA();
    try { renderDecisionFlow(); } catch(e) {
      console.warn('[Tracent:DecisionFlow] post-analysis render failed:', e);
    }
  };

  window.renderDecisionFlow = renderDecisionFlow;

  // ═══════════════════════════════════════════════════════
  // CSS
  // ═══════════════════════════════════════════════════════
  var _tdfStyle = document.createElement('style');
  _tdfStyle.textContent = [
    // ── Shared wrap ──
    '.tdf-wrap{display:flex;flex-direction:column;gap:0;}',
    '.nbm-wrap{display:flex;flex-direction:column;gap:0;}',
    // ── Primary NBM card ──
    '.nbm-card{padding:24px 22px 20px;background:var(--navy,#1a1f35);border-radius:16px;}',
    '.nbm-eyebrow{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:rgba(0,168,232,0.80);margin-bottom:12px;}',
    '.nbm-title{font-size:22px;font-weight:700;color:#fff;line-height:1.25;margin-bottom:8px;}',
    '.nbm-consequence{font-size:13px;color:rgba(0,168,232,0.70);line-height:1.5;margin-bottom:8px;}',
    '.nbm-why{font-size:12px;color:rgba(255,255,255,0.40);line-height:1.55;margin-bottom:10px;}',
    '.nbm-action{font-size:13px;font-weight:600;color:rgba(255,255,255,0.70);line-height:1.5;margin-bottom:14px;}',
    '.nbm-conf-note{font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:12px;font-style:italic;}',
    '.nbm-support{font-size:12px;color:rgba(255,255,255,0.38);line-height:1.55;margin-bottom:12px;font-style:italic;}',
    '.nbm-impact{font-size:13px;margin-bottom:14px;}',
    '.nbm-impact-val{font-weight:700;}',
    '.nbm-impact-score{color:#4CAF7D;}',
    '.nbm-impact-cash{color:rgba(255,255,255,0.70);}',
    '.nbm-impact-sep{color:rgba(255,255,255,0.25);}',
    '.nbm-impact-lbl{color:rgba(255,255,255,0.40);font-size:12px;}',
    '.nbm-cta{display:inline-flex;align-items:center;justify-content:center;padding:14px 32px;border-radius:999px;background:var(--sky,#00A8E8);color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity 0.15s ease;margin-top:8px;}',
    '.nbm-cta:active{opacity:0.8;}',
    '.nbm-card-fallback .nbm-cta,.nbm-card-ctx .nbm-cta{background:rgba(0,168,232,0.15);color:rgba(0,168,232,0.90);border:1px solid rgba(0,168,232,0.28);}',
    // ── Confidence layer ──
    '.nbm-confidence{font-size:13px;font-weight:700;padding:10px 0 14px;border-bottom:1px solid rgba(255,255,255,0.07);}',
    // ── Expand toggle ──
    '.nbm-expand-toggle{display:block;width:100%;padding:13px;margin-top:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:12px;color:rgba(255,255,255,0.55);font-size:13px;font-weight:600;cursor:pointer;text-align:center;-webkit-tap-highlight-color:transparent;box-sizing:border-box;}',
    '.nbm-expand-toggle:active{opacity:0.7;}',
    // ── Full picture panel ──
    '.nbm-full-picture{margin-top:4px;}',
    // ── Existing tdf-* detail section styles (unchanged) ──
    '.tdf-section{padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.07);}',
    '.tdf-section:last-child{border-bottom:none;padding-bottom:6px;}',
    '.tdf-eyebrow{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:rgba(255,255,255,0.32);margin-bottom:8px;}',
    '.tdf-eyebrow-nbm{color:rgba(0,168,232,0.65);}',
    '.tdf-sit-grid{display:flex;flex-direction:column;gap:5px;margin-bottom:2px;}',
    '.tdf-sit-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;}',
    '.tdf-sit-label{font-size:12px;color:rgba(255,255,255,0.45);}',
    '.tdf-sit-value{font-size:13px;font-weight:600;color:rgba(255,255,255,0.80);}',
    '.tdf-risk-flag{margin-top:10px;padding:8px 11px;background:rgba(192,100,92,0.12);border:1px solid rgba(192,100,92,0.25);border-radius:8px;font-size:12px;font-weight:600;color:#e07070;}',
    '.tdf-interp-body{font-size:14px;color:rgba(255,255,255,0.72);line-height:1.6;}',
    '.tdf-section-nbm{padding-top:18px;padding-bottom:18px;}',
    '.tdf-nbm-title{font-size:17px;font-weight:700;color:#fff;line-height:1.35;margin-bottom:8px;}',
    '.tdf-nbm-why{font-size:14px;color:rgba(255,255,255,0.72);line-height:1.6;margin-bottom:8px;}',
    '.tdf-nbm-action{font-size:13px;font-weight:600;color:rgba(255,255,255,0.55);line-height:1.5;margin-bottom:14px;}',
    '.tdf-nbm-conf-note{font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:12px;font-style:italic;}',
    '.tdf-nbm-incomplete .tdf-nbm-title{font-size:15px;color:rgba(255,255,255,0.70);}',
    '.tdf-cta{display:inline-flex;align-items:center;justify-content:center;padding:11px 22px;border-radius:999px;background:var(--sky,#00A8E8);color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity 0.15s ease;}',
    '.tdf-cta:active{opacity:0.8;}',
    '.tdf-cta-ctx{background:rgba(0,168,232,0.15);color:rgba(0,168,232,0.90);border:1px solid rgba(0,168,232,0.28);}',
    '.tdf-ctx-context{font-size:15px;font-weight:700;color:#fff;line-height:1.35;margin-bottom:8px;}',
    '.tdf-ctx-limitation{font-size:13px;color:rgba(255,255,255,0.62);line-height:1.6;margin-bottom:6px;}',
    '.tdf-ctx-action{font-size:12px;color:rgba(255,255,255,0.40);line-height:1.5;margin-bottom:14px;font-style:italic;}',
    '.tdf-micro-input{margin-top:14px;padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:12px;}',
    '.tdf-mi-fields{display:flex;flex-direction:column;gap:12px;margin-bottom:14px;}',
    '.tdf-mi-field{display:flex;flex-direction:column;gap:4px;}',
    '.tdf-mi-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:rgba(255,255,255,0.40);}',
    '.tdf-mi-field-wrap{display:flex;align-items:center;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;overflow:hidden;}',
    '.tdf-mi-affix{padding:0 10px;font-size:13px;color:rgba(255,255,255,0.40);font-weight:600;flex-shrink:0;}',
    '.tdf-mi-input{width:100%;padding:10px 12px;background:transparent;border:none;outline:none;font-size:15px;font-weight:600;color:#fff;-webkit-appearance:none;}',
    '.tdf-mi-field-wrap .tdf-mi-input{padding-left:4px;}',
    '.tdf-mi-input-solo{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;}',
    '.tdf-mi-hint{font-size:11px;color:rgba(255,255,255,0.30);}',
    '.tdf-mi-submit{width:100%;padding:12px;border-radius:999px;background:var(--sky,#00A8E8);color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;}',
    '.tdf-outcome-row{display:flex;gap:10px;flex-wrap:wrap;}',
    '.tdf-outcome-item{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:10px 14px;min-width:90px;}',
    '.tdf-outcome-val{font-size:16px;font-weight:700;color:#4CAF7D;margin-bottom:3px;}',
    '.tdf-outcome-cash{color:rgba(255,255,255,0.70);}',
    '.tdf-outcome-lbl{font-size:11px;color:rgba(255,255,255,0.38);}',
    '.tdf-conf-badge{font-size:13px;font-weight:700;margin-bottom:5px;}',
    '.tdf-conf-sub{font-size:12px;color:rgba(255,255,255,0.48);line-height:1.55;}',
    '.tdf-reasoning-body{font-size:12px;color:rgba(255,255,255,0.48);line-height:1.6;margin-bottom:8px;}',
    '.tdf-alts-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:rgba(255,255,255,0.28);margin-bottom:6px;margin-top:2px;}',
    '.tdf-alt-row{font-size:12px;color:rgba(255,255,255,0.38);line-height:1.55;margin-bottom:5px;}',
    '.tdf-alt-title{font-weight:600;color:rgba(255,255,255,0.48);}',
    '.tdf-alt-why{font-style:italic;}',
    // ── Home Hero ──
    '.hh-hero{padding:16px 0 14px;border-bottom:1px solid var(--gray-2);margin-bottom:14px;}',
    '.hh-state{font-size:15px;font-weight:700;color:var(--navy);line-height:1.4;margin-bottom:12px;}',
    '.hh-rows{display:flex;flex-direction:column;gap:9px;margin-bottom:6px;}',
    '.hh-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}',
    '.hh-lbl{font-size:12px;color:var(--gray-3);}',
    '.hh-val{font-size:14px;font-weight:700;color:var(--navy);}',
    '.hh-val--ok{color:#2A9D5C;}',
    '.hh-val--caution{color:#B07200;}',
    '.hh-val--high{color:#C0321E;}',
    '.hh-sub{font-size:11px;font-weight:400;color:var(--gray-3);}',
    '.hh-shared{font-size:11px;color:var(--gray-3);margin-top:6px;}',
  ].join('\n');
  document.head.appendChild(_tdfStyle);

})();
