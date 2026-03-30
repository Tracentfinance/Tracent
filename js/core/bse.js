/* ═══ Tracent Core: Behavioral State Engine (BSE) v3 ═══
   PRIMARY RENDER AUTHORITY.
   Must load LAST — intercepts v21RenderPostAnalysis.
   
   Controls: archetype detection, score hero, module visibility,
   focus card, debt relief, NBM tone, adaptive nav,
   body classes, stagger animation, retirement enforcement.
═══════════════════════════════════════════════ */

/* ═══ MODULE: BSE — Behavioral State Engine (primary render authority) ═══ */
/* ============================================================
   TRACENT BEHAVIORAL STATE ENGINE  v3  —  Primary Control
   ============================================================
   BSE is the rendering authority. The calculation engine
   (score, NBM, debt math) remains source of truth for numbers.
   BSE decides what shows, in what order, at what density.

   Flow:
     G (financial data)
       -> BSE._compute()          reads G + pbfdeState + mem
       -> BSE._renderHome()       decides EVERYTHING shown
          |-> _applyScoreHero()   score prominence / suppression
          |-> _applyModuleVis()   show/hide all modules via CSS classes
          |-> _buildFocusCard()   one action + one explanation
          |-> _buildDebtRelief()  debt relief-first layered view
          |-> _applyNBMTone()     archetype-aware NBM framing
          |-> _applyNav()         adaptive bottom nav
          |-> _applyBodyClasses() CSS hooks for archetype/stress/density
          |-> _staggerHome()      BSE-ordered entrance animation
   ============================================================ */
