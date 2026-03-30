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
    return (v < 0 ? '-$' : '$') + abs.toLocaleString();
  }
  function safeText(el, text){ if (el) el.textContent = text; }

  function getConfidence(){
    var completeness = Number((window.G && G.profileCompleteness) || 0);
    var inferred = (window.G && Array.isArray(G._inferredFields)) ? G._inferredFields.length : 0;
    if (completeness >= 80 && inferred === 0) return 'High confidence';
    if (completeness >= 60 && inferred <= 2) return 'Medium confidence';
    return 'Directional estimate';
  }

  function getFreshness(){
    var ts = (window.G && G.lastComputedAt) || Date.now();
    try{
      var d = new Date(ts);
      return 'Updated ' + d.toLocaleDateString([], {month:'short', day:'numeric'}) + ' · on-device';
    }catch(e){
      return 'Updated just now · on-device';
    }
  }

  function buildAuthorityCard(){
    if (!window.G || !G.scoreCategories) return;
    var host = document.getElementById('v21-authority-card');
    if (!host) {
      host = document.createElement('div');
      host.id = 'v21-authority-card';
      host.className = 'tracent-authority-card';
      // Try insertion points in priority order; fall back to appending into dash-content
      var anchor = document.getElementById('v21-driver-strip');
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(host, anchor.nextSibling);
      } else {
        // Fallback 1: after the NBM card
        var nbm = document.getElementById('v21-nbm-card');
        if (nbm && nbm.parentNode) {
          nbm.parentNode.insertBefore(host, nbm.nextSibling);
        } else {
          // Fallback 2: append to the home tab panel
          var tabHome = document.getElementById('tab-home');
          if (tabHome) tabHome.appendChild(host);
          else return; // truly cannot place — bail cleanly
        }
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
      <div class="tracent-chip-row">
        <div class="tracent-mini-chip">${getConfidence()}</div>
        <div class="tracent-mini-chip">${getFreshness()}</div>
        <div class="tracent-mini-chip">${inferred}</div>
      </div>
      <div class="tracent-proof-list">${top}</div>
      <div class="tracent-soft-note">This is a Tracent planning score, not a lender credit score. Use it as a decision aid, not a guaranteed approval signal.</div>
    `;
  }

  function activeMode(){
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

    var data = {
      today: {
        title:'Today mode',
        sub:'Lead with the single move that changes your near-term position the most.',
        metrics:[
          ['Score', (G.scoreFinal && G.score ? String(G.score) : (G.previewScoreMid ? 'Preview ~' + G.previewScoreMid : '—')), 'Real planning score (post-analysis)'],
          ['Free cash flow', fmtCurrency(G.fcf || 0) + '/mo', 'Money left after core obligations'],
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
          ['Target price', fmtCurrency(G.homePrice || G.targetHomePrice || G.purchasePrice || 0), 'Tracked home target'],
          ['Saved for move', fmtCurrency(G.depositSaved || G.downPayment || 0), 'Deposit / accessible cash'],
          ['DTI', (G.dti!=null ? G.dti + '%' : '—'), 'Debt-to-income pressure']
        ],
        note:'Home should feel like readiness engineering, not a generic score tab.'
      },
      debt: {
        title:'Debt mode',
        sub:'Make payoff order, payment pressure, and relief velocity obvious.',
        metrics:[
          ['Card debt', fmtCurrency(G.ccDebt || 0), 'Highest-interest pressure'],
          ['Total debt', fmtCurrency((G.ccDebt||0)+(G.carDebt||0)+(G.studentDebt||0)+(G.otherDebt||0)), 'Non-housing debt load'],
          ['Free cash flow', fmtCurrency(G.fcf || 0) + '/mo', 'Amount available to attack balances'],
          ['Current DTI', (G.dti!=null ? G.dti + '%' : '—'), 'Lender pressure indicator']
        ],
        note:'Debt mode should feel like a pressure-release plan with ranked urgency.'
      },
      grow: {
        title:'Grow mode',
        sub:'Separate true investable surplus from money that still needs to become safety.',
        metrics:[
          ['Investable cash', fmtCurrency(Math.max(0, Math.round((G.fcf||0) * 0.35))) + '/mo', 'Conservative deployable estimate'],
          ['Cash saved', fmtCurrency((G.savingsAmt||0)+(G.depositSaved||0)), 'Current liquid base'],
          ['Employer match', G.retMatch || 'unknown', 'Retirement capture status'],
          ['Confidence', getConfidence(), 'How complete this picture is']
        ],
        note:'Grow should feel like capital allocation, not vague encouragement.'
      },
      retire: {
        title:'Retire mode',
        sub:'Show whether short-term pressure is stealing from long-term compounding.',
        metrics:[
          ['Retirement match', G.retMatch || 'unknown', 'Contribution footing'],
          ['Liquid savings', fmtCurrency((G.savingsAmt||0)+(G.depositSaved||0)), 'Current reserve base'],
          ['Free cash flow', fmtCurrency(G.fcf || 0) + '/mo', 'Capacity to increase contributions'],
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
      delete G.score;
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

  // v21BridgeToEngine now handles _inferredFields tracking internally.
  // The board-pass override is retired — the new bridge is the source of truth.
  // We wrap only to add the lastComputedAt timestamp if needed.
  var _origBridgeForBoard = window.v21BridgeToEngine;
  window.v21BridgeToEngine = function(){
    if (typeof _origBridgeForBoard === 'function') _origBridgeForBoard();
    // _inferredFields is already populated by the new bridge — no override needed.
    // Record when the bridge ran for authority card freshness.
    if (window.G) G._bridgeRanAt = Date.now();
  };

  var originalRenderPost = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function(){
    incrementDashboardCount();
    if (typeof originalRenderPost === 'function') originalRenderPost();

    if (window.G) G.lastComputedAt = Date.now();
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
    return sign + abs.toLocaleString();
  }
  function months(n){ n = Math.round(n||0); return n <= 0 ? '—' : n < 12 ? n+'mo' : (n/12).toFixed(1)+'yr'; }
  function pct(n)   { return n == null ? '—' : Math.round(n) + '%'; }

  function G(){ return window.G || null; }

  /* ═══════════════════════════════════════════════════════
     SECTION 1 — MODE STRATEGY BLOCKS
     Each builder returns an HTML string for the top card.
  ═══════════════════════════════════════════════════════ */

  function buildHomeStrategy(){
    var g = G(); if(!g) return '';
    var takeHome     = g.takeHome || (g.income ? Math.round(g.income / 12 * 0.72) : 0);
    var targetPrice  = g.homePrice || g.targetHomePrice || g.purchasePrice || 0;
    var depositSaved = g.depositSaved || g.downPayment || g.savingsAmt || 0;
    var depositNeed  = targetPrice * 0.10;
    var depositGap   = Math.max(0, depositNeed - depositSaved);
    var closingEst   = Math.round(targetPrice * 0.03);
    var totalCash    = depositNeed + closingEst;
    var cashToClose  = Math.max(0, totalCash - depositSaved);
    var dtiVal       = g.dti != null ? g.dti : 0;
    var fcf          = g.fcf || 0;
    var savingCapacity = Math.max(0, Math.round(fcf * 0.50));
    var moToReady    = savingCapacity > 0 && cashToClose > 0 ? Math.ceil(cashToClose / savingCapacity) : 0;
    var depositPct   = depositNeed > 0 ? Math.min(100, Math.round((depositSaved / depositNeed)*100)) : 0;
    var creditRates  = { excellent:0, good:0.20, fair:0.50, below:1.20, poor:2.10, unknown:0.35 };
    var creditPrem   = creditRates[g.credit || 'unknown'] || 0;
    var estRate      = (g.marketRate || 6.72) + creditPrem;
    var loanAmt      = Math.max(0, targetPrice - Math.max(depositSaved, depositNeed));
    var pi = loanAmt > 0 ? (function(){
      var r = (estRate/100)/12, n = 360;
      return Math.round((loanAmt * r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1));
    })() : 0;
    var dtiAfter = takeHome > 0 ? Math.round(((pi + (g.carPayment||0) + (g.otherPayment||0) + Math.max(0,(g.ccDebt||0)*0.02)) / takeHome)*100) : 0;
    var dtiOk    = dtiAfter <= 43;
    var readinessSignal = depositPct >= 100 && dtiOk ? 'Ready to apply' :
                          depositPct >= 75  ? 'Almost there' :
                          depositPct >= 50  ? 'Building momentum' : 'Early stage';
    var readinessColor  = depositPct >= 100 && dtiOk ? 'var(--green)' :
                          depositPct >= 50 ? 'var(--amber)' : 'var(--red)';

    var whatChangesReadiness = (function(){
      if (dtiAfter > 50) return 'Lowering your debt load is the single fastest path — at '+pct(dtiAfter)+' DTI, lenders will pause the application.';
      if (depositPct < 50) return 'Deposit is the bottleneck. You need '+fmt(cashToClose,true)+' more. At '+fmt(savingCapacity,true)+'/mo — that\'s '+months(moToReady)+' away.';
      if (creditPrem > 0.5) return 'Improving your credit band by one tier cuts your rate by ~'+creditPrem.toFixed(1)+'% — saving '+fmt(Math.round(pi * creditPrem / estRate))+'/mo.';
      if (dtiAfter > 36 && dtiAfter <= 43) return 'You qualify now but at '+pct(dtiAfter)+' DTI lenders will offer tighter terms. Clearing one debt before applying improves both rate and approval confidence.';
      return 'Your readiness position is solid. Get three lender quotes before committing to any rate.';
    })();

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="background:rgba(0,119,182,0.10);color:var(--teal);">🏠 Home Mode — Readiness Engineering</div>' +
      '<div class="tracent-mode-readiness-bar"><div class="tracent-mode-readiness-label">Deposit progress</div>' +
        '<div class="tracent-mode-bar-track"><div class="tracent-mode-bar-fill" style="width:'+depositPct+'%;background:'+readinessColor+'"></div></div>' +
        '<div class="tracent-mode-bar-meta"><span style="color:'+readinessColor+';font-weight:700;">'+depositPct+'%</span> of 10% target · <span style="font-weight:700;">'+readinessSignal+'</span></div>' +
      '</div>' +
      '<div class="tracent-mode-grid-3">' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Cash-to-close gap</div><div class="tracent-mode-cell-value" style="color:'+(cashToClose>0?'var(--red)':'var(--green)')+'">'+fmt(cashToClose,true)+'</div><div class="tracent-mode-cell-note">'+(cashToClose>0?'Deposit + closing costs still needed':'Fully funded')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">DTI if you buy</div><div class="tracent-mode-cell-value" style="color:'+(dtiOk?'var(--teal)':'var(--red)')+'">'+pct(dtiAfter)+'</div><div class="tracent-mode-cell-note">'+(dtiOk?'Lender-qualifying':'Above 43% threshold')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Months to ready</div><div class="tracent-mode-cell-value">'+months(moToReady)+'</div><div class="tracent-mode-cell-note">'+(moToReady>0?'At current saving pace':'Already there')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Est. monthly PITI</div><div class="tracent-mode-cell-value">'+fmt(pi,true)+'/mo</div><div class="tracent-mode-cell-note">At '+estRate.toFixed(2)+'% · '+g.credit+' credit</div></div>' +
      '</div>' +
      '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">💡 What changes readiness fastest</div><div class="tracent-mode-insight-text">'+whatChangesReadiness+'</div></div>' +
    '</div>';
  }

  function buildDebtStrategy(){
    var g = G(); if(!g) return '';
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
    var takeHome     = g.takeHome || 1;
    var debtPctIncome= Math.round((totalPmt / takeHome)*100);
    var extraCapacity= Math.max(0, Math.round(fcf * 0.40));
    var top          = debts[0] || null;
    var cashFreedNext= top ? top.pmt : 0;
    var moToPayTop   = top && (top.pmt + extraCapacity) > 0 ? Math.ceil(top.bal / (top.pmt + extraCapacity)) : 0;

    var cashFreedInsight = top
      ? 'Clearing your '+top.name+' ('+fmt(top.bal,true)+' at '+top.rate+'%) frees '+fmt(cashFreedNext)+'/mo permanently. At current pace that\'s '+months(moToPayTop)+'.'
      : 'No consumer debt recorded — all free cash flow is available to deploy toward goals.';

    var rankRows = debts.slice(0,4).map(function(d,i){
      var moToGo = d.pmt > 0 ? Math.ceil(d.bal / (d.pmt + (i===0 ? extraCapacity : 0))) : 999;
      return '<div class="tracent-debt-row">' +
        '<div class="tracent-debt-rank" style="background:'+(i===0?'rgba(0,168,232,0.15)':'var(--gray-1)')+';color:'+(i===0?'var(--teal)':'var(--gray-4)')+'">'+( i===0?'⚡':String(i+1) )+'</div>' +
        '<div class="tracent-debt-body"><div class="tracent-debt-name">'+d.name+'</div><div class="tracent-debt-detail">'+d.rate+'% APR · '+fmt(d.pmt)+'/mo minimum</div></div>' +
        '<div class="tracent-debt-right"><div class="tracent-debt-bal">'+fmt(d.bal,true)+'</div><div class="tracent-debt-time">'+months(moToGo)+'</div></div>' +
      '</div>';
    }).join('');

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="background:rgba(239,68,68,0.10);color:var(--red);">⚡ Debt Mode — Pressure-Release Plan</div>' +
      '<div class="tracent-debt-summary">' +
        '<div class="tracent-mode-grid-3">' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Total debt</div><div class="tracent-mode-cell-value">'+fmt(totalDebt,true)+'</div><div class="tracent-mode-cell-note">Non-housing only</div></div>' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Monthly drag</div><div class="tracent-mode-cell-value" style="color:var(--red)">'+pct(debtPctIncome)+' of income</div><div class="tracent-mode-cell-note">'+fmt(totalPmt)+'/mo minimums</div></div>' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Annual interest</div><div class="tracent-mode-cell-value" style="color:var(--red)">'+fmt(annualInt,true)+'</div><div class="tracent-mode-cell-note">Cost of carrying this debt</div></div>' +
          '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Extra capacity</div><div class="tracent-mode-cell-value" style="color:var(--teal)">'+fmt(extraCapacity)+'/mo</div><div class="tracent-mode-cell-note">40% of free cash flow</div></div>' +
        '</div>' +
      '</div>' +
      (debts.length > 0 ? '<div class="tracent-debt-list"><div class="tracent-mode-section-label">Ranked payoff order (avalanche)</div>'+rankRows+'</div>' : '') +
      '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">💡 Cash freed next</div><div class="tracent-mode-insight-text">'+cashFreedInsight+'</div></div>' +
    '</div>';
  }

  function buildGrowStrategy(){
    var g = G(); if(!g) return '';
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
    var debtDrag     = totalDebt > 0 ? Math.min(fcf * 0.4, Math.max((g.ccDebt||0)*0.02 + (g.carPayment||0), 0)) : 0;
    var efBuild      = !efSufficient ? Math.min(fcf * 0.5, Math.max(0, (takeHome * efTarget) - savings)) / 6 : 0;
    var investable   = Math.max(0, Math.round(fcf - debtDrag - efBuild));
    var investablePct= takeHome > 0 ? Math.round((investable/takeHome)*100) : 0;

    var safetyGrade = efSufficient && debtFree ? '✅ Safety sufficient' :
                      efSufficient && !debtFree ? '⚠️ Safety ok, debt drag present' :
                      '🔴 Build safety first';
    var safetyColor = efSufficient && debtFree ? 'var(--green)' :
                      efSufficient ? 'var(--amber)' : 'var(--red)';

    var allocationInsight = (function(){
      if (!efSufficient) return 'Emergency fund is at '+efMonths+' months — reach '+efTarget+' before committing capital elsewhere. Every $1 invested with no buffer is borrowed risk.';
      if (!matchCapture && matchStatus !== 'none') return 'Employer match is not fully captured. That\'s an immediate 50–100% return — no investment beats it. Capture the full match before allocating anywhere else.';
      if (!debtFree && (g.ccDebt||0) > 0) return 'Credit card debt at '+(g.ccRate||21)+'% is a guaranteed negative return. Paying it off is equivalent to a '+(g.ccRate||21)+'% risk-free investment. Clear it before building an investment position.';
      if (investable > 0) return 'After safety and debt obligations, '+fmt(investable)+'/mo is genuinely deployable. A low-cost index fund with this amount, invested monthly, compounds meaningfully over time without taking on unnecessary complexity.';
      return 'Your cash flow is tight right now. The highest-leverage move is reducing a fixed obligation — even small FCF improvements compound quickly into investable capacity.';
    })();

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="background:rgba(16,185,129,0.10);color:var(--green);">📈 Grow Mode — Capital Allocation</div>' +
      '<div class="tracent-mode-grid-3">' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Safety check</div><div class="tracent-mode-cell-value" style="color:'+safetyColor+'">'+safetyGrade+'</div><div class="tracent-mode-cell-note">Emergency fund: '+efMonths+' of '+efTarget+' months</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">True investable</div><div class="tracent-mode-cell-value" style="color:'+(investable>0?'var(--teal)':'var(--red)')+'">'+fmt(investable)+'/mo</div><div class="tracent-mode-cell-note">After safety + debt obligations</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Employer match</div><div class="tracent-mode-cell-value" style="color:'+(matchCapture?'var(--green)':'var(--amber)')+'">'+matchStatus+'</div><div class="tracent-mode-cell-note">'+(matchCapture?'Fully captured — max free return':'Check contribution rate')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Liquid base</div><div class="tracent-mode-cell-value">'+fmt(savings,true)+'</div><div class="tracent-mode-cell-note">Cash available before investing</div></div>' +
      '</div>' +
      '<div class="tracent-mode-grow-tiers">' +
        '<div class="tracent-mode-section-label">Allocation priority order</div>' +
        '<div class="tracent-grow-tier '+(efSufficient?'done':'active')+'"><span class="tracent-grow-tier-n">1</span><span>Emergency fund to '+efTarget+' months</span><span class="tracent-grow-tier-status">'+(efSufficient?'✓ Done':'Current priority')+'</span></div>' +
        '<div class="tracent-grow-tier '+(matchCapture?'done':efSufficient?'active':'locked')+'"><span class="tracent-grow-tier-n">2</span><span>Capture full employer match</span><span class="tracent-grow-tier-status">'+(matchCapture?'✓ Done':efSufficient?'Next':'Locked')+'</span></div>' +
        '<div class="tracent-grow-tier '+(debtFree?'done':(efSufficient&&matchCapture)?'active':'locked')+'"><span class="tracent-grow-tier-n">3</span><span>Clear high-rate debt</span><span class="tracent-grow-tier-status">'+(debtFree?'✓ Done':(efSufficient&&matchCapture)?'Next':'Locked')+'</span></div>' +
        '<div class="tracent-grow-tier '+(investable>0&&debtFree&&efSufficient?'active':'locked')+'"><span class="tracent-grow-tier-n">4</span><span>Deploy '+fmt(investable)+'/mo into index fund</span><span class="tracent-grow-tier-status">'+(investable>0&&debtFree&&efSufficient?'Ready to start':'Locked')+'</span></div>' +
      '</div>' +
      '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">💡 Capital allocation logic</div><div class="tracent-mode-insight-text">'+allocationInsight+'</div></div>' +
    '</div>';
  }

  function buildRetireStrategy(){
    var g = G(); if(!g) return '';
    var income       = g.income || 0;
    var takeHome     = g.takeHome || 0;
    var fcf          = g.fcf || 0;
    var matchStatus  = g.retMatch || 'none';
    var matchCapture = matchStatus === 'full' || matchStatus === 'maxed';
    var totalDebt    = (g.ccDebt||0)+(g.carDebt||0)+(g.studentDebt||0)+(g.otherDebt||0);
    var annualInt    = totalDebt > 0 ? Math.round((g.ccDebt||0)*(g.ccRate||21)/100 + (g.carDebt||0)*0.075 + (g.studentDebt||0)*0.055 + (g.otherDebt||0)*0.09) : 0;

    // Simple retirement trajectory: current contrib rate and projection
    var currentContrib  = income > 0 ? Math.round(income * 0.06) : 0; // assume 6% default
    var idealContrib    = Math.round(income * 0.15);
    var contribGap      = Math.max(0, idealContrib - currentContrib);
    var monthlyContrib  = Math.round(currentContrib / 12);
    var monthlyIdeal    = Math.round(idealContrib / 12);

    // Future value approximation: 7% for 30 years
    function fv(monthlyPmt, years){ var r = 0.07/12, n = years*12; return Math.round(monthlyPmt * ((Math.pow(1+r,n)-1)/r)); }
    var fvCurrent  = fv(monthlyContrib, 30);
    var fvIdeal    = fv(monthlyIdeal,   30);
    var fvDebtFree = fv(monthlyContrib + Math.round(totalDebt > 0 ? (takeHome * 0.05) : 0), 30);

    // Debt drag: interest cost = capital that could compound instead
    var debtDragFV = annualInt > 0 ? fv(Math.round(annualInt/12), 30) : 0;

    var futureImpact = (function(){
      if (!matchCapture && matchStatus !== 'none') return 'Your employer match is not fully captured. Match contributions typically add 50% instantly. Over 30 years at 7%, that extra '+fmt(Math.round(monthlyContrib*0.5))+'/mo could compound to an additional '+fmt(fv(Math.round(monthlyContrib*0.5),30),true)+'.';
      if (totalDebt > 0 && annualInt > 500) return 'Your debt costs '+fmt(annualInt,true)+'/yr in interest. That same amount invested monthly would compound to '+fmt(debtDragFV,true)+' over 30 years. Every year of debt is retirement wealth foregone.';
      if (contribGap > 0) return 'At your current rate, you\'re projected to reach ~'+fmt(fvCurrent,true)+' in 30 years. At the 15% ideal rate, that grows to ~'+fmt(fvIdeal,true)+'. The gap is '+fmt(contribGap,true)+'/yr — equivalent to one intentional decision today.';
      return 'Your retirement trajectory looks solid. The next lever is consistency over time — don\'t interruptrrupt compounding for short-term liquidity if you can avoid it.';
    })();

    var trajectoryLabel = matchCapture && !totalDebt ? 'On track' :
                          matchCapture ? 'Debt drag present' :
                          'Below ideal pace';
    var trajectoryColor = matchCapture && !totalDebt ? 'var(--green)' :
                          matchCapture ? 'var(--amber)' : 'var(--red)';

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="background:rgba(139,92,246,0.10);color:#8B5CF6;">🌅 Retire Mode — Long-Horizon Security</div>' +
      '<div class="tracent-mode-grid-3">' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Trajectory signal</div><div class="tracent-mode-cell-value" style="color:'+trajectoryColor+'">'+trajectoryLabel+'</div><div class="tracent-mode-cell-note">Based on match + debt position</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Est. 30-yr projection</div><div class="tracent-mode-cell-value">'+fmt(fvCurrent,true)+'</div><div class="tracent-mode-cell-note">At current pace · 7% avg</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Employer match</div><div class="tracent-mode-cell-value" style="color:'+(matchCapture?'var(--green)':'var(--amber)')+'">'+matchStatus+'</div><div class="tracent-mode-cell-note">'+(matchCapture?'Fully captured':'Not fully captured')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Debt drag (annual)</div><div class="tracent-mode-cell-value" style="color:'+(annualInt>0?'var(--red)':'var(--green)')+'">'+fmt(annualInt,true)+'</div><div class="tracent-mode-cell-note">'+(annualInt>0?'Competing with contributions':'No debt drag')+'</div></div>' +
      '</div>' +
      '<div class="tracent-retire-compare">' +
        '<div class="tracent-mode-section-label">Contribution comparison</div>' +
        '<div class="tracent-retire-bar-row"><span>Current rate</span><div class="tracent-retire-bar-track"><div class="tracent-retire-bar-fill" style="width:'+Math.min(100,Math.round((currentContrib/Math.max(idealContrib,1))*100))+'%;background:var(--teal)"></div></div><span>'+fmt(currentContrib,true)+'/yr</span></div>' +
        '<div class="tracent-retire-bar-row"><span>Ideal (15%)</span><div class="tracent-retire-bar-track"><div class="tracent-retire-bar-fill" style="width:100%;background:var(--green)"></div></div><span>'+fmt(idealContrib,true)+'/yr</span></div>' +
      '</div>' +
      '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">💡 Future impact</div><div class="tracent-mode-insight-text">'+futureImpact+'</div></div>' +
    '</div>';
  }

  function buildTodayStrategy(){
    var g = G(); if(!g) return '';
    var score    = (g.scoreFinal && g.score) ? g.score : null;
    var fcf      = g.fcf || 0;
    var efMonths = parseInt(g.emergency || '0');
    var totalDebt= (g.ccDebt||0)+(g.carDebt||0)+(g.studentDebt||0)+(g.otherDebt||0);
    var dtiVal   = g.dti != null ? g.dti : 0;

    var topPriority = (function(){
      if (fcf < 0)          return { label:'🔴 Budget deficit', desc:'Spending exceeds take-home by '+fmt(Math.abs(fcf))+'/mo. This must be resolved before any other goal.', color:'var(--red)' };
      if (efMonths === 0)   return { label:'🛡️ Build emergency fund', desc:'No buffer means any unexpected cost becomes a financial crisis. Even $1,000 changes the risk profile.', color:'var(--amber)' };
      if ((g.ccDebt||0)>2000) return { label:'💳 Attack credit card balance', desc:fmt(g.ccDebt||0)+' at '+(g.ccRate||21)+'% APR costs '+fmt(Math.round((g.ccDebt||0)*(g.ccRate||21)/100/12))+'/mo in interest. Clearing it is a guaranteed return.', color:'var(--amber)' };
      if (dtiVal > 43)      return { label:'⚠️ DTI above lender threshold', desc:'At '+pct(dtiVal)+' DTI, mortgage applications will be challenged. Reduce debt before applying.', color:'var(--amber)' };
      if (score && score >= 70) return { label:'✅ Strong position — optimise', desc:'Your financial foundation is solid. The next move is directing surplus toward your primary goal.', color:'var(--green)' };
      return { label:'📊 Tighten cash flow', desc:'Your position has room to improve. Start by mapping where every dollar of FCF actually goes each month.', color:'var(--teal)' };
    })();

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="background:rgba(0,119,182,0.10);color:var(--teal);">📊 Today Mode — Mission Control</div>' +
      '<div class="tracent-mode-grid-3">' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Planning score</div><div class="tracent-mode-cell-value">'+(score ? score+'/100' : '—')+'</div><div class="tracent-mode-cell-note">'+(score ? 'Real weighted score' : 'Complete analysis to see')+'</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Free cash flow</div><div class="tracent-mode-cell-value" style="color:'+(fcf>=0?'var(--teal)':'var(--red)')+'">'+fmt(fcf)+'/mo</div><div class="tracent-mode-cell-note">After obligations</div></div>' +
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
    var g = G(); if(!g || !g.scoreFinal) return;
    var card = document.getElementById('v21-nbm-card');
    if (!card || card.style.display === 'none') return;

    var eyebrowEl = card.querySelector('.v21-nbm-eyebrow');
    var titleEl   = document.getElementById('v21-nbm-title');
    var descEl    = document.getElementById('v21-nbm-desc');

    if (!titleEl || !descEl) return;

    var move = buildModeNBMCopy(mode, g);
    if (!move) return;

    if (eyebrowEl) eyebrowEl.innerHTML = '<span class="v21-live-dot"></span>' + (move.eyebrow || 'Your next best move');
    titleEl.textContent = move.title;
    descEl.textContent  = move.why + ' ' + move.action;

    var impactEl = document.getElementById('v21-nbm-impact');
    var cashEl   = document.getElementById('v21-nbm-cash');
    var timeEl   = document.getElementById('v21-nbm-time');
    if (impactEl) impactEl.textContent = move.scoreImpact ? '+'+move.scoreImpact : '—';
    if (cashEl)   cashEl.textContent   = move.cashImpact  || '—';
    if (timeEl)   timeEl.textContent   = move.timeframe   || '—';
  }

  function buildModeNBMCopy(mode, g){
    var fmt0 = function(n){ return fmt(n,true); };
    var fcf = g.fcf || 0;
    var totalDebt = (g.ccDebt||0)+(g.carDebt||0)+(g.studentDebt||0)+(g.otherDebt||0);

    if (mode === 'home') {
      var targetPrice  = g.homePrice || g.targetHomePrice || g.purchasePrice || 0;
      var depositSaved = g.depositSaved || g.downPayment || g.savingsAmt || 0;
      var depositNeed  = targetPrice > 0 ? targetPrice * 0.10 : 0;
      var closingEst   = Math.round(targetPrice * 0.03);
      var cashGap      = Math.max(0, depositNeed + closingEst - depositSaved);
      var savingCap    = Math.max(0, Math.round(fcf * 0.50));
      var mo           = savingCap > 0 && cashGap > 0 ? Math.ceil(cashGap / savingCap) : 0;
      var dtiAfter     = g.dtiAfterBuying || g.dti || 0;

      if (dtiAfter > 43) return { eyebrow:'Home readiness move', title:'Reduce debt load before applying', why:'Your DTI after buying would be '+pct(dtiAfter)+' — above the 43% lender threshold. Applications at this ratio face higher rates and potential declines.', action:'Target your highest monthly payment. Even a small paydown shifts the DTI meaningfully.', scoreImpact:6, cashImpact:'Lower rate', timeframe:'1–3 months' };
      if (cashGap > 0 && targetPrice > 0) return { eyebrow:'Home readiness move', title:'Close the cash-to-close gap', why:fmt0(cashGap)+' more needed to cover 10% deposit plus closing costs.', action:'At '+fmt0(savingCap)+'/mo — that\'s '+months(mo)+' away. Automate the transfer — don\'t let it sit as unallocated FCF.', scoreImpact:4, cashImpact:'Readiness unlocked', timeframe:months(mo) };
      if (g.credit && (g.credit === 'poor' || g.credit === 'below')) return { eyebrow:'Home readiness move', title:'Improve credit before applying', why:'A '+g.credit+' credit score adds a significant rate premium. One tier improvement typically saves 0.5–1.2% on your mortgage rate.', action:'Pay card balances below 30% utilisation. Dispute any errors on your credit report.', scoreImpact:5, cashImpact:'Saves monthly', timeframe:'6–12 months' };
      return { eyebrow:'Home readiness move', title:'Get three lender quotes before committing', why:'Your readiness position is solid. Rate variation between lenders on the same day can be 0.3–0.5%.', action:'Pre-approval costs nothing. Three quotes takes 2 hours and can save thousands.', scoreImpact:2, cashImpact:'Rates differ', timeframe:'This week' };
    }

    if (mode === 'debt') {
      var debts = [];
      if ((g.ccDebt||0)>0)      debts.push({ name:'Credit card',   bal:g.ccDebt,     rate:g.ccRate||21 });
      if ((g.carDebt||0)>0)     debts.push({ name:'Car loan',      bal:g.carDebt,    rate:7.5 });
      if ((g.studentDebt||0)>0) debts.push({ name:'Student loan',  bal:g.studentDebt,rate:5.5 });
      if ((g.otherDebt||0)>0)   debts.push({ name:'Other',         bal:g.otherDebt,  rate:9.0 });
      debts.sort(function(a,b){ return b.rate - a.rate; });
      var top = debts[0];
      if (!top) return { eyebrow:'Debt move', title:'No consumer debt recorded', why:'Your consumer debt position is clean.', action:'Redirect free cash flow toward your next financial priority.', scoreImpact:0, cashImpact:'Already free', timeframe:'Now' };
      var extra     = Math.max(0, Math.round(fcf * 0.40));
      var intMo     = Math.round(top.bal * (top.rate/100) / 12);
      var minPmt    = top.name === 'Credit card' ? Math.max(25, Math.round(top.bal*0.02)) : (g.carPayment||300);
      var moToPayoff= (minPmt+extra) > 0 ? Math.ceil(top.bal/(minPmt+extra)) : 0;
      var freed     = minPmt;
      return { eyebrow:'Highest-leverage debt move', title:'Target your '+top.name+' at '+top.rate+'% first', why:'At '+top.rate+'% this balance costs '+fmt(intMo)+'/mo in interest alone — money that does nothing for your position.', action:'Put '+fmt(extra)+'/mo of your FCF here. That clears it in '+months(moToPayoff)+' and permanently frees '+fmt(freed)+'/mo.', scoreImpact:6, cashImpact:fmt(freed)+'/mo freed', timeframe:months(moToPayoff) };
    }

    if (mode === 'grow') {
      var efMonths = parseInt(g.emergency || '0');
      var matchSt  = g.retMatch || 'none';
      if (efMonths < 3) return { eyebrow:'Capital allocation move', title:'Build emergency fund to 3 months before investing', why:'Investing with under 3 months of buffer means any surprise forces you to liquidate. That erases compounding gains and creates a loss cycle.', action:'Direct surplus to a high-yield savings account until you hold '+(3-efMonths)+' more months of expenses.', scoreImpact:7, cashImpact:'Safety first', timeframe:'1–3 months' };
      if (matchSt !== 'none' && matchSt !== 'full' && matchSt !== 'maxed') return { eyebrow:'Capital allocation move', title:'Capture your full employer match first', why:'Employer match is an immediate 50–100% return — no investment vehicle in the market offers that risk-free.', action:'Log into your HR portal and raise your contribution to at least the match threshold. This week.', scoreImpact:5, cashImpact:'Free return', timeframe:'This week' };
      if ((g.ccDebt||0) > 1000) return { eyebrow:'Capital allocation move', title:'Clear credit card debt before investing', why:'Paying '+(g.ccRate||21)+'% guaranteed interest while seeking 7% market returns is a losing trade. The math is unfavorable.', action:'Put investable surplus at your CC balance until it\'s gone. Then redirect to investments.', scoreImpact:5, cashImpact:'Guaranteed return', timeframe:'1–6 months' };
      var investable = Math.max(0, Math.round(fcf * 0.35));
      return { eyebrow:'Capital allocation move', title:'Deploy '+fmt(investable)+'/mo into a low-cost index fund', why:'Your safety base is in place. Consistency now matters more than timing — regular monthly contributions outperform waiting for the "right moment".', action:'Set up a recurring investment on payday. Automate it — no decision needed every month.', scoreImpact:4, cashImpact:'Compounds monthly', timeframe:'This week' };
    }

    if (mode === 'retire') {
      var matchSt = g.retMatch || 'none';
      var income  = g.income || 0;
      var curContrib = income > 0 ? Math.round(income * 0.06 / 12) : 0;
      var r = 0.07/12, n = 30*12;
      var fvIncrease = Math.round(curContrib * 0.5 * ((Math.pow(1+r,n)-1)/r));
      if (matchSt !== 'none' && matchSt !== 'full' && matchSt !== 'maxed') return { eyebrow:'Retirement move', title:'Capture full employer match — immediate future impact', why:'Employer match is the highest-return action available to you. Not capturing it is leaving guaranteed retirement wealth on the table.', action:'Raise your contribution rate to the match threshold today. Small change, permanent compounding benefit.', scoreImpact:5, cashImpact:'+'+fmt(fvIncrease,true)+' projected', timeframe:'This week' };
      if (totalDebt > 5000) {
        var annInt = Math.round((g.ccDebt||0)*(g.ccRate||21)/100 + (g.carDebt||0)*0.075 + (g.studentDebt||0)*0.055);
        var fvDebt = Math.round((annInt/12) * ((Math.pow(1+r,n)-1)/r));
        return { eyebrow:'Retirement move', title:'Clear debt to unlock retirement capacity', why:'You\'re paying '+fmt(annInt,true)+'/yr in interest — capital that could compound instead. Over 30 years that is an estimated '+fmt(fvDebt,true)+' in lost future value.', action:'Prioritise debt elimination as a retirement strategy, not just a cash flow fix. These are the same thing.', scoreImpact:6, cashImpact:'+'+fmt(fvDebt,true)+' projected', timeframe:'6–24 months' };
      }
      var increaseAmt = Math.round(income * 0.01 / 12);
      var fv1Pct = Math.round(increaseAmt * ((Math.pow(1+r,n)-1)/r));
      return { eyebrow:'Retirement move', title:'Add 1% more to contributions — compounding does the rest', why:'A 1% contribution increase on your income adds '+fmt(increaseAmt)+'/mo. At 7%, that small change compounds to approximately '+fmt(fv1Pct,true)+' over 30 years.', action:'Log into your retirement portal and increase your contribution by 1 percentage point. One action, permanent benefit.', scoreImpact:4, cashImpact:'+'+fmt(fv1Pct,true)+' projected', timeframe:'This week' };
    }

    // TODAY — fall back to the existing v21GetRankedMoves logic
    return null;
  }

  /* ═══════════════════════════════════════════════════════
     SECTION 3 — RENDER ORCHESTRATOR
  ═══════════════════════════════════════════════════════ */

  function renderMode(mode){
    if (!G()) return;
    buildStrategyBlock(mode);
    patchNBM(mode);
  }

  function buildStrategyBlock(mode){
    var g = G(); if(!g) return;

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
    } catch(e) { html = ''; }

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
    .tracent-mode-header { }
    .tracent-mode-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px; border-radius: 999px;
      font-size: 11px; font-weight: 700;
      margin-bottom: 14px;
    }
    .tracent-mode-grid-3 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .tracent-mode-cell {
      background: var(--off-white);
      border: 1px solid var(--gray-2);
      border-radius: 14px;
      padding: 12px;
    }
    .tracent-mode-cell-label {
      font-size: 10px; font-weight: 700;
      color: var(--gray-3); text-transform: uppercase;
      letter-spacing: .4px; margin-bottom: 5px;
    }
    .tracent-mode-cell-value {
      font-size: 15px; font-weight: 700; color: var(--navy);
      margin-bottom: 3px; line-height: 1.2;
    }
    .tracent-mode-cell-note {
      font-size: 11px; color: var(--gray-4); line-height: 1.45;
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
    // Determine active mode from rail
    var active = document.querySelector('.v21-mode-btn.active');
    var mode = active ? active.id.replace('mode-btn-','') : 'today';
    try { renderMode(mode); } catch(e) {}
  };

  window.v21RenderPostAnalysis = window.v21RenderPostAnalysis;
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
  function fmt(n,c){var v=Number(n||0),a=Math.abs(Math.round(v)),s=v<0?'-$':'$';if(c&&a>=1e6)return s+(a/1e6).toFixed(1)+'M';if(c&&a>=1e3)return s+(a/1e3).toFixed(1)+'k';return s+a.toLocaleString();}
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
      var ds = gv.depositSaved||gv.downPayment||gv.savingsAmt||0;
      return tp>0 ? Math.min(100,Math.round((ds/(tp*0.10))*100)) : 0;
    })();

    /* Headline logic */
    var headline, sub;
    if(fcf < 0){
      headline = 'Your spending is outpacing your income right now';
      sub = 'That\u2019s the single most important thing to address \u2014 everything else depends on fixing this first.';
    } else if(ccDebt > 5000 || (totDebt > 0 && (totDebt/(gv.takeHome||1)) > 0.5)){
      headline = 'You\u2019re carrying more financial pressure than you should';
      sub = 'Here\u2019s what\u2019s shaping this right now \u2014 and what to do next.';
    } else if(intent === 'home' && depPct < 70){
      headline = 'You\u2019re on your way \u2014 but not quite ready yet';
      sub = 'Here\u2019s what\u2019s shaping your readiness \u2014 and the fastest path to change it.';
    } else if(score < 55){
      headline = 'Your foundation needs attention \u2014 let\u2019s fix the biggest lever first';
      sub = 'Here\u2019s what\u2019s shaping this right now \u2014 and what to do next.';
    } else if(score < 70){
      headline = 'You\u2019re in a stable position with room to improve';
      sub = 'Here\u2019s what\u2019s shaping this right now \u2014 and what to do next.';
    } else if(score < 85){
      headline = 'You\u2019re in a strong position \u2014 now it\u2019s about optimisation';
      sub = 'The foundation is solid. Here\u2019s where the biggest gains still are.';
    } else {
      headline = 'You\u2019re in an excellent position \u2014 protect and compound';
      sub = 'Here\u2019s what\u2019s keeping you here \u2014 and how to stay on trajectory.';
    }

    var el = document.getElementById('v21-verdict-block');
    if(!el) return;
    el.innerHTML =
      '<div class="v21-verdict-inner tdp-fade-item">' +
        '<div class="v21-verdict-headline" id="v21-verdict-headline">' + headline + '</div>' +
        '<div class="v21-verdict-sub">' + sub + '</div>' +
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

    // Insert meta bar after existing content
    var existing = host.querySelector('.tracent-soft-note');
    if(!existing||host.querySelector('.v21-auth-meta-bar')) return; // already enhanced

    var meta = document.createElement('div');
    meta.className = 'v21-auth-meta-bar';
    meta.innerHTML =
      '<div class="v21-auth-meta-row">' +
        '<span class="v21-auth-meta-chip" style="border-color:'+confColor+';color:'+confColor+'">'+
          'Confidence: '+confidence+
        '</span>' +
        '<span class="v21-auth-meta-chip">~'+inputCount+' inputs · '+inferredCount+' estimated</span>' +
        '<span class="v21-auth-meta-chip">Updated: '+updated+'</span>' +
      '</div>' +
      '<div class="v21-auth-refine-note">This is based on your inputs \u2014 refine anytime to improve accuracy.</div>';
    host.appendChild(meta);
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
    'v21-verdict-block',
    'v21-compact-score',
    'v21-authority-card',
    'v21-nbm-card',
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

  /* ── WIRE INTO v21RenderPostAnalysis ───────────────────── */
  var _prevRPA = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function(){
    if(typeof _prevRPA === 'function') _prevRPA();

    // Build/update dashboard components
    try { buildVerdict();         } catch(e) {}
    try { buildCompactScore();    } catch(e) {}
    try { enhanceAuthorityCard(); } catch(e) {}
    try { relocateModeRail();     } catch(e) {}
    try { syncRailClone();        } catch(e) {}
    try { elevateNBM();           } catch(e) {}
    try { compactScoreRing();     } catch(e) {}

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
    /* ── Verdict block ── */
    '#v21-verdict-block { margin-bottom: 4px; }',
    '.v21-verdict-inner {',
    '  padding: 20px 20px 18px;',
    '  border-bottom: 1px solid rgba(255,255,255,0.08);',
    '}',
    '.v21-verdict-headline {',
    '  font-family: var(--font-display);',
    '  font-size: 24px;',
    '  font-weight: 600;',
    '  color: var(--white);',
    '  line-height: 1.25;',
    '  letter-spacing: -0.3px;',
    '  margin-bottom: 10px;',
    '}',
    '.v21-verdict-sub {',
    '  font-size: 14px;',
    '  color: rgba(255,255,255,0.60);',
    '  line-height: 1.6;',
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
    /* ── Reduce existing score ring dominance ── */
    '.v21-score-compact .score-ring-area { margin-bottom: 6px !important; }',
    '.v21-score-compact .score-ring-wrap { width: 72px !important; height: 72px !important; }',
    '.v21-score-compact .score-ring-svg  { width: 72px !important; height: 72px !important; }',
    '.v21-score-compact .score-ring-num  { font-size: 22px !important; }',
    '.v21-score-compact .score-title     { font-size: 17px !important; }',
    '.v21-score-compact                  { padding-bottom: 8px !important; }',
    /* Hide original score hero when compact score row is showing */
    '#v21-compact-score[style*="block"] ~ .score-hero-wrap,',
    '#tab-home:has(#v21-compact-score[style*="block"]) #score-hero-wrap { display: none !important; }',
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
      var btn = document.querySelector('.v21-mode-btn.active');
      return btn ? btn.id.replace('mode-btn-','') : (gv.primaryIntent || 'today');
    })();
    var income    = gv.income    || 0;
    var takeHome  = gv.takeHome  || (income ? Math.round(income/12*0.72) : 0);
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
    var efMonths  = parseInt(gv.emergency||'0');
    var efTarget  = 3;
    var ccDebt    = gv.ccDebt||0;
    var ccRate    = gv.ccRate||21;
    var carDebt   = gv.carDebt||0;
    var studDebt  = gv.studentDebt||0;
    var othDebt   = gv.otherDebt||0;
    var dti       = gv.dti!=null ? gv.dti : (takeHome>0?Math.round((minPmts/takeHome)*100):0);
    var homePrice = gv.homePrice||gv.targetHomePrice||gv.purchasePrice||0;
    var depSaved  = gv.depositSaved||gv.downPayment||gv.savingsAmt||0;
    var depNeed   = homePrice>0 ? homePrice*0.10 : 0;
    var closingEst= homePrice>0 ? Math.round(homePrice*0.03) : 0;
    var depositGap= Math.max(0, depNeed+closingEst-depSaved);
    var saveCap   = Math.max(0, Math.round(fcf*0.50));
    var retMatch  = gv.retMatch||'unknown';
    var matchMissed = retMatch!=='full'&&retMatch!=='maxed'&&retMatch!=='none';
    var completeness = Number(gv.profileCompleteness||0);
    var inferred  = Array.isArray(gv._inferredFields)?gv._inferredFields.length:0;
    var confidence= completeness>=80&&inferred===0?'high':completeness>=60&&inferred<=2?'medium':'low';
    return {
      active:active,income:income,takeHome:takeHome,fixedSpend:fixedSpend,fcf:fcf,efMonths:efMonths,efTarget:efTarget,
      ccDebt:ccDebt,ccRate:ccRate,carDebt:carDebt,studDebt:studDebt,othDebt:othDebt,totalDebt:totalDebt,minPmts:minPmts,dti:dti,
      homePrice:homePrice,depSaved:depSaved,depNeed:depNeed,closingEst:closingEst,depositGap:depositGap,saveCap:saveCap,
      retMatch:retMatch,matchMissed:matchMissed,
      score:gv.score||55,intent:gv.primaryIntent||'stable',
      completeness:completeness,inferred:inferred,confidence:confidence
    };
  }

  /* ═══════════════════════════════════════════════════════
     2. CANDIDATE POOL
  ═══════════════════════════════════════════════════════ */
  function buildCandidates(s){
    var c=[];
    var fmt=function(n){ return '$'+Math.round(Math.abs(n)).toLocaleString(); };
    var mos=function(n){ return n<12?n+'mo':(n/12).toFixed(1)+'yr'; };

    /* SAFETY: deficit */
    if(s.fcf<0){
      c.push({id:'deficit',
        title:'Close the monthly deficit — spending exceeds income by '+fmt(-s.fcf),
        why:'You are currently spending more than you earn. Every other financial goal is impossible until this gap closes.',
        action:'List every fixed obligation. Find the single highest non-essential cost and reduce or eliminate it this week. Even '+fmt(Math.round(-s.fcf*0.5))+'/mo improvement changes the trajectory.',
        impact:'Stops the bleed; unlocks all downstream actions',timing:'This week',
        confidenceNote:'Calculated from your inputs — verify with actual bank statements.',
        scoreImpact:10,cashImpact:'+'+fmt(-s.fcf)+'/mo',timeToStart:'This week',
        category:'safety',
        scores:{urgency:10,impact:10,feasibility:6,confidence:8,modeAlignment:10}
      });
    }

    /* SAFETY: zero EF */
    if(s.efMonths===0&&s.fcf>=0){
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

    /* SAFETY: low EF */
    if(s.efMonths>0&&s.efMonths<s.efTarget&&s.fcf>0){
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
        impact:'Unlocks lender qualification; improves credit profile',timing:'1–3 months',
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
        why:'Your car loan is your highest remaining debt. At ~7.5% it costs '+fmt(carInt)+'/mo in interest on a depreciating asset.',
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
        why:'You need '+fmt(s.depositGap)+' more to cover 10% deposit and closing costs on your '+fmt(s.homePrice)+' target. At your current saving rate, that\'s '+mos(moToClose)+' away.',
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
        title:'Reduce DTI from '+s.dti+'% to under 36% before applying — unlocks better rate tier',
        why:'You qualify at 43% DTI, but the best mortgage rates are reserved for borrowers under 36%. One extra debt payoff before application changes the rate you get.',
        action:'Identify your smallest remaining debt by balance. Pay it off in full before submitting a mortgage application. The freed minimum payment improves your DTI immediately.',
        impact:'Better rate tier; stronger application',timing:'Before application',
        confidenceNote:'Rate impact varies by lender. Get quotes at both DTI levels to quantify.',
        scoreImpact:4,cashImpact:'Better rate',timeToStart:'1–2 months',
        category:'home',
        scores:{urgency:6,impact:7,feasibility:7,confidence:7,modeAlignment:s.active==='home'?10:4}
      });
    }

    /* HOME: missing target price */
    if(s.homePrice===0&&s.intent==='home'){
      c.push({id:'home_research',
        title:'Enter a target home price to unlock your readiness numbers',
        why:'Without a target price, Tracent cannot calculate your deposit gap, DTI after buying, or monthly payment. All home readiness metrics depend on this single number.',
        action:'Go to Settings and enter a realistic target price for your area. Use current listing prices, not aspirational ones. Update it as the market moves.',
        impact:'Unlocks deposit gap, DTI projection, and readiness score',timing:'Today',
        confidenceNote:'Any estimate is better than none — refine it as you research.',
        scoreImpact:3,cashImpact:'Unlocks analysis',timeToStart:'Today',
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

    /* RETIRE: increase contribution */
    if(s.income>0&&s.efMonths>=2){
      var curAmt=Math.round(s.income*0.06/12);
      var idealAmt=Math.round(s.income*0.15/12);
      var gap=Math.max(0,idealAmt-curAmt);
      if(gap>0){
        var r=0.07/12,n=30*12;
        var fvGap=Math.round(gap*((Math.pow(1+r,n)-1)/r));
        c.push({id:'retire_contrib',
          title:'Increase retirement contribution by 1% — worth ~'+fmt(fvGap)+' over 30 years',
          why:'You are contributing at an estimated 6% rate. Reaching 15% requires incremental increases. A single 1% raise today compounds for decades.',
          action:'Log into your retirement account portal. Raise your contribution by exactly 1 percentage point. This takes 5 minutes. Set a calendar reminder to raise it again in 6 months.',
          impact:'~'+fmt(fvGap)+' additional projected value at 7% average over 30 years',timing:'This week',
          confidenceNote:'Projection uses 7% average return — actual returns vary. This is illustrative, not a guarantee.',
          scoreImpact:5,cashImpact:fmt(gap)+'/mo more invested',timeToStart:'This week',
          category:'retire',
          scores:{urgency:5,impact:8,feasibility:9,confidence:6,modeAlignment:s.active==='retire'?10:5}
        });
      }
    }

    /* STABLE: subscription audit */
    if(s.score>=70&&s.ccDebt===0&&s.efMonths>=s.efTarget){
      c.push({id:'optimize_fcf',
        title:'Audit recurring subscriptions — recover '+fmt(Math.round(s.fcf*0.08))+'/mo to redirect',
        why:'Your position is strong. Most people overpay on subscriptions, insurance, and utilities by 5–10% of take-home. That money redeploys more productively elsewhere.',
        action:'Pull your last two bank statements. Highlight every recurring charge under $30. Cancel any you have not actively used in 30 days. Redirect what you save to your primary goal.',
        impact:'Frees '+fmt(Math.round(s.fcf*0.08))+'/mo to deploy intentionally',timing:'This week',
        confidenceNote:'Estimate based on 8% of FCF — actual recovery depends on your subscription mix.',
        scoreImpact:2,cashImpact:'+'+fmt(Math.round(s.fcf*0.08))+'/mo',timeToStart:'This week',
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
    var raw=sc.urgency*0.30+sc.impact*0.30+sc.feasibility*0.20+sc.confidence*0.10+(sc.modeAlignment+modeBoost)*0.10;
    var confMult=s.confidence==='high'?1:s.confidence==='medium'?0.92:0.82;
    return raw*confMult;
  }

  function applySafetyFilters(candidates,s){
    var criticalEF=s.efMonths<1;
    var highDebt=s.totalDebt>5000;
    var severeCC=s.ccDebt>8000;
    var tightCash=s.fcf<200;
    var nearZero=s.fcf<50;
    return candidates.filter(function(c){
      if(criticalEF&&highDebt&&(c.id==='invest_surplus'||c.id==='optimize_fcf')) return false;
      if(severeCC&&(c.id==='home_deposit'||c.id==='home_dti_prep')) return false;
      if(tightCash&&(c.id==='retire_contrib'||c.id==='invest_surplus')) return false;
      if(nearZero&&c.id!=='deficit'&&c.id!=='ef_zero') return false;
      return true;
    });
  }

  function rankCandidates(candidates,s){
    return candidates
      .map(function(c){ return {c:c,score:scoreCandidate(c,s)}; })
      .sort(function(a,b){ return b.score-a.score; })
      .map(function(item){ return item.c; });
  }

  /* ═══════════════════════════════════════════════════════
     4. PUBLIC: replaces v21GetRankedMoves
  ═══════════════════════════════════════════════════════ */
  function getEngineRankedMoves(){
    if(typeof G==='undefined'||!G.scoreFinal) return [_fallback()];
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
      title:'Keep reviewing your position monthly',
      why:'Your score is solid — small consistent improvements compound over time.',
      action:'Check in weekly and update your numbers when anything changes.',
      impact:'Steady progress',timing:'Weekly',
      confidenceNote:'Run a full analysis to unlock specific recommendations.',
      scoreImpact:1,cashImpact:'Steady',timeToStart:'Weekly',
      category:'safety',scores:{urgency:1,impact:1,feasibility:10,confidence:8,modeAlignment:5},
      _alternatives:[],_rankingReason:'No specific high-priority actions identified for current position.'
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

  /* ═══════════════════════════════════════════════════════
     5. UPDATED RENDER FUNCTION
  ═══════════════════════════════════════════════════════ */
  window.v21RenderNBMCard = function(){
    var card=document.getElementById('v21-nbm-card');
    if(!card||typeof G==='undefined'||!G.score||!G.scoreFinal) return;
    var moves=window.v21GetRankedMoves();
    var idx=Math.min(window._v21MoveIndex||0,moves.length-1);
    var move=moves[idx]||moves[0];
    var f=function(id){ return document.getElementById(id); };
    if(f('v21-nbm-title'))      f('v21-nbm-title').textContent      = move.title;
    if(f('v21-nbm-why'))        f('v21-nbm-why').textContent        = move.why||'';
    if(f('v21-nbm-desc'))       f('v21-nbm-desc').textContent       = move.action||'';
    if(f('v21-nbm-impact'))     f('v21-nbm-impact').textContent     = move.scoreImpact>0?'+'+move.scoreImpact:String(move.scoreImpact||'—');
    if(f('v21-nbm-cash'))       f('v21-nbm-cash').textContent       = move.cashImpact||'—';
    if(f('v21-nbm-time'))       f('v21-nbm-time').textContent       = move.timeToStart||move.timing||'—';
    if(f('v21-nbm-confidence')) f('v21-nbm-confidence').textContent = move.confidenceNote||'';
    var whyBtn=f('v21-nbm-why-btn');
    if(whyBtn) whyBtn.style.display=(move._rankingReason||(move._alternatives&&move._alternatives.length))?'inline-flex':'none';
    _populateDisclosure(move);
    var easierBtn=f('v21-nbm-easier-btn');
    if(easierBtn) easierBtn.style.display=moves.length>1?'inline-flex':'none';
    card.style.display='block';
    try { tracentTrack('nbm_shown',{moveTitle:move.title,moveId:move.id||'engine'}); pbfdeState.nbmViewCount++; } catch(e){}
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
  var style=document.createElement('style');
  style.textContent=[
    '.v21-nbm-why{font-size:14px;color:rgba(255,255,255,0.80);line-height:1.6;margin-bottom:10px;}',
    '.v21-nbm-action-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.35);margin-bottom:4px;}',
    '.v21-nbm-confidence{font-size:11px;color:rgba(255,255,255,0.38);line-height:1.5;margin-top:10px;margin-bottom:4px;font-style:italic;}',
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
  function fmt(n){ return '$'+Math.round(Math.abs(n||0)).toLocaleString(); }
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
    var ts = g.lastComputedAt||Date.now();
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
    } else if(parseInt(g.emergency||'0')<3){
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
    if(!g.score||!g.scoreFinal) return;

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
  var fmtMoney = function(n){ return '$'+Math.round(Math.abs(n||0)).toLocaleString(); };
  var el = document.getElementById('bse-focus-mode');
  if (!el) return;
  var BSE = window.BSE || {};
  var g = window.G || {};
  var fcf = g.fcf||0, efMo = parseInt(g.emergency||'0'), cc = g.ccDebt||0;
  var dti = g.dti||0, score = g.score||0, at = BSE.archetype;

  /* One primary action */
  var action, why, proof, ctaFn, ctaLabel;
  if (fcf < 0) {
    action = 'Find one expense to reduce this week';
    why = 'Your spending is outpacing your income. Everything else depends on fixing this first.';
    proof = 'Even a small reduction creates real forward movement.';
    ctaLabel = 'Show me where \u2192'; ctaFn = 'bseOpenPlan()';
  } else if (efMo === 0) {
    var tgt = Math.max(100, Math.round(fcf * 0.3));
    action = 'Set aside ' + fmtMoney(tgt) + ' this month as an emergency start';
    why = 'No emergency buffer means one unexpected event becomes a financial crisis. This one step protects you.';
    proof = 'Even ' + fmtMoney(500) + ' changes your risk profile meaningfully.';
    ctaLabel = 'How to start \u2192'; ctaFn = 'bseOpenPlan()';
  } else if (cc > 3000) {
    var extra = Math.max(25, Math.round(Math.min(fcf * 0.25, 200)));
    action = 'Add ' + fmtMoney(extra) + '/mo to your credit card payment';
    why = 'Your card balance costs real money every month in interest. This is the highest-return action available right now.';
    proof = 'This saves hundreds in total interest.';
    ctaLabel = 'See the debt plan \u2192'; ctaFn = "switchTab('debtrank')";
  } else if (dti > 43) {
    action = 'Direct extra payments to your highest monthly debt payment';
    why = 'Your debt-to-income ratio is above the lender threshold. Reducing it keeps your financial options open.';
    proof = 'One payment reduced shifts your DTI faster than any other single move.';
    ctaLabel = 'See debt plan \u2192'; ctaFn = "switchTab('debtrank')";
  } else {
    try {
      var moves = window.v21GetRankedMoves ? window.v21GetRankedMoves() : [];
      if (moves && moves[0]) { action = moves[0].action || moves[0].title; why = moves[0].why || ''; proof = moves[0].confidenceNote || ''; }
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
        ctaLabel = 'See retirement plan \u2192'; ctaFn = "showProgressSub('retirement')";
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

  if (!BSE.showScore) {
    dh.classList.add('bse-score-hidden');
    if (sz)    sz.style.display    = 'none';
    if (strip) strip.style.display = 'none';
  } else if (!BSE.scoreProminent) {
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
    if (sz)    sz.style.display    = 'flex';
    if (strip) strip.style.display = '';
    /* Trigger score ring draw animation */
    var ring = document.querySelector('.score-ring-bg');
    if (ring && !ring.classList.contains('score-ring-animated')) {
      var score = (window.G || {}).score || 0;
      var offset = Math.round(283 - (283 * score / 100));
      ring.style.setProperty('--ring-offset', offset);
      ring.classList.add('score-ring-animated');
    }
  }
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
  if (rc) rc.style.display = (!BSE.focusOnly && show.verdictBlock) ? '' : 'none';
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
