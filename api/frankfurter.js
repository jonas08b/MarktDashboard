// api/frankfurter.js
// Vercel serverless function — haalt EUR/USD koers op via Frankfurter API
// (gratis, geen API key, CORS-vriendelijk)
//
// Gebruik: /api/frankfurter

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  try {
    const resp = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD");
    if (!resp.ok) throw new Error(`Frankfurter HTTP ${resp.status}`);
    const data = await resp.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: "Frankfurter fetch mislukt", detail: String(err) });
  }
};
