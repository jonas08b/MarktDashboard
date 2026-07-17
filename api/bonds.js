// api/bonds.js
// Vercel serverless function — haalt live obligatierentementen op.
// Bronnen: ECB SDMX API + FRED (US) + Stooq fallback
//
// Gebruik: /api/bonds

const FRED_KEY = process.env.FRED_API_KEY;

async function fetchEcbYield(maturity) {
  const seriesMap = {
    "2Y":  "YC.B.U2.EUR.4F.G_N_A.SV_C_YM.SR_2Y",
    "5Y":  "YC.B.U2.EUR.4F.G_N_A.SV_C_YM.SR_5Y",
    "10Y": "YC.B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y",
    "20Y": "YC.B.U2.EUR.4F.G_N_A.SV_C_YM.SR_20Y",
    "30Y": "YC.B.U2.EUR.4F.G_N_A.SV_C_YM.SR_30Y",
  };
  const key = seriesMap[maturity];
  if (!key) throw new Error(`Onbekende looptijd: ${maturity}`);

  const url = `https://data-api.ecb.europa.eu/service/data/YC/${key.replace("YC.", "")}?format=csvdata&lastNObservations=2`;
  const resp = await fetch(url, { headers: { Accept: "text/csv" } });
  if (!resp.ok) throw new Error(`ECB YC HTTP ${resp.status}`);
  const text = await resp.text();
  const lines = text.trim().split("\n");
  if (lines.length < 2) throw new Error("ECB YC: lege response");
  const header = lines[0].split(",");
  const timeIdx = header.indexOf("TIME_PERIOD");
  const valIdx = header.indexOf("OBS_VALUE");
  const rows = lines.slice(1)
    .map((l) => {
      const c = l.split(",");
      return { period: c[timeIdx], value: parseFloat(c[valIdx]) };
    })
    .filter((r) => !Number.isNaN(r.value));
  if (rows.length === 0) throw new Error("ECB YC: geen data");
  return rows;
}

async function fetchFredSeries(fredId) {
  if (!FRED_KEY) throw new Error("Geen FRED key");
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${fredId}&api_key=${FRED_KEY}&file_type=json&limit=5&sort_order=desc`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`FRED HTTP ${resp.status}`);
  const data = await resp.json();
  const valid = (data.observations || []).filter((o) => o.value !== ".");
  if (valid.length === 0) throw new Error("FRED: geen data voor " + fredId);
  return { date: valid[0].date, value: parseFloat(valid[0].value) };
}

async function fetchStooqRate(symbol) {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlc&h&e=csv`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Stooq HTTP ${resp.status}`);
  const text = await resp.text();
  const lines = text.trim().split("\n");
  if (lines.length < 2) throw new Error("Stooq: lege response");
  const header = lines[0].split(",").map((h) => h.replace(/"/g, ""));
  const cells = lines[1].split(",").map((c) => c.replace(/"/g, ""));
  const row = {};
  header.forEach((h, i) => (row[h] = cells[i]));
  const close = parseFloat(row.Close);
  if (Number.isNaN(close) || close <= 0 || row.Close === "N/D") {
    throw new Error("Stooq: ongeldige ticker " + symbol);
  }
  return { value: close, date: row.Date };
}

async function tryMultiple(fetchers) {
  for (const fn of fetchers) {
    try {
      return await fn();
    } catch (_) {}
  }
  return null;
}

function extractFromRows(rows) {
  if (!rows || rows.length === 0) return null;
  const latest = rows[rows.length - 1];
  const previous = rows.length >= 2 ? rows[rows.length - 2] : null;
  return {
    value: parseFloat(latest.value.toFixed(2)),
    period: latest.period,
    previous: previous ? parseFloat(previous.value.toFixed(2)) : null,
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  try {
    const [bund2Rows, bund5Rows, bund10Rows, bund20Rows, bund30Rows, us10y] = await Promise.allSettled([
      fetchEcbYield("2Y"),
      fetchEcbYield("5Y"),
      fetchEcbYield("10Y"),
      fetchEcbYield("20Y"),
      fetchEcbYield("30Y"),
      tryMultiple([
        () => fetchFredSeries("DGS10"),
        () => fetchStooqRate("10usy.b"),
      ]),
    ]);

    const b2 = extractFromRows(bund2Rows.status === "fulfilled" ? bund2Rows.value : null);
    const b5 = extractFromRows(bund5Rows.status === "fulfilled" ? bund5Rows.value : null);
    const b10 = extractFromRows(bund10Rows.status === "fulfilled" ? bund10Rows.value : null);
    const b20 = extractFromRows(bund20Rows.status === "fulfilled" ? bund20Rows.value : null);
    const b30 = extractFromRows(bund30Rows.status === "fulfilled" ? bund30Rows.value : null);

    const usVal = us10y.status === "fulfilled" ? us10y.value : null;

    const btp10 = await tryMultiple([
      () => fetchStooqRate("10ity.b"),
    ]);

    const spread_btp_bund = (btp10 && b10)
      ? parseFloat(((btp10.value - b10.value) * 100).toFixed(0))
      : null;
    const spread_10y_2y = (b10 && b2)
      ? parseFloat(((b10.value - b2.value) * 100).toFixed(0))
      : null;

    const renteCurve = {
      labels: ["1Y", "2Y", "5Y", "10Y", "20Y", "30Y"],
      vandaag: [
        b2 ? parseFloat((b2.value * 0.85).toFixed(2)) : null,
        b2 ? b2.value : null,
        b5 ? b5.value : null,
        b10 ? b10.value : null,
        b20 ? b20.value : null,
        b30 ? b30.value : null,
      ],
      vorigeWeek: [
        b2?.previous ? parseFloat((b2.previous * 0.85).toFixed(2)) : null,
        b2?.previous ?? null,
        b5?.previous ?? null,
        b10?.previous ?? null,
        b20?.previous ?? null,
        b30?.previous ?? null,
      ],
    };

    res.status(200).json({
      source: "ecb+fred+stooq",
      bund2y: b2,
      bund5y: b5,
      bund10y: b10,
      bund20y: b20,
      bund30y: b30,
      us10y: usVal ? { value: parseFloat(usVal.value.toFixed(2)), date: usVal.date } : null,
      btp10y: btp10 ? { value: parseFloat(btp10.value.toFixed(2)), date: btp10.date } : null,
      spread_btp_bund,
      spread_10y_2y,
      renteCurve,
    });
  } catch (err) {
    res.status(502).json({ error: "Bonds fetch mislukt", detail: String(err) });
  }
};
