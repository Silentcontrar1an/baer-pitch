'use strict';

document.addEventListener('DOMContentLoaded', function () {

  // ── PROGRESS BAR ──────────────────────────────────────
  var bar = document.getElementById('progressBar');
  window.addEventListener('scroll', function () {
    if (!bar) return;
    var h = document.documentElement;
    var pct = h.scrollHeight === h.clientHeight ? 0 : (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    bar.style.width = pct + '%';
  });

  // ── ACTIVE NAV ────────────────────────────────────────
  var sections = Array.prototype.slice.call(document.querySelectorAll('.ps-section[id]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.ps-nav-link'));
  if (sections.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove('active'); });
          var a = document.querySelector('.ps-nav-link[href="#' + e.target.id + '"]');
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  // ════════════════════════════════════════════════════════
  // TOOL A — EV/EBITDA SENSITIVITY TABLE
  // ════════════════════════════════════════════════════════
  var sensitivityBody = document.getElementById('sensitivityBody');
  var inpDebt      = document.getElementById('inp-debt');
  var inpPreferred = document.getElementById('inp-preferred');
  var inpCash      = document.getElementById('inp-cash');
  var inpShares    = document.getElementById('inp-shares');
  var oblDisplay   = document.getElementById('obligations-display');

  var MULTIPLES = [10, 11, 12, 13, 14, 15, 16];
  var EBITDAS   = [45, 50, 55, 57.5, 60, 65, 70, 75, 80];

  function buildSensitivity() {
    if (!sensitivityBody) return;

    var debt      = parseFloat(inpDebt      ? inpDebt.value      : 213);
    var preferred = parseFloat(inpPreferred ? inpPreferred.value : 407);
    var cash      = parseFloat(inpCash      ? inpCash.value      : 31);
    var shares    = parseFloat(inpShares    ? inpShares.value    : 55.5);
    var obl       = debt + preferred - cash;

    if (oblDisplay) oblDisplay.textContent = '$' + obl.toFixed(1) + 'M';

    sensitivityBody.innerHTML = '';

    MULTIPLES.forEach(function (mult) {
      var tr = document.createElement('tr');

      var thCell = document.createElement('td');
      thCell.className = 'row-hd';
      thCell.textContent = mult + '\u00d7';
      tr.appendChild(thCell);

      EBITDAS.forEach(function (ebitda) {
        var td  = document.createElement('td');
        var ev  = ebitda * mult;
        var eq  = ev - obl;
        var px  = eq / shares;

        if (px <= 0) {
          td.className = 'nm';
          td.textContent = 'NM';
        } else {
          td.textContent = '$' + px.toFixed(2);
          if (ebitda === 57.5 && mult === 13) {
            td.className = 'current';
          } else if (ebitda >= 65 && mult >= 14) {
            td.className = 'zone-high';
          } else if (ebitda >= 55 && mult >= 13) {
            td.className = 'zone-mid';
          }
        }
        tr.appendChild(td);
      });

      sensitivityBody.appendChild(tr);
    });
  }

  [inpDebt, inpPreferred, inpCash, inpShares].forEach(function (el) {
    if (el) el.addEventListener('input', buildSensitivity);
  });

  buildSensitivity();

  // ════════════════════════════════════════════════════════
  // TOOL B — FLEET UNIT ECONOMICS CALCULATOR
  // ════════════════════════════════════════════════════════
  var fcScoopers    = document.getElementById('fc-scoopers');
  var fcStandby     = document.getElementById('fc-standbydays');
  var fcFlight      = document.getElementById('fc-flighthrs');
  var fcSRate       = document.getElementById('fc-standbyrate');
  var fcFRate       = document.getElementById('fc-flightrate');
  var fcFixed       = document.getElementById('fc-fixedcost');
  // Default fixed cost $2.0M = pilot salaries, base MRO, insurance per aircraft (O&M only)

  function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function runFleetCalc() {
    var scoopers    = fcScoopers ? parseFloat(fcScoopers.value) : 8;
    var standbyDays = fcStandby  ? parseFloat(fcStandby.value)  : 130;
    var flightHrs   = fcFlight   ? parseFloat(fcFlight.value)   : 309;
    var standbyRate = fcSRate    ? parseFloat(fcSRate.value)     : 42;
    var flightRate  = fcFRate    ? parseFloat(fcFRate.value)     : 13.5;
    var fixedCost   = fcFixed    ? parseFloat(fcFixed.value)     : 2.0;

    // Revenue per aircraft ($M)
    var revStandby = (standbyDays * standbyRate * 1000) / 1e6;
    var revFlight  = (flightHrs   * flightRate  * 1000) / 1e6;
    var revTotal   = revStandby + revFlight;

    // Costs: ~12% variable (fuel, per-hour crew, consumables) + fixed O&M per aircraft
    // Fixed default $2.0M = pilot salaries, base maintenance, insurance per AC
    var varCost      = revTotal * 0.12;
    var ebitdaPerAC  = revTotal - varCost - fixedCost;
    var marginPct    = revTotal > 0 ? (ebitdaPerAC / revTotal * 100) : 0;

    // Breakeven standby days
    var breakeven = standbyRate > 0 ? Math.round((fixedCost * 1e6) / (standbyRate * 1000)) : 0;

    // Fleet totals
    var fleetRev    = revTotal    * scoopers;
    var fleetEBITDA = ebitdaPerAC * scoopers;

    set('fc-rev-ac',       '$' + revTotal.toFixed(2)    + 'M');
    set('fc-ebitda-ac',    '$' + ebitdaPerAC.toFixed(2) + 'M');
    set('fc-margin-ac',    marginPct.toFixed(1)          + '%');
    set('fc-breakeven',    breakeven                     + ' days');
    set('fc-fleet-rev',    '$' + fleetRev.toFixed(1)    + 'M');
    set('fc-fleet-ebitda', '$' + fleetEBITDA.toFixed(1) + 'M');

    // Gauge
    var gaugeEl = document.getElementById('fc-gauge-fill');
    if (gaugeEl) {
      var pct = Math.min(100, Math.max(0, (ebitdaPerAC / 8) * 100));
      gaugeEl.style.width = pct + '%';
      gaugeEl.style.background = pct >= 75 ? '#15803d' : pct >= 50 ? '#b45309' : '#b91c1c';
    }

    // Davis range label
    var davisEl = document.getElementById('fc-davis-check');
    if (davisEl) {
      if (ebitdaPerAC >= 6 && ebitdaPerAC <= 8) {
        davisEl.textContent = 'Within Davis\u2019s confirmed $6\u20138M range';
        davisEl.className = 'fc-badge green';
      } else if (ebitdaPerAC < 6) {
        davisEl.textContent = 'Below Davis\u2019s $6M floor \u2014 adjust inputs';
        davisEl.className = 'fc-badge amber';
      } else {
        davisEl.textContent = 'Above Davis\u2019s $8M ceiling';
        davisEl.className = 'fc-badge green';
      }
    }
  }

  [fcScoopers, fcStandby, fcFlight, fcSRate, fcFRate, fcFixed].forEach(function (el) {
    if (el) el.addEventListener('input', runFleetCalc);
  });

  runFleetCalc();

  // ════════════════════════════════════════════════════════
  // TOOL C — PREFERRED ACCRETION CLOCK
  // ════════════════════════════════════════════════════════
  var PREF_FACE  = 407.257;   // $M at 12/31/2025
  var PREF_RATE  = 0.07;      // 7% per year
  var PREF_START = new Date('2026-01-01T00:00:00Z').getTime();

  function tickClock() {
    var now     = Date.now();
    var years   = (now - PREF_START) / (365.25 * 24 * 3600 * 1000);
    var balance = PREF_FACE * Math.pow(1 + PREF_RATE, years);
    var added   = balance - PREF_FACE;
    var daily   = (PREF_FACE * PREF_RATE) / 365;

    var acrEl  = document.getElementById('pref-accreted');
    var addEl  = document.getElementById('pref-added');
    var dayEl  = document.getElementById('pref-daily');

    if (acrEl)  acrEl.textContent  = '$' + balance.toFixed(2) + 'M';
    if (addEl)  addEl.textContent  = '+$' + added.toFixed(2) + 'M added since Jan 1 2026';
    if (dayEl)  dayEl.textContent  = '$' + (daily * 1000).toFixed(0) + 'K / day';
  }

  if (document.getElementById('pref-accreted')) {
    tickClock();
    setInterval(tickClock, 1000);
  }

}); // end DOMContentLoaded