(function(){
  if (window.__TRACENT_BSE__) return;
  window.__TRACENT_BSE__ = true;

  /* ----------------------------------------------------------
     1. BEHAVIORAL MEMORY
  ---------------------------------------------------------- */
  var MEM_KEY = 'tracent_bse_mem';
  var _mem = (function(){
    try { var r = JSON.parse(localStorage.getItem(MEM_KEY)||'null'); if(r&&r.v===3) return r; } catch(e){}
    return { v:3, sessions:0, debtLayerMax:1, density:null, archetype:null, modeVisits:{}, avoiderCount:0, nbmClicks:0 };
  })();
  function _saveMem(){ try{ localStorage.setItem(MEM_KEY, JSON.stringify(_mem)); }catch(e){} }
  _mem.sessions = (_mem.sessions||0) + 1;
  _saveMem();

  /* ----------------------------------------------------------
     2. BSE OBJECT
  ---------------------------------------------------------- */
  var BSE = window.BSE = {
    archetype:'stable_confident', stress:0, pressure:0, engagement:0,
    stage:'build',
    focusOnly:false, showScore:true, scoreProminent:true,
    navStyle:'standard', densityLevel:'normal', debtLayer:1, nbmStyle:'standard',
    show:{
      focusCard:false, verdictBlock:true, compactScore:true, modeRail:true,
      nbmCard:true, retentionCard:true, premiumTeaser:false, metricsStrip:true,
      modeStrategy:true, driverStrip:true, debtRelief:false
    },
    homeOrder:['verdictBlock','focusCard','nbmCard','compactScore','modeRail','retentionCard'],
    initialized:false
  };

  /* ----------------------------------------------------------
     3. ARCHETYPE CONFIGURATIONS
     Each defines the complete rendered experience for that state.
  ---------------------------------------------------------- */
  var ARCH_CFG = {
    anxious_overwhelmed:{
      focusOnly:true, showScore:false, scoreProminent:false,
      navStyle:'minimal', densityLevel:'minimal', debtLayer:1, nbmStyle:'calm_single',
      show:{ focusCard:true, verdictBlock:false, compactScore:false, modeRail:false,
             nbmCard:false, retentionCard:false, premiumTeaser:false, metricsStrip:false,
             modeStrategy:false, driverStrip:false, debtRelief:true },
      homeOrder:['focusCard']
    },
    avoider:{
      focusOnly:true, showScore:false, scoreProminent:false,
      navStyle:'minimal', densityLevel:'minimal', debtLayer:1, nbmStyle:'micro_step',
      show:{ focusCard:true, verdictBlock:false, compactScore:false, modeRail:false,
             nbmCard:true, retentionCard:false, premiumTeaser:false, metricsStrip:false,
             modeStrategy:false, driverStrip:false, debtRelief:true },
      homeOrder:['focusCard','nbmCard']
    },
    stable_confident:{
      focusOnly:false, showScore:true, scoreProminent:true,
      navStyle:'standard', densityLevel:'normal', debtLayer:2, nbmStyle:'standard',
      show:{ focusCard:true, verdictBlock:true, compactScore:true, modeRail:true,
             nbmCard:true, retentionCard:true, premiumTeaser:false, metricsStrip:true,
             modeStrategy:true, driverStrip:true, debtRelief:false },
      homeOrder:['verdictBlock','focusCard','nbmCard','compactScore','modeRail','retentionCard']
    },
    optimizer:{
      focusOnly:false, showScore:true, scoreProminent:true,
      navStyle:'standard', densityLevel:'full', debtLayer:4, nbmStyle:'ranked_detail',
      show:{ focusCard:false, verdictBlock:true, compactScore:true, modeRail:true,
             nbmCard:true, retentionCard:true, premiumTeaser:true, metricsStrip:true,
             modeStrategy:true, driverStrip:true, debtRelief:false },
      homeOrder:['verdictBlock','compactScore','nbmCard','modeRail','modeStrategy','retentionCard']
    },
    pre_retirement:{
      focusOnly:false, showScore:true, scoreProminent:false,
      navStyle:'retirement', densityLevel:'normal', debtLayer:2, nbmStyle:'readiness_first',
      show:{ focusCard:true, verdictBlock:true, compactScore:false, modeRail:false,
             nbmCard:true, retentionCard:true, premiumTeaser:false, metricsStrip:false,
             modeStrategy:true, driverStrip:false, debtRelief:false },
      homeOrder:['verdictBlock','focusCard','nbmCard','modeStrategy','retentionCard']
    },
    in_retirement:{
      focusOnly:false, showScore:false, scoreProminent:false,
      navStyle:'retirement', densityLevel:'minimal', debtLayer:2, nbmStyle:'stability_first',
      show:{ focusCard:true, verdictBlock:false, compactScore:false, modeRail:false,
             nbmCard:true, retentionCard:false, premiumTeaser:false, metricsStrip:false,
             modeStrategy:false, driverStrip:false, debtRelief:false },
      homeOrder:['focusCard','nbmCard']
    }
  };

  /* ----------------------------------------------------------
     4. COMPUTE
     Reads G + pbfdeState + memory. Produces full BSE config.
  ---------------------------------------------------------- */
  function _compute(){
    var g  = window.G  || {};
    var ps = window.pbfdeState || {};
    var fcf      = g.fcf || 0;
    var income   = g.income || 0;
    var takeHome = g.takeHome || Math.round(income/12*0.72);
    var ccDebt   = g.ccDebt   || 0;
    var totDebt  = (g.ccDebt||0)+(g.carDebt||0)+(g.studentDebt||0)+(g.otherDebt||0);
    var dti      = g.dti || 0;
    var efMo     = parseInt(g.emergency||'0');
    var score    = g.score || 0;
    var intent   = g.primaryIntent || ps.activeModule || 'stable';
    var age      = parseInt(g.currentAge||g.age||0);
    var retAge   = parseInt(g.retireAge||g.retirementAge||65);

    /* stress 0-10 */
    var s=0;
    if(fcf<0) s+=4; else if(fcf<200) s+=2;
    if(efMo===0) s+=2; else if(efMo<2) s+=1;
    if(ccDebt>8000) s+=2; else if(ccDebt>3000) s+=1;
    if(dti>50) s+=2; else if(dti>40) s+=1;
    BSE.stress = Math.min(10,s);

    /* pressure 0-10 */
    var p=0;
    if(dti>43) p+=3;
    if(totDebt>takeHome*12*0.5) p+=2;
    if(ccDebt>5000) p+=2;
    if(fcf<0) p+=3;
    BSE.pressure = Math.min(10,p);

    /* engagement 0-10 */
    BSE.engagement = Math.min(10,Math.round(
      (ps.engagementDepth||0)*0.5 + (ps.nbmClickCount||0)*0.5 + Math.min(4,_mem.sessions*0.5)
    ));

    /* archetype */
    var at;
    if(intent==='retire' && age>=retAge-2)       at='in_retirement';
    else if(intent==='retire' && age>=retAge-10) at='pre_retirement';
    else if(BSE.stress>=7)                       at='anxious_overwhelmed';
    else if(BSE.pressure>=7)                     at='anxious_overwhelmed';
    else if(ps.avoidance||(ps.ignoredCtas||0)>4||_mem.avoiderCount>3) at='avoider';
    else if(BSE.engagement>=6&&BSE.stress<4&&score>=60) at='optimizer';
    else if(score>=70&&BSE.stress<3)             at='stable_confident';
    else if(BSE.stress>=4||score<55)             at='anxious_overwhelmed';
    else                                         at='stable_confident';
    /* memory can upgrade density for returning power users */
    if(_mem.density==='full'&&at!=='in_retirement'&&at!=='anxious_overwhelmed') at='optimizer';
    BSE.archetype = at;

    /* stage */
    if(BSE.stress>=7||BSE.pressure>=7) BSE.stage='stabilize';
    else if(score<55||BSE.stress>=4)   BSE.stage='build';
    else if(at==='in_retirement'||at==='pre_retirement') BSE.stage='sustain';
    else if(score>=70&&BSE.engagement>=4) BSE.stage='optimize';
    else BSE.stage='build';

    /* apply archetype config */
    var cfg = ARCH_CFG[at] || ARCH_CFG.stable_confident;
    BSE.focusOnly     = cfg.focusOnly;
    BSE.showScore     = cfg.showScore;
    BSE.scoreProminent= cfg.scoreProminent!==false;
    BSE.navStyle      = cfg.navStyle;
    BSE.densityLevel  = cfg.densityLevel;
    BSE.nbmStyle      = cfg.nbmStyle;
    BSE.homeOrder     = cfg.homeOrder.slice();
    BSE.debtLayer     = Math.max(cfg.debtLayer||1, _mem.debtLayerMax||1);
    Object.assign(BSE.show, cfg.show);

    /* premium: only for eligible optimizers */
    if(BSE.stress>=5||at==='in_retirement'||at==='pre_retirement') BSE.show.premiumTeaser=false;
    if(BSE.show.premiumTeaser){
      BSE.show.premiumTeaser=(typeof window.shouldShowPremium==='function')?window.shouldShowPremium():false;
    }
    /* debt relief: whenever there is debt and user is not optimizer */
    if(totDebt>0&&at!=='optimizer') BSE.show.debtRelief=true;

    BSE.initialized=true;
    _mem.archetype=at;
    _saveMem();
  }

  /* ----------------------------------------------------------
     5. HOME ORCHESTRATOR  —  the single render authority
  ---------------------------------------------------------- */
  function _renderHome(){
    if(!BSE.initialized) return;
    _applyScoreHero();
    _applyModuleVis();
    if(BSE.show.focusCard) _buildFocusCard();
    if(BSE.show.debtRelief) _buildDebtRelief();
    _applyNBMTone();
    _applyNav();
    _applyBodyClasses();
    setTimeout(_staggerHome, 30);
  }

  /* ----------------------------------------------------------
     5a. SCORE HERO — suppress, de-emphasize, or show fully
  ---------------------------------------------------------- */
  /* Score hero rendering delegated to render/home.js (window.bseApplyScoreHero).
     BSE decides showScore + scoreProminent. Home module applies to DOM. */
  function _applyScoreHero(){
    if(typeof window.bseApplyScoreHero === 'function') window.bseApplyScoreHero();
  }

  /* _ensureMinimalHeader no longer needed — header-greeting handles this */
  function _ensureMinimalHeader(){ /* no-op: replaced by bse-header-greeting */ }

  /* ----------------------------------------------------------
     5b. MODULE VISIBILITY  —  the authoritative show/hide pass
  ---------------------------------------------------------- */
  /* Module visibility rendering delegated to render/home.js (window.bseApplyModuleVis).
     BSE decides BSE.show + BSE.focusOnly + BSE.debtLayer. Home module applies to DOM. */
  function _applyModuleVis(){
    if(typeof window.bseApplyModuleVis === 'function') window.bseApplyModuleVis();
  }

  /* ----------------------------------------------------------
     5c. FOCUS CARD  —  the primary home experience
  ---------------------------------------------------------- */
  /* Focus card rendering delegated to render/home.js (window.bseRenderFocusCard).
     BSE decides WHEN. Home module decides HOW. */
  function _buildFocusCard(){
    if(typeof window.bseRenderFocusCard === 'function'){
      window.bseRenderFocusCard();
    }
  }

  /* ----------------------------------------------------------
     5d. DEBT RELIEF  —  progressive 4-layer structure
  ---------------------------------------------------------- */
  /* Debt relief rendering delegated to render/debt.js (window.bseRenderDebtRelief).
     BSE decides WHEN and at what layer. Debt module decides HOW. */
  function _buildDebtRelief(){
    if(typeof window.bseRenderDebtRelief === 'function'){
      window.bseRenderDebtRelief();
    }
  }

  /* ----------------------------------------------------------
     5e. NBM TONE
  ---------------------------------------------------------- */
  /* NBM tone rendering delegated to render/home.js (window.bseApplyNBMTone).
     BSE decides nbmStyle. Home module applies it to the DOM. */
  function _applyNBMTone(){
    if(typeof window.bseApplyNBMTone === 'function') window.bseApplyNBMTone();
  }

  /* ----------------------------------------------------------
     5f. ADAPTIVE NAV
  ---------------------------------------------------------- */
  /* Nav config + rendering: BSE decides navStyle, navigation.js applies to DOM.
     Nav configs stay here (behavioral decisions). DOM application delegated. */
  function _applyNav(){
    var cfgs={
      minimal:[
        {id:'nav-home',label:'Focus',show:true},
        {id:'nav-debt',label:'Debt',show:true},
        {id:'nav-advice',show:false},{id:'nav-rates',show:false},
        {id:'nav-progress',show:false},{id:'nav-settings',label:'Settings',show:true}
      ],
      retirement:[
        {id:'nav-home',label:'Summary',show:true},
        {id:'nav-advice',label:'Advice',show:true},
        {id:'nav-debt',show:false},{id:'nav-rates',show:false},
        {id:'nav-progress',label:'Progress',show:true},
        {id:'nav-settings',label:'Settings',show:true}
      ],
      standard:[
        {id:'nav-home',label:'Focus',show:true},
        {id:'nav-debt',label:'Debt',show:true},
        {id:'nav-advice',label:'Explore',show:true},
        {id:'nav-rates',show:false},
        {id:'nav-progress',label:'Progress',show:true},
        {id:'nav-settings',label:'Settings',show:true}
      ]
    };
    var items=cfgs[BSE.navStyle]||cfgs.standard;
    /* Delegate DOM application to navigation.js */
    if(typeof window.bseApplyNavConfig === 'function') window.bseApplyNavConfig(items);

    /* ── Debt nav override: always show Debt tab when user has meaningful liabilities ── */
    /* Retirement navStyle hides nav-debt by default, but debt payoff is relevant regardless
       of retirement intent. Show the button whenever any consumer debt exists. */
    var _g = window.G || {};
    var _totDebt = (_g.ccDebt||0)+(_g.carDebt||0)+(_g.studentDebt||0)+(_g.otherDebt||0);
    if (_totDebt > 0) {
      var _nd = document.getElementById('nav-debt');
      if (_nd) { _nd.style.display = ''; }
    }

    /* ── Retirement structural enforcement ── */
    _enforceRetirementLifeStage();
  }

  /* ----------------------------------------------------------
     5f-b. RETIREMENT LIFE STAGE ENFORCEMENT
     Structurally removes career UI for in_retirement users.
     De-emphasizes career for pre_retirement users.
     Adapts progress subnav by life stage.
  ---------------------------------------------------------- */
  function _enforceRetirementLifeStage(){
    var at = BSE.archetype;

    /* Delegate progress pill rendering to render/progress.js */
    if (typeof window.applyLifeStageProgress === 'function') {
      window.applyLifeStageProgress(at);
    }

    /* Delegate career UI rendering to render/progress.js */
    if (typeof window.applyLifeStageCareerUI === 'function') {
      window.applyLifeStageCareerUI(at);
    }

    /* ── Retirement-specific greeting adaptation ── */
    var isRetirementUser = (at === 'in_retirement') || (at === 'pre_retirement');
    var greetEl = document.getElementById('bse-header-greeting');
    if (greetEl && isRetirementUser) {
      var existingGreet = greetEl.textContent || '';
      if (at === 'in_retirement' && existingGreet.indexOf('retirement') === -1) {
        /* Don't override if already set — just ensure tone */
      }
    }
  }

  /* ----------------------------------------------------------
     5g. BODY CLASSES  — CSS-level archetype targeting
  ---------------------------------------------------------- */
  function _applyBodyClasses(){
    var b=document.body;
    b.className=b.className.replace(/\bbse-\S+/g,'').trim();
    b.classList.add('bse-arch-'+(BSE.archetype||'default'));
    b.classList.add('bse-stress-'+(BSE.stress>=7?'high':BSE.stress>=4?'mid':'low'));
    b.classList.add('bse-density-'+BSE.densityLevel);
    b.classList.add('bse-stage-'+BSE.stage);
    /* Debt pressure class for debt tab */
    if(BSE.pressure>=7) b.classList.add('bse-pressure-high');
  }

  /* ----------------------------------------------------------
     5h. STAGGER  — BSE-ordered entrance animation
  ---------------------------------------------------------- */
  /* Home stagger animation delegated to render/home.js (window.bseStaggerHome).
     BSE decides homeOrder. Home module runs the animation. */
  function _staggerHome(){
    if(typeof window.bseStaggerHome === 'function') window.bseStaggerHome();
  }

  /* ----------------------------------------------------------
     6. PUBLIC API
  ---------------------------------------------------------- */
  window.bseRevealDebtLayer=function(){
    BSE.debtLayer=Math.min(4,(BSE.debtLayer||1)+1);
    _mem.debtLayerMax=Math.max(_mem.debtLayerMax||1,BSE.debtLayer);
    _saveMem(); _buildDebtRelief();
    try{tracentTrack('bse_debt_layer',{layer:BSE.debtLayer});}catch(e){}
  };

  window.bseUnlockDebtStrategy=function(){
    /* Remove strategy-hidden class and link to debt tab */
    var tabDebt=document.getElementById('tab-debtrank');
    if(tabDebt) tabDebt.classList.remove('bse-debt-strategy-hidden');
    BSE.debtLayer=4; _mem.debtLayerMax=4; _saveMem();
    _buildDebtRelief();
    try{tracentTrack('bse_debt_strategy_unlocked',{});}catch(e){}
  };

  var _detailMode=false;
  window.bseToggleDetail=function(){
    _detailMode=!_detailMode;
    if(_detailMode){
      _mem.density='full';
      ['v21-mode-rail','v21-mode-rail-home','home-metrics','v21-verdict-block','v21-compact-score','v21-retention-card'].forEach(function(id){
        var el=document.getElementById(id); if(el) el.style.display='';
      });
      var tabHome=document.getElementById('tab-home');
      if(tabHome) tabHome.classList.remove('bse-focus-active');
    } else {
      _mem.density=null; _applyModuleVis();
    }
    _saveMem();
    var lnk=document.querySelector('.bse-expand-link');
    if(lnk) lnk.textContent=_detailMode?'Back to focused view \u2191':'See full dashboard';
  };

  window.bseOpenPlan=function(){
    try{ switchTab('debtrank'); setNavByName('debt'); }catch(e){}
    try{tracentTrack('bse_focus_cta',{archetype:BSE.archetype});}catch(e){}
  };

  window.bseOpenRetirementReview=function(){
    try{ switchTab('progress'); setNavByName('progress'); setTimeout(function(){ showProgressSub('retirement'); },80); }catch(e){}
    try{tracentTrack('bse_retirement_review',{archetype:BSE.archetype});}catch(e){}
  };

  window.bseRender=function(){ _compute(); _renderHome(); };

  /* Kinetic counter — makes numbers roll to their target */
  window.bseAnimateCounter=function(el, target, duration){
    if(!el) return;
    duration = duration || 800;
    var start = parseInt(el.textContent) || 0;
    var diff = target - start;
    if(diff === 0) return;
    var startTime = null;
    function step(ts){
      if(!startTime) startTime = ts;
      var p = Math.min((ts - startTime) / duration, 1);
      var ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = Math.round(start + diff * ease);
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  /* ----------------------------------------------------------
     7. INTERCEPT v21RenderPostAnalysis  —  BSE RUNS FIRST
  ---------------------------------------------------------- */
  var _downstreamRPA=window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis=function(){
    /* Step 1: Compute BSE from fresh financial state */
    _compute();
    /* Step 2: Fire existing downstream passes (score band, verdict, NBM, retention...) */
    if(typeof _downstreamRPA==='function') _downstreamRPA();
    /* Step 3: BSE enforces its rendering decisions over everything downstream built */
    setTimeout(_renderHome, 50);
  };

  /* Intercept switchTab — rebuild relief and focus when entering those tabs */
  var _downstreamSwitch=window.switchTab;
  window.switchTab=function(tabId){
    if(typeof _downstreamSwitch==='function') _downstreamSwitch(tabId);
    if(tabId==='debtrank'||tabId==='debt'){
      _mem.modeVisits=_mem.modeVisits||{}; _mem.modeVisits.debt=(_mem.modeVisits.debt||0)+1; _saveMem();
      setTimeout(function(){ if(BSE.initialized){ _compute(); _buildDebtRelief(); _applyModuleVis(); }},80);
    }
    if(tabId==='home'){ setTimeout(function(){ if(BSE.initialized) _buildFocusCard(); },80); }
  };

  /* ----------------------------------------------------------
     8. INJECT HTML SLOTS + STYLES
  ---------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded',function(){
    /* Slots now exist in HTML markup — no injection needed.
       bse-focus-mode: first child of #tab-home
       bse-debt-relief: first child of #tab-debtrank */
    _injectStyles();
  });

  /* ----------------------------------------------------------
     9. CSS
  ---------------------------------------------------------- */
  function _injectStyles(){
    var s=document.createElement('style');
    s.textContent=[
      /* Score suppression — applied via dash-header class */
      '.bse-score-hidden #bse-score-zone{display:none!important}',
      '.bse-score-hidden #bse-stat-strip{display:none!important}',
      '.bse-score-hidden #bse-planning-note{display:none!important}',
      '.bse-score-deemphasized #bse-score-zone{opacity:0.55!important;transform:scale(0.90)!important}',
      '.bse-score-deemphasized #bse-stat-strip{display:none!important}',
      '.bse-score-deemphasized .score-hero-wrap{padding-bottom:4px!important}',

      /* Focus-active: CSS-driven module suppression for tab-home */
      '#tab-home.bse-focus-active #home-metrics{display:none!important}',
      '#tab-home.bse-focus-active #v21-mode-rail-home{display:none!important}',
      '#tab-home.bse-focus-active #v21-retention-card{display:none!important}',
      '#tab-home.bse-focus-active #v21-premium-teaser{display:none!important}',
      '#tab-home.bse-focus-active #hm-readiness-card{display:none!important}',
      '#tab-home.bse-focus-active #v21-verdict-block{display:none!important}',
      '#tab-home.bse-focus-active #v21-compact-score{display:none!important}',
      '#tab-home.bse-focus-active #v21-driver-strip{display:none!important}',
      '#tab-home.bse-focus-active #v21-mode-strategy{display:none!important}',
      '#tab-home.bse-focus-active #v21-position-label{display:none!important}',

      /* Debt: strategy tools hidden until revealed */
      '#tab-debtrank.bse-debt-strategy-hidden #bse-debt-strategy{display:none!important}',
      '#tab-debtrank.bse-debt-strategy-hidden #debt-rank-list{display:none!important}',
      '#tab-debtrank.bse-debt-strategy-hidden #debt-countdown-banner{display:none!important}',
      /* Debt relief always visible even when strategy hidden */
      '#tab-debtrank.bse-debt-strategy-hidden #bse-debt-relief{display:block!important}',

      /* Global: stressed users suppress mode rail and premium */
      '.bse-stress-high #v21-mode-rail,.bse-stress-high #v21-mode-rail-home{display:none!important}',
      '.bse-stress-high #v21-premium-teaser{display:none!important}',
      '.bse-pressure-high #v21-premium-teaser{display:none!important}',

      /* ── Retirement: structural CSS enforcement ── */
      /* in_retirement: remove all career, growth, accumulation UI */
      '.bse-arch-in_retirement #v21-mode-rail,.bse-arch-in_retirement #v21-mode-rail-home{display:none!important}',
      '.bse-arch-in_retirement #v21-premium-teaser{display:none!important}',
      '.bse-arch-in_retirement #ppill-career{display:none!important}',
      '.bse-arch-in_retirement #prog-sub-career{display:none!important}',
      '.bse-arch-in_retirement .ppill-growth-context{display:none!important}',
      '.bse-arch-in_retirement #prog-sub-goals .goal-growth-only{display:none!important}',
      '.bse-arch-in_retirement #career-compare-card{display:none!important}',
      '.bse-arch-in_retirement #career-chart-card{display:none!important}',
      '.bse-arch-in_retirement #career-promo-card{display:none!important}',
      '.bse-arch-in_retirement #career-log-card{display:none!important}',
      '.bse-arch-in_retirement #career-action-btn{display:none!important}',
      '.bse-arch-in_retirement #mode-btn-career{display:none!important}',
      '.bse-arch-in_retirement #pill-career-y10{display:none!important}',
      /* pre_retirement: dim career, hide promotion/salary tools */
      '.bse-arch-pre_retirement #v21-premium-teaser{display:none!important}',
      '.bse-arch-pre_retirement #ppill-career{opacity:0.3;pointer-events:none}',
      '.bse-arch-pre_retirement #career-promo-card{display:none!important}',
      '.bse-arch-pre_retirement #career-log-card{display:none!important}',

      /* Focus card */
      '.bse-focus-wrap{padding:18px 18px 2px}',
      '.bse-focus-eyebrow{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:rgba(255,255,255,0.35);margin-bottom:12px}',
      '.bse-action-card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:18px;padding:20px 18px 16px;margin-bottom:12px}',
      '.bse-tone-pre{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:rgba(255,255,255,0.38);margin-bottom:5px}',
      '.bse-action-label{font-family:var(--font-display);font-size:19px;color:rgba(255,255,255,0.92);line-height:1.30;margin-bottom:10px}',
      '.bse-action-why{font-size:14px;color:rgba(255,255,255,0.52);line-height:1.65;margin-bottom:16px}',
      '.bse-action-cta{width:100%;padding:13px;background:var(--sky);color:#fff;border:none;border-radius:999px;font-family:var(--font-body);font-size:14px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity 0.15s}',
      '.bse-action-cta:active{opacity:0.80}',
      '.bse-proof{font-size:12px;color:rgba(255,255,255,0.32);text-align:center;padding:2px 16px 6px}',
      '.bse-sig{font-size:12px;color:rgba(255,255,255,0.38);text-align:center;padding:2px 16px 6px}',
      '.bse-score-tap{font-size:12px;color:rgba(255,255,255,0.26);text-align:center;padding:4px 16px 6px;cursor:pointer}',
      '.bse-score-note{font-size:10px;color:rgba(255,255,255,0.18)}',
      '.bse-expand-link{display:block;width:100%;padding:10px;background:transparent;border:none;font-family:var(--font-body);font-size:12px;color:rgba(255,255,255,0.26);cursor:pointer;text-align:center;-webkit-tap-highlight-color:transparent}',

      /* Debt relief */
      '.bse-debt-wrap{padding:14px 14px 0}',
      '.bse-dl{margin-bottom:14px}',
      '.bse-dl-orient{font-size:15px;color:var(--navy);line-height:1.7;padding:20px 18px;background:var(--sky-dim);border:1px solid var(--sky-border);border-radius:14px;margin-bottom:10px}',
      '.bse-dl-hero{margin-bottom:20px}',
      '.bse-dl-capacity{font-size:13px;color:var(--gray-4);padding:10px 14px;background:var(--gray-1);border-radius:10px;margin-top:10px}',
      '.bse-dl-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--gray-3);margin-bottom:10px}',
      '.bse-dp-card{background:#fff;border:1px solid var(--gray-2);border-radius:14px;padding:16px;border-left:3px solid var(--teal)}',
      '.bse-dp-name{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--gray-3);margin-bottom:6px}',
      '.bse-dp-amt{font-family:var(--font-display);font-size:30px;color:var(--navy);margin-bottom:4px}',
      '.bse-dp-why{font-size:12px;color:var(--teal);font-weight:600;margin-bottom:5px}',
      '.bse-dp-timeline{font-size:12px;color:var(--gray-4)}',
      '.bse-dl-metrics{background:var(--gray-1);border:1px solid var(--gray-2);border-radius:14px;padding:16px 18px}',
      '.bse-metric-primary{margin-bottom:6px}',
      '.bse-metric-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--gray-3);margin-bottom:4px}',
      '.bse-metric-value{font-family:var(--font-display);font-size:28px;color:var(--navy);line-height:1.1}',
      '.bse-metric-unit{font-family:var(--font-body);font-size:13px;color:var(--gray-3);font-weight:500;margin-left:2px}',
      '.bse-metric-secondary{font-size:12px;color:var(--gray-4)}',
      '.bse-debt-list{display:flex;flex-direction:column;gap:8px}',
      '.bse-debt-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#fff;border:1px solid var(--gray-2);border-radius:12px}',
      '.bse-dr-name{font-size:13px;font-weight:600;color:var(--navy)}',
      '.bse-dr-right{text-align:right}',
      '.bse-dr-amt{font-size:14px;font-weight:700;color:var(--navy)}',
      '.bse-dr-int{font-size:11px;color:var(--red)}',
      '.bse-dl-strategy-btn{width:100%;padding:12px;background:var(--sky-dim);border:1.5px solid var(--sky-border);color:var(--teal);border-radius:12px;font-family:var(--font-body);font-size:13px;font-weight:700;cursor:pointer}',
      '.bse-dl-reveal{display:block;width:100%;padding:12px;background:var(--gray-1);border:1px solid var(--gray-2);border-radius:12px;font-family:var(--font-body);font-size:13px;color:var(--gray-4);cursor:pointer;margin-top:8px;-webkit-tap-highlight-color:transparent}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ----------------------------------------------------------
     HELPER — NOTE: fmtMoney duplicated in multiple IIFE scopes.
     Future modularization: extract to shared tracent-utils.js
  ---------------------------------------------------------- */
  function fmtMoney(n){ return '$'+Math.round(Math.abs(n||0)).toLocaleString(); }

})();
