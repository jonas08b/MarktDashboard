/* ==========================================================================
   app.js — Macro Dashboard
   1) Rendert alle panelen op basis van BASELINE (data.js)
   2) Start klok
   3) Probeert live databronnen op te halen; bij succes wordt de UI-waarde
      + badge (LIVE, groene stip) bijgewerkt. Bij falen blijft de baseline
      staan (DEMO badge, grijze stip).
   ========================================================================== */

const nl = new Intl.NumberFormat("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nl1 = new Intl.NumberFormat("nl-BE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function fmtPct(v, decimals = 2) {
  const s = v.toLocaleString("nl-BE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (v > 0 ? "+" : "") + s;
}

/* ------------------------------------------------------------------ *
 * LIVE STATE — houdt bij welke metrics succesvol live opgehaald zijn
 * ------------------------------------------------------------------ */
const LIVE = {}; // key -> { value, changePct? }

function markLive(key) {
  document.querySelectorAll(`[data-live="${key}"]`).forEach((el) => {
    const dot = el.querySelector(".live-dot");
    if (dot) dot.classList.add("on");
  });
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
   RENDER: GROEI & ACTIVITEIT / ARBEIDSMARKT (zelfde tabelvorm)
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

  const allVals = series.flatMap((s) => s.data);
  const min = opts.min !== undefined ? opts.min : Math.min(...allVals, 0);
  const max = opts.max !== undefined ? opts.max : Math.max(...allVals);
  const n = series[0].data.length;

  const x = (i) => padL + (i / (n - 1)) * innerW;
  const y = (v) => padT + innerH - ((v - min) / (max - min)) * innerH;

  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;

  // gridlines (y-as)
  const steps = opts.yTicks || 5;
  for (let i = 0; i <= steps; i++) {
    const v = min + (i / steps) * (max - min);
    const yy = y(v);
    svg += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="#1a2029" stroke-width="1"/>`;
    svg += `<text x="${padL - 6}" y="${yy + 3}" text-anchor="end" font-size="9" fill="#545c6a">${opts.yFmt ? opts.yFmt(v) : v}</text>`;
  }

  // doellijn (dashed)
  if (opts.targetLine !== undefined) {
    const yy = y(opts.targetLine);
    svg += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="#545c6a" stroke-width="1.2" stroke-dasharray="4 3"/>`;
  }

  // x-as labels
  if (opts.xLabels) {
    opts.xLabels.forEach((lab, idx) => {
      const xi = (idx / (opts.xLabels.length - 1)) * (n - 1);
      svg += `<text x="${x(xi)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#545c6a">${lab}</text>`;
    });
  }

  // series
  series.forEach((s) => {
    const pts = s.data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    const dash = s.dashed ? `stroke-dasharray="5 4"` : "";
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" ${dash} stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.dots) {
      s.data.forEach((v, i) => {
        svg += `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${s.color}"/>`;
      });
    }
  });

  svg += `</svg>`;
  el.innerHTML = svg;
}

function renderInflatieChart() {
  drawLineChart("chartInflatie", [
    { data: BASELINE.inflatie.hicp, color: "#4a8fe7" },
    { data: BASELINE.inflatie.core, color: "#e8873f" },
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

function renderRenteCurve() {
  const rc = BASELINE.renteCurve;
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
   RENDER: ECONOMISCHE KALENDER — TradingView widget (live) + fallback
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

  // Als TradingView na 4s niets rendert (bv. geblokkeerd netwerk), val terug op de statische tabel.
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
  const intensity = Math.min(Math.abs(pct) / 2.5, 1); // schaal: 2.5% = volle kleur
  if (pct >= 0) {
    const l = 22 + intensity * 8; // donker -> iets lichter groen
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
   LIVE DATA — FRANKFURTER (EUR/USD, direct client-side, CORS-vriendelijk)
   ========================================================================== */
async function fetchEurUsd() {
  try {
    const resp = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();
    const rate = data.rates && data.rates.USD;
    if (!rate) throw new Error("geen USD rate in response");
    updateTickerItem("eurusd", rate.toFixed(4).replace(".", ","), null);
    markLive("eurusd");
  } catch (err) {
    console.warn("EUR/USD live fetch mislukt, val terug op demo:", err.message);
  }
}

/* ==========================================================================
   LIVE DATA — ECB (via eigen /api/ecb proxy)
   ========================================================================== */
async function fetchEcb(series) {
  try {
    const resp = await fetch(`/api/ecb?series=${series}`);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();
    return data;
  } catch (err) {
    console.warn(`ECB ${series} live fetch mislukt, val terug op demo:`, err.message);
    return null;
  }
}

async function loadEcbDepo() {
  const data = await fetchEcb("depo");
  if (!data || !data.latest) return;
  const v = data.latest.value;
  const str = nl.format(v).replace(".", ",") + "%";
  document.querySelectorAll('[data-role="ecbDepo"]').forEach((el) => (el.textContent = str));
  updateTickerItem("ecb", str, null);
  markLive("ecbDepo");
}

async function loadEcbInflation() {
  const [hicp, core] = await Promise.all([fetchEcb("hicp"), fetchEcb("core")]);

  if (hicp && hicp.history && hicp.history.length >= 2) {
    const vals = hicp.history.map((r) => r.value);
    BASELINE.inflatie.hicp = vals.slice(-11);
    const latest = hicp.latest.value;
    const prev = hicp.history[hicp.history.length - 2].value;
    document.querySelectorAll('[data-role="hicp-laatste"]').forEach((el) => (el.textContent = nl.format(latest).replace(".", ",") + "%"));
    markLive("hicp");
  }
  if (core && core.history && core.history.length >= 2) {
    const vals = core.history.map((r) => r.value);
    BASELINE.inflatie.core = vals.slice(-11);
    const latest = core.latest.value;
    document.querySelectorAll('[data-role="coreInflation-laatste"]').forEach((el) => (el.textContent = nl.format(latest).replace(".", ",") + "%"));
    markLive("coreInflation");
  }
  if ((hicp && hicp.history) || (core && core.history)) {
    renderInflatieChart();
    document.getElementById("badgeInflatie").textContent = "LIVE — ECB Data Portal";
    document.getElementById("badgeInflatie").className = "badge badge-live";
  }
}

/* ==========================================================================
   LIVE DATA — STOOQ (via eigen /api/quote proxy): indices, rente, grondstoffen, aandelen
   ========================================================================== */
async function fetchQuote(symbol) {
  try {
    const resp = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    console.warn(`Quote ${symbol} live fetch mislukt, val terug op demo:`, err.message);
    return null;
  }
}

const TICKER_QUOTE_MAP = {
  sx5e:    { symbol: "^sx5e",  tickerId: "sx5e",   decimals: 2, thousands: true },
  vstoxx:  { symbol: "^v2tx",  tickerId: "vstoxx",  decimals: 2, thousands: false },
  brent:   { symbol: "cb.f",   tickerId: "brent",   decimals: 2, thousands: false },
  gold:    { symbol: "xauusd", tickerId: "gold",    decimals: 2, thousands: true },
  bund10y: { symbol: "10dey.b",tickerId: "bund10y", decimals: 2, thousands: false, isPercent: true },
};

async function loadMarketQuotes() {
  const entries = Object.entries(TICKER_QUOTE_MAP);
  const results = await Promise.all(entries.map(([key, cfg]) => fetchQuote(cfg.symbol).then((r) => [key, cfg, r])));
  results.forEach(([key, cfg, data]) => {
    if (!data) return;
    const valStr = cfg.thousands
      ? data.close.toLocaleString("nl-BE", { minimumFractionDigits: cfg.decimals, maximumFractionDigits: cfg.decimals })
      : data.close.toFixed(cfg.decimals).replace(".", ",");
    updateTickerItem(cfg.tickerId, valStr + (cfg.isPercent ? "%" : ""), data.changePct);
    markLive(key);
    if (key === "bund10y") {
      const str = data.close.toFixed(2).replace(".", ",") + "%";
      document.querySelectorAll('[data-role="bund10y"]').forEach((el) => (el.textContent = str));
    }
  });
}

async function loadPortfolioQuotes() {
  const results = await Promise.all(
    BASELINE.portfolio.map((p) => fetchQuote(p.ticker.toLowerCase()).then((r) => [p, r]))
  );
  let anyLive = false;
  results.forEach(([p, data]) => {
    if (!data || data.changePct === null) return;
    anyLive = true;
    updatePortfolioCell(p.ticker, data.changePct);
  });
  if (anyLive) {
    document.getElementById("badgePortfolio").textContent = "LIVE — Stooq";
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

  // Live databronnen ophalen (elk faalt onafhankelijk en gracieus)
  fetchEurUsd();
  loadEcbDepo();
  loadEcbInflation();
  loadMarketQuotes();
  loadPortfolioQuotes();

  // Herhaal live refresh elke 5 minuten
  setInterval(() => {
    fetchEurUsd();
    loadEcbDepo();
    loadMarketQuotes();
    loadPortfolioQuotes();
  }, 5 * 60 * 1000);
}

document.addEventListener("DOMContentLoaded", init);
