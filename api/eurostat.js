// api/eurostat.js
// Vercel serverless function — haalt macro-data op bij Eurostat JSON-stat API.
// Geen API key nodig.
//
// Gebruik:
//   /api/eurostat?series=unemployment  -> Werkloosheidsgraad Eurozone
//   /api/eurostat?series=gdp           -> BBP-groei Eurozone YoY
//   /api/eurostat?series=indprod       -> Industriële productie Eurozone
//   /api/eurostat?series=consconf      -> Consumentenvertrouwen Eurozone

const EUROSTAT_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

const SERIES_MAP = {
  unemployment: {
    dataset: "une_rt_m",
    params: "geo=EA20&s_adj=SA&age=TOTAL&unit=PC_ACT&sex=T",
    label: "Werkloosheid Eurozone",
    unit: "%",
    decimals: 1,
  },
  gdp: {
    dataset: "namq_10_gdp",
    params: "geo=EA20&unit=PCH_PRE&s_adj=SCA&na_item=B1GQ",
    label: "BBP-groei Eurozone",
    unit: "%",
    decimals: 1,
  },
  indprod: {
    dataset: "sts_inpr_m",
    params: "geo=EA20&s_adj=CA&indic_bt=PROD&nace_r2=B-D&unit=PCH_PRE",
    label: "Industriële productie Eurozone",
    unit: "%",
    decimals: 1,
  },
  consconf: {
    dataset: "ei_bsco_m",
    params: "geo=EA&s_adj=SA&indic=BS-CSMCI",
    label: "Consumentenvertrouwen Eurozone",
    unit: "",
    decimals: 1,
  },
};

function extractLatestValues(jsonData) {
  const values = jsonData.value;
  const times = jsonData.dimension?.time?.category?.index || {};
  const timePeriods = Object.keys(times).sort();
  const nTime = timePeriods.length;

  if (!values || nTime === 0) throw new Error("Eurostat: geen tijdreeks");

  const results = [];
  for (let i = nTime - 1; i >= 0 && results.length < 2; i--) {
    let val;
    if (Array.isArray(values)) {
      val = values[values.length - 1 - (nTime - 1 - i)];
    } else {
      val = values[String(i)];
    }
    if (val !== null && val !== undefined && !isNaN(val)) {
      results.unshift({ period: timePeriods[i], value: val });
    }
  }

  if (results.length === 0) throw new Error("Eurostat: geen geldige waarden");
  return results;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");

  const seriesKey = req.query.series;
  const cfg = SERIES_MAP[seriesKey];
  if (!cfg) {
    res.status(400).json({ error: `Onbekende series. Gebruik: ${Object.keys(SERIES_MAP).join(" | ")}` });
    return;
  }

  try {
    const url = `${EUROSTAT_BASE}/${cfg.dataset}?format=JSON&lang=NL&${cfg.params}&lastTimePeriod=24`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) throw new Error(`Eurostat HTTP ${resp.status}`);
    const data = await resp.json();

    const recentValues = extractLatestValues(data);
    const latest = recentValues[recentValues.length - 1];
    const previous = recentValues.length >= 2 ? recentValues[recentValues.length - 2] : null;

    res.status(200).json({
      series: seriesKey,
      label: cfg.label,
      unit: cfg.unit,
      decimals: cfg.decimals,
      latest: {
        period: latest.period,
        value: parseFloat(parseFloat(latest.value).toFixed(cfg.decimals)),
      },
      previous: previous ? {
        period: previous.period,
        value: parseFloat(parseFloat(previous.value).toFixed(cfg.decimals)),
      } : null,
    });
  } catch (err) {
    res.status(502).json({ error: "Eurostat fetch mislukt", detail: String(err) });
  }
};
