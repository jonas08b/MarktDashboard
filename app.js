/* ==========================================================================
   app.js — Macro Dashboard (Volledig LIVE)
   Alle data wordt opgehaald via serverless functions; bij falen valt het
   terug op de baseline uit data.js.
   ========================================================================== */

const nl = new Intl.NumberFormat("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nl1 = new Intl.NumberFormat("nl-BE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nl0 = new Intl.NumberFormat("nl-BE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function fmtPct(v, decimals = 2) {
  const s = v.toLocaleString("nl-BE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (v > 0 ? "+" : "") + s;
}

/* ------------------------------------------------------------------ *
 * LIVE STATE
 * ------------------------------------------------------------------ */
const LIVE = {};

function markLive(key) {
  document.querySelectorAll(`[data-live="${key}"]`).forEach((el) => {
    const dot = el.querySelector(".live-dot");
    if (dot) dot.classList.add("on");
  });
  // Update badge
  const badge = document.querySelector(`[data-badge="${key}"]`);
  if (badge) {
    badge.textContent = "LIVE";
    badge.className = "badge badge-live";
  }
}

/* ==========================================================================
   RENDER: TICKER BAR
   ========================================================================== */
function renderTicker() {
  const bar = document.getElementById("tickerBar");
  BASELINE.ticker.forEach((item) => {
    const el = document.createElement("div");
    el.className = "ticker-item";
    el.dataset.tickerId = item.id;
    if (item.live) el.dataset.live = item.live;
    const deltaClass = item.delta >= 0 ? "pos" : "neg";
    el.innerHTML = `
      <div class="ticker-label"><span class="live-dot"></span>${item.label}</div>
      <div class="ticker-values">
        <span class="ticker-value" data-role="value">${item.value}</span>
        <span class="ticker-delta ${deltaClass}" data-role="delta">${item.deltaText}</span>
      </div>`;
    bar.insertBefore(el, bar.querySelector(".ticker-clock"));
  });
}

function updateTickerItem(id, valueStr, changePct) {
  const el = document.querySelector(`.ticker-item[data-ticker-id="${id}"]`);
  if (!el) return;
  el.querySelector('[data-role="value"]').textContent = valueStr;
  if (changePct !== null && changePct !== undefined && !Number.isNaN(changePct)) {
    const d = el.querySelector('[data-role="delta"]');
    d.textContent = fmtPct(changePct) + "%";
    d.className = "ticker-delta " + (changePct >= 0 ? "pos" : "neg");
  }
}

/* ==========================================================================
   RENDER: CENTRALE BANKEN
   ========================================================================== */
const TREND_ARROW = { down: "▼", up: "▲", flat: "➜" };

function renderCentraleBanken() {
  const tbody = document.getElementById("tblCentraleBanken");
  tbody.innerHTML = BASELINE.centraleBanken.map((r) => `
    <tr>
      <td><span class="val-name" ${r.live ? `data-live="${r.live}"` : ""}><span class="live-dot"></span>${r.naam}</span></td>
      <td data-role="${r.live || ""}">${r.waarde}</td>
      <td><span class="trend-icon ${r.trend}">${TREND_ARROW[r.trend]}</span></td>
    </tr>`).join("");
}

/* ==========================================================================
   RENDER: GROEI & ACTIVITEIT / ARBEIDSMARKT
   ========================================================================== */
function renderSimpleTable(tbodyId, rows) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = rows.map((r) => `
    <tr>
      <td><span class="val-name" ${r.live ? `data-live="${r.live}"` : ""}><span class="live-dot"></span>${r.naam}</span></td>
      <td data-role="${r.live || ""}">${r.laatste}</td>
      <td><span class="trend-icon ${r.trend}">●</span></td>
    </tr>`).join("");
}

/* ==========================================================================
   RENDER: INFLATIE
   ========================================================================== */
function renderInflatieTabel() {
  const tbody = document.getElementById("tblInflatie");
  tbody.innerHTML = BASELINE.inflatie.tabel.map((r) => `
    <tr>
      <td><span class="val-name" ${r.live ? `data-live="${r.live}"` : ""}><span class="live-dot"></span>${r.naam}</span></td>
      <td data-role="${r.live || ""}-laatste">${r.laatste}</td>
      <td>${r.vorige}</td>
    </tr>`).join("");
}

function drawLineChart(containerId, series, opts) {
  const el = document.getElementById(containerId);
  const W = 600, H = opts.height || 260;
  const padL = 34, padR = 8, padT = 10, padB = 20;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  const allVals = series.flatMap((s) => s.data.filter(v => v !== null && v !== undefined));
  if (allVals.length === 0) { el.innerHTML = '<p style="color:#545c6a;text-align:center;padding:20px;">Geen data</p>'; return; }
  const min = opts.min !== undefined ? opts.min : Math.min(...allVals, 0);
  const max = opts.max !== undefined ? opts.max : Math.max(...allVals);
  const n = series[0].data.length;

  const x = (i) => padL + (i / (n - 1)) * innerW;
  const y = (v) => padT + innerH - ((v - min) / (max - min)) * innerH;

  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;

  const steps = opts.yTicks || 5;
  for (let i = 0; i <= steps; i++) {
    const v = min + (i / steps) * (max - min);
    const yy = y(v);
    svg += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="#1a2029" stroke-width="1"/>`;
    svg += `<text x="${padL - 6}" y="${yy + 3}" text-anchor="end" font-size="9" fill="#545c6a">${opts.yFmt ? opts.yFmt(v) : v}</text>`;
  }

  if (opts.targetLine !== undefined) {
    const yy = y(opts.targetLine);
    svg += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="#545c6a" stroke-width="1.2" stroke-dasharray="4 3"/>`;
  }

  if (opts.xLabels) {
    opts.xLabels.forEach((lab, idx) => {
      const xi = (idx / (opts.xLabels.length - 1)) * (n - 1);
      svg += `<text x="${x(xi)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#545c6a">${lab}</text>`;
    });
  }

  series.forEach((s) => {
    const pts = s.data.map((v, i) => v !== null && v !== undefined ? `${x(i)},${y(v)}` : null).filter(p => p).join(" ");
    if (!pts) return;
    const dash = s.dashed ? `stroke-dasharray="5 4"` : "";
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" ${dash} stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.dots) {
      s.data.forEach((v, i) => {
        if (v !== null && v !== undefined) {
          svg += `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${s.color}"/>`;
        }
      });
    }
  });

  svg += `</svg>`;
  el.innerHTML = svg;
}

