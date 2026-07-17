// api/fred.js
// Vercel serverless function — haalt macro-data op bij FRED API
// (Federal Reserve Bank of St. Louis, gratis, API key nodig).
//
// Env vars (Vercel):
//   FRED_API_KEY  — gratis key via https://fred.stlouisfed.org/docs/api/api_key.html
//
// Gebruik:
//   /api/fred?series=fedfunds   -> Fed Funds Effective Rate
//   /api/fred?series=gdpus      -> VS BBP-groei YoY
//   /api/fred?series=unrateus   -> VS werkloosheidsgraad
//   /api/fred?series=cpiusy     -> VS CPI YoY

const FRED_KEY = process.env.FRED_API_KEY;

const SERIES_MAP = {
  fedfunds: { id: "FEDFUNDS",     label: "Fed Funds Rate",    unit: "%", decimals: 2 },
  gdpus:    { id: "A191RL1Q225SBEA", label: "VS BBP YoY",    unit: "%", decimals: 1 },
  unrateus: { id: "UNRATE",       label: "VS Werkloosheid",   unit: "%", decimals: 1 },
  cpiusy:   { id: "CPIAUCSL",     label: "VS CPI YoY",       unit: "%", decimals: 1, pctChange: true },
  dgs2:     { id: "DGS2",         label: "US 2Y Treasury",   unit: "%", decimals: 2 },
  dgs10:    { id: "DGS10",        label: "US 10Y Treasury",  unit: "%", decimals: 2 },
  dgs30:    { id: "DGS30",        label: "US 30Y Treasury",  unit: "%", decimals: 2 },
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");

  if (!FRED_KEY) {
    res.status(503).json({ error: "FRED_API_KEY niet ingesteld" });
    return;
  }

  const seriesKey = req.query.series;
  const cfg = SERIES_MAP[seriesKey];
  if (!cfg) {
    res.status(400).json({ error: `Onbekende series. Gebruik: ${Object.keys(SERIES_MAP).join(" | ")}` });
    return;
  }

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${cfg.id}&api_key=${FRED_KEY}&file_type=json&limit=13&sort_order=desc`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`FRED HTTP ${resp.status}`);
    const data = await resp.json();

    if (!data.observations || data.observations.length === 0) {
      throw new Error("FRED: geen observaties");
    }

    const valid = data.observations.filter((o) => o.value !== ".");
    if (valid.length === 0) throw new Error("FRED: alle waarden zijn leeg");

    const latest = valid[0];
    const previous = valid[1] || null;

    let latestValue = parseFloat(latest.value);
    let previousValue = previous ? parseFloat(previous.value) : null;

    if (cfg.pctChange && valid.length >= 13) {
      const yearAgo = valid[12];
      if (yearAgo && yearAgo.value !== ".") {
        const base = parseFloat(yearAgo.value);
        latestValue = ((latestValue - base) / base) * 100;
        previousValue = previous ? ((parseFloat(valid[1].value) - parseFloat(valid.length >= 13 ? valid[13]?.value || yearAgo.value : yearAgo.value)) / parseFloat(yearAgo.value)) * 100 : null;
      }
    }

    res.status(200).json({
      series: seriesKey,
      fredId: cfg.id,
      label: cfg.label,
      unit: cfg.unit,
      decimals: cfg.decimals,
      latest: {
        date: latest.date,
        value: parseFloat(latestValue.toFixed(cfg.decimals)),
      },
      previous: previousValue !== null ? {
        date: previous?.date,
        value: parseFloat(previousValue.toFixed(cfg.decimals)),
      } : null,
    });
  } catch (err) {
    res.status(502).json({ error: "FRED fetch mislukt", detail: String(err) });
  }
};
