const express = require("express");
const axios = require("axios");
const { signToken, verifyToken } = require("../logic/auth");
const {
  findUserByCredentials,
  findUserByUsernameOrEmail,
  addUser,
  isStrongPassword,
} = require("../logic/userStore");

const router = express.Router();

// API Keys - Replace with your own keys from newsapi.org and alphavantage.co
const NEWS_API_KEY =
  process.env.NEWS_API_KEY || "ac1f2d65de8b4c0fb9ffddbed97830af";
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || "96UI4G6Z6ZX5K30P";

router.get("/", (req, res) => {
  res.render("homePage.ejs");
});

router.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = findUserByCredentials(username, password);

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  const token = signToken({ username: user.username, name: user.name });

  res.cookie("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60,
  });

  return res.json({ success: true, token });
});

router.post("/api/signup", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Fill in all signup fields" });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      success: false,
      message:
        "Choose a stronger password: at least 10 characters, with uppercase, lowercase, number, and symbol.",
    });
  }

  const existingUser = findUserByUsernameOrEmail(username, email);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "Username or email already exists",
    });
  }

  addUser({ username, email, password, name: username });

  return res.json({
    success: true,
    message: "Account created successfully. Please log in.",
  });
});

router.get("/dashboard", (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.redirect("/");
  }

  try {
    const decoded = verifyToken(token);
    return res.render("dashboard.ejs", {
      username: decoded.username,
      name: decoded.name,
    });
  } catch (error) {
    return res.redirect("/");
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  });
  return res.redirect("/");
});

// Fetch financial news from NewsAPI
router.get("/api/news", async (req, res) => {
  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: "stocks OR finance OR market",
        sortBy: "publishedAt",
        language: "en",
        pageSize: 12,
        apiKey: NEWS_API_KEY,
      },
    });

    const articles = response.data.articles.map((article) => ({
      headline: article.title,
      summary: article.description || "No summary available",
      image:
        article.urlToImage ||
        "https://via.placeholder.com/400x300?text=No+Image",
      source: article.source.name,
      url: article.url,
      publishedAt: article.publishedAt,
    }));

    res.json({ success: true, articles });
  } catch (error) {
    console.error("NewsAPI Error:", error.message);
    res.status(500).json({
      success: false,
      message:
        "Failed to fetch news. Make sure you have set up the NEWS_API_KEY.",
      error: error.message,
    });
  }
});

// Fetch stock quote from Alpha Vantage
router.get("/api/stock/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: "GLOBAL_QUOTE",
        symbol: symbol.toUpperCase(),
        apikey: ALPHA_VANTAGE_KEY,
      },
    });

    const quote = response.data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      return res.status(404).json({
        success: false,
        message: "Stock not found or API limit reached",
      });
    }

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["09. change"]),
      changePct: parseFloat(quote["10. change percent"]),
      timestamp: quote["07. latest trading day"],
    });
  } catch (error) {
    console.error("Alpha Vantage Error:", error.message);
    res.status(500).json({
      success: false,
      message:
        "Failed to fetch stock data. Make sure you have set up the ALPHA_VANTAGE_KEY.",
      error: error.message,
    });
  }
});

// Fetch daily time series data for historical analysis
router.get("/api/stock-history/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: "TIME_SERIES_DAILY",
        symbol: symbol.toUpperCase(),
        outputsize: "full",
        apikey: ALPHA_VANTAGE_KEY,
      },
    });

    const timeSeries = response.data["Time Series (Daily)"];
    if (!timeSeries) {
      return res.status(404).json({
        success: false,
        message: "Stock history not found or API limit reached",
      });
    }

    // Convert to array and limit to last 60 days for performance
    const history = Object.entries(timeSeries)
      .slice(0, 60)
      .map(([date, data]) => ({
        date,
        open: parseFloat(data["1. open"]),
        high: parseFloat(data["2. high"]),
        low: parseFloat(data["3. low"]),
        close: parseFloat(data["4. close"]),
        volume: parseInt(data["5. volume"]),
      }))
      .reverse();

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      data: history,
    });
  } catch (error) {
    console.error("Alpha Vantage History Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stock history",
      error: error.message,
    });
  }
});

// Technical Indicators and Risk Analysis
function calculateMA(prices, period) {
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;

  let gains = 0,
    losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(prices) {
  if (prices.length < 26) return null;

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  const signalLine = calculateEMA([macdLine], 9); // Simplified

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine,
  };
}