function renderInflatieChart(data) {
  const hicp = data?.hicp || BASELINE.inflatie.hicp;
  const core = data?.core || BASELINE.inflatie.core;
  drawLineChart("chartInflatie", [
    { data: hicp, color: "#4a8fe7" },
    { data: core, color: "#e8873f" },
  ], {
    min: 0, max: 10, yTicks: 5,
    yFmt: (v) => v.toFixed(0) + "%",
    xLabels: ["2020", "2021", "2022", "2023", "2024"],
    targetLine: BASELINE.inflatie.target,
    height: 150,
  });
}

/* ==========================================================================
   RENDER: OBLIGATIEMARKT + RENTECURVE
   ========================================================================== */
function renderObligatiemarkt() {
  const tbody = document.getElementById("tblObligatiemarkt");
  tbody.innerHTML = BASELINE.obligatiemarkt.map((r) => {
    const num = parseFloat(String(r.delta).replace(",", "."));
    const cls = num >= 0 ? "pos" : "neg";
    return `
    <tr>
      <td><span class="val-name" ${r.live ? `data-live="${r.live}"` : ""}><span class="live-dot"></span>${r.naam}</span></td>
      <td data-role="${r.live || ""}">${r.laatste}</td>
      <td class="delta-cell ${cls}">${r.delta}</td>
    </tr>`;
  }).join("");
}

function renderRenteCurve(data) {
  const rc = data || BASELINE.renteCurve;
  drawLineChart("chartRenteCurve", [
    { data: rc.vandaag, color: "#4a8fe7", dots: true },
    { data: rc.vorigeWeek, color: "#545c6a", dashed: true },
  ], {
    min: 1.0, max: 3.0, yTicks: 4,
    yFmt: (v) => v.toFixed(1),
    xLabels: rc.labels,
    height: 110,
  });
}

/* ==========================================================================
   RENDER: SECTOR DASHBOARD
   ========================================================================== */
