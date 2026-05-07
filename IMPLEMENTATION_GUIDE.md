# Finance Dashboard - Real-Time Stock Analysis Implementation

## 🚀 Features Implemented

### 1. **Real-Time Stock Prices (Alpha Vantage API)**

- Fetches live stock prices every 5 minutes
- Displays price changes with color coding (green for gains, red for losses)
- Supports: AAPL, NVDA, TSLA, AMZN, MSFT

### 2. **Technical Indicators**

Clicking on any stock card opens a detailed analysis modal showing:

- **Moving Averages**: 20-day, 50-day, 200-day MA
- **RSI (14)**: Relative Strength Index for momentum
- **MACD**: Moving Average Convergence Divergence
- **Bollinger Bands**: Upper, middle, and lower bands

### 3. **Risk Identification (No ML Required)**

The system automatically flags risks:

- **High Volatility**: Price swings > 5%
- **Price Drop Alerts**: Drops > 3% in a day
- **Volume Spikes**: Trading volume > 2x average
- **Moving Average Crossovers**: Price below 50-day or 200-day MA
- **RSI Extremes**: Overbought (RSI > 70) or Oversold (RSI < 30)

Risk levels: HIGH, MEDIUM, LOW

### 4. **Pattern Recognition (Without ML)**

Detects trading patterns:

- Uptrend / Downtrend
- Bullish / Bearish Breakouts
- Bollinger Band extremes
- Support/Resistance level proximity

## 📡 Backend API Endpoints

### 1. **Get Real Stock Quote**

```
GET /api/stock/:symbol
Response: {
  success: true,
  symbol: "AAPL",
  price: 184.28,
  change: 2.14,
  changePct: 1.18,
  timestamp: "2024-05-07"
}
```

### 2. **Get Historical Data (60 days)**

```
GET /api/stock-history/:symbol
Response: {
  success: true,
  symbol: "AAPL",
  data: [
    { date: "2024-05-07", open: 180.0, high: 185.0, low: 179.0, close: 184.28, volume: 5000000 },
    ...
  ]
}
```

### 3. **Complete Stock Analysis** ⭐ (Main Endpoint)

```
GET /api/stock-analysis/:symbol
Response: {
  success: true,
  symbol: "AAPL",
  current: { price, change, changePct, timestamp },
  technicalIndicators: {
    ma20, ma50, ma200,
    rsi,
    macd: { macd, signal, histogram },
    bollingerBands: { upper, middle, lower }
  },
  riskAnalysis: {
    risks: ["High volatility"],
    warnings: ["Below 50-day MA"],
    severity: "high"
  },
  patterns: ["Uptrend", "Bullish breakout"],
  history: [ last 30 days of data ]
}
```

## 🎯 How to Use

### For Users:

1. **View Stock Prices**: Main dashboard shows current prices auto-updated every 5 minutes
2. **View Technical Analysis**: Click any stock card to open detailed analysis
3. **Manage Favorites**: Click the star icon to add/remove from favorites
4. **Read Alerts**: Check risk factors and patterns in the analysis modal

### For Developers:

#### Adding More Stocks:

Edit `public/js/dashboard.js`:

```javascript
const DEFAULT_STOCKS = ["AAPL", "NVDA", "TSLA", "AMZN", "MSFT", "GOOG", "META"];
```

#### Changing Refresh Interval:

Edit `public/js/dashboard.js` in `initDashboard()`:

```javascript
// Currently every 5 minutes (300000 ms)
// Change to 1 minute (60000 ms):
setInterval(updateAllStockData, 60000);
```

#### Adding Custom Stock Names:

Edit `public/js/dashboard.js`:

```javascript
const STOCK_NAMES = {
  AAPL: "Apple Inc.",
  GOOG: "Alphabet Inc.",
  // Add more...
};
```

## ⚙️ Configuration

### Environment Variables (in .env):

```
NEWS_API_KEY=your_newsapi_key
ALPHA_VANTAGE_KEY=your_alpha_vantage_key
```

### Free API Tier Limits:

- **Alpha Vantage**: 5 calls/min, 500 calls/day (free tier)
- **NewsAPI**: 100 calls/day (free tier)

⚠️ With 5-minute refresh and 5 stocks: ~1,440 calls/day (may hit limits)

**Solution**: Cache data locally or use Redis for production

## 📊 Technical Implementation Details

### Frontend Architecture:

```
dashboard.js
├─ fetchStockData() → Real prices
├─ fetchStockAnalysis() → Indicators + Risks
├─ updateAllStockData() → Batch fetch
├─ showStockAnalysis() → Modal display
└─ Auto-refresh every 5 minutes
```

### Backend Calculation Functions:

```javascript
calculateMA(prices, period)           // Moving Average
calculateRSI(prices, period=14)       // Relative Strength Index
calculateMACD(prices)                 // MACD
calculateBollingerBands(prices)       // Bollinger Bands
identifyRiskFactors(...)              // Risk Analysis
identifyPatterns(prices)              // Pattern Recognition
```

## 🔮 Future Enhancements

1. **ML Price Predictions**
   - Add LSTM neural network for 1-week price forecasts
   - Confidence scores for predictions

2. **Portfolio Analysis**
   - Correlation between stocks
   - Diversification suggestions

3. **Alerts & Notifications**
   - Email/SMS alerts for risk thresholds
   - Custom alert rules

4. **Database Storage**
   - Store analysis history
   - User preference persistence

5. **Advanced Charting**
   - Interactive candlestick charts
   - Technical indicator overlays

## ⚠️ Disclaimer

**This tool is for educational purposes only.**

- Stock predictions are unreliable
- Past performance ≠ future results
- Always consult financial advisors before trading
- No warranties or guarantees on data accuracy

## 🐛 Troubleshooting

### API Limit Reached

- Error: "Stock not found or API limit reached"
- Solution: Wait 5 minutes or reduce refresh frequency

### Missing Stock Data

- Check ALPHA_VANTAGE_KEY in .env
- Verify stock symbol is valid (use uppercase)

### Modal Not Displaying

- Check browser console for JavaScript errors
- Ensure stock data is cached first

## 📝 Notes

- Risk analysis refreshes every 5 minutes with price data
- Patterns are recalculated on each fetch
- Historical data limited to 60 days for performance
- All calculations done client-side (no additional server load)
