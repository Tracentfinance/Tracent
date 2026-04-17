/* ═══ Tracent Render: Retirement ═══
   Mode routing (retirement sub-view, today/home context),
   retirement mode (career benchmarks, salary projections, BLS data).
═══════════════════════════════════════════════ */

/* ═══ MODULE: Mode Routing — retirement sub, today/home context ═══ */
/* ── Mode Routing Pass ──────────────────────────────────────
   1. Injects prog-sub-retirement HTML into #tab-progress
   2. Provides _renderRetirementSub() rendering function
   3. Provides v21SetDashboardContext() for Today vs Home differentiation
   4. Mode-aware subnav: surfaces Retirement, dims Career in retire mode
   No redesign — routing truth only.
─────────────────────────────────────────────────────────── */
(function(){
  if (window.__TRACENT_MODE_ROUTING__) return;
  window.__TRACENT_MODE_ROUTING__ = true;

  /* ── helpers ─────────────────────────────────────────── */
  function fmt(n){ return '$'+Math.round(Math.abs(n||0)).toLocaleString('en-US'); }
  function pct(n){ return n==null?'—':Math.round(n)+'%'; }
  function gv()  { return window.G || {}; }

  /* ═══════════════════════════════════════════════════════
     1. INJECT RETIREMENT SUBVIEW HTML
  ═══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function(){
    injectRetirementPanel();
    injectRetirementSubnav();
  });

  function injectRetirementPanel(){
    if (document.getElementById('prog-sub-retirement')) return;
    var goalsPanel = document.getElementById('prog-sub-goals');
    if (!goalsPanel) return;
    var panel = document.createElement('div');
    panel.id    = 'prog-sub-retirement';
    panel.style.display = 'none';
    panel.innerHTML = [
      '<div class="ret-hero">',
        '<div class="ret-hero-inner">',
          '<div class="ret-hero-label" id="ret-hero-label">Retirement trajectory</div>',
          '<div class="ret-hero-val" id="ret-proj-val">—</div>',
          '<div class="ret-hero-sub" id="ret-proj-sub">Estimated 30-yr projection at 7% avg</div>',
        '</div>',
      '</div>',
      '<div class="card" style="margin-bottom:var(--s2);">',
        '<div class="card-body">',
          '<div class="card-eyebrow navy" style="margin-bottom:10px;">Contribution position</div>',
          '<div class="metric-grid-2" id="ret-contrib-grid"></div>',
        '</div>',
      '</div>',
      '<div class="card" style="margin-bottom:var(--s2);" id="ret-debt-drag-card">',
        '<div class="card-body">',
          '<div class="card-eyebrow navy" style="margin-bottom:8px;">Debt drag on future value</div>',
          '<div style="font-size:13px;color:var(--gray-4);line-height:1.6;" id="ret-debt-drag-text">—</div>',
        '</div>',
      '</div>',
      '<div class="card" style="margin-bottom:var(--s2);">',
        '<div class="card-body">',
          '<div class="card-eyebrow navy" style="margin-bottom:8px;">What matters most now</div>',
          '<div style="font-size:13px;color:var(--navy);line-height:1.65;font-weight:600;" id="ret-priority-text">—</div>',
        '</div>',
      '</div>',
    ].join('');
    goalsPanel.parentNode.insertBefore(panel, goalsPanel);
  }

  function injectRetirementSubnav(){
    // Ensure Retirement pill exists (HTML may already have been updated)
    if (document.getElementById('ppill-retirement')) return;
    var careerPill = document.getElementById('ppill-career');
    if (!careerPill) return;
    var retPill = document.createElement('button');
    retPill.className = 'prog-pill';
    retPill.id = 'ppill-retirement';
    retPill.textContent = 'Retirement';
    retPill.onclick = function(){ window.showProgressSub('retirement'); };
    careerPill.parentNode.insertBefore(retPill, careerPill);
  }

  /* ═══════════════════════════════════════════════════════
     2. RETIREMENT SUBVIEW RENDERER
  ═══════════════════════════════════════════════════════ */
  window._renderRetirementSub = function(){
    var g = gv();
    if (!g.score && !g.income) {
      var v = document.getElementById('ret-proj-val');
      if (v) v.textContent = '—';
      return;
    }

    /* ── Life stage detection — explicit user state overrides BSE inference ── */
    var bse = window.BSE || {};
    var isInRetirement  = (g.retirementStage === 'retired')       || (!g.retirementStage && bse.archetype === 'in_retirement');
    var isPreRetirement = (g.retirementStage === 'near_retirement') || (!g.retirementStage && !isInRetirement && bse.archetype === 'pre_retirement');

    var income       = g.income || 0;
    var takeHome     = g.takeHome || (function(){if(!income)return 0;var s=(window.STATE_TAX&&document.getElementById('state'))?((window.STATE_TAX)[document.getElementById('state').value]||0):0,f=income<=11600?income*0.10:income<=47150?1160+(income-11600)*0.12:income<=100525?5426+(income-47150)*0.22:income<=191950?17169+(income-100525)*0.24:39111+(income-191950)*0.32;f=Math.max(0,f-14600*0.12);var c=Math.min(income,168600)*0.062+income*0.0145;return Math.round(Math.max(income*0.5,income-f-c-income*s)/12)})();
    var efMonths     = parseInt(g.emergency||'0');
    var totalDebt    = (g.ccDebt||0)+(g.carDebt||0)+(g.studentDebt||0)+(g.otherDebt||0);
    var annInt       = Math.round((g.ccDebt||0)*(g.ccRate||21)/100 +
                                  (g.carDebt||0)*0.075 +
                                  (g.studentDebt||0)*0.055 +
                                  (g.otherDebt||0)*0.09);
    var retMatch     = g.retMatch || 'unknown';
    var matchCapture = retMatch === 'full' || retMatch === 'maxed';

    // ── Shared projection validity gate ─────────────────────────────────────
    // Income alone does NOT qualify. Requires explicit retirement-specific inputs.
    var hasProjectionData = (g.retireSavings > 0) || (g.retirementSavings > 0)
      || (g.savingsAmt > 0) || (g.depositSaved > 0)
      || (g.pensionIncome > 0);

    // FV helper — defined always (cheap); actual math only runs when gate passes
    var _retAge = g.retirementAge || 65;
    var _curAge = g.age || 35;
    var _yrs    = Math.max(10, _retAge - _curAge);
    var _fv     = function(mo){ var r=0.07/12,n=_yrs*12; return Math.round(mo*((Math.pow(1+r,n)-1)/r)); };

    // Debt drag from real debt inputs (not a fabricated projection — no gate needed)
    var fvDebtDrag = annInt > 0 ? _fv(Math.round(annInt/12)) : 0;

    // Accumulation projections — only computed when projection gate passes
    var fvCurrent = 0, fvIdeal = 0;
    if (hasProjectionData && !isInRetirement) {
      // Compound the existing retirement savings forward — this is the starting balance,
      // not a contribution stream. Missing it was causing $2M+ portfolios to show ~$0-base projections.
      var _portfolio   = g.retirementSavings || 0;
      var _portfolioFV = _portfolio > 0 ? Math.round(_portfolio * Math.pow(1.07, _yrs)) : 0;
      var curMoContrib   = income > 0 ? Math.round(income * 0.06 / 12) : 0;
      var idealMoContrib = income > 0 ? Math.round(income * 0.15 / 12) : 0;
      fvCurrent = _portfolioFV + _fv(curMoContrib);
      fvIdeal   = _portfolioFV + _fv(idealMoContrib);
    }

    var trajLabel, trajColor;
    if (isInRetirement) {
      /* In-retirement: focus on sustainability, not growth trajectory */
      trajLabel = totalDebt===0 ? 'Stable' : 'Debt present — review';
      trajColor = totalDebt===0 ? 'var(--green)' : 'var(--amber)';
    } else {
      trajLabel = matchCapture && totalDebt===0 ? 'On track'
                : matchCapture ? 'Debt drag present'
                : 'Below ideal pace';
      trajColor = matchCapture && totalDebt===0 ? 'var(--green)'
                : matchCapture ? 'var(--amber)' : 'var(--red)';
    }

    // Projection hero — adapted by life stage
    var projEl  = document.getElementById('ret-proj-val');
    var projSub = document.getElementById('ret-proj-sub');
    var heroLabel = document.getElementById('ret-hero-label');
    if (isInRetirement) {
      if (heroLabel) heroLabel.textContent = 'Retirement stability';
      if (projEl)  { projEl.textContent = trajLabel; projEl.style.color = trajColor; projEl.style.fontSize = '28px'; }
      if (projSub) projSub.textContent = 'Your focus now: income clarity, drawdown awareness, and confidence.';
    } else {
      if (heroLabel) heroLabel.textContent = 'Retirement trajectory';
      if (hasProjectionData) {
        if (projEl)  { projEl.textContent = fmt(fvCurrent); projEl.style.color = trajColor; projEl.style.fontSize = ''; }
        if (projSub) projSub.textContent = 'Illustrative estimate \u00b7 7% avg \u00b7 '+_yrs+' years';
      } else {
        if (projEl)  { projEl.textContent = '\u2014'; projEl.style.color = ''; projEl.style.fontSize = ''; }
        if (projSub) projSub.textContent = 'Add your retirement details to see a real projection';
      }
    }

    // Contribution grid — life-stage aware
    var grid = document.getElementById('ret-contrib-grid');
    if (grid) {
      if (isInRetirement) {
        /* In-retirement: show stability metrics, not accumulation */
        var monthlyIncome = takeHome || (function(){if(!income)return 0;var s=(window.STATE_TAX&&document.getElementById('state'))?((window.STATE_TAX)[document.getElementById('state').value]||0):0,f=income<=11600?income*0.10:income<=47150?1160+(income-11600)*0.12:income<=100525?5426+(income-47150)*0.22:income<=191950?17169+(income-100525)*0.24:39111+(income-191950)*0.32;f=Math.max(0,f-14600*0.12);var c=Math.min(income,168600)*0.062+income*0.0145;return Math.round(Math.max(income*0.5,income-f-c-income*s)/12)})();
        var monthlyDebtPmt = totalDebt > 0 ? Math.round(totalDebt * 0.02) : 0;
        var netDisposable = monthlyIncome - monthlyDebtPmt;
        grid.innerHTML = [
          '<div class="metric-cell">',
            '<div class="metric-cell-lbl">Monthly income</div>',
            '<div class="metric-cell-val" style="color:var(--green)">'+fmt(monthlyIncome)+'</div>',
            '<div class="metric-cell-sub">After-tax (estimated)</div>',
          '</div>',
          '<div class="metric-cell">',
            '<div class="metric-cell-lbl">Status</div>',
            '<div class="metric-cell-val" style="color:'+trajColor+'">'+trajLabel+'</div>',
            '<div class="metric-cell-sub">Overall position</div>',
          '</div>',
          '<div class="metric-cell">',
            '<div class="metric-cell-lbl">Emergency buffer</div>',
            '<div class="metric-cell-val">'+(efMonths||0)+' mo</div>',
            '<div class="metric-cell-sub">'+(efMonths>=6?'Strong':'Build to 6+ months')+'</div>',
          '</div>',
          '<div class="metric-cell">',
            '<div class="metric-cell-lbl">Debt obligations</div>',
            '<div class="metric-cell-val" style="color:'+(totalDebt>0?'var(--amber)':'var(--green)')+'">'+fmt(monthlyDebtPmt)+'/mo</div>',
            '<div class="metric-cell-sub">'+(totalDebt>0?fmt(totalDebt)+' remaining':'Debt-free')+'</div>',
          '</div>',
        ].join('');
      } else {
        /* Pre-retirement and standard: show accumulation trajectory */
        grid.innerHTML = [
          '<div class="metric-cell">',
            '<div class="metric-cell-lbl">Employer match</div>',
            '<div class="metric-cell-val" style="color:'+(matchCapture?'var(--green)':'var(--amber)')+'">'+retMatch+'</div>',
            '<div class="metric-cell-sub">'+(matchCapture?'Fully captured':'Check HR portal')+'</div>',
          '</div>',
          '<div class="metric-cell">',
            '<div class="metric-cell-lbl">Trajectory</div>',
            '<div class="metric-cell-val" style="color:'+trajColor+'">'+trajLabel+'</div>',
            '<div class="metric-cell-sub">vs 15% ideal pace</div>',
          '</div>',
          '<div class="metric-cell">',
            '<div class="metric-cell-lbl">At current rate</div>',
            '<div class="metric-cell-val">'+(hasProjectionData ? fmt(fvCurrent) : '\u2014')+'</div>',
            '<div class="metric-cell-sub">'+(hasProjectionData ? 'Illustrative \u00b7 '+(isPreRetirement?'at retirement':_yrs+'-yr') : 'Add retirement details')+'</div>',
          '</div>',
          '<div class="metric-cell">',
            '<div class="metric-cell-lbl">At 15% rate</div>',
            '<div class="metric-cell-val">'+(hasProjectionData ? fmt(fvIdeal) : '\u2014')+'</div>',
            '<div class="metric-cell-sub">'+(hasProjectionData ? 'Illustrative \u00b7 '+(isPreRetirement?'if you increase now':'30-yr') : 'Add retirement details')+'</div>',
          '</div>',
        ].join('');
      }
    }

    // Debt drag — life-stage adapted
    var dragCard = document.getElementById('ret-debt-drag-card');
    var dragText = document.getElementById('ret-debt-drag-text');
    if (dragCard) dragCard.style.display = annInt>500 ? 'block' : 'none';
    if (dragText && annInt>500) {
      if (isInRetirement) {
        dragText.textContent = 'Your debt costs '+fmt(annInt)+'/yr in interest. In retirement, this directly reduces your available income. Clearing it improves your monthly cash position by '+fmt(Math.round(annInt/12))+'.';
      } else if (hasProjectionData) {
        dragText.textContent = 'Your debt costs '+fmt(annInt)+'/yr in interest. That same capital invested monthly would compound to approximately '+fmt(fvDebtDrag)+' over 30 years. Every year of debt held is retirement wealth foregone.';
      } else {
        dragText.textContent = 'Your debt costs '+fmt(annInt)+'/yr in interest. Clearing it before retirement frees cash flow and reduces financial pressure.';
      }
    }

    // Priority — life-stage aware
    var priText = document.getElementById('ret-priority-text');
    if (priText) {
      if (isInRetirement) {
        /* In-retirement priorities: stability, safety, sustainability */
        if (totalDebt > 0) {
          priText.textContent = 'Reducing remaining debt protects your income stability. At '+fmt(annInt)+'/yr in interest, clearing this frees cash flow you can rely on.';
        } else if (efMonths < 6) {
          priText.textContent = 'Maintain at least 6 months of living expenses in liquid savings. This is your buffer against unexpected costs without disrupting investments.';
        } else {
          priText.textContent = 'Your position is stable. The most important thing now is to avoid unnecessary risk and let your plan continue working for you.';
        }
      } else if (isPreRetirement) {
        /* Pre-retirement priorities: readiness, gap, timeline */
        if (!matchCapture && retMatch!=='none' && retMatch!=='unknown') {
          priText.textContent = 'Capture your full employer match before retirement. It\u2019s an immediate 50\u2013100% guaranteed return \u2014 no investment beats it.';
        } else if (annInt > 500) {
          priText.textContent = 'Clear high-rate debt before retirement to maximise your income in retirement. At '+fmt(annInt)+'/yr in interest, this is the highest-leverage move.';
        } else {
          priText.textContent = 'You\u2019re in the final stretch. Maximise contributions and avoid taking on new debt. Every dollar saved now works hardest.';
        }
      } else {
        if (!matchCapture && retMatch!=='none' && retMatch!=='unknown') {
          priText.textContent = 'Capture your full employer match. It\u2019s an immediate 50\u2013100% guaranteed return \u2014 no investment beats it.';
        } else if (annInt > 500) {
          priText.textContent = 'Clear high-rate debt to free capital for compounding. At '+fmt(annInt)+'/yr in interest, your retirement funding is competing with the cost of existing debt.';
        } else if (efMonths < 2) {
          priText.textContent = 'Build a 2-month emergency buffer before increasing retirement contributions. An unexpected expense without a buffer forces liquidation.';
        } else {
          priText.textContent = 'Consistency matters most now. Raise contributions by 1% per year and avoid disrupting compounding for short-term needs.';
        }
      }
    }
  };

  /* ═══════════════════════════════════════════════════════
     3. TODAY vs HOME DASHBOARD CONTEXT
     Sets a visible mode-context indicator on the home tab
     so Today and Home feel architecturally distinct.
  ═══════════════════════════════════════════════════════ */
  window.v21SetDashboardContext = function(mode){
    var indicator = document.getElementById('v21-dash-context-bar');
    if (!indicator) return;

    if (mode === 'today') {
      indicator.innerHTML =
        '<div class="v21-ctx-bar v21-ctx-today">' +
          '<span class="v21-ctx-label">Mission control</span>' +
          '<span class="v21-ctx-sub">What matters now · This week\u2019s priority</span>' +
        '</div>';
      indicator.style.display = 'block';
    } else if (mode === 'home') {
      indicator.innerHTML =
        '<div class="v21-ctx-bar v21-ctx-home">' +
          '<span class="v21-ctx-label">Home readiness</span>' +
          '<span class="v21-ctx-sub">Deposit · Affordability · DTI · Timing</span>' +
        '</div>';
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  };

  /* ═══════════════════════════════════════════════════════
     4. INJECT CONTEXT BAR SLOT into #tab-home
  ═══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function(){
    var tabHome = document.getElementById('tab-home');
    if (tabHome && !document.getElementById('v21-dash-context-bar')) {
      var bar = document.createElement('div');
      bar.id = 'v21-dash-context-bar';
      bar.style.display = 'none';
      // Insert right after the return banner (or position label, or very top)
      var returnBanner = document.getElementById('v21-return-banner');
      var posLabel     = document.getElementById('v21-position-label');
      var verdictBlock = document.getElementById('v21-verdict-block');
      var insertAfter  = returnBanner || posLabel || null;
      if (insertAfter && insertAfter.parentNode) {
        insertAfter.parentNode.insertBefore(bar, insertAfter.nextSibling);
      } else if (verdictBlock && verdictBlock.parentNode) {
        verdictBlock.parentNode.insertBefore(bar, verdictBlock);
      } else {
        tabHome.insertBefore(bar, tabHome.firstChild);
      }
    }
  });

  /* ═══════════════════════════════════════════════════════
     5. RE-RENDER RETIREMENT WHEN POST-ANALYSIS FIRES
  ═══════════════════════════════════════════════════════ */
  var _prevRPA = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function(){
    if (typeof _prevRPA === 'function') _prevRPA();
    // If retire mode is active, refresh retirement subview
    var g = gv();
    var mode   = g.v21Mode || 'today';
    var intent = g.primaryIntent || 'stable';
    var _isRet = !!(g.isRetirementMode) || (window.BSE && window.BSE.navStyle === 'retirement');
    if (mode === 'retire' || intent === 'retire' || _isRet) {
      try { _renderRetirementSub(); } catch(e){}
    }
  };

  /* ═══════════════════════════════════════════════════════
     6. METRIC CELL CSS (shared utility)
  ═══════════════════════════════════════════════════════ */
  var style = document.createElement('style');
  style.textContent = [
    /* Retirement hero */
    '.ret-hero {',
    '  background: linear-gradient(160deg, var(--navy-mid), var(--navy));',
    '  border-radius: var(--r-lg); padding: var(--s3);',
    '  margin-bottom: var(--s2); position: relative; overflow: hidden;',
    '}',
    '.ret-hero::before {',
    '  content:""; position:absolute; inset:0;',
    '  background: radial-gradient(ellipse 60% 70% at 90% 10%, rgba(0,119,182,0.14) 0%, transparent 60%);',
    '  pointer-events:none;',
    '}',
    '.ret-hero-inner { position: relative; z-index: 1; }',
    '.ret-hero-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:rgba(255,255,255,0.40); margin-bottom:8px; }',
    '.ret-hero-val   { font-family:var(--font-display); font-size:36px; color:var(--white); line-height:1; margin-bottom:6px; }',
    '.ret-hero-sub   { font-size:12px; color:rgba(255,255,255,0.40); line-height:1.5; }',
    /* Metric grid 2-col */
    '.metric-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }',
    '.metric-cell { background:var(--off-white); border:1px solid var(--gray-2); border-radius:var(--r-sm); padding:12px; }',
    '.metric-cell-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--gray-3); margin-bottom:5px; }',
    '.metric-cell-val { font-size:16px; font-weight:700; color:var(--navy); margin-bottom:3px; }',
    '.metric-cell-sub { font-size:11px; color:var(--gray-4); line-height:1.4; }',
    /* Dashboard context bar */
    '.v21-ctx-bar {',
    '  display:flex; align-items:center; justify-content:space-between;',
    '  padding:10px 20px; gap:8px;',
    '}',
    '.v21-ctx-today { border-bottom:2px solid rgba(0,168,232,0.18); background:rgba(0,168,232,0.04); }',
    '.v21-ctx-home  { border-bottom:2px solid rgba(0,119,182,0.18); background:rgba(0,119,182,0.04); }',
    '.v21-ctx-label { font-size:13px; font-weight:700; color:rgba(255,255,255,0.80); }',
    '.v21-ctx-sub   { font-size:11px; color:rgba(255,255,255,0.38); text-align:right; }',
    /* Retirement pill highlight when in retire mode */
    '#ppill-retirement.active { background:var(--sky-dim); border-color:var(--sky-border); color:var(--teal); }',
  ].join('\n');
  document.head.appendChild(style);

})();


/* ═══ MODULE: Retirement Mode — career benchmarks, salary, projections ═══ */
/* ============================================================
   TRACENT RETIREMENT MODE - Pass 1 + Pass 2
   A parallel life-stage product. Not a dashboard reskin.
   ------------------------------------------------------------
   Architecture  : full-screen overlay on #screen-dashboard
   Intercepts    : v21SetMode('retire')
   Restores      : cleanly on any other mode selection
   Sections      : Income, Runway, Spending, Health & Taxes, Plan
   Language      : protect, sustain, simplify, cover, keep steady
   ============================================================ */
(function(){
  if (window.__TRACENT_RETIREMENT_MODE__) return;
  window.__TRACENT_RETIREMENT_MODE__ = true;

  /* --------------------------------------------------------
     HELPERS
  -------------------------------------------------------- */
  var $ = function(id){ return document.getElementById(id); };
  var gv = function(){ return window.G || {}; };
  var fmt = function(n){
    var v = Math.round(Math.abs(n || 0));
    return '$' + v.toLocaleString('en-US');
  };
  var fmtK = function(n){
    if (!n) return '--';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    return '$' + Math.round(n / 1000) + 'K';
  };
  var pct = function(n){ return Math.round(n || 0) + '%'; };

  /* --------------------------------------------------------
     CORE CALCULATIONS
     All numbers are illustrative estimates from user inputs.
  -------------------------------------------------------- */
  function calc(){
    var g = gv();

    /* income inputs */
    var grossIncome = g.income || 0;
    var takeHome    = g.takeHome || (function(){var i=grossIncome;if(!i)return 0;var s=(window.STATE_TAX&&document.getElementById('state'))?((window.STATE_TAX)[document.getElementById('state').value]||0):0,f=i<=11600?i*0.10:i<=47150?1160+(i-11600)*0.12:i<=100525?5426+(i-47150)*0.22:i<=191950?17169+(i-100525)*0.24:39111+(i-191950)*0.32;f=Math.max(0,f-14600*0.12);var c=Math.min(i,168600)*0.062+i*0.0145;return Math.round(Math.max(i*0.5,i-f-c-i*s)/12)})();
    var fcf         = g.fcf || 0;

    /* savings / portfolio */
    var savings     = (g.savingsAmt || 0) + (g.depositSaved || 0);
    var portfolio   = g.retireSavings || g.retirementSavings || savings;

    /* debt */
    var ccDebt      = g.ccDebt || 0;
    var carDebt     = g.carDebt || 0;
    var studentDebt = g.studentDebt || 0;
    var otherDebt   = g.otherDebt || 0;
    var totalDebt   = ccDebt + carDebt + studentDebt + otherDebt;

    /* timing */
    var efMonths    = parseInt(g.emergency || '0');
    var retireAge   = parseInt(g.retireAge || g.retirementAge || 65);
    var currentAge  = parseInt(g.currentAge || g.age || 58);
    var yearsTo     = Math.max(0, retireAge - currentAge);
    var yearsIn     = Math.max(0, currentAge - retireAge);

    /* retirement-specific inputs */
    var pensionMo   = g.pensionIncome || 0;
    var matchFull   = g.retMatch === 'full' || g.retMatch === 'maxed';

    /* -- Future-value formula (monthly compounding) */
    function fv(mo, yrs, rate){
      rate = rate || 0.07;
      var r = rate / 12, n = yrs * 12;
      if (n <= 0 || r <= 0) return 0;
      return Math.round(mo * ((Math.pow(1 + r, n) - 1) / r));
    }

    /* projected portfolio at retirement */
    var curContrib  = grossIncome > 0 ? Math.round(grossIncome * 0.08 / 12) : 0;
    var projPortfolio = portfolio > 0
      ? Math.round(portfolio * Math.pow(1.07, yearsTo) + fv(curContrib, yearsTo))
      : fv(curContrib, yearsTo);

    /* income sources — prefer user-entered SS; formula is illustrative fallback only */
    var ssUserEntered = g.socialSecurityMonthly > 0;
    var ssEst        = ssUserEntered
      ? g.socialSecurityMonthly
      : grossIncome > 0 ? Math.round(Math.min(3822, grossIncome * 0.40 / 12)) : 0;
    var withdrawalMo = Math.round(projPortfolio * 0.04 / 12);   /* 4% rule */
    var totalIncome  = ssEst + pensionMo + withdrawalMo;

    /* spending estimate */
    var monthlySpend = takeHome > 0 ? takeHome : (function(){var i=grossIncome;if(!i)return 0;var s=(window.STATE_TAX&&document.getElementById('state'))?((window.STATE_TAX)[document.getElementById('state').value]||0):0,f=i<=11600?i*0.10:i<=47150?1160+(i-11600)*0.12:i<=100525?5426+(i-47150)*0.22:i<=191950?17169+(i-100525)*0.24:39111+(i-191950)*0.32;f=Math.max(0,f-14600*0.12);var c=Math.min(i,168600)*0.062+i*0.0145;return Math.round(Math.max(i*0.5,i-f-c-i*s)/12)})();
    var essential    = Math.round(monthlySpend * 0.65);   /* housing, food, utilities, insurance */
    var discretionary= monthlySpend - essential;
    var surplus      = totalIncome - monthlySpend;

    /* runway: years portfolio sustains current-pace withdrawals */
    var netMonthlyDraw = Math.max(0, monthlySpend - ssEst - pensionMo);
    var runwayBase = projPortfolio > 0 && netMonthlyDraw > 0
      ? Math.min(50, Math.round(projPortfolio / (netMonthlyDraw * 12)))
      : projPortfolio > 0 ? 50 : 0;

    /* runway scenarios */
    var spendUpMo  = Math.round(monthlySpend * 1.10);   /* +10% spending */
    var drawUpMo   = Math.max(0, spendUpMo - ssEst - pensionMo);
    var runwaySpendUp = projPortfolio > 0 && drawUpMo > 0
      ? Math.min(50, Math.round(projPortfolio / (drawUpMo * 12))) : runwayBase;

    var portWeakMo = projPortfolio * 0.80;              /* -20% market shock */
    var runwayMktWeak = portWeakMo > 0 && netMonthlyDraw > 0
      ? Math.min(50, Math.round(portWeakMo / (netMonthlyDraw * 12))) : runwayBase;

    var hcExtra    = 600;                               /* +$600/mo healthcare cost */
    var drawHCMo   = Math.max(0, netMonthlyDraw + hcExtra);
    var runwayHC   = projPortfolio > 0 && drawHCMo > 0
      ? Math.min(50, Math.round(projPortfolio / (drawHCMo * 12))) : runwayBase;

    /* withdrawal pace: safe / stretched / risky */
    var safeWithdrawMo  = Math.round(projPortfolio * 0.04 / 12);
    var stretchRate     = netMonthlyDraw > 0
      ? (netMonthlyDraw * 12) / Math.max(projPortfolio, 1) : 0;
    var withdrawPace    = stretchRate <= 0.04 ? 'safe'
                       : stretchRate <= 0.055 ? 'stretched' : 'risky';

    /* sustainability score 0-100 */
    var sustScore = 40;
    if (projPortfolio > 500000)  sustScore += 10;
    if (projPortfolio > 1000000) sustScore += 10;
    if (totalDebt === 0)         sustScore += 10;
    if (efMonths >= 12)          sustScore += 15;
    else if (efMonths >= 6)      sustScore += 8;
    if (withdrawPace === 'safe')      sustScore += 15;
    else if (withdrawPace === 'stretched') sustScore += 7;
    sustScore = Math.min(100, Math.max(8, sustScore));

    /* verdict sentence */
    var verdictText, verdictSub;
    if (sustScore >= 75 && withdrawPace === 'safe') {
      verdictText = 'Your current plan covers essentials with a stable buffer.';
      verdictSub  = 'Income and portfolio pace are both within sustainable range.';
    } else if (sustScore >= 55 && withdrawPace !== 'risky') {
      verdictText = 'Your plan is workable, but withdrawals need tightening.';
      verdictSub  = 'The portfolio can cover the basics -- discretionary spending is the lever to watch.';
    } else if (efMonths < 6 && totalDebt > 0) {
      verdictText = 'You are close, but healthcare and income timing need attention.';
      verdictSub  = 'A cash buffer and debt clearance would significantly strengthen your position.';
    } else if (withdrawPace === 'risky') {
      verdictText = 'The current withdrawal pace is above the sustainable threshold.';
      verdictSub  = 'Reducing monthly spending by ' + fmt(netMonthlyDraw - safeWithdrawMo) + ' would bring the plan back into a safe range.';
    } else {
      verdictText = 'Your retirement foundation is taking shape -- a few adjustments will make it more stable.';
      verdictSub  = 'Each section below shows one thing to keep steady or simplify.';
    }

    return {
      grossIncome, takeHome, fcf, portfolio, projPortfolio,
      ssEst, ssUserEntered, pensionMo, withdrawalMo, totalIncome,
      monthlySpend, essential, discretionary, surplus,
      runwayBase, runwaySpendUp, runwayMktWeak, runwayHC,
      withdrawPace, safeWithdrawMo, stretchRate,
      sustScore, totalDebt, ccDebt, efMonths, matchFull,
      yearsTo, yearsIn, retireAge, currentAge,
      verdictText, verdictSub, netMonthlyDraw
    };
  }

  /* --------------------------------------------------------
     SECTION A -- VERDICT HERO
     Top answer. Plain English. Never score-first.
  -------------------------------------------------------- */
  function renderLanding(d){
    var sustLabel  = d.sustScore >= 75 ? 'Solid foundation' : d.sustScore >= 55 ? 'Stable with watch items' : d.sustScore >= 35 ? 'Needs attention' : 'Requires action';
    var sustColor  = d.sustScore >= 75 ? 'var(--ret-calm)'  : d.sustScore >= 55 ? 'var(--ret-sage)'         : d.sustScore >= 35 ? 'var(--amber)'    : 'var(--red)';
    var meterFill  = d.sustScore;

    var html = '';

    /* Verdict hero */
    html += '<div class="ret-verdict-hero">';
    html +=   '<div class="ret-verdict-label">' + sustLabel + '</div>';
    html +=   '<div class="ret-verdict-headline">' + d.verdictText + '</div>';
    html +=   '<div class="ret-verdict-sub">' + d.verdictSub + '</div>';
    html +=   '<div class="ret-verdict-meter-wrap">';
    html +=     '<div class="ret-verdict-meter-track">';
    html +=       '<div class="ret-verdict-meter-fill" style="width:' + meterFill + '%;background:' + sustColor + ';"></div>';
    html +=     '</div>';
    html +=     '<div class="ret-verdict-meter-row">';
    html +=       '<span class="ret-verdict-meter-pct" style="color:' + sustColor + ';">' + d.sustScore + ' / 100</span>';
    html +=       '<span class="ret-verdict-meter-note">Sustainability estimate</span>';
    html +=     '</div>';
    html +=   '</div>';
    html += '</div>';

    /* Income snapshot strip */
    var surplusColor = d.surplus >= 0 ? 'var(--ret-calm)' : 'var(--amber)';
    var surplusLabel = d.surplus >= 0 ? 'Monthly surplus' : 'Monthly shortfall';
    html += '<div class="ret-snapshot-strip">';
    html +=   retSnapCell('Estimated income', fmt(d.totalIncome) + '/mo', 'var(--ret-text)');
    html +=   '<div class="ret-snap-divider"></div>';
    html +=   retSnapCell('Est. spending', fmt(d.monthlySpend) + '/mo', 'var(--ret-text)');
    html +=   '<div class="ret-snap-divider"></div>';
    html +=   retSnapCell(surplusLabel, (d.surplus >= 0 ? '+' : '') + fmt(d.surplus) + '/mo', surplusColor);
    html += '</div>';

    /* Quick nav tiles to each section */
    var TILES = [
      { id:'income',   label:'Income',         note:'Sources & coverage', icon:'' },
      { id:'runway',   label:'Runway',          note:'How long it lasts',  icon:'' },
      { id:'spending', label:'Spending',        note:'Withdrawal pace',    icon:'' },
      { id:'health',   label:'Health & Taxes',  note:'Key watch items',    icon:'' },
      { id:'plan',     label:'Your next move',  note:'One clear action',   icon:'' }
    ];
    html += '<div class="ret-tile-grid">';
    TILES.forEach(function(t){
      html += '<button class="ret-tile" onclick="window.retSetSection(\'' + t.id + '\')">';
      html +=   '<div class="ret-tile-icon">' + t.icon + '</div>';
      html +=   '<div class="ret-tile-label">' + t.label + '</div>';
      html +=   '<div class="ret-tile-note">' + t.note + '</div>';
      html += '</button>';
    });
    html += '</div>';

    return html;
  }

  function retSnapCell(label, val, color){
    return '<div class="ret-snap-cell">'
      + '<div class="ret-snap-label">' + label + '</div>'
      + '<div class="ret-snap-val" style="color:' + color + ';">' + val + '</div>'
    + '</div>';
  }

  /* --------------------------------------------------------
     SECTION B -- MONTHLY INCOME
  -------------------------------------------------------- */
  function renderIncome(d){
    var coverageRatio = d.totalIncome > 0 && d.monthlySpend > 0 ? d.totalIncome / d.monthlySpend : 0;
    var coverageLabel = coverageRatio >= 1.05 ? 'Income covers all spending with a buffer'
                      : coverageRatio >= 0.90 ? 'Income covers most spending -- gap is small'
                      : 'Income does not fully cover current spending';
    var coverageColor = coverageRatio >= 1.05 ? 'var(--ret-calm)' : coverageRatio >= 0.90 ? 'var(--ret-sage)' : 'var(--amber)';

    var html = '<div class="ret-section-card">';
    html += '<div class="ret-section-eyebrow">Monthly income picture</div>';
    html += '<div class="ret-income-headline" style="color:' + coverageColor + '">' + coverageLabel + '</div>';

    /* Income sources */
    html += '<div class="ret-divider-label">Income sources</div>';
    html += '<div class="ret-income-rows">';
    html += retIncomeRow('Social Security',  d.ssEst,        d.ssUserEntered ? 'Your entered benefit amount' : 'Illustrative estimate \u00b7 based on income history formula');
    if (d.pensionMo > 0)
      html += retIncomeRow('Pension',               d.pensionMo,    'Monthly pension income');
    html += retIncomeRow('Portfolio withdrawal',    d.withdrawalMo, '4% sustainable withdrawal rate');
    html += '</div>';

    /* Spending breakdown */
    html += '<div class="ret-divider-label">Monthly spending estimate</div>';
    html += '<div class="ret-income-rows">';
    html += retIncomeRow('Essential spending',    d.essential,       'Housing, food, utilities, insurance');
    html += retIncomeRow('Discretionary spending', d.discretionary,  'Travel, lifestyle, personal');
    html += '</div>';

    /* Surplus / shortfall */
    var surplusColor = d.surplus >= 0 ? 'var(--ret-calm)' : 'var(--amber)';
    var surplusNote  = d.surplus >= 0 ? 'Available to protect reserves or reduce withdrawals' : 'Consider reducing discretionary spending to close this gap';
    html += '<div class="ret-surplus-row" style="border-color:' + surplusColor + '15;">';
    html +=   '<div>';
    html +=     '<div class="ret-surplus-label">' + (d.surplus >= 0 ? 'Monthly surplus' : 'Monthly shortfall') + '</div>';
    html +=     '<div class="ret-surplus-note">' + surplusNote + '</div>';
    html +=   '</div>';
    html +=   '<div class="ret-surplus-val" style="color:' + surplusColor + ';">' + (d.surplus >= 0 ? '+' : '') + fmt(d.surplus) + '/mo</div>';
    html += '</div>';

    html += '<div class="ret-section-note">Income projections are illustrative estimates. Social Security amounts depend on your earnings history and claiming age.</div>';
    html += '</div>';
    return html;
  }

  function retIncomeRow(label, amt, note){
    return '<div class="ret-income-row">'
      + '<div class="ret-income-row-left"><div class="ret-income-row-label">' + label + '</div><div class="ret-income-row-note">' + note + '</div></div>'
      + '<div class="ret-income-row-amt">' + fmt(amt) + '/mo</div>'
    + '</div>';
  }

  /* --------------------------------------------------------
     SECTION C -- RUNWAY
  -------------------------------------------------------- */
  function renderRunway(d){
    var rLabel = d.runwayBase >= 40 ? 'Your plan lasts a lifetime at current pace'
               : d.runwayBase >= 25 ? 'Your plan covers a long retirement at current pace'
               : d.runwayBase >= 15 ? 'Your plan covers the essential years -- watch the pace'
               : 'Your current pace puts the plan under pressure';
    var rColor = d.runwayBase >= 30 ? 'var(--ret-calm)' : d.runwayBase >= 20 ? 'var(--ret-sage)' : d.runwayBase >= 12 ? 'var(--amber)' : 'var(--red)';
    var meterPct = Math.min(100, Math.round(d.runwayBase / 40 * 100));

    var html = '<div class="ret-section-card">';
    html += '<div class="ret-section-eyebrow">How long your money lasts</div>';
    html += '<div class="ret-runway-headline">' + rLabel + '</div>';

    /* Big number */
    html += '<div class="ret-runway-hero">';
    html +=   '<div class="ret-runway-big" style="color:' + rColor + ';">' + (d.runwayBase >= 40 ? '40+' : d.runwayBase) + '</div>';
    html +=   '<div class="ret-runway-unit">years at current pace</div>';
    html += '</div>';
    html += '<div class="ret-runway-meter"><div class="ret-runway-meter-fill" style="width:' + meterPct + '%;background:' + rColor + ';"></div></div>';

    /* Three scenario cards */
    html += '<div class="ret-divider-label">What changes the runway</div>';
    html += '<div class="ret-scenario-grid">';
    html += retScenario('If spending rises 10%',         d.runwaySpendUp, d.runwayBase, '');
    html += retScenario('If markets fall 20%',           d.runwayMktWeak, d.runwayBase, '');
    html += retScenario('If healthcare adds $600/mo',    d.runwayHC,      d.runwayBase, '');
    html += '</div>';

    /* Debt note */
    if (d.totalDebt > 0)
      html += '<div class="ret-scenario-warn">Carrying ' + fmt(d.totalDebt) + ' in debt reduces effective runway -- clearing it before drawing down protects the portfolio</div>';

    html += '<div class="ret-section-note">Runway estimates assume a 4% sustainable withdrawal rate and 7% average annual return. Actual results depend on sequence of returns, inflation, and spending changes.</div>';
    html += '</div>';
    return html;
  }

  function retScenario(label, newYears, baseYears, icon){
    var delta     = newYears - baseYears;
    var impactTxt = delta === 0 ? 'No change' : (delta > 0 ? '+' + delta : delta.toString()) + ' years';
    var impactCol = delta >= 0 ? 'var(--ret-calm)' : 'var(--amber)';
    var runLabel  = newYears >= 40 ? '40+ yrs' : newYears + ' yrs';
    return '<div class="ret-scenario-card">'
      + '<div class="ret-scenario-icon">' + icon + '</div>'
      + '<div class="ret-scenario-label">' + label + '</div>'
      + '<div class="ret-scenario-val">' + runLabel + '</div>'
      + '<div class="ret-scenario-delta" style="color:' + impactCol + ';">' + impactTxt + '</div>'
    + '</div>';
  }

  /* --------------------------------------------------------
     SECTION D -- SPENDING & WITHDRAWAL GUARDRAILS
  -------------------------------------------------------- */
  function renderSpending(d){
    var paceLabels = { safe:'Safe', stretched:'Stretched', risky:'Risky' };
    var paceColors = { safe:'var(--ret-calm)', stretched:'var(--amber)', risky:'var(--red)' };
    var paceDescs  = {
      safe:      'Withdrawals are within the sustainable threshold. The plan can hold steady at this pace.',
      stretched: 'Withdrawals are above the 4% guideline. Reduce spending or increase income to protect the portfolio long-term.',
      risky:     'Withdrawals are significantly above the sustainable rate. The portfolio may not cover a full retirement without changes.'
    };
    var improveTips = {
      safe:      'You have room to build a larger healthcare reserve or reduce withdrawals further.',
      stretched: 'Reducing monthly spending by ' + fmt(Math.round(d.netMonthlyDraw - d.safeWithdrawMo)) + ' would bring the pace back to the safe threshold.',
      risky:     'Reducing withdrawals to ' + fmt(d.safeWithdrawMo) + '/mo would protect the plan. Consider what discretionary spending can be deferred.'
    };

    var pace  = d.withdrawPace;
    var color = paceColors[pace];

    var html = '<div class="ret-section-card">';
    html += '<div class="ret-section-eyebrow">Withdrawal pace</div>';

    /* Pace badge */
    html += '<div class="ret-pace-badge" style="background:' + color + '18;border-color:' + color + '35;">';
    html +=   '<div class="ret-pace-label" style="color:' + color + ';">' + paceLabels[pace] + '</div>';
    html +=   '<div class="ret-pace-rate">' + (d.stretchRate * 100).toFixed(1) + '% annual withdrawal</div>';
    html += '</div>';

    html += '<div class="ret-pace-desc">' + paceDescs[pace] + '</div>';

    /* Numbers */
    html += '<div class="ret-guardrail-grid">';
    html += retGuardrailCell('Current draw',   fmt(d.netMonthlyDraw) + '/mo', 'From portfolio only');
    html += retGuardrailCell('Safe threshold', fmt(d.safeWithdrawMo) + '/mo', '4% of projected portfolio');
    html += '</div>';

    /* Improve tip */
    html += '<div class="ret-improve-tip">';
    html +=   '<div class="ret-improve-tip-label">One thing to keep steady</div>';
    html +=   '<div class="ret-improve-tip-text">' + improveTips[pace] + '</div>';
    html += '</div>';

    html += '<div class="ret-section-note">The 4% rule is a planning guideline. Actual sustainable rates vary with portfolio composition, return sequence, and inflation. Review annually.</div>';
    html += '</div>';
    return html;
  }

  function retGuardrailCell(label, val, note){
    return '<div class="ret-guardrail-cell">'
      + '<div class="ret-guardrail-label">' + label + '</div>'
      + '<div class="ret-guardrail-val">' + val + '</div>'
      + '<div class="ret-guardrail-note">' + note + '</div>'
    + '</div>';
  }

  /* --------------------------------------------------------
     SECTION E -- HEALTH & TAXES
  -------------------------------------------------------- */
  function renderHealth(d){
    var g        = gv();
    var age      = d.currentAge;
    var retAge   = d.retireAge;
    var preMedicare = age < 65 && retAge < 65;
    var yearsToMedicare = Math.max(0, 65 - age);
    var hcReserve = d.efMonths >= 12 ? 'covered' : d.efMonths >= 6 ? 'partial' : 'low';
    var hcNote    = { covered:'A 12-month buffer covers most unexpected healthcare events.', partial:'Your buffer covers some healthcare costs. Building toward 12 months would provide stronger protection.', low:'A cash reserve of at least 6 months is important before drawing down a portfolio.' }[hcReserve];
    var hcColor   = { covered:'var(--ret-calm)', partial:'var(--ret-sage)', low:'var(--amber)' }[hcReserve];

    var watchItem = d.totalDebt > 0
      ? 'Debt interest costs reduce available income. Clear debt before increasing withdrawals.'
      : d.efMonths < 6
      ? 'A low cash buffer increases sequence-of-returns risk. Prioritise building reserves.'
      : preMedicare
      ? 'Pre-Medicare healthcare coverage is the biggest near-term cost to plan for.'
      : 'Review RMD timing once accounts exceed $500K to minimise tax drag.';

    var html = '<div class="ret-section-card">';
    html += '<div class="ret-section-eyebrow">Health &amp; tax considerations</div>';

    /* Healthcare reserve status */
    html += '<div class="ret-ht-card" style="border-color:' + hcColor + '20;">';
    html +=   '<div class="ret-ht-card-row">';
    html +=     '<div class="ret-ht-card-icon"></div>';
    html +=     '<div>';
    html +=       '<div class="ret-ht-card-title">Healthcare reserve</div>';
    html +=       '<div class="ret-ht-card-status" style="color:' + hcColor + ';">' + { covered:'Covered', partial:'Partially covered', low:'Build this first' }[hcReserve] + '</div>';
    html +=     '</div>';
    html +=   '</div>';
    html +=   '<div class="ret-ht-card-text">' + hcNote + '</div>';
    html += '</div>';

    /* Medicare note */
    html += '<div class="ret-ht-row">';
    html +=   '<div class="ret-ht-icon"></div>';
    html +=   '<div>';
    html +=     '<div class="ret-ht-label">Medicare ' + (preMedicare ? 'bridge' : 'status') + '</div>';
    html +=     '<div class="ret-ht-text">' + (preMedicare
      ? 'Medicare starts at 65 -- ' + yearsToMedicare + ' year' + (yearsToMedicare !== 1 ? 's' : '') + ' away. Budget $600–$900/mo for private coverage in the gap period.'
      : 'Medicare-eligible at 65. Compare Medigap and Medicare Advantage plans to control out-of-pocket costs.') + '</div>';
    html +=   '</div>';
    html += '</div>';

    /* Tax order */
    html += '<div class="ret-ht-row">';
    html +=   '<div class="ret-ht-icon"></div>';
    html +=   '<div>';
    html +=     '<div class="ret-ht-label">Tax-efficient withdrawal order</div>';
    html +=     '<div class="ret-ht-text">Draw from taxable accounts first, then traditional IRA/401(k), then Roth last. This order typically reduces lifetime tax drag.</div>';
    html +=   '</div>';
    html += '</div>';

    /* RMD */
    html += '<div class="ret-ht-row">';
    html +=   '<div class="ret-ht-icon"></div>';
    html +=   '<div>';
    html +=     '<div class="ret-ht-label">Required Minimum Distributions</div>';
    html +=     '<div class="ret-ht-text">RMDs from traditional accounts begin at age 73. Roth IRAs have no RMDs during your lifetime -- useful for legacy planning.</div>';
    html +=   '</div>';
    html += '</div>';

    /* Watch item */
    html += '<div class="ret-watch-item">';
    html +=   '<div class="ret-watch-label">Watch this now</div>';
    html +=   '<div class="ret-watch-text">' + watchItem + '</div>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  /* --------------------------------------------------------
     SECTION F -- NEXT RETIREMENT MOVE
     Retirement-specific. One clear action at the top.
  -------------------------------------------------------- */
  function renderPlan(d){
    var moves = [];

    /* Retirement-specific move generation */
    if (d.withdrawPace === 'risky' || d.withdrawPace === 'stretched'){
      var reduceBy = Math.round(d.netMonthlyDraw - d.safeWithdrawMo);
      moves.push({ icon:'', title:'Reduce monthly withdrawals by ' + fmt(Math.max(50, reduceBy)), text:'Your current withdrawal pace is above the sustainable threshold. Reducing withdrawals protects the portfolio from running short in later years.' });
    }
    if (d.efMonths < 12){
      moves.push({ icon:'', title:'Protect your healthcare reserve', text:'Build or maintain a 12-month cash cushion before drawing more from the portfolio. This prevents forced selling during market downturns.' });
    }
    if (d.totalDebt > 0){
      moves.push({ icon:'', title:'Clear remaining debt before drawing down', text:'Entering or continuing retirement with ' + fmt(d.totalDebt) + ' in debt reduces your monthly income flexibility and increases risk.' });
    }
    if (d.yearsTo >= 1){
      moves.push({ icon:'', title:'Compare Social Security claiming timing', text:'Claiming SS at 62 reduces lifetime benefits. Each year of delay before age 70 increases your monthly benefit by roughly 6–8%.' });
    }
    if (!d.matchFull && d.grossIncome > 0){
      moves.push({ icon:'', title:'Capture your full employer match', text:'Every dollar of uncaptured match is a guaranteed return. Confirm your contribution rate covers the full match percentage.' });
    }
    if (d.yearsTo > 3){
      moves.push({ icon:'', title:'Raise contributions by 1% this year', text:'Small consistent increases compound significantly over ' + d.yearsTo + ' years. Even 1% more per year can add years to your runway.' });
    }
    if (d.withdrawPace === 'safe' && d.efMonths >= 12 && d.totalDebt === 0){
      moves.push({ icon:'', title:'Your plan is in good shape', text:'Regular annual reviews and consistent withdrawal discipline are the most important things now. Small adjustments made early matter more than large corrections made late.' });
    }
    if (moves.length === 0){
      moves.push({ icon:'', title:'Review your plan once a year', text:'Set a fixed annual date to review income, withdrawals, and portfolio balance. Consistency protects against reactive decisions.' });
    }

    var top   = moves[0];
    var rest  = moves.slice(1, 4);

    var html = '<div class="ret-section-card">';
    html += '<div class="ret-section-eyebrow">Your next retirement move</div>';

    /* Top move -- highlighted */
    html += '<div class="ret-plan-top">';
    html +=   '<div class="ret-plan-top-icon">' + top.icon + '</div>';
    html +=   '<div>';
    html +=     '<div class="ret-plan-top-title">' + top.title + '</div>';
    html +=     '<div class="ret-plan-top-text">' + top.text + '</div>';
    html +=   '</div>';
    html += '</div>';

    /* Secondary moves */
    if (rest.length > 0){
      html += '<div class="ret-plan-rest-label">Also worth considering</div>';
      rest.forEach(function(m){
        html += '<div class="ret-plan-rest-row">';
        html +=   '<div class="ret-plan-rest-icon">' + m.icon + '</div>';
        html +=   '<div>';
        html +=     '<div class="ret-plan-rest-title">' + m.title + '</div>';
        html +=     '<div class="ret-plan-rest-text">' + m.text + '</div>';
        html +=   '</div>';
        html += '</div>';
      });
    }

    html += '<div class="ret-section-note">All recommendations are illustrative. Consult a qualified financial planner before making changes to your retirement income plan.</div>';
    html += '</div>';
    return html;
  }

  /* --------------------------------------------------------
     SECTION REGISTRY
  -------------------------------------------------------- */
  var SECTIONS = [
    { id:'income',   label:'Income',         icon:'', render: renderIncome   },
    { id:'runway',   label:'Runway',          icon:'', render: renderRunway   },
    { id:'spending', label:'Spending',        icon:'', render: renderSpending },
    { id:'health',   label:'Health & Taxes',  icon:'', render: renderHealth   },
    { id:'plan',     label:'Plan',            icon:'', render: renderPlan     }
  ];
  var _activeSection = null;  /* null = landing view */

  /* --------------------------------------------------------
     OVERLAY HTML BUILDER
  -------------------------------------------------------- */
  function buildOverlayHTML(){
    return '<div id="ret-overlay" class="ret-overlay" role="main" aria-label="Retirement Mode">'
      + '<div class="ret-overlay-inner">'

        /* -- Header */
        + '<div class="ret-header" id="ret-header">'
          + '<button class="ret-header-back" onclick="window.retLeaveMode()" aria-label="Exit Retirement Mode">'
            + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>'
          + '</button>'
          + '<div class="ret-header-center">'
            + '<div class="ret-header-brand">Tracent<span class="ret-brand-dot">.</span></div>'
            + '<div class="ret-header-mode-tag">Retirement</div>'
          + '</div>'
          + '<div class="ret-header-right" id="ret-back-to-overview" style="display:none;">'
            + '<button class="ret-header-overview-btn" onclick="window.retGoHome()" aria-label="Back to overview">Overview</button>'
          + '</div>'
          + '<div style="width:44px;" id="ret-header-spacer"></div>'
        + '</div>'

        /* -- Scrollable body */
        + '<div class="ret-body" id="ret-body"></div>'

        /* -- 5-tab nav */
        + '<nav class="ret-nav" id="ret-nav" aria-label="Retirement sections">'
          + SECTIONS.map(function(s){
              return '<button class="ret-nav-btn" id="ret-nav-' + s.id + '" onclick="window.retSetSection(\'' + s.id + '\')" aria-label="' + s.label + '">'
                + '<div class="ret-nav-icon">' + s.icon + '</div>'
                + '<div class="ret-nav-label">' + s.label + '</div>'
              + '</button>';
            }).join('')
        + '</nav>'

      + '</div>'
    + '</div>';
  }

  /* --------------------------------------------------------
     MOUNT / UNMOUNT
  -------------------------------------------------------- */
  function mountRetirementMode(){
    if (!$('ret-overlay')){
      var w = document.createElement('div');
      w.innerHTML = buildOverlayHTML();
      document.getElementById('screen-dashboard').appendChild(w.firstChild);
    }
    $('ret-overlay').style.display = 'flex';
    _activeSection = null;
    _repaintLanding();
    requestAnimationFrame(function(){
      $('ret-overlay').classList.add('ret-overlay-in');
    });
    try { tracentTrack('retirement_mode_opened', {}); } catch(e){}
  }

  function unmountRetirementMode(){
    var ov = $('ret-overlay');
    if (!ov) return;
    ov.classList.remove('ret-overlay-in');
    ov.classList.add('ret-overlay-out');
    setTimeout(function(){ ov.style.display = 'none'; ov.classList.remove('ret-overlay-out'); }, 340);
  }

  function _repaintLanding(){
    _activeSection = null;
    var body = $('ret-body');
    if (!body) return;
    var g = gv();
    // Truth gate: income alone does NOT qualify — requires explicit retirement-specific inputs
    var _hasMinInputs = (g.retireSavings > 0) || (g.retirementSavings > 0)
      || (g.savingsAmt > 0) || (g.depositSaved > 0)
      || (g.pensionIncome > 0)
      || (g.retMatch && g.retMatch !== 'none' && g.retMatch !== 'unknown');
    if (!_hasMinInputs) {
      body.innerHTML = '<div style="padding:32px 24px;text-align:center;">'
        + '<div style="font-size:32px;color:rgba(255,255,255,0.25);margin-bottom:16px;">\u2014</div>'
        + '<div style="font-size:17px;font-weight:600;color:rgba(255,255,255,0.75);margin-bottom:8px;">Add your retirement details</div>'
        + '<div style="font-size:14px;color:rgba(255,255,255,0.45);line-height:1.5;">Income, savings, or portfolio info is needed to show a real projection.</div>'
      + '</div>';
      body.scrollTop = 0;
      SECTIONS.forEach(function(s){ var btn = $('ret-nav-' + s.id); if (btn) btn.classList.remove('ret-nav-active'); });
      return;
    }
    var d = calc();
    try { body.innerHTML = renderLanding(d); } catch(e){ body.innerHTML = '<div style="padding:24px;color:rgba(255,255,255,0.6);">Complete your financial profile to see your retirement picture.</div>'; }
    body.scrollTop = 0;
    /* nav -- none active */
    SECTIONS.forEach(function(s){
      var btn = $('ret-nav-' + s.id);
      if (btn) btn.classList.remove('active');
    });
    var backBtn = $('ret-back-to-overview');
    var spacer  = $('ret-header-spacer');
    if (backBtn) backBtn.style.display = 'none';
    if (spacer)  spacer.style.display  = '';
  }

  function _repaintSection(secId){
    var body = $('ret-body');
    if (!body) return;
    var sec = SECTIONS.find(function(s){ return s.id === secId; });
    if (!sec) return;
    // Same projection gate as landing — no calc() without real retirement inputs
    var _g = gv();
    var _secHasData = (_g.retireSavings > 0) || (_g.retirementSavings > 0)
      || (_g.savingsAmt > 0) || (_g.depositSaved > 0)
      || (_g.pensionIncome > 0)
      || (_g.retMatch && _g.retMatch !== 'none' && _g.retMatch !== 'unknown');
    if (!_secHasData) { _repaintLanding(); return; }
    var d = calc();
    try { body.innerHTML = sec.render(d); } catch(e){ body.innerHTML = '<div style="padding:24px;color:rgba(255,255,255,0.6);">Complete your financial profile to see this section.</div>'; }
    body.scrollTop = 0;
    /* nav highlight */
    SECTIONS.forEach(function(s){
      var btn = $('ret-nav-' + s.id);
      if (btn) btn.classList.toggle('active', s.id === secId);
    });
    var backBtn = $('ret-back-to-overview');
    var spacer  = $('ret-header-spacer');
    if (backBtn) backBtn.style.display = '';
    if (spacer)  spacer.style.display  = 'none';
  }

  /* --------------------------------------------------------
     PUBLIC API
  -------------------------------------------------------- */
  window.retSetSection = function(secId){
    _activeSection = secId;
    _repaintSection(secId);
    try { tracentTrack('retirement_section_viewed', { section: secId }); } catch(e){}
  };

  window.retGoHome = function(){
    _repaintLanding();
    try { tracentTrack('retirement_overview_viewed', {}); } catch(e){}
  };

  window.retLeaveMode = function(){
    unmountRetirementMode();
    try {
      var todayBtn = document.getElementById('mode-btn-today');
      if (typeof v21SetMode === 'function') v21SetMode('today', todayBtn);
    } catch(e){}
    try { tracentTrack('retirement_mode_exited', {}); } catch(e){}
  };

  /* --------------------------------------------------------
     INTERCEPT v21SetMode
  -------------------------------------------------------- */
  var _prevRetireSetMode = window.v21SetMode;
  window.v21SetMode = function(mode, btn){
    if (mode === 'retire'){
      document.querySelectorAll('.v21-mode-btn').forEach(function(b){ b.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      if (typeof G !== 'undefined') G.v21Mode = 'retire';
      try { tracentTrack('mode_switch', { mode:'retire' }); } catch(e){}
      mountRetirementMode();
      return;
    }
    unmountRetirementMode();
    if (typeof _prevRetireSetMode === 'function') _prevRetireSetMode(mode, btn);
  };

  /* Re-render when analysis fires */
  var _prevRPARetire = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function(){
    if (typeof _prevRPARetire === 'function') _prevRPARetire();
    if (window.G && window.G.v21Mode === 'retire' && $('ret-overlay')){
      setTimeout(function(){
        if (_activeSection) _repaintSection(_activeSection);
        else _repaintLanding();
      }, 120);
    }
  };

  /* --------------------------------------------------------
     CSS  --  retirement-native design tokens
  -------------------------------------------------------- */
  var style = document.createElement('style');
  style.textContent = [
    ':root {',
    '  --ret-bg:         #0C1929;',
    '  --ret-surface:    #0F2035;',
    '  --ret-surface-hi: #132540;',
    '  --ret-border:     rgba(255,255,255,0.07);',
    '  --ret-border-hi:  rgba(255,255,255,0.12);',
    '  --ret-calm:       #5CA4A4;',
    '  --ret-sage:       #7AAF7A;',
    '  --ret-moss:       #8B9E75;',
    '  --ret-warm:       #C5A06A;',
    '  --ret-text:       rgba(255,255,255,0.90);',
    '  --ret-sub:        rgba(255,255,255,0.52);',
    '  --ret-faint:      rgba(255,255,255,0.26);',
    '  --ret-motion:     0.38s cubic-bezier(0.22, 0.61, 0.36, 1);',
    '}',

    /* overlay shell */
    '.ret-overlay {',
    '  position:fixed; inset:0; z-index:8000;',
    '  background:var(--ret-bg);',
    '  display:flex; flex-direction:column;',
    '  transform:translateY(100%);',
    '  transition:transform var(--ret-motion);',
    '}',
    '.ret-overlay.ret-overlay-in  { transform:translateY(0); }',
    '.ret-overlay.ret-overlay-out { transform:translateY(100%); }',
    '.ret-overlay-inner { display:flex; flex-direction:column; height:100%; overflow:hidden; }',

    /* header */
    '.ret-header {',
    '  display:flex; align-items:center; justify-content:space-between;',
    '  padding:50px 18px 14px;',
    '  background:linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 100%);',
    '  border-bottom:1px solid var(--ret-border);',
    '  flex-shrink:0;',
    '}',
    '.ret-header-back {',
    '  width:44px; height:44px; border-radius:50%;',
    '  background:rgba(255,255,255,0.07); border:1px solid var(--ret-border);',
    '  display:flex; align-items:center; justify-content:center;',
    '  cursor:pointer; color:var(--ret-text); transition:background 0.15s;',
    '  -webkit-tap-highlight-color:transparent; flex-shrink:0;',
    '}',
    '.ret-header-back:active { background:rgba(255,255,255,0.14); }',
    '.ret-header-center { text-align:center; flex:1; }',
    '.ret-header-brand {',
    '  font-family:var(--font-display); font-size:16px;',
    '  color:var(--ret-text); letter-spacing:0.2px;',
    '}',
    '.ret-brand-dot { color:var(--ret-calm); }',
    '.ret-header-mode-tag {',
    '  font-size:11px; font-weight:700; text-transform:uppercase;',
    '  letter-spacing:1.2px; color:var(--ret-calm); margin-top:3px;',
    '}',
    '.ret-header-overview-btn {',
    '  font-size:12px; font-weight:700; color:var(--ret-calm);',
    '  background:rgba(92,164,164,0.10); border:1px solid rgba(92,164,164,0.25);',
    '  border-radius:999px; padding:6px 14px; cursor:pointer;',
    '  -webkit-tap-highlight-color:transparent;',
    '}',
    '.ret-header-right { width:44px; display:flex; justify-content:flex-end; }',

    /* scrollable body */
    '.ret-body {',
    '  flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch;',
    '  padding:20px 0 12px;',
    '}',

    /* -- VERDICT HERO */
    '.ret-verdict-hero {',
    '  margin:0 16px 20px;',
    '  background:linear-gradient(160deg, rgba(92,164,164,0.10) 0%, rgba(15,32,53,0) 100%);',
    '  border:1px solid rgba(92,164,164,0.18);',
    '  border-radius:20px; padding:24px 20px;',
    '}',
    '.ret-verdict-label {',
    '  font-size:11px; font-weight:700; text-transform:uppercase;',
    '  letter-spacing:1px; color:var(--ret-calm); margin-bottom:10px;',
    '}',
    '.ret-verdict-headline {',
    '  font-family:var(--font-display);',
    '  font-size:22px; line-height:1.32;',
    '  color:var(--ret-text); margin-bottom:10px;',
    '}',
    '.ret-verdict-sub {',
    '  font-size:14px; color:var(--ret-sub); line-height:1.60; margin-bottom:18px;',
    '}',
    '.ret-verdict-meter-wrap { }',
    '.ret-verdict-meter-track {',
    '  height:7px; background:rgba(255,255,255,0.07); border-radius:4px; overflow:hidden; margin-bottom:7px;',
    '}',
    '.ret-verdict-meter-fill { height:100%; border-radius:4px; transition:width 0.9s cubic-bezier(0.16,1,0.3,1); }',
    '.ret-verdict-meter-row { display:flex; justify-content:space-between; }',
    '.ret-verdict-meter-pct { font-size:13px; font-weight:700; }',
    '.ret-verdict-meter-note { font-size:11px; color:var(--ret-faint); }',

    /* snapshot strip */
    '.ret-snapshot-strip {',
    '  display:flex; align-items:center;',
    '  margin:0 16px 20px;',
    '  background:var(--ret-surface);',
    '  border:1px solid var(--ret-border);',
    '  border-radius:16px; padding:16px;',
    '}',
    '.ret-snap-cell { flex:1; text-align:center; }',
    '.ret-snap-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--ret-faint); margin-bottom:6px; }',
    '.ret-snap-val   { font-size:17px; font-weight:700; }',
    '.ret-snap-divider { width:1px; height:36px; background:var(--ret-border); flex-shrink:0; margin:0 4px; }',

    /* quick nav tiles */
    '.ret-tile-grid {',
    '  display:grid; grid-template-columns:1fr 1fr; gap:10px;',
    '  margin:0 16px 20px; grid-auto-rows:1fr;',
    '}',
    '.ret-tile-grid .ret-tile:last-child:nth-child(odd) { grid-column:1 / -1; }',
    '.ret-tile {',
    '  background:var(--ret-surface); border:1px solid var(--ret-border);',
    '  border-radius:16px; padding:16px 14px;',
    '  display:flex; flex-direction:column; align-items:flex-start;',
    '  cursor:pointer; text-align:left;',
    '  transition:background 0.15s, border-color 0.15s;',
    '  -webkit-tap-highlight-color:transparent;',
    '  min-height:80px;',
    '}',
    '.ret-tile:active { background:var(--ret-surface-hi); border-color:var(--ret-border-hi); }',
    '.ret-tile-icon  { font-size:22px; margin-bottom:8px; }',
    '.ret-tile-label { font-size:14px; font-weight:700; color:var(--ret-text); margin-bottom:3px; }',
    '.ret-tile-note  { font-size:12px; color:var(--ret-sub); line-height:1.4; }',

    /* -- SECTION CARDS */
    '.ret-section-card {',
    '  margin:0 16px 14px;',
    '  background:var(--ret-surface);',
    '  border:1px solid var(--ret-border);',
    '  border-radius:18px; padding:22px 20px;',
    '}',
    '.ret-section-eyebrow {',
    '  font-size:10px; font-weight:700; text-transform:uppercase;',
    '  letter-spacing:0.8px; color:var(--ret-faint); margin-bottom:14px;',
    '}',
    '.ret-section-note {',
    '  font-size:11px; color:var(--ret-faint); line-height:1.55;',
    '  margin-top:14px; padding-top:12px;',
    '  border-top:1px solid var(--ret-border);',
    '}',
    '.ret-divider-label {',
    '  font-size:10px; font-weight:700; text-transform:uppercase;',
    '  letter-spacing:0.5px; color:var(--ret-faint);',
    '  margin:16px 0 10px;',
    '}',

    /* income section */
    '.ret-income-headline {',
    '  font-size:17px; font-weight:700; line-height:1.3; margin-bottom:16px;',
    '}',
    '.ret-income-rows { display:flex; flex-direction:column; gap:10px; }',
    '.ret-income-row {',
    '  display:flex; align-items:center; justify-content:space-between;',
    '  padding:13px 14px;',
    '  background:rgba(255,255,255,0.04);',
    '  border-radius:12px; border:1px solid var(--ret-border);',
    '}',
    '.ret-income-row-left { flex:1; min-width:0; }',
    '.ret-income-row-label { font-size:14px; font-weight:600; color:var(--ret-text); margin-bottom:2px; }',
    '.ret-income-row-note  { font-size:11px; color:var(--ret-sub); }',
    '.ret-income-row-amt   { font-size:16px; font-weight:700; color:var(--ret-text); white-space:nowrap; margin-left:14px; }',
    '.ret-surplus-row {',
    '  display:flex; align-items:center; justify-content:space-between;',
    '  margin-top:14px; padding:14px;',
    '  background:rgba(255,255,255,0.03); border:1px solid;',
    '  border-radius:12px;',
    '}',
    '.ret-surplus-label { font-size:13px; font-weight:700; color:var(--ret-text); margin-bottom:3px; }',
    '.ret-surplus-note  { font-size:11px; color:var(--ret-sub); line-height:1.4; max-width:180px; }',
    '.ret-surplus-val   { font-size:20px; font-weight:700; margin-left:12px; white-space:nowrap; }',

    /* runway section */
    '.ret-runway-headline { font-size:15px; font-weight:600; color:var(--ret-text); line-height:1.4; margin-bottom:18px; }',
    '.ret-runway-hero { text-align:center; padding:10px 0 14px; }',
    '.ret-runway-big  { font-family:var(--font-display); font-size:64px; line-height:1; margin-bottom:6px; }',
    '.ret-runway-unit { font-size:14px; color:var(--ret-sub); }',
    '.ret-runway-meter { height:7px; background:rgba(255,255,255,0.07); border-radius:4px; overflow:hidden; margin:0 0 18px; }',
    '.ret-runway-meter-fill { height:100%; border-radius:4px; transition:width 0.9s cubic-bezier(0.16,1,0.3,1); }',
    '.ret-scenario-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }',
    '.ret-scenario-card {',
    '  background:rgba(255,255,255,0.04); border:1px solid var(--ret-border);',
    '  border-radius:12px; padding:13px 10px; text-align:center;',
    '}',
    '.ret-scenario-icon  { font-size:18px; margin-bottom:7px; }',
    '.ret-scenario-label { font-size:10px; color:var(--ret-sub); line-height:1.35; margin-bottom:7px; }',
    '.ret-scenario-val   { font-size:15px; font-weight:700; color:var(--ret-text); margin-bottom:4px; }',
    '.ret-scenario-delta { font-size:11px; font-weight:700; }',
    '.ret-scenario-warn {',
    '  margin-top:12px; padding:11px 13px;',
    '  background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.20);',
    '  border-radius:11px; font-size:12px; color:var(--amber); line-height:1.55;',
    '}',

    /* spending section */
    '.ret-pace-badge {',
    '  border-radius:12px; border:1px solid; padding:14px 16px;',
    '  margin-bottom:14px;',
    '}',
    '.ret-pace-label { font-size:20px; font-weight:700; margin-bottom:5px; }',
    '.ret-pace-rate  { font-size:12px; color:var(--ret-sub); }',
    '.ret-pace-desc  { font-size:14px; color:var(--ret-sub); line-height:1.60; margin-bottom:14px; }',
    '.ret-guardrail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }',
    '.ret-guardrail-cell {',
    '  background:rgba(255,255,255,0.04); border:1px solid var(--ret-border);',
    '  border-radius:12px; padding:14px;',
    '}',
    '.ret-guardrail-label { font-size:11px; color:var(--ret-sub); margin-bottom:6px; }',
    '.ret-guardrail-val   { font-size:18px; font-weight:700; color:var(--ret-text); margin-bottom:3px; }',
    '.ret-guardrail-note  { font-size:11px; color:var(--ret-faint); line-height:1.4; }',
    '.ret-improve-tip {',
    '  padding:14px; background:rgba(92,164,164,0.07);',
    '  border:1px solid rgba(92,164,164,0.18); border-radius:12px;',
    '}',
    '.ret-improve-tip-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--ret-calm); margin-bottom:6px; }',
    '.ret-improve-tip-text  { font-size:13px; color:var(--ret-text); line-height:1.6; }',

    /* health section */
    '.ret-ht-card {',
    '  border:1px solid; border-radius:13px; padding:14px;',
    '  margin-bottom:14px;',
    '}',
    '.ret-ht-card-row    { display:flex; align-items:center; gap:12px; margin-bottom:8px; }',
    '.ret-ht-card-icon   { font-size:22px; }',
    '.ret-ht-card-title  { font-size:13px; font-weight:700; color:var(--ret-text); margin-bottom:3px; }',
    '.ret-ht-card-status { font-size:12px; font-weight:700; }',
    '.ret-ht-card-text   { font-size:13px; color:var(--ret-sub); line-height:1.6; }',
    '.ret-ht-row { display:flex; gap:14px; padding:14px 0; border-bottom:1px solid var(--ret-border); }',
    '.ret-ht-row:last-of-type { border-bottom:none; padding-bottom:0; }',
    '.ret-ht-icon  { font-size:22px; flex-shrink:0; width:30px; text-align:center; padding-top:1px; }',
    '.ret-ht-label { font-size:14px; font-weight:600; color:var(--ret-text); margin-bottom:5px; }',
    '.ret-ht-text  { font-size:13px; color:var(--ret-sub); line-height:1.6; }',
    '.ret-watch-item {',
    '  margin-top:14px; padding:14px;',
    '  background:rgba(197,160,106,0.08); border:1px solid rgba(197,160,106,0.20);',
    '  border-radius:12px;',
    '}',
    '.ret-watch-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--ret-warm); margin-bottom:6px; }',
    '.ret-watch-text  { font-size:13px; color:var(--ret-text); line-height:1.60; }',

    /* plan section */
    '.ret-plan-top {',
    '  display:flex; gap:16px; padding:16px;',
    '  background:rgba(92,164,164,0.08); border:1px solid rgba(92,164,164,0.18);',
    '  border-radius:14px; margin-bottom:16px;',
    '}',
    '.ret-plan-top-icon  { font-size:30px; flex-shrink:0; padding-top:2px; }',
    '.ret-plan-top-title { font-size:16px; font-weight:700; color:var(--ret-text); margin-bottom:7px; line-height:1.3; }',
    '.ret-plan-top-text  { font-size:13px; color:var(--ret-sub); line-height:1.62; }',
    '.ret-plan-rest-label {',
    '  font-size:10px; font-weight:700; text-transform:uppercase;',
    '  letter-spacing:0.5px; color:var(--ret-faint); margin-bottom:10px;',
    '}',
    '.ret-plan-rest-row {',
    '  display:flex; gap:14px; padding:13px 0;',
    '  border-top:1px solid var(--ret-border);',
    '}',
    '.ret-plan-rest-icon  { font-size:20px; flex-shrink:0; width:28px; text-align:center; padding-top:1px; }',
    '.ret-plan-rest-title { font-size:14px; font-weight:600; color:var(--ret-text); margin-bottom:4px; }',
    '.ret-plan-rest-text  { font-size:12px; color:var(--ret-sub); line-height:1.55; }',

    /* bottom nav */
    '.ret-nav {',
    '  display:flex; background:var(--ret-surface);',
    '  border-top:1px solid var(--ret-border);',
    '  flex-shrink:0;',
    '  padding-bottom:env(safe-area-inset-bottom, 0px);',
    '}',
    '.ret-nav-btn {',
    '  flex:1; display:flex; flex-direction:column; align-items:center;',
    '  gap:4px; padding:11px 4px 12px;',
    '  border:none; background:none; cursor:pointer;',
    '  color:var(--ret-faint);',
    '  transition:color 0.18s, background 0.18s;',
    '  -webkit-tap-highlight-color:transparent;',
    '  min-height:62px;',
    '}',
    '.ret-nav-btn.active { color:var(--ret-calm); background:rgba(92,164,164,0.06); }',
    '.ret-nav-btn:active  { background:rgba(255,255,255,0.04); }',
    '.ret-nav-icon  { font-size:21px; }',
    '.ret-nav-label { font-family:var(--font-body); font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; line-height:1.2; }',
  ].join('\n');
  document.head.appendChild(style);

})();


/* ═══════════════════════════════════════════════════════════
   RETIREMENT MODE STRATEGY — exported for home.js mode rendering
   Builds the retire mode strategy card HTML.
   Called by home.js buildStrategyBlock when mode === 'retire'.
═══════════════════════════════════════════════════════════ */
window.buildRetireStrategyHTML = function() {
  var g = window.G || {};
  var fmt = function(n, compact) {
    var v = Number(n||0), a = Math.abs(Math.round(v)), s = v < 0 ? '-$' : '$';
    if (compact && a >= 1e6) return s + (a/1e6).toFixed(1) + 'M';
    if (compact && a >= 1e3) return s + (a/1e3).toFixed(1) + 'k';
    return s + a.toLocaleString('en-US');
  };

  var income       = g.income || 0;
  var takeHome     = g.takeHome || 0;
  var fcf          = g.fcf || 0;
  var matchStatus  = g.retMatch || 'none';
  var matchCapture = matchStatus === 'full' || matchStatus === 'maxed';
  var totalDebt    = (g.ccDebt||0) + (g.carDebt||0) + (g.studentDebt||0) + (g.otherDebt||0);
  var annualInt    = totalDebt > 0 ? Math.round((g.ccDebt||0)*(g.ccRate||21)/100 + (g.carDebt||0)*0.075 + (g.studentDebt||0)*0.055 + (g.otherDebt||0)*0.09) : 0;
  var isRetired    = g.retirementStage === 'retired';

  // Retire-specific truth gate — uses ONLY retire-entered fields to avoid cross-mode bleed
  var hasRealRetireData = (g.retirementSavings > 0) || (g.socialSecurityMonthly > 0) || (g.pensionIncome > 0);

  // Pre-retirement projection gate — income alone does not qualify
  var hasProjectionData = (g.retireSavings > 0) || (g.retirementSavings > 0)
    || (g.savingsAmt > 0) || (g.depositSaved > 0)
    || (g.pensionIncome > 0) || (g.socialSecurityMonthly > 0);
  var canProject = !isRetired && income > 0 && hasProjectionData;

  // ── Already-retired branch ────────────────────────────────
  if (isRetired) {
    // No real retire-specific inputs entered — show placeholder only
    if (!hasRealRetireData) {
      return '<div class="tracent-mode-header">' +
        '<div class="tracent-mode-badge" style="background:rgba(0,119,182,0.10);color:#0077B6;">\ud83c\udf05 Retire Mode \u2014 Retirement Stability</div>' +
        '<div class="tracent-mode-insight" style="margin-top:12px;">' +
          '<div class="tracent-mode-insight-label">Stability outlook</div>' +
          '<div class="tracent-mode-insight-text">Reserve picture not yet defined. Add your savings, Social Security, or pension amount to see your stability picture.</div>' +
        '</div>' +
      '</div>';
    }
    var _efRawR      = g.emergency;
    var _efProvidedR = _efRawR !== undefined && _efRawR !== null && _efRawR !== '';
    var efMonths     = _efProvidedR ? parseInt(_efRawR, 10) : null;
    var incSrc       = g.retirementIncomeSource || null;
    var incSrcLabel  = { social_security:'Social Security', pension:'Pension income', withdrawals:'Savings / investments', combination:'Multiple sources' }[incSrc] || '\u2014';
    var stabilityLabel = totalDebt === 0 ? 'Stable' : 'Debt present \u2014 review';
    var stabilityColor = totalDebt === 0 ? 'var(--green)' : 'var(--amber)';
    var insight = totalDebt > 0
      ? 'Your debt costs ' + fmt(annualInt,true) + '/yr in interest. In retirement, this directly reduces available income. Clearing it improves monthly cash flow by ' + fmt(Math.round(annualInt/12)) + '.'
      : (_efProvidedR && efMonths < 6)
      ? 'Maintain at least 6 months of liquid savings as a buffer. This protects your portfolio from forced drawdowns during unexpected costs.'
      : 'Your position is stable. Consistent withdrawal discipline and an annual review are the most important things now.';

    return '<div class="tracent-mode-header">' +
      '<div class="tracent-mode-badge" style="background:rgba(0,119,182,0.10);color:#0077B6;">\ud83c\udf05 Retire Mode \u2014 Retirement Stability</div>' +
      '<div class="tracent-mode-grid-3">' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Income source</div><div class="tracent-mode-cell-value">' + incSrcLabel + '</div><div class="tracent-mode-cell-note">Primary retirement income</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Position</div><div class="tracent-mode-cell-value" style="color:' + stabilityColor + '">' + stabilityLabel + '</div><div class="tracent-mode-cell-note">Overall stability signal</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Emergency buffer</div><div class="tracent-mode-cell-value" style="color:' + (!_efProvidedR ? 'var(--gray-3)' : efMonths>=6?'var(--green)':efMonths>=3?'var(--amber)':'var(--red)') + '">' + (!_efProvidedR ? '\u2014' : efMonths + ' mo') + '</div><div class="tracent-mode-cell-note">' + (!_efProvidedR ? 'Not provided' : efMonths>=6?'Strong buffer':'Build to 6+ months') + '</div></div>' +
        '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Debt drag (annual)</div><div class="tracent-mode-cell-value" style="color:' + (annualInt>0?'var(--red)':'var(--green)') + '">' + fmt(annualInt,true) + '</div><div class="tracent-mode-cell-note">' + (annualInt>0?'Reduces monthly income':'No debt drag') + '</div></div>' +
      '</div>' +
      '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">\ud83d\udca1 What matters most now</div><div class="tracent-mode-insight-text">' + insight + '</div></div>' +
    '</div>';
  }

  // ── Pre-retirement branch ─────────────────────────────────
  var currentContrib = income > 0 ? Math.round(income * 0.06) : 0;
  var idealContrib   = income > 0 ? Math.round(income * 0.15) : 0;
  var contribGap     = Math.max(0, idealContrib - currentContrib);
  var monthlyContrib = Math.round(currentContrib / 12);
  var monthlyIdeal   = Math.round(idealContrib / 12);

  function fv(monthlyPmt, years) { var r = 0.07/12, n = years*12; return Math.round(monthlyPmt * ((Math.pow(1+r,n)-1)/r)); }
  // Years to retirement — use actual user inputs so portfolio growth is anchored to real timeline
  var _retYrs      = Math.max(10, parseInt(g.retirementAge || g.retireAge || 65) - parseInt(g.currentAge || g.age || 35));
  // Compound the existing retirement savings forward — this is the starting balance, not a contribution stream
  var _portfolio   = g.retirementSavings || 0;
  var _portfolioFV = _portfolio > 0 ? Math.round(_portfolio * Math.pow(1.07, _retYrs)) : 0;
  var fvCurrent  = canProject ? (_portfolioFV + fv(monthlyContrib, _retYrs)) : 0;
  var fvIdeal    = canProject ? (_portfolioFV + fv(monthlyIdeal,   _retYrs)) : 0;
  var debtDragFV = annualInt > 0 && canProject ? fv(Math.round(annualInt/12), _retYrs) : 0;

  var futureImpact = (function() {
    if (!matchCapture && matchStatus !== 'none') {
      var matchExtra = canProject ? ' Over 30 years at 7%, capturing it fully could add significantly to your projected balance.' : '';
      return 'Your employer match is not fully captured. That\'s an immediate 50\u2013100% guaranteed return.' + matchExtra;
    }
    if (totalDebt > 0 && annualInt > 500) return 'Your debt costs ' + fmt(annualInt,true) + '/yr in interest.' + (debtDragFV > 0 ? ' That same capital invested monthly would compound to ' + fmt(debtDragFV,true) + ' over 30 years.' : ' Clearing it frees capital for compounding.');
    if (canProject && contribGap > 0) return 'At your current rate, you\'re projected to reach ~' + fmt(fvCurrent,true) + ' in 30 years. At the 15% ideal rate, that grows to ~' + fmt(fvIdeal,true) + '.';
    if (!canProject && income > 0) return 'Add your retirement savings or portfolio balance to see a projection of where your plan is heading.';
    if (income === 0) return 'Add your income and retirement savings to see how your plan is tracking.';
    return 'Your retirement trajectory looks solid. The next lever is consistency over time.';
  })();

  var trajectoryLabel = matchCapture && !totalDebt ? 'On track' : matchCapture ? 'Debt drag present' : 'Below ideal pace';
  var trajectoryColor = matchCapture && !totalDebt ? 'var(--green)' : matchCapture ? 'var(--amber)' : 'var(--red)';

  var projCell = canProject
    ? '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Est. 30-yr projection</div><div class="tracent-mode-cell-value">' + fmt(fvCurrent,true) + '</div><div class="tracent-mode-cell-note">At current pace \u00b7 7% avg \u00b7 illustrative</div></div>'
    : '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Est. 30-yr projection</div><div class="tracent-mode-cell-value">\u2014</div><div class="tracent-mode-cell-note">Add retirement savings to project</div></div>';

  var contribBars = income > 0
    ? '<div class="tracent-retire-compare">' +
        '<div class="tracent-mode-section-label">Contribution comparison</div>' +
        '<div class="tracent-retire-bar-row"><span>Current rate</span><div class="tracent-retire-bar-track"><div class="tracent-retire-bar-fill" style="width:' + Math.min(100, Math.round((currentContrib/Math.max(idealContrib,1))*100)) + '%;background:var(--teal)"></div></div><span>' + fmt(currentContrib,true) + '/yr</span></div>' +
        '<div class="tracent-retire-bar-row"><span>Ideal (15%)</span><div class="tracent-retire-bar-track"><div class="tracent-retire-bar-fill" style="width:100%;background:var(--green)"></div></div><span>' + fmt(idealContrib,true) + '/yr</span></div>' +
      '</div>'
    : '';

  return '<div class="tracent-mode-header">' +
    '<div class="tracent-mode-badge" style="background:rgba(0,119,182,0.10);color:#0077B6;">\ud83c\udf05 Retire Mode \u2014 Long-Horizon Security</div>' +
    '<div class="tracent-mode-grid-3">' +
      '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Trajectory signal</div><div class="tracent-mode-cell-value" style="color:' + trajectoryColor + '">' + trajectoryLabel + '</div><div class="tracent-mode-cell-note">Based on match + debt position</div></div>' +
      projCell +
      '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Employer match</div><div class="tracent-mode-cell-value" style="color:' + (matchCapture ? 'var(--green)' : 'var(--amber)') + '">' + matchStatus + '</div><div class="tracent-mode-cell-note">' + (matchCapture ? 'Fully captured' : 'Not fully captured') + '</div></div>' +
      '<div class="tracent-mode-cell"><div class="tracent-mode-cell-label">Debt drag (annual)</div><div class="tracent-mode-cell-value" style="color:' + (annualInt > 0 ? 'var(--red)' : 'var(--green)') + '">' + fmt(annualInt,true) + '</div><div class="tracent-mode-cell-note">' + (annualInt > 0 ? 'Competing with contributions' : 'No debt drag') + '</div></div>' +
    '</div>' +
    contribBars +
    '<div class="tracent-mode-insight"><div class="tracent-mode-insight-label">\ud83d\udca1 Future impact</div><div class="tracent-mode-insight-text">' + futureImpact + '</div></div>' +
  '</div>';
};