const SECTOR_ARROW = { up: "↗", down: "↘", flat: "→" };
function renderSectoren() {
  const tbody = document.getElementById("tblSectoren");
  tbody.innerHTML = BASELINE.sectoren.map((s) => {
    const num = parseFloat(s.vsMarkt.replace(",", ".").replace("%", ""));
    const cls = num >= 0 ? "pos" : "neg";
    return `
    <tr>
      <td>${s.naam}</td>
      <td>${s.score}/10</td>
      <td><span class="trend-icon ${s.trend === "up" ? "up" : s.trend === "down" ? "down" : "flat"}">${SECTOR_ARROW[s.trend]}</span></td>
      <td class="delta-cell ${cls}">${s.vsMarkt}</td>
    </tr>`;
  }).join("");
}

/* ==========================================================================
   RENDER: ECONOMISCHE KALENDER
   ========================================================================== */
function renderKalenderFallback() {
  const tbody = document.getElementById("tblKalender");
  tbody.innerHTML = BASELINE.kalender.map((k) => `
    <tr>
      <td>${k.tijd}</td>
      <td class="event-name ${k.impact}">${k.event}</td>
      <td><span class="impact-dot ${k.impact}"></span></td>
      <td>${k.verwacht}</td>
      <td>${k.vorige}</td>
    </tr>`).join("");
}

function renderKalenderWidget() {
  const wrap = document.getElementById("calendarWidgetWrap");
  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
  script.async = true;
  script.innerHTML = JSON.stringify({
    colorTheme: "dark",
    isTransparent: true,
    width: "100%",
    height: "420",
    locale: "nl_BE",
    importanceFilter: "-1,0,1",
    countryFilter: "eu,de,us,fr,it,gb",
  });

  const container = document.createElement("div");
  container.className = "tradingview-widget-container";
  const widgetDiv = document.createElement("div");
  widgetDiv.className = "tradingview-widget-container__widget";
  container.appendChild(widgetDiv);
  container.appendChild(script);
  wrap.appendChild(container);

  setTimeout(() => {
    const iframe = wrap.querySelector("iframe");
    if (!iframe) {
      wrap.style.display = "none";
      document.getElementById("calendarFallback").style.display = "table";
      document.getElementById("badgeKalender").textContent = "DEMO";
      document.getElementById("badgeKalender").className = "badge badge-demo";
    }
  }, 4000);
}

/* ==========================================================================
   RENDER: PORTFOLIO HEATMAP
   ========================================================================== */
function heatColor(pct) {
  const intensity = Math.min(Math.abs(pct) / 2.5, 1);
  if (pct >= 0) {
    const l = 22 + intensity * 8;
    return `hsl(150, 45%, ${l}%)`;
  }
  const l = 22 + intensity * 8;
  return `hsl(2, 55%, ${l}%)`;
}

function renderPortfolio() {
  const grid = document.getElementById("heatmapGrid");
  grid.innerHTML = "";
  BASELINE.portfolio.forEach((p) => {
    const cell = document.createElement("div");
    cell.className = "heat-cell";
    cell.dataset.ticker = p.ticker;
    cell.style.background = heatColor(p.pct);
    cell.innerHTML = `
      <span class="heat-name">${p.naam}</span>
      <span class="heat-pct">${fmtPct(p.pct)}%</span>`;
    grid.appendChild(cell);
  });
}

function updatePortfolioCell(ticker, pct) {
  document.querySelectorAll(`.heat-cell[data-ticker="${ticker}"]`).forEach((cell) => {
    cell.style.background = heatColor(pct);
    cell.querySelector(".heat-pct").textContent = fmtPct(pct) + "%";
  });
}

/* ==========================================================================
   RENDER: MACRO SCORE MODEL
   ========================================================================== */
