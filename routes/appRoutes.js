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

// API Keys - Replace with your own keys from newsapi.org and finnhub.io
const NEWS_API_KEY =
  process.env.NEWS_API_KEY || "ac1f2d65de8b4c0fb9ffddbed97830af";

// ⚠️ IMPORTANT: Trim whitespace from API key (fixes 401 errors)
const FINNHUB_KEY = (
  process.env.FINNHUB_KEY || "your_finnhub_api_key_here"
).trim();

// Debug: Log if API key is missing or placeholder
if (!FINNHUB_KEY || FINNHUB_KEY === "your_finnhub_api_key_here") {
  console.warn("[WARN] FINNHUB_KEY is not configured or is using placeholder!");
}

// In-memory cache with TTL and max size limit to prevent memory leak
const cache = new Map();
const CACHE_TTL = 60000; // 60 seconds
const MAX_CACHE_SIZE = 500; // Prevent unlimited growth

function getCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return cached.data;
}

function setCache(key, data) {
  // Remove oldest entry if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// Validate stock symbol format (prevent injection attacks)
function validateSymbol(symbol) {
  // Allow only alphanumeric and dots (e.g., AAPL, INFY.NS)
  if (!/^[A-Z0-9]{1,10}(\.?[A-Z]{1,3})?$/i.test(symbol)) {
    throw new Error("Invalid symbol format");
  }
  return symbol.toUpperCase();
}

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
    console.log("[API CALL] Fetching news from NewsAPI");

    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: "stocks OR finance OR market",
        sortBy: "publishedAt",
        language: "en",
        pageSize: 12,
        apiKey: NEWS_API_KEY,
      },
      timeout: 5000,
    });

    if (!response.data.articles || response.data.articles.length === 0) {
      console.warn("[WARNING] No news articles returned from NewsAPI");
      return res.status(404).json({
        success: false,
        message: "No news articles found",
        error: "NO_DATA",
      });
    }

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
    console.error("[ERROR] NewsAPI Error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
    });

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch news. Please check your NEWS_API_KEY configuration.",
      error: error.message,
    });
  }
});

