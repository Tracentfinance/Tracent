/* ═══ Tracent Render: House Tab ═══
   Renders the House tab.

   Structure (per mode):
     1. Home Decision Card  — headline / reason / action
     2. Supporting metrics  — controlled by timeline tier
     3. Section label       — divider before legacy detail

   Public API: TracentHouseRender.render()
   Modes:      BUYING | OWNER | EMPTY
   Timelines:  exploring | planning | ready
═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Format helpers ──────────────────────────────────── */
  function _fmt(n) {
    if (!n || isNaN(n)) return '—';
    return '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
  }
  function _fmtK(n) {
    if (!n || isNaN(n)) return '—';
    var abs = Math.abs(n);
    if (abs >= 1000000) return '$' + (abs / 1000000).toFixed(1) + 'M';
    if (abs >= 1000)    return '$' + Math.round(abs / 1000) + 'K';
    return '$' + Math.round(abs).toLocaleString('en-US');
  }
  function _creditLabel(c) {
    return { excellent:'Excellent', good:'Good', fair:'Fair',
             below:'Below avg', poor:'Building', unknown:'Unknown' }[c] || '—';
  }
  function _creditColor(c) {
    return { excellent:'var(--green)', good:'var(--green)', fair:'var(--amber)',
             below:'var(--amber)', poor:'var(--red)', unknown:'var(--gray-3)' }[c] || 'var(--gray-3)';
  }

  /* ── Timeline helper ─────────────────────────────────── */
  function _getTimeline(g) {
    return g.homeBuyTimeline || 'exploring';
  }

  /* ── Decision layer ──────────────────────────────────── */
  function _buildHomeDecision(g) {
    var dti     = g.dtiAfterBuying || g.dti || 0; // Use projected PITI-based DTI when available
    var deposit = g.depositSaved || 0;
    var price   = g.homePrice || 0;
    var income  = g.income || 0;
    var piti    = g.totalPITI || 0;

    /* Small formatter — no new math */
    var _fmtK = function(n) {
      if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000)    return '$' + Math.round(n / 1000) + 'k';
      return '$' + Math.round(n);
    };
    var _fmtMo = function(n) { return '$' + Math.round(n).toLocaleString('en-US'); };

    /* Confidence: how many major inputs are present */
    var inputs = [income > 0, dti > 0, deposit > 0, price > 0];
    var present = inputs.filter(Boolean).length;
    var confidence = present === 4 ? 'high' : present >= 3 ? 'medium' : 'low';

    if (confidence === 'low') {
      return {
        title:      'Add income, savings, and a target price',
        reason:     'Three inputs needed for a real readiness number.',
        action:     '',
        confidence: 'low'
      };
    }

    if (dti > 45) {
      var _pitiStr  = piti > 0 ? _fmtMo(piti) + '/mo \u00b7 ' : '';
      var _safeEst  = price > 0 ? 'Reducing to ~' + _fmtK(Math.round(price * 0.85)) + ' brings DTI into a workable range.' : '';
      return {
        title:      'Lower target price or clear one debt before applying',
        reason:     _pitiStr + '~' + dti + '% DTI \u2014 most lenders cap at 43\u201345%.',
        action:     _safeEst,
        confidence: confidence
      };
    }
    if (dti > 40) {
      var _pitiStr2   = piti > 0 ? _fmtMo(piti) + '/mo \u00b7 ' : '';
      var _comfortPx  = (dti > 0 && price > 0) ? _fmtK(Math.round(price * (36 / dti))) : '';
      var _rangeNote  = _comfortPx ? 'Around ' + _comfortPx + ' puts you in a comfortable zone.' : '';
      return {
        title:      'Lower target or clear one debt to reach ~36% DTI',
        reason:     _pitiStr2 + '~' + dti + '% DTI \u00b7 any rate change or appraisal miss tips this out.',
        action:     _rangeNote,
        confidence: confidence
      };
    }
    if (price > 0 && deposit < price * 0.08) {
      var _depTarget = Math.round(price * 0.13); // 10% down + closing est.
      var _depGap    = Math.max(0, _depTarget - deposit);
      return {
        title:      'Build savings to ~' + _fmtK(_depTarget) + ' before shopping seriously',
        reason:     _fmtK(_depGap) + ' short of deposit + closing costs on ' + _fmtK(price) + '.',
        action:     '',
        confidence: confidence
      };
    }
    /* Workable: show upper bound before it gets tight */
    var _upperPx    = (dti > 0 && price > 0) ? Math.round(price * (40 / dti)) : 0;
    var _rangeHint  = _upperPx > price
      ? 'Room up to ~' + _fmtK(_upperPx) + ' before it gets tight.'
      : '';
    var _pitiStr3   = piti > 0 ? 'Est. ' + _fmtMo(piti) + '/mo \u00b7 ' : '';
    return {
      title:      'Start lender conversations',
      reason:     _pitiStr3 + '~' + (dti > 0 ? dti : '\u2014') + '% DTI \u00b7 numbers support this purchase.',
      action:     _rangeHint,
      confidence: confidence
    };
  }

  /* ── Dark hero card wrapper ──────────────────────────── */
  function _heroOpen(eyebrow) {
    return '<div style="background:linear-gradient(160deg,#0d1b2a 0%,#1a2f45 100%);'
      + 'border-radius:18px;padding:24px 22px;margin-bottom:16px;position:relative;overflow:hidden;">'
      + '<div style="position:absolute;inset:0;'
      + 'background:radial-gradient(ellipse 70% 60% at 95% 10%,rgba(0,168,232,0.13) 0%,transparent 60%);'
      + 'pointer-events:none;"></div>'
      + '<div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;'
      + 'color:rgba(0,168,232,0.75);margin-bottom:14px;position:relative;">'
      + eyebrow + '</div>';
  }
  function _heroClose() {
    return '<div style="margin-top:12px;font-size:10px;color:rgba(255,255,255,0.18);'
      + 'line-height:1.4;position:relative;">Estimates based on your inputs · Not financial advice</div>'
      + '</div>';
  }

  /* ── Decision card ───────────────────────────────────── */
  function _decisionCard(d) {
    var confColor = d.confidence === 'high'
      ? 'rgba(0,168,232,0.75)'
      : d.confidence === 'medium'
        ? 'rgba(245,158,11,0.75)'
        : 'rgba(148,163,184,0.65)';
    var confLabel = d.confidence === 'high' ? 'Based on your inputs'
      : d.confidence === 'medium' ? 'Some inputs missing'
      : 'Limited data';

    var h = '<div style="margin-bottom:16px;position:relative;">';
    h += '<div style="font-family:var(--font-display);font-size:22px;color:white;line-height:1.25;margin-bottom:8px;">'
      + d.title + '</div>';
    h += '<div style="font-size:13px;color:rgba(255,255,255,0.50);line-height:1.5;margin-bottom:8px;">'
      + d.reason + '</div>';
    if (d.action) {
      h += '<div style="font-size:13px;font-weight:600;color:rgba(0,168,232,0.85);line-height:1.4;margin-bottom:6px;">'
        + d.action + '</div>';
    }
    h += '<div style="margin-top:8px;font-size:10px;color:' + confColor + ';letter-spacing:0.3px;">'
      + confLabel + '</div>';
    h += '</div>';
    return h;
  }

  /* ── Chip (3-up grid) ────────────────────────────────── */
  function _chip(label, val, sub, valColor) {
    valColor = valColor || 'white';
    return '<div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px;text-align:center;">'
      + '<div style="font-size:9px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;'
      + 'color:rgba(255,255,255,0.38);margin-bottom:4px;">' + label + '</div>'
      + '<div style="font-size:14px;font-weight:700;color:' + valColor + ';line-height:1.1;">' + val + '</div>'
      + '<div style="font-size:10px;color:rgba(255,255,255,0.32);margin-top:3px;">' + sub + '</div>'
      + '</div>';
  }

  /* ── Section divider ─────────────────────────────────── */
  function _sectionLabel(text) {
    return '<div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;'
      + 'color:var(--gray-3);margin:4px 0 12px;">' + text + '</div>';
  }

  /* ── Source label helpers ────────────────────────────── */
  /* Returns a small inline label string for appending to values */
  function _srcLabel(text) {
    return ' <span style="font-size:10px;font-weight:400;color:rgba(255,255,255,0.30);'
      + 'letter-spacing:0px;">' + text + '</span>';
  }
  function _taxSrc(g) {
    /* If user has entered a specific tax figure, treat it as confirmed */
    return (g.propertyTaxMonthly && g.propertyTaxSource === 'user')
      ? ''
      : _srcLabel('(est. — state avg)');
  }
  function _insSrc(g) {
    return (g.monthlyIns && g.insSource === 'user')
      ? ''
      : _srcLabel('(est. — varies by location)');
  }
  function _rateSrc() {
    return _srcLabel('(as of Mar 2026 — may not reflect your quoted rate)');
  }


  /* ════════════════════════════════════════════════════
     BUYING MODE
  ════════════════════════════════════════════════════ */
  function _renderBuying(g, el) {
    var timeline  = _getTimeline(g);
    var readiness = g.readiness || 0;
    var deposit   = g.depositSaved || 0;
    var price     = g.homePrice || 0;
    var credit    = g.credit || 'unknown';
    var dti       = g.dtiAfterBuying || g.dti || 0; // Use projected PITI-based DTI for buyers

    var decision = _buildHomeDecision(g);
    var h = _heroOpen('Home Readiness');
    h += _decisionCard(decision);

    /* ── EXPLORING: decision + one metric only ── */
    if (timeline === 'exploring') {
      /* Single readiness ring — directional only */
      var circ = 150.8;
      var dash = (circ - (readiness / 100) * circ).toFixed(1);
      var rColor = readiness >= 80 ? 'var(--green)'
        : readiness >= 60 ? 'var(--teal)'
        : readiness >= 40 ? 'var(--amber)'
        : '#E63946';

      h += '<div style="display:flex;align-items:center;gap:14px;position:relative;">';
      h += '<svg width="48" height="48" viewBox="0 0 64 64" style="transform:rotate(-90deg);flex-shrink:0;">';
      h += '<circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="5"/>';
      h += '<circle cx="32" cy="32" r="24" fill="none" stroke="' + rColor + '" stroke-width="5"'
        + ' stroke-dasharray="' + circ + '" stroke-dashoffset="' + dash + '" stroke-linecap="round"/>';
      h += '</svg>';
      h += '<div>';
      h += '<div style="font-size:13px;color:rgba(255,255,255,0.55);">Readiness signal</div>';
      h += '<div style="font-size:20px;font-weight:700;color:' + rColor + ';">' + readiness + '%</div>';
      h += '</div>';
      h += '</div>';

      h += _heroClose();
      h += _sectionLabel('Rate &amp; Affordability');
      el.innerHTML = h;
      return;
    }

    /* ── PLANNING: decision + simplified monthly estimate + top drivers ── */
    if (timeline === 'planning') {
      /* Readiness ring — compact */
      var circ2 = 150.8;
      var dash2 = (circ2 - (readiness / 100) * circ2).toFixed(1);
      var rColor2 = readiness >= 80 ? 'var(--green)'
        : readiness >= 60 ? 'var(--teal)'
        : readiness >= 40 ? 'var(--amber)'
        : '#E63946';

      h += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;position:relative;">';
      h += '<div style="width:56px;height:56px;flex-shrink:0;position:relative;">';
      h += '<svg width="56" height="56" viewBox="0 0 64 64" style="transform:rotate(-90deg);">';
      h += '<circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="5"/>';
      h += '<circle cx="32" cy="32" r="24" fill="none" stroke="' + rColor2 + '" stroke-width="5"'
        + ' stroke-dasharray="' + circ2 + '" stroke-dashoffset="' + dash2 + '" stroke-linecap="round"/>';
      h += '</svg>';
      h += '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;'
        + 'font-size:13px;font-weight:700;color:white;">' + readiness + '%</div>';
      h += '</div>';
      h += '<div style="flex:1;">';
      h += '<div style="font-size:11px;color:rgba(255,255,255,0.38);margin-bottom:2px;">Readiness</div>';
      h += '<div style="font-size:13px;color:rgba(255,255,255,0.65);line-height:1.4;">'
        + (readiness >= 80 ? 'Strong position'
          : readiness >= 60 ? 'Getting close'
          : readiness >= 40 ? 'Building foundations'
          : 'Early stage') + '</div>';
      h += '</div>';
      h += '</div>';

      /* 2-chip grid: Deposit + DTI */
      var depPct   = (price > 0 && deposit > 0) ? Math.min(100, Math.round(deposit / (price * 0.10) * 100)) : 0;
      var depVal   = deposit > 0 ? _fmtK(deposit) : '—';
      var depSub   = price > 0 ? (depPct + '% of 10% target') : 'Set a target price';
      var dtiColor = dti <= 36 ? 'var(--green)' : dti <= 43 ? 'var(--amber)' : 'var(--red)';
      var dtiVal   = dti > 0 ? dti + '%' : '—';
      var dtiSub   = dti <= 36 ? 'After buying' : dti <= 43 ? 'Near limit (PITI)' : 'Above limit (PITI)';

      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;position:relative;">';
      h += _chip('Deposit', depVal, depSub, deposit > 0 ? 'var(--teal-light)' : 'rgba(255,255,255,0.55)');
      h += _chip('DTI', dtiVal, dtiSub, dti > 0 ? dtiColor : 'rgba(255,255,255,0.55)');
      h += '</div>';

      h += _heroClose();
      h += _sectionLabel('Rate &amp; Affordability');
      el.innerHTML = h;
      return;
    }

    /* ── READY: full readiness ring + 3-chip grid ── */
    var circ3 = 150.8;
    var dash3 = (circ3 - (readiness / 100) * circ3).toFixed(1);
    var rColor3, rLabel, rSub;
    if (readiness >= 80) {
      rColor3 = 'var(--green)'; rLabel = 'Mortgage Ready';
      rSub    = 'Strong position — start lender conversations';
    } else if (readiness >= 60) {
      rColor3 = 'var(--teal)'; rLabel = 'Getting Close';
      rSub    = 'Keep building your deposit and credit score';
    } else if (readiness >= 40) {
      rColor3 = 'var(--amber)'; rLabel = 'Building Foundations';
      rSub    = 'You\u2019re on the right path — every step counts';
    } else {
      rColor3 = '#E63946'; rLabel = 'Early Stage';
      rSub    = 'Your plan starts here — one move at a time';
    }

    h += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;position:relative;">';
    h += '<div style="width:64px;height:64px;flex-shrink:0;position:relative;">';
    h += '<svg width="64" height="64" viewBox="0 0 64 64" style="transform:rotate(-90deg);">';
    h += '<circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="5"/>';
    h += '<circle cx="32" cy="32" r="24" fill="none" stroke="' + rColor3 + '" stroke-width="5"'
      + ' stroke-dasharray="' + circ3 + '" stroke-dashoffset="' + dash3 + '"'
      + ' stroke-linecap="round"/>';
    h += '</svg>';
    h += '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;'
      + 'font-family:var(--font-display);font-size:15px;color:white;">' + readiness + '%</div>';
    h += '</div>';
    h += '<div style="flex:1;">';
    h += '<div style="font-family:var(--font-display);font-size:20px;color:white;line-height:1.2;margin-bottom:4px;">'
      + rLabel + '</div>';
    h += '<div style="font-size:12px;color:rgba(255,255,255,0.42);line-height:1.5;">' + rSub + '</div>';
    h += '</div>';
    h += '</div>';

    /* 3-chip grid */
    var depPct4   = (price > 0 && deposit > 0) ? Math.min(100, Math.round(deposit / (price * 0.10) * 100)) : 0;
    var depVal4   = deposit > 0 ? _fmtK(deposit) : '—';
    var depSub4   = price > 0 ? (depPct4 + '% of 10% goal') : 'Set a target price';
    var dtiColor4 = dti <= 36 ? 'var(--green)' : dti <= 43 ? 'var(--amber)' : 'var(--red)';
    var dtiVal4   = dti > 0 ? dti + '%' : '—';
    var dtiSub4   = dti > 0 ? (dti <= 36 ? 'After buying (PITI)' : dti <= 43 ? 'Near limit (PITI)' : 'Above limit (PITI)') : 'Not calculated';

    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;position:relative;">';
    h += _chip('Deposit', depVal4, depSub4, deposit > 0 ? 'var(--teal-light)' : 'rgba(255,255,255,0.55)');
    h += _chip('DTI',     dtiVal4, dtiSub4, dti > 0 ? dtiColor4 : 'rgba(255,255,255,0.55)');
    h += _chip('Credit',  _creditLabel(credit),
      credit === 'excellent' || credit === 'good' ? 'Best rates available'
      : credit === 'fair' ? 'Standard rates'
      : credit === 'unknown' ? 'Not yet set'
      : 'Premium applies',
      _creditColor(credit));
    h += '</div>';

    h += _heroClose();
    h += _sectionLabel('Rate &amp; Affordability');
    el.innerHTML = h;
  }


  /* ════════════════════════════════════════════════════
     OWNER MODE
  ════════════════════════════════════════════════════ */
  function _renderOwner(g, el) {
    var timeline  = _getTimeline(g);
    var balance   = g.balance   || 0;
    var curRate   = g.currentRate || 0;
    var payment   = g.payment   || 0;
    var yearsLeft = g.yearsLeft || 0;
    var homeValue = g.homeValue || 0;
    var equity    = g.equity    || (homeValue > balance && balance > 0 ? homeValue - balance : 0);
    var mktRate   = (typeof MARKET_RATE_30Y !== 'undefined') ? MARKET_RATE_30Y : 6.72;
    var hasData   = balance > 0 && curRate > 0;

    if (!hasData) {
      var h = _heroOpen('Your Home');
      h += '<div style="font-family:var(--font-display);font-size:20px;color:white;'
        + 'line-height:1.3;margin-bottom:10px;position:relative;">Add your mortgage details</div>';
      h += '<div style="font-size:13px;color:rgba(255,255,255,0.48);line-height:1.6;margin-bottom:18px;position:relative;">'
        + 'Enter your current rate, balance, and payment to unlock your refinance analysis.</div>';
      h += '<button onclick="openSettingsEdit(\'assets\')" style="background:rgba(0,168,232,0.14);'
        + 'border:1.5px solid rgba(0,168,232,0.32);border-radius:50px;padding:10px 20px;'
        + 'font-size:13px;font-weight:600;color:var(--teal);cursor:pointer;position:relative;">'
        + 'Update details \u2192</button>';
      h += _heroClose();
      h += _sectionLabel('Rate &amp; Refinance Analysis');
      el.innerHTML = h;
      return;
    }

    /* Rate vs market signal */
    var rateGap = curRate - mktRate;
    var refiIcon, refiSignal, refiColor;
    if (rateGap >= 1.0) {
      refiIcon = '\u26a0\ufe0f'; refiColor = 'var(--amber)';
      refiSignal = 'Your rate is ' + rateGap.toFixed(2) + '% above market — refi worth modelling';
    } else if (rateGap >= 0.5) {
      refiIcon = '\ud83d\udcca'; refiColor = 'var(--teal)';
      refiSignal = 'Refinancing may be worth exploring at the right rate';
    } else if (rateGap >= 0) {
      refiIcon = '\u2705'; refiColor = 'var(--green)';
      refiSignal = 'Your rate is competitive — no immediate action needed';
    } else {
      refiIcon = '\u2705'; refiColor = 'var(--green)';
      refiSignal = 'Your rate is below market — excellent position';
    }

    var h = _heroOpen('Your Mortgage');

    /* Owner decision card using the refi signal as the primary framing */
    var ownerDecision = {
      title:  curRate.toFixed(2) + '% · ' + _fmt(payment) + '/mo',
      reason: refiSignal,
      action: rateGap >= 0.5
        ? 'Model a refinance to see your potential saving.'
        : 'No refinance action needed at this time.',
      confidence: 'high'
    };

    /* For exploring tier: just rate + refi signal, nothing more */
    if (timeline === 'exploring') {
      h += _decisionCard(ownerDecision);
      h += _heroClose();
      h += _sectionLabel('Rate &amp; Refinance Analysis');
      el.innerHTML = h;
      return;
    }

    /* Planning + Ready: rate headline + refi signal + chips */
    h += '<div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:16px;position:relative;">';
    h += '<div>';
    h += '<div style="font-family:var(--font-display);font-size:38px;color:white;line-height:1;">'
      + curRate.toFixed(2) + '%</div>';
    h += '<div style="font-size:11px;color:rgba(255,255,255,0.38);margin-top:4px;">Current rate'
      + _rateSrc() + '</div>';
    h += '</div>';
    h += '<div style="text-align:right;">';
    h += '<div style="font-family:var(--font-display);font-size:26px;color:white;line-height:1;">'
      + _fmt(payment) + '</div>';
    h += '<div style="font-size:11px;color:rgba(255,255,255,0.38);margin-top:4px;">Monthly P&amp;I</div>';
    h += '</div>';
    h += '</div>';

    /* Refi signal band */
    h += '<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:11px 14px;'
      + 'margin-bottom:16px;position:relative;">';
    h += '<div style="font-size:12px;font-weight:600;color:' + refiColor + ';line-height:1.5;">'
      + refiIcon + ' ' + refiSignal + '</div>';
    h += '</div>';

    /* 3-chip grid — only at ready tier */
    if (timeline === 'ready') {
      var equityVal   = equity > 0 ? _fmtK(equity) : '—';
      var equityPct   = (homeValue > 0 && equity > 0) ? Math.round(equity / homeValue * 100) + '% of value' : 'Est.';
      var equityColor = equity > 0 ? 'var(--green)' : 'rgba(255,255,255,0.55)';
      var mktGapSub   = Math.abs(rateGap) < 0.05 ? 'At market'
        : rateGap > 0 ? '+' + rateGap.toFixed(2) + '% gap'
        : Math.abs(rateGap).toFixed(2) + '% below';

      h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;position:relative;">';
      h += _chip('Balance',  _fmtK(balance), yearsLeft > 0 ? yearsLeft + ' yrs left' : 'Remaining', 'white');
      h += _chip('Market',   mktRate.toFixed(2) + '%', mktGapSub + _rateSrc(), rateGap > 0.5 ? 'var(--amber)' : 'var(--green)');
      h += _chip('Equity',   equityVal, equityPct, equityColor);
      h += '</div>';
    }

    h += _heroClose();
    h += _sectionLabel('Rate &amp; Refinance Analysis');
    el.innerHTML = h;
  }


  /* ════════════════════════════════════════════════════
     EMPTY / UNKNOWN STATE
  ════════════════════════════════════════════════════ */
  function _renderEmpty(el) {
    var h = _heroOpen('House');
    h += '<div style="font-family:var(--font-display);font-size:20px;color:white;'
      + 'line-height:1.3;margin-bottom:10px;position:relative;">Your housing picture</div>';
    h += '<div style="font-size:13px;color:rgba(255,255,255,0.48);line-height:1.6;position:relative;">'
      + 'Complete setup to see your personalised home buying or ownership analysis.</div>';
    h += _heroClose();
    el.innerHTML = h;
  }


  /* ════════════════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════════════════ */
  function _render() {
    var el = document.getElementById('house-header');
    if (!el) return;
    var g  = window.G || {};
    var ht = g.housingType || '';
    if (ht === 'buying') {
      _renderBuying(g, el);
    } else if (ht === 'owner' || ht === 'cashout') {
      _renderOwner(g, el);
    } else {
      _renderEmpty(el);
    }
  }

  /* ── Event wiring ─────────────────────────────────────── */
  document.addEventListener('tracent:scoreComputed', function () {
    setTimeout(_render, 100);
  });

  /* ═══ PUBLIC API ═══════════════════════════════════════ */
  window.TracentHouseRender = { render: _render };

})();