function renderMacroScore() {
  const wrap = document.getElementById("scoreBars");
  const rows = [
    { label: "Growth", ...BASELINE.macroScore.growth },
    { label: "Inflation", ...BASELINE.macroScore.inflation },
    { label: "Liquidity", ...BASELINE.macroScore.liquidity },
    { label: "Risk", ...BASELINE.macroScore.risk },
  ];
  wrap.innerHTML = rows.map((r) => {
    const blocks = Array.from({ length: 10 }, (_, i) =>
      `<div class="score-block ${i < r.score ? "filled-" + r.kleur : ""}"></div>`).join("");
    return `
    <div class="score-bar-row">
      <span class="score-bar-label">${r.label}</span>
      <div class="score-bar-track">${blocks}</div>
      <span class="score-bar-value">${r.score}/10</span>
    </div>`;
  }).join("");

  document.getElementById("scoreTotaal").textContent = nl1.format(BASELINE.macroScore.totaal) + "/10";
  document.getElementById("regimeBadge").textContent = BASELINE.macroScore.regime;
}

/* ==========================================================================
   RENDER: ACTIEVE POSITIONERING
   ========================================================================== */
function renderPositionering() {
  const wrap = document.getElementById("positioningList");
  wrap.innerHTML = BASELINE.positionering.map((p) => `
    <div class="pos-row">
      <span class="pos-dot ${p.status}"></span>
      <span class="pos-label">${p.label}</span>
      <span class="pos-sectoren">${p.sectoren}</span>
    </div>`).join("");
  document.getElementById("themasValue").textContent = BASELINE.themas;
}

/* ==========================================================================
   KLOK
   ========================================================================== */
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("nl-BE", { day: "2-digit", month: "long", year: "numeric" });
  document.getElementById("clockTime").textContent = time;
  document.getElementById("clockDate").textContent = date;
  document.querySelectorAll(".live-clock").forEach((el) => (el.textContent = time));
}

/* ==========================================================================
   LIVE DATA — API FETCH HELPERS
   ========================================================================== */
