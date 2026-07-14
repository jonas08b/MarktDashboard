# Macro Dashboard

1:1 replica van het macro-economisch dashboard (dark trading-terminal stijl),
gebouwd in vanilla HTML/CSS/JS + Vercel serverless functions als API-proxy.

## Structuur

```
index.html      layout / paneelstructuur
style.css       volledige styling (dark theme)
data.js         BASELINE — exacte data uit de screenshot, dient als fallback
app.js          rendert alles + haalt live data op
api/ecb.js      serverless proxy → ECB Data Portal (depo rate, HICP, kerninflatie)
api/quote.js    serverless proxy → Stooq (indices, obligatierente, grondstoffen, aandelen)
vercel.json     CORS-headers voor /api
```

## Deployen op Vercel

```bash
npm i -g vercel      # eenmalig
cd macro-dashboard
vercel                # preview deploy
vercel --prod          # productie
```

Geen environment variables of build-stap nodig — Vercel detecteert de
statische bestanden + de functies in `/api` automatisch.

## Welke cijfers zijn écht live, en welke niet?

Elk datapunt volgt hetzelfde patroon: **eerst een live fetch proberen, bij
falen stil terugvallen op de baseline-waarde uit `data.js`.** Een groene
stip/badge = live gelukt, grijs = demo-waarde. Zo blijft de dashboard altijd
volledig bruikbaar, ook offline of als een bron down is.

| Paneel / cijfer | Bron | Status |
|---|---|---|
| EUR/USD | [Frankfurter API](https://frankfurter.dev) (ECB-koersen, gratis, geen key, CORS-vriendelijk) | **Live** |
| ECB Depo Rate | [ECB Data Portal](https://data.ecb.europa.eu) SDMX API, via `/api/ecb` | **Live** |
| HICP YoY / Kerninflatie | ECB Data Portal, dataset ICP/HICP, via `/api/ecb` | **Live**, met fallback (ECB hernoemde dit dataflow begin 2026; de proxy probeert beide namen) |
| Economische kalender | Officiële TradingView Economic Calendar widget (embed, gratis, geen key) | **Live** — toont de échte actuele agenda, niet de bevroren datum uit de screenshot |
| Euro Stoxx 50, VSTOXX, Brent, Gold, Bund 10Y | [Stooq](https://stooq.com) snapshot-quote, via `/api/quote` | **Best-effort live** — Stooq heeft geen officiële API; tickersymbolen (`^sx5e`, `^v2tx`, `cb.f`, `xauusd`, `10dey.b`) zijn afgeleid uit community-conventies en kunnen fout/verouderd zijn. Check en corrigeer ze in `TICKER_QUOTE_MAP` (app.js) indien nodig. |
| Portfolio heatmap (dagperformance) | Stooq, via `/api/quote` (change = close t.o.v. open) | **Best-effort live**, zelfde caveat |
| Fed/BoE/BoJ/PBoC rates, PMI, BBP-groei, industriële productie, consumentenvertrouwen, werkloosheid, loongroei, vacatures, participatiegraad, sector-scores, macro score model, positionering | — | **Demo-data** (analytische/samengestelde cijfers, niet gratis+live zonder betaalde databron) |

### Waarom niet alles live?

- **PMI** (Manufacturing/Services) is gelicenseerde data van S&P Global/HCOB —
  nergens gratis live beschikbaar.
- **Fed Funds Rate** kan via [FRED](https://fred.stlouisfed.org/docs/api/fred/)
  (gratis, wel een API key nodig).
- **BBP-groei, industriële productie, werkloosheid, consumentenvertrouwen**
  zijn wél gratis en live op te halen via de
  [Eurostat API](https://ec.europa.eu/eurostat/web/main/data/web-services)
  (JSON-stat, geen key) — niet ingebouwd in deze versie om de scope beheersbaar
  te houden, maar een logische volgende stap voor `FinDash`-achtig
  uitbreidingswerk.
- **Sector-scores, macro score model, actieve positionering** zijn per
  definitie analistenoordelen, geen marktdata — die vul je zelf in via
  `data.js`.

## Live data zelf uitbreiden

1. Voeg een nieuwe entry toe in `data.js` (baseline-waarde + `live`-sleutel).
2. Schrijf een fetch-functie in `app.js` die dezelfde sleutel target via
   `data-role="..."` / `data-live="..."` attributen (zie bestaande functies
   als voorbeeld).
3. Heb je een key-based API nodig (FRED, Alpha Vantage, Twelve Data)? Zet de
   key als Vercel environment variable en lees ze uit in een nieuwe
   `api/*.js`-functie — nooit client-side, anders lekt de key.

## Belangrijk

Dit is een demo-/schoolproject-dashboard, geen productieklare
beleggingstool. De Stooq-integratie leunt op een niet-officiële endpoint;
voor iets dat betrouwbaar moet blijven draaien: vervang door Twelve Data,
Alpha Vantage of Finnhub (allen gratis tier + API key).
