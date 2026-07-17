/* ==========================================================================
   data.js — Statische baseline (demo) data.
   ========================================================================== */

const BASELINE = {

  ticker: [
    { id: "ecb",     label: "ECB Depo Rate",  value: "2,00%",    delta: -0.25, deltaText: "-0,25", live: "ecbDepo" },
    { id: "bund10y", label: "Bund 10Y",       value: "2,60%",    delta: 0.03,  deltaText: "+0,03", live: "bund10y" },
    { id: "eurusd",  label: "EUR/USD",        value: "1,1624",   delta: 0.41,  deltaText: "+0,41%", live: "eurusd" },
    { id: "sx5e",    label: "Euro Stoxx 50",  value: "5.120,45", delta: 0.70,  deltaText: "+0,70%", live: "sx5e" },
    { id: "vstoxx",  label: "VSTOXX",         value: "18,40",    delta: -1.10, deltaText: "-1,10", live: "vstoxx" },
    { id: "brent",   label: "Brent Oil",      value: "84,32",    delta: 0.65,  deltaText: "+0,65", live: "brent" },
    { id: "gold",    label: "Gold",           value: "2.350,10", delta: -0.20, deltaText: "-0,20%", live: "gold" },
    { id: "fedfunds",label: "Fed Funds Rate", value: "4,25%",    delta: 0,     deltaText: "0,00", live: "fedFunds" },
    { id: "gdpus",   label: "VS BBP YoY",     value: "2,8%",     delta: 0,     deltaText: "0,00", live: "gdpGrowth" },
  ],

  centraleBanken: [
    { naam: "ECB Depo Rate",  waarde: "2,00%",  trend: "down", live: "ecbDepo" },
    { naam: "Fed Funds Rate", waarde: "4,25%",  trend: "down", live: "fedFunds" },
    { naam: "BoE Rate",       waarde: "3,75%",  trend: "flat" },
    { naam: "BoJ Policy Rate",waarde: "-0,10%", trend: "flat" },
    { naam: "PBoC 1Y LPR",    waarde: "3,45%",  trend: "up" },
  ],

  inflatie: {
    hicp:  [3.4, 5.9, 8.6, 9.9, 8.1, 6.1, 5.2, 4.3, 2.9, 2.4, 2.1],
    core:  [1.2, 2.7, 3.9, 4.8, 5.5, 5.7, 5.0, 4.5, 3.4, 2.6, 2.4],
    years: [2020, 2020.8, 2021.6, 2022, 2022.4, 2022.8, 2023.2, 2023.6, 2024, 2024.4, 2024.8],
    target: 2.0,
    tabel: [
      { naam: "HICP YoY",         laatste: "2,1%", vorige: "2,4%", live: "hicp" },
      { naam: "Kerninflatie YoY", laatste: "2,4%", vorige: "2,6%", live: "coreInflation" },
      { naam: "5Y5Y Inflation Swap", laatste: "2,1%", vorige: "2,0%" },
    ],
  },

  groeiActiviteit: [
    { naam: "PMI Manufacturing",       laatste: "49,8", trend: "bad" },
    { naam: "PMI Services",            laatste: "52,1", trend: "good" },
    { naam: "BBP-groei Eurozone (YoY)", laatste: "1,4%", trend: "good", live: "gdpEu" },
    { naam: "Industriële productie (YoY)", laatste: "-1,0%", trend: "bad", live: "indProd" },
    { naam: "Consumentenvertrouwen",   laatste: "-12",  trend: "bad", live: "consConf" },
  ],

  arbeidsmarkt: [
    { naam: "Werkloosheid EU",      laatste: "6,2%",  trend: "good", live: "unemploymentEu" },
    { naam: "Werkloosheid VS",      laatste: "3,8%",  trend: "good", live: "unemployment" },
    { naam: "Loongroei (YoY)",      laatste: "3,1%",  trend: "good" },
    { naam: "Vacatures (YoY)",      laatste: "+8,2%", trend: "good" },
    { naam: "Participatiegraad",    laatste: "72,3%", trend: "neutral" },
  ],

  obligatiemarkt: [
    { naam: "Duitse 2Y Bund",  laatste: "1,90%", delta: "-2", live: "bund2y" },
    { naam: "Duitse 10Y Bund", laatste: "2,60%", delta: "+3", live: "bund10y" },
    { naam: "10Y - 2Y Spread", laatste: "+70 bp", delta: "+5", live: "spread10y2y" },
    { naam: "BTP-Bund Spread", laatste: "+130 bp", delta: "+4", live: "spreadBtpBund" },
    { naam: "US 10Y Treasury", laatste: "4,42%", delta: "+2", live: "us10y" },
  ],

  renteCurve: {
    labels: ["1Y", "2Y", "5Y", "10Y", "20Y", "30Y"],
    vandaag:    [1.90, 1.90, 2.25, 2.60, 2.85, 2.90],
    vorigeWeek: [1.85, 1.88, 2.15, 2.55, 2.80, 2.85],
  },

  sectoren: [
    { naam: "Financieel",             score: 7, trend: "up",   vsMarkt: "+1,2%" },
    { naam: "Industrie",              score: 6, trend: "up",   vsMarkt: "+0,6%" },
    { naam: "Technologie",            score: 5, trend: "flat", vsMarkt: "-0,1%" },
    { naam: "Consument Discretionair",score: 4, trend: "down", vsMarkt: "-0,8%" },
    { naam: "Gezondheidszorg",        score: 6, trend: "up",   vsMarkt: "+0,3%" },
    { naam: "Energie",                score: 7, trend: "up",   vsMarkt: "+1,5%" },
    { naam: "Vastgoed",               score: 3, trend: "down", vsMarkt: "-1,2%" },
    { naam: "Nutsbedrijven",          score: 5, trend: "flat", vsMarkt: "+0,1%" },
    { naam: "Materialen",             score: 5, trend: "flat", vsMarkt: "-0,2%" },
  ],

  kalender: [
    { tijd: "09:00", event: "Duitse PPI (YoY)",     impact: "high", verwacht: "-0,2%", vorige: "-0,4%" },
    { tijd: "11:00", event: "Eurozone CPI (YoY)",   impact: "high", verwacht: "2,1%",  vorige: "2,4%" },
    { tijd: "14:30", event: "VS Building Permits",  impact: "med",  verwacht: "1,46M", vorige: "1,48M" },
    { tijd: "14:30", event: "VS Housing Starts",    impact: "med",  verwacht: "1,38M", vorige: "1,32M" },
    { tijd: "16:00", event: "VS Conf. Board Index", impact: "med",  verwacht: "100,2", vorige: "97,5" },
    { tijd: "20:00", event: "FOMC Notulen",         impact: "high", verwacht: "-",     vorige: "-" },
  ],

  portfolio: [
    { naam: "ASML",         pct: 2.15,  ticker: "ASML.NL" },
    { naam: "SAP",          pct: 0.85,  ticker: "SAP.DE" },
    { naam: "LVMH",         pct: -1.45, ticker: "MC.FR" },
    { naam: "ING",          pct: 1.20,  ticker: "INGA.NL" },
    { naam: "Shell",        pct: -0.55, ticker: "SHEL.UK" },
    { naam: "Airbus",       pct: 0.95,  ticker: "AIR.FR" },
    { naam: "Schneider",    pct: 0.40,  ticker: "SU.FR" },
    { naam: "TotalEnergies",pct: -0.30, ticker: "TTE.FR" },
    { naam: "BMW",          pct: -0.80, ticker: "BMW.DE" },
    { naam: "Siemens",      pct: 0.60,  ticker: "SIE.DE" },
  ],

  macroScore: {
    growth:    { score: 7, kleur: "green" },
    inflation: { score: 4, kleur: "amber" },
    liquidity: { score: 6, kleur: "green" },
    risk:      { score: 5, kleur: "amber" },
    totaal: 5.5,
    regime: "LATE CYCLE",
  },

  positionering: [
    { status: "over",    label: "Overwogen",  sectoren: "Banken, Defensie, Industrie" },
    { status: "neutraal",label: "Neutraal",   sectoren: "Technologie, Gezondheidszorg" },
    { status: "onder",   label: "Onderwogen", sectoren: "Vastgoed, Consument Discretionair" },
  ],
  themas: "Deglobalisatie, Rente-top, AI-productiviteit",
};