async function fetchAPI(endpoint, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `/api/${endpoint}${qs ? '?' + qs : ''}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/* ==========================================================================
   LIVE DATA — EUR/USD (Frankfurter API)
   ========================================================================== */
async function fetchEurUsd() {
  try {
    const data = await fetchAPI('frankfurter');
    const rate = data.rates?.USD;
    if (!rate) throw new Error("Geen USD rate");
    const str = rate.toFixed(4).replace(".", ",");
    updateTickerItem("eurusd", str, null);
    markLive("eurusd");
  } catch (err) {
    console.warn("EUR/USD live fetch mislukt:", err.message);
  }
}

/* ==========================================================================
   LIVE DATA — ECB (Depo, HICP, Core)
   ========================================================================== */
async function loadEcbDepo() {
  try {
    const data = await fetchAPI('ecb', { series: 'depo' });
    if (!data?.latest) return;
    const v = data.latest.value;
    const str = nl.format(v).replace(".", ",") + "%";
    document.querySelectorAll('[data-role="ecbDepo"]').forEach((el) => (el.textContent = str));
    updateTickerItem("ecb", str, null);
    markLive("ecbDepo");
  } catch (err) {
    console.warn("ECB Depo fetch mislukt:", err.message);
  }
}

async function loadEcbInflation() {
  try {
    const [hicpData, coreData] = await Promise.all([
      fetchAPI('ecb', { series: 'hicp' }).catch(() => null),
      fetchAPI('ecb', { series: 'core' }).catch(() => null)
    ]);

    if (hicpData?.history?.length >= 2) {
      const vals = hicpData.history.map((r) => r.value).slice(-11);
      BASELINE.inflatie.hicp = vals;
      const latest = hicpData.latest.value;
      document.querySelectorAll('[data-role="hicp-laatste"]').forEach((el) => (el.textContent = nl.format(latest).replace(".", ",") + "%"));
      markLive("hicp");
    }
    if (coreData?.history?.length >= 2) {
      const vals = coreData.history.map((r) => r.value).slice(-11);
      BASELINE.inflatie.core = vals;
      const latest = coreData.latest.value;
      document.querySelectorAll('[data-role="coreInflation-laatste"]').forEach((el) => (el.textContent = nl.format(latest).replace(".", ",") + "%"));
      markLive("coreInflation");
    }
    if (hicpData?.history || coreData?.history) {
      renderInflatieChart();
      document.getElementById("badgeInflatie").textContent = "LIVE — ECB";
      document.getElementById("badgeInflatie").className = "badge badge-live";
    }
  } catch (err) {
    console.warn("ECB inflatie fetch mislukt:", err.message);
  }
}

/* ==========================================================================
   LIVE DATA — FRED (Fed Funds, GDP US, Unemployment US, CPI)
   ========================================================================== */
async function loadFredData() {
  const series = ['fedfunds', 'gdpus', 'unrateus', 'cpiusy'];
  try {
    const results = await Promise.all(
      series.map(s => fetchAPI('fred', { series: s }).catch(() => null))
    );
    results.forEach((data) => {
      if (!data?.latest) return;
      const key = data.series;
      const val = data.latest.value;
      const unit = data.unit || '';
      const decimals = data.decimals || 2;
      const str = val.toFixed(decimals).replace(".", ",") + unit;

      // Update ticker (als het bestaat)
      const tickerMap = { fedfunds: 'fedfunds', gdpus: 'gdpus', unrateus: 'unrateus', cpiusy: 'cpiusy' };
      const tickerId = tickerMap[key];
      if (tickerId) updateTickerItem(tickerId, str, null);

      // Update tabellen
      const roleMap = {
        fedfunds: 'fedFunds',
        gdpus: 'gdpGrowth',
        unrateus: 'unemployment',
        cpiusy: 'cpiUs'
      };
      const role = roleMap[key];
      if (role) {
        document.querySelectorAll(`[data-role="${role}"]`).forEach((el) => (el.textContent = str));
        markLive(role);
      }
    });
  } catch (err) {
    console.warn("FRED fetch mislukt:", err.message);
  }
}

/* ==========================================================================
   LIVE DATA — EUROSTAT (Unemployment EU, GDP EU, Industrial Production, Consumer Confidence)
   ========================================================================== */
async function loadEurostatData() {
  const series = ['unemployment', 'gdp', 'indprod', 'consconf'];
  try {
    const results = await Promise.all(
      series.map(s => fetchAPI('eurostat', { series: s }).catch(() => null))
    );
    results.forEach((data) => {
      if (!data?.latest) return;
      const key = data.series;
      const val = data.latest.value;
      const unit = data.unit === '%' ? '%' : '';
      const decimals = data.decimals || 1;
      const str = val.toFixed(decimals).replace(".", ",") + unit;

      const roleMap = {
        unemployment: 'unemploymentEu',
        gdp: 'gdpEu',
        indprod: 'indProd',
        consconf: 'consConf'
      };
      const role = roleMap[key];
      if (role) {
        document.querySelectorAll(`[data-role="${role}"]`).forEach((el) => (el.textContent = str));
        markLive(role);
      }
    });
  } catch (err) {
    console.warn("Eurostat fetch mislukt:", err.message);
  }
}

/* ==========================================================================
   LIVE DATA — BONDS (via /api/bonds)
   ========================================================================== */
async function loadBondsData() {
  try {
    const data = await fetchAPI('bonds');
    if (!data) return;

    // Update ticker
    if (data.bund10y) {
      const str = data.bund10y.value.toFixed(2).replace(".", ",") + "%";
      updateTickerItem("bund10y", str, null);
      document.querySelectorAll('[data-role="bund10y"]').forEach((el) => (el.textContent = str));
      markLive("bund10y");
    }

    // Update obligatiemarkt tabel
    const bondMap = {
      'Duitse 2Y Bund': data.bund2y,
      'Duitse 10Y Bund': data.bund10y,
      'BTP-Bund Spread': data.spread_btp_bund !== null ? { value: data.spread_btp_bund, unit: ' bp' } : null,
      '10Y - 2Y Spread': data.spread_10y_2y !== null ? { value: data.spread_10y_2y, unit: ' bp' } : null,
      'US 10Y Treasury': data.us10y,
    };

    Object.entries(bondMap).forEach(([label, bondData]) => {
      if (!bondData) return;
      const value = typeof bondData === 'object' ? bondData.value : bondData;
      const unit = typeof bondData === 'object' ? (bondData.unit || '%') : '%';
      const str = value.toFixed(2).replace(".", ",") + unit;
      const td = document.querySelector(`#tblObligatiemarkt td:first-child:contains("${label}")`);
      if (td) {
        const row = td.closest('tr');
        if (row) {
          const valTd = row.querySelector('td:nth-child(2)');
          if (valTd) valTd.textContent = str;
        }
      }
    });

    // Update rentecurve chart
    if (data.renteCurve) {
      renderRenteCurve(data.renteCurve);
    }

    // Update badge
    document.getElementById("badgeObligatiemarkt").textContent = "LIVE — ECB+FRED";
    document.getElementById("badgeObligatiemarkt").className = "badge badge-live";
  } catch (err) {
    console.warn("Bonds fetch mislukt:", err.message);
  }
}

