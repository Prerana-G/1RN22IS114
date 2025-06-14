const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

const stockDataStore = {
  AAPL: [],
  GOOGL: [],
  TSLA: [],
  MSFT: [],
  AMZN: []
};

setInterval(() => {
  const timestamp = new Date().toISOString();

  for (const symbol in stockDataStore) {
    const pricePoints = stockDataStore[symbol];
    const prevPrice = pricePoints.length
      ? pricePoints[pricePoints.length - 1].price
      : Math.random() * 1000;

    const delta = (Math.random() - 0.5) * 20;
    const updatedPrice = parseFloat((prevPrice + delta).toFixed(4));

    pricePoints.push({ price: updatedPrice, lastUpdatedAt: timestamp });

    if (pricePoints.length > 360) pricePoints.shift(); // keep only recent 1 hour data
  }
}, 10000);

function getRecentData(symbol, minutes) {
  const entries = stockDataStore[symbol];
  if (!entries) return null;

  const cutoffTime = Date.now() - minutes * 60 * 1000;
  return entries.filter(entry => new Date(entry.lastUpdatedAt).getTime() >= cutoffTime);
}

app.get('/tickers', (req, res) => {
  res.json(Object.keys(stockDataStore));
});

app.get('/stocks/:ticker', (req, res) => {
  const { ticker } = req.params;
  const { minutes, aggregation } = req.query;

  const symbol = ticker.toUpperCase();
  const range = parseInt(minutes, 10);

  if (!stockDataStore[symbol]) {
    return res.status(404).json({ error: `Ticker '${symbol}' not found.` });
  }

  if (!minutes || isNaN(range) || range <= 0 || range > 60) {
    return res.status(400).json({ error: 'minutes is required (1–60).' });
  }

  if (aggregation !== 'average') {
    return res.status(400).json({ error: 'Only aggregation=average supported.' });
  }

  const filtered = getRecentData(symbol, range);
  if (!filtered || filtered.length === 0) {
    return res.status(404).json({ error: `No data for '${symbol}' in last ${range} min.` });
  }

  const avgPrice = filtered.reduce((sum, entry) => sum + entry.price, 0) / filtered.length;

  res.json({
    averageStockPrice: parseFloat(avgPrice.toFixed(6)),
    priceHistory: filtered
  });
});

app.get('/stockcorrelation', (req, res) => {
  const { minutes, ticker } = req.query;

  if (!minutes || !ticker) {
    return res.status(400).json({ error: 'minutes and ticker[] are required.' });
  }

  const range = parseInt(minutes, 10);
  const symbols = Array.isArray(ticker) ? ticker : [ticker];

  if (isNaN(range) || range <= 0 || range > 60 || symbols.length !== 2) {
    return res.status(400).json({ error: 'Provide minutes(1–60) and two ticker values.' });
  }

  const [s1, s2] = symbols.map(s => s.toUpperCase());

  if (!stockDataStore[s1] || !stockDataStore[s2]) {
    return res.status(404).json({ error: 'One or both tickers not found.' });
  }

  const data1 = getRecentData(s1, range);
  const data2 = getRecentData(s2, range);

  const map1 = new Map(data1.map(entry => [entry.lastUpdatedAt, entry.price]));
  const map2 = new Map(data2.map(entry => [entry.lastUpdatedAt, entry.price]));

  const timestamps = [...map1.keys()].filter(ts => map2.has(ts));
  if (timestamps.length < 2) {
    return res.json({
      correlation: 0,
      stocks: {
        [s1]: { averagePrice: 0, priceHistory: [] },
        [s2]: { averagePrice: 0, priceHistory: [] }
      }
    });
  }

  const values1 = timestamps.map(ts => map1.get(ts));
  const values2 = timestamps.map(ts => map2.get(ts));

  const mean1 = values1.reduce((s, v) => s + v, 0) / values1.length;
  const mean2 = values2.reduce((s, v) => s + v, 0) / values2.length;

  const covariance = values1.reduce((sum, v, i) => sum + (v - mean1) * (values2[i] - mean2), 0) / (values1.length - 1);
  const stdDev1 = Math.sqrt(values1.reduce((s, v) => s + (v - mean1) ** 2, 0) / (values1.length - 1));
  const stdDev2 = Math.sqrt(values2.reduce((s, v) => s + (v - mean2) ** 2, 0) / (values2.length - 1));

  const correlation = covariance / (stdDev1 * stdDev2) || 0;

  res.json({
    correlation: parseFloat(correlation.toFixed(4)),
    stocks: {
      [s1]: {
        averagePrice: parseFloat(mean1.toFixed(6)),
        priceHistory: timestamps.map(ts => ({ price: map1.get(ts), lastUpdatedAt: ts }))
      },
      [s2]: {
        averagePrice: parseFloat(mean2.toFixed(6)),
        priceHistory: timestamps.map(ts => ({ price: map2.get(ts), lastUpdatedAt: ts }))
      }
    }
  });
});

app.get('/correlationmatrix', (req, res) => {
  const { minutes } = req.query;
  const range = parseInt(minutes, 10);

  if (isNaN(range) || range <= 0 || range > 60) {
    return res.status(400).json({ error: 'minutes must be 1–60.' });
  }

  const symbols = Object.keys(stockDataStore);
  const matrix = {};
  const averages = {};
  const deviations = {};

  for (const sym of symbols) {
    const recent = getRecentData(sym, range) || [];
    const prices = recent.map(entry => entry.price);

    if (prices.length < 2) {
      averages[sym] = 0;
      deviations[sym] = 0;
    } else {
      const avg = prices.reduce((s, v) => s + v, 0) / prices.length;
      const variance = prices.reduce((s, v) => s + (v - avg) ** 2, 0) / (prices.length - 1);
      averages[sym] = parseFloat(avg.toFixed(6));
      deviations[sym] = parseFloat(Math.sqrt(variance).toFixed(6));
    }
  }

  for (const s1 of symbols) {
    matrix[s1] = {};
    for (const s2 of symbols) {
      if (s1 === s2) {
        matrix[s1][s2] = 1.0;
      } else {
        const d1 = getRecentData(s1, range) || [];
        const d2 = getRecentData(s2, range) || [];

        const m1 = new Map(d1.map(e => [e.lastUpdatedAt, e.price]));
        const m2 = new Map(d2.map(e => [e.lastUpdatedAt, e.price]));
        const commonTs = [...m1.keys()].filter(ts => m2.has(ts));

        if (commonTs.length < 2) {
          matrix[s1][s2] = 0;
        } else {
          const v1 = commonTs.map(ts => m1.get(ts));
          const v2 = commonTs.map(ts => m2.get(ts));

          const avg1 = v1.reduce((s, val) => s + val, 0) / v1.length;
          const avg2 = v2.reduce((s, val) => s + val, 0) / v2.length;

          const cov = v1.reduce((sum, val, i) => sum + (val - avg1) * (v2[i] - avg2), 0) / (v1.length - 1);
          const std1 = Math.sqrt(v1.reduce((s, val) => s + (val - avg1) ** 2, 0) / (v1.length - 1));
          const std2 = Math.sqrt(v2.reduce((s, val) => s + (val - avg2) ** 2, 0) / (v2.length - 1));

          matrix[s1][s2] = parseFloat((cov / (std1 * std2) || 0).toFixed(4));
        }
      }
    }
  }

  res.json({ matrix, averages, standardDeviations: deviations });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