// Fetch stock quote from Finnhub (free tier supports US stocks only)
// For NSE/international stocks, upgrade to paid Finnhub plan or use different API
router.get("/api/stock/:symbol", async (req, res) => {
  try {
    let { symbol } = req.params;

    // Validate symbol format
    try {
      symbol = validateSymbol(symbol);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock symbol format",
        error: err.message,
      });
    }

    // Check cache first
    const cacheKey = `stock_${symbol}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] ${symbol}`);
      return res.json(cachedData);
    }

    console.log(`[API CALL] Fetching stock quote for ${symbol} from Finnhub`);
    console.log(
      `[DEBUG] Using Finnhub key (first 10 chars): ${FINNHUB_KEY.substring(0, 10)}...`,
    );

    const response = await axios.get("https://finnhub.io/api/v1/quote", {
      params: {
        symbol: symbol.toUpperCase(),
        token: FINNHUB_KEY,
      },
      timeout: 5000,
    });

    const data = response.data;

    // Finnhub returns: c (current price), d (change), dp (change percent), t (timestamp)
    if (!data.c || data.c === 0) {
      console.error(`[ERROR] Invalid stock data for ${symbol}:`, data);
      return res.status(404).json({
        success: false,
        message: `Stock symbol not found: ${symbol}. Please check the symbol and try again.`,
        error: "INVALID_SYMBOL",
      });
    }

    const responseData = {
      success: true,
      symbol: symbol.toUpperCase(),
      price: data.c,
      change: data.d || 0,
      changePct: data.dp || 0,
      timestamp: new Date(data.t * 1000).toISOString(),
      high: data.h || null,
      low: data.l || null,
      open: data.o || null,
      previousClose: data.pc || null,
    };

    // Cache the response
    setCache(cacheKey, responseData);

    res.json(responseData);
  } catch (error) {
    console.error(`[ERROR] Finnhub API Error for ${req.params.symbol}:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      responseData: error.response?.data,
      fullError: error.toJSON ? error.toJSON() : error,
    });
    console.error(`[DEBUG] Request was:`, {
      url: "https://finnhub.io/api/v1/quote",
      params: {
        symbol: req.params.symbol,
        token: FINNHUB_KEY.substring(0, 5) + "...",
      },
    });

    // Better error messaging based on status code
    let errorMessage = "Failed to fetch stock data. Please try again later.";
    if (error.response?.status === 401) {
      errorMessage =
        "API Key is invalid or expired. Please check your FINNHUB_KEY in .env";
    } else if (error.response?.status === 403) {
      errorMessage =
        "API access forbidden. Check your Finnhub account/subscription.";
    } else if (error.response?.status === 429) {
      errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
});

// Fetch daily time series data for historical analysis
router.get("/api/stock-history/:symbol", async (req, res) => {
  try {
    let { symbol } = req.params;

    // Validate symbol format
    try {
      symbol = validateSymbol(symbol);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock symbol format",
        error: err.message,
      });
    }

    // Check cache first
    const cacheKey = `history_${symbol}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] History for ${symbol}`);
      return res.json(cachedData);
    }

    console.log(`[API CALL] Fetching history for ${symbol} from Finnhub`);

    // Finnhub candles endpoint (daily data)
    const response = await axios.get("https://finnhub.io/api/v1/stock/candle", {
      params: {
        symbol: symbol.toUpperCase(),
        resolution: "D",
        from: Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60, // 60 days ago
        to: Math.floor(Date.now() / 1000),
        token: FINNHUB_KEY,
      },
      timeout: 5000,
    });

    const data = response.data;

    if (!data.c || data.c.length === 0) {
      console.error(`[ERROR] No history data for ${symbol}`);
      return res.status(404).json({
        success: false,
        message: "Stock history not found",
        error: "NO_DATA",
      });
    }

    // Transform Finnhub response to expected format
    const history = data.t.map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().split("T")[0],
      open: data.o ? data.o[index] : null,
      high: data.h ? data.h[index] : null,
      low: data.l ? data.l[index] : null,
      close: data.c[index],
      volume: data.v ? data.v[index] : 0,
    }));

    const responseData = {
      success: true,
      symbol: symbol.toUpperCase(),
      data: history,
    };

    // Cache the response
    setCache(cacheKey, responseData);

    res.json(responseData);
  } catch (error) {
    console.error(`[ERROR] Finnhub History Error for ${req.params.symbol}:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      responseData: error.response?.data,
      fullError: error.toJSON ? error.toJSON() : error,
    });

    let errorMessage = "Failed to fetch stock history";
    if (error.response?.status === 401) {
      errorMessage = "API Key is invalid or expired.";
    } else if (error.response?.status === 429) {
      errorMessage = "Rate limit exceeded. Please wait.";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
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
  // Guard against invalid input
  if (!prices || prices.length === 0) return null;
  if (prices.length === 1) return prices[0];

  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    if (typeof prices[i] !== "number" || isNaN(prices[i])) continue;
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

// Combined analysis endpoint with technical indicators
router.get("/api/stock-analysis/:symbol", async (req, res) => {
  try {
    let { symbol } = req.params;

    // Validate symbol format
    try {
      symbol = validateSymbol(symbol);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock symbol format",
        error: err.message,
      });
    }

    // Check cache first
    const cacheKey = `analysis_${symbol}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] Analysis for ${symbol}`);
      return res.json(cachedData);
    }

    console.log(`[API CALL] Fetching analysis for ${symbol} from Finnhub`);

    // Parallel requests for efficiency
    const [quoteResponse, historyResponse] = await Promise.all([
      axios.get("https://finnhub.io/api/v1/quote", {
        params: {
          symbol: symbol.toUpperCase(),
          token: FINNHUB_KEY,
        },
        timeout: 5000,
      }),
      axios.get("https://finnhub.io/api/v1/stock/candle", {
        params: {
          symbol: symbol.toUpperCase(),
          resolution: "D",
          from: Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60, // 90 days for analysis
          to: Math.floor(Date.now() / 1000),
          token: FINNHUB_KEY,
        },
        timeout: 5000,
      }),
    ]);

    const quote = quoteResponse.data;
    const historyData = historyResponse.data;

    if (!quote.c || quote.c === 0) {
      console.error(`[ERROR] Invalid stock data for ${symbol}`);
      return res.status(404).json({
        success: false,
        message: `Stock symbol not found: ${symbol}`,
        error: "INVALID_SYMBOL",
      });
    }

    if (!historyData.c || historyData.c.length === 0) {
      console.error(`[ERROR] No history data for ${symbol}`);
      return res.status(404).json({
        success: false,
        message: "Insufficient historical data for analysis",
        error: "NO_HISTORY",
      });
    }

    // Transform history
    const history = historyData.t.map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().split("T")[0],
      open: historyData.o ? historyData.o[index] : quote.c,
      high: historyData.h ? historyData.h[index] : quote.c,
      low: historyData.l ? historyData.l[index] : quote.c,
      close: historyData.c[index],
      volume: historyData.v ? historyData.v[index] : 0,
    }));

    const closes = history.map((h) => h.close);
    const volumes = history.map((h) => h.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    // Technical calculations
    const ma20 = calculateMA(closes, 20);
    const ma50 = calculateMA(closes, 50);
    const ma200 = calculateMA(closes, 200);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes, 20);

    const currentPrice = quote.c;
    const previousPrice =
      history.length > 1 ? history[history.length - 2].close : currentPrice;
    const currentVolume = historyData.v
      ? historyData.v[historyData.v.length - 1]
      : 0;

    const riskAnalysis = identifyRiskFactors(
      currentPrice,
      previousPrice,
      closes,
      currentVolume,
      avgVolume,
    );

    const patterns = identifyPatterns(closes);

    const responseData = {
      success: true,
      symbol: symbol.toUpperCase(),
      current: {
        price: currentPrice,
        change: quote.d || 0,
        changePct: quote.dp || 0,
        timestamp: new Date(quote.t * 1000).toISOString(),
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
    };

    // Cache the response
    setCache(cacheKey, responseData);

    res.json(responseData);
  } catch (error) {
    console.error(`[ERROR] Stock Analysis Error for ${req.params.symbol}:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      responseData: error.response?.data,
      fullError: error.toJSON ? error.toJSON() : error,
    });

    let errorMessage = "Failed to analyze stock";
    if (error.response?.status === 401) {
      errorMessage = "API Key is invalid or expired.";
    } else if (error.response?.status === 429) {
      errorMessage = "Rate limit exceeded. Please wait.";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
});

module.exports = router;