/* ==========================================================================
   LIVE DATA — QUOTES (Alpha Vantage → Stooq fallback)
   ========================================================================== */
const TICKER_QUOTE_MAP = {
  sx5e:    { apiSymbol: "^sx5e",  tickerId: "sx5e",   decimals: 2, thousands: true },
  vstoxx:  { apiSymbol: "^v2tx",  tickerId: "vstoxx",  decimals: 2, thousands: false },
  brent:   { apiSymbol: "cb.f",   tickerId: "brent",   decimals: 2, thousands: false },
  gold:    { apiSymbol: "xauusd", tickerId: "gold",    decimals: 2, thousands: true },
};

const PORTFOLIO_SYMBOL_MAP = {
  'ASML.NL': 'asml.nl',
  'SAP.DE': 'sap.de',
  'MC.FR': 'mc.fr',
  'INGA.NL': 'inga.nl',
  'SHEL.UK': 'shel.uk',
  'AIR.FR': 'air.fr',
  'SU.FR': 'su.fr',
  'TTE.FR': 'tte.fr',
  'BMW.DE': 'bmw.de',
};

async function loadMarketQuotes() {
  const entries = Object.entries(TICKER_QUOTE_MAP);
  const results = await Promise.all(
    entries.map(([key, cfg]) => 
      fetchAPI('quote', { symbol: cfg.apiSymbol }).catch(() => null)
    )
  );
  results.forEach((data, idx) => {
    if (!data) return;
    const [key, cfg] = entries[idx];
    const valStr = cfg.thousands
      ? data.close.toLocaleString("nl-BE", { minimumFractionDigits: cfg.decimals, maximumFractionDigits: cfg.decimals })
      : data.close.toFixed(cfg.decimals).replace(".", ",");
    updateTickerItem(cfg.tickerId, valStr, data.changePct);
    markLive(key);
  });
}

async function loadPortfolioQuotes() {
  const entries = Object.entries(PORTFOLIO_SYMBOL_MAP);
  const results = await Promise.all(
    entries.map(([key, sym]) => 
      fetchAPI('quote', { symbol: sym }).catch(() => null)
    )
  );
  let anyLive = false;
  results.forEach((data, idx) => {
    if (!data || data.changePct === null) return;
    anyLive = true;
    const ticker = entries[idx][0];
    updatePortfolioCell(ticker, data.changePct);
  });
  if (anyLive) {
    document.getElementById("badgePortfolio").textContent = "LIVE — Alpha Vantage";
    document.getElementById("badgePortfolio").className = "badge badge-live";
  }
}

/* ==========================================================================
   INIT
   ========================================================================== */
function init() {
  renderTicker();
  renderCentraleBanken();
  renderInflatieTabel();
  renderInflatieChart();
  renderSimpleTable("tblGroei", BASELINE.groeiActiviteit);
  renderSimpleTable("tblArbeidsmarkt", BASELINE.arbeidsmarkt);
  renderObligatiemarkt();
  renderRenteCurve();
  renderSectoren();
  renderKalenderFallback();
  renderKalenderWidget();
  renderPortfolio();
  renderMacroScore();
  renderPositionering();

  updateClock();
  setInterval(updateClock, 1000 * 15);

  // Live data ophalen
  fetchEurUsd();
  loadEcbDepo();
  loadEcbInflation();
  loadFredData();
  loadEurostatData();
  loadBondsData();
  loadMarketQuotes();
  loadPortfolioQuotes();

  // Herhaal elke 5 minuten
  setInterval(() => {
    fetchEurUsd();
    loadEcbDepo();
    loadEcbInflation();
    loadFredData();
    loadEurostatData();
    loadBondsData();
    loadMarketQuotes();
    loadPortfolioQuotes();
  }, 5 * 60 * 1000);
}

document.addEventListener("DOMContentLoaded", init);