function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateBollingerBands(prices, period = 20) {
  if (prices.length < period) return null;

  const ma = calculateMA(prices, period);
  const subset = prices.slice(-period);
  const variance =
    subset.reduce((sum, price) => sum + Math.pow(price - ma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: ma + stdDev * 2,
    middle: ma,
    lower: ma - stdDev * 2,
  };
}

function identifyRiskFactors(
  currentPrice,
  previousPrice,
  prices,
  volume,
  avgVolume,
) {
  const risks = [];
  const warnings = [];

  // Volatility threshold (> 5%)
  const priceChangePercent =
    ((currentPrice - previousPrice) / previousPrice) * 100;
  if (Math.abs(priceChangePercent) > 5) {
    risks.push("High volatility");
  }

  // Price drop alert (> 3%)
  if (priceChangePercent < -3) {
    risks.push("Significant price drop");
  }

  // Volume spike (> 2x average)
  if (avgVolume > 0 && volume > avgVolume * 2) {
    warnings.push("Unusual trading volume");
  }

  // Moving average crossover
  const ma50 = calculateMA(prices, 50);
  const ma200 = calculateMA(prices, 200);
  if (ma50 && ma200 && ma50 < ma200) {
    warnings.push("Price below 50-day MA");
  }
  if (ma50 && ma200 && currentPrice < ma50) {
    warnings.push("Below short-term MA");
  }

  // RSI extreme values
  const rsi = calculateRSI(prices, 14);
  if (rsi !== null) {
    if (rsi > 70) warnings.push("Overbought (RSI > 70)");
    if (rsi < 30) warnings.push("Oversold (RSI < 30)");
  }

  return { risks, warnings, severity: risks.length > 0 ? "high" : "medium" };
}

function identifyPatterns(prices) {
  const patterns = [];

  if (prices.length < 5) return patterns;

  const recent = prices.slice(-5);
  const trend = recent[recent.length - 1] - recent[0];

  // Uptrend vs downtrend
  if (trend > 0) {
    patterns.push("Uptrend");
  } else if (trend < 0) {
    patterns.push("Downtrend");
  }

  // Breakout detection
  const ma20 = calculateMA(prices, 20);
  if (ma20 && prices[prices.length - 1] > ma20 * 1.02) {
    patterns.push("Bullish breakout");
  } else if (ma20 && prices[prices.length - 1] < ma20 * 0.98) {
    patterns.push("Bearish breakout");
  }

  // Bollinger Bands
  const bb = calculateBollingerBands(prices);
  if (bb) {
    if (prices[prices.length - 1] > bb.upper) {
      patterns.push("Price above upper band");
    } else if (prices[prices.length - 1] < bb.lower) {
      patterns.push("Price below lower band");
    }
  }

  return patterns;
}

// Combined analysis endpoint
router.get("/api/stock-analysis/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    // Get current quote
    const quoteResponse = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: "GLOBAL_QUOTE",
        symbol: symbol.toUpperCase(),
        apikey: ALPHA_VANTAGE_KEY,
      },
    });

    const quote = quoteResponse.data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      return res.status(404).json({
        success: false,
        message: "Stock not found or API limit reached",
      });
    }

    // Get historical data
    const historyResponse = await axios.get(
      "https://www.alphavantage.co/query",
      {
        params: {
          function: "TIME_SERIES_DAILY",
          symbol: symbol.toUpperCase(),
          outputsize: "full",
          apikey: ALPHA_VANTAGE_KEY,
        },
      },
    );

    const timeSeries = historyResponse.data["Time Series (Daily)"];
    let history = [];
    let closes = [];
    let avgVolume = 0;

    if (timeSeries) {
      history = Object.entries(timeSeries)
        .slice(0, 60)
        .map(([date, data]) => ({
          date,
          open: parseFloat(data["1. open"]),
          high: parseFloat(data["2. high"]),
          low: parseFloat(data["3. low"]),
          close: parseFloat(data["4. close"]),
          volume: parseInt(data["5. volume"]),
        }))
        .reverse();

      closes = history.map((h) => h.close);
      avgVolume =
        history.reduce((sum, h) => sum + h.volume, 0) / history.length;
    }

    const currentPrice = parseFloat(quote["05. price"]);
    const previousPrice =
      history.length > 1 ? history[history.length - 2].close : currentPrice;
    const currentVolume = parseInt(quote["06. volume"]) || 0;

    const ma20 = calculateMA(closes, 20);
    const ma50 = calculateMA(closes, 50);
    const ma200 = calculateMA(closes, 200);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes, 20);

    const riskAnalysis = identifyRiskFactors(
      currentPrice,
      previousPrice,
      closes,
      currentVolume,
      avgVolume,
    );

    const patterns = identifyPatterns(closes);

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      current: {
        price: currentPrice,
        change: parseFloat(quote["09. change"]),
        changePct: parseFloat(quote["10. change percent"]),
        timestamp: quote["07. latest trading day"],
      },
      technicalIndicators: {
        ma20: ma20 ? ma20.toFixed(2) : null,
        ma50: ma50 ? ma50.toFixed(2) : null,
        ma200: ma200 ? ma200.toFixed(2) : null,
        rsi: rsi ? rsi.toFixed(2) : null,
        macd: macd
          ? {
              macd: macd.macd.toFixed(2),
              signal: macd.signal.toFixed(2),
              histogram: macd.histogram.toFixed(2),
            }
          : null,
        bollingerBands: bb
          ? {
              upper: bb.upper.toFixed(2),
              middle: bb.middle.toFixed(2),
              lower: bb.lower.toFixed(2),
            }
          : null,
      },
      riskAnalysis,
      patterns,
      history: history.slice(-30),
    });
  } catch (error) {
    console.error("Stock Analysis Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to analyze stock",
      error: error.message,
    });
  }
});

module.exports = router;
