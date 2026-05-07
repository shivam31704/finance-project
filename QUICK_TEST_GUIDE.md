# 📊 Stock Analysis Dashboard - Quick Test Guide

## ✅ What's Working

### 1. Real Stock Prices (Confirmed ✓)

- **Endpoint**: `GET /api/stock/:symbol`
- **Status**: ✅ Working - Returns live prices from Alpha Vantage
- **Example Response**:
  ```json
  {
    "success": true,
    "symbol": "AAPL",
    "price": 287.51,
    "change": 3.33,
    "changePct": 1.1718,
    "timestamp": "2026-05-06"
  }
  ```

### 2. Complete Analysis with Indicators

- **Endpoint**: `GET /api/stock-analysis/:symbol`
- **Status**: ⚠️ Rate limited (Alpha Vantage free tier: 5 calls/min)
- **Includes**:
  - Current price data
  - Technical indicators (MA20, MA50, MA200, RSI, MACD, Bollinger Bands)
  - Risk identification (volatility, price drops, volume spikes, MA crossovers)
  - Pattern recognition (trends, breakouts)
  - 30-day historical data

## 🚀 How to Test Locally

### Step 1: Start the Server

```bash
cd "c:\Users\Admin\Desktop\finance project"
npm start
```

Server runs on `http://localhost:8080`

### Step 2: Open Dashboard

Visit: `http://localhost:8080/dashboard`

### Step 3: View Stock Data

- You'll see 5 stocks: AAPL, NVDA, TSLA, AMZN, MSFT
- Prices update every 5 minutes
- All data fetches from Alpha Vantage API

### Step 4: Click Stock Card

Click any stock → Opens modal with:

- 📊 Current price & change percentage
- 📈 Technical indicators (MA20, MA50, MA200, RSI)
- 📉 Bollinger Bands
- ⚠️ Risk factors (High/Medium/Low severity)
- 🎯 Detected patterns
- 📋 Timestamp of last update

## 🎯 Features Breakdown

### Real-Time Updates

```
Every 5 minutes (300,000 ms):
├─ Fetch latest prices for all stocks
├─ Update cache (stockDataCache)
├─ Re-render stock cards
└─ Show loading state while fetching
```

### Technical Indicators Calculated

| Indicator       | Purpose                 | Values                               |
| --------------- | ----------------------- | ------------------------------------ |
| MA20            | 20-day Moving Average   | Trend over 1 month                   |
| MA50            | 50-day Moving Average   | Trend over ~2.5 months               |
| MA200           | 200-day Moving Average  | Long-term trend (1 year)             |
| RSI             | Relative Strength Index | 0-100 (70+=Overbought, <30=Oversold) |
| MACD            | Momentum indicator      | Shows trend changes                  |
| Bollinger Bands | Volatility bands        | Upper/Middle/Lower bands             |

### Risk Identification

| Risk Type       | Threshold           | Action      |
| --------------- | ------------------- | ----------- |
| High Volatility | Price swing > 5%    | 🔴 CRITICAL |
| Price Drop      | Drop > 3% per day   | 🔴 CRITICAL |
| Volume Spike    | Volume > 2x average | ⚠️ WARNING  |
| MA Crossover    | Below 50/200-day MA | ⚠️ WARNING  |
| RSI Extreme     | RSI > 70 or < 30    | ⚠️ WARNING  |

### Pattern Recognition

- ✓ Uptrend / Downtrend detection
- ✓ Bullish / Bearish breakouts
- ✓ Bollinger Band extremes
- ✓ Support/Resistance proximity

## 📱 UI Highlights

### Stock Card (Main Dashboard)

```
┌─────────────────────────────┐
│ AAPL              ⭐        │
│ Apple Inc.                  │
│                             │
│ $287.51                     │
│ +3.33 (+1.17%)             │
│ Updated: 2026-05-06         │
└─────────────────────────────┘
```

### Analysis Modal (Click Card)

```
┌─────── AAPL ANALYSIS MODAL ─────────┐
│                                      │
│ Current Price: $287.51              │
│ Change: +3.33 (+1.17%)              │
│                                      │
│ 📊 Technical Indicators              │
│ • MA20: 285.12                       │
│ • MA50: 280.45                       │
│ • RSI: 65.2 (Not overbought)         │
│                                      │
│ ⚠️ Risk Factors (MEDIUM)             │
│ 🟠 Below 50-day MA                   │
│ 🟠 Overbought (RSI > 70)             │
│                                      │
│ 📈 Patterns Detected                 │
│ ✓ Uptrend                            │
│ ✓ Bullish breakout                   │
│                                      │
└──────────────────────────────────────┘
```

## 🔌 API Rate Limiting

### Alpha Vantage Free Tier

- **Calls per minute**: 5
- **Calls per day**: 500
- **Cost**: FREE

### Your Setup (5 stocks, 5-min refresh)

- **Calls per 5 minutes**: 5 (one per stock)
- **Calls per day**: ~1,440 (5 × 12 × 24)
- **Status**: ⚠️ May exceed daily limit

### To Stay Within Limits

**Option 1**: Increase refresh interval

```javascript
// Change from 5 minutes to 15 minutes
setInterval(updateAllStockData, 900000); // 15 mins
```

**Option 2**: Reduce stocks tracked

```javascript
const DEFAULT_STOCKS = ["AAPL", "MSFT", "TSLA"];
```

**Option 3**: Implement local caching with TTL

```javascript
// Store data for X minutes before refetching
```

## 🐛 Common Issues & Solutions

### Issue: "Stock not found or API limit reached"

**Cause**: Alpha Vantage 5-call/min limit exceeded
**Solution**: Wait 5 minutes and try again

### Issue: Modal shows "N/A" for technical indicators

**Cause**: Not enough historical data yet
**Solution**: Wait for next refresh cycle

### Issue: Prices don't update

**Cause**: Browser didn't refetch, or rate limit hit
**Solution**:

- Manually refresh page (Ctrl+R)
- Wait 5 minutes for next auto-refresh
- Check browser console for errors

### Issue: Risk factors showing but patterns empty

**Cause**: Patterns need more historical data
**Solution**: Normal, some stocks have no clear patterns

## 💡 Usage Tips

1. **Star favorite stocks** - They appear in favorites section
2. **Click stock cards** - Opens detailed analysis modal
3. **Check time stamps** - Shows when data was last updated
4. **Read risk warnings** - Make informed decisions
5. **Monitor patterns** - Use for technical analysis

## 📊 Data Flow

```
Frontend (Dashboard)
    ↓ (Click on stock)
    ↓
JavaScript: fetchStockAnalysis(symbol)
    ↓
    ↓ HTTP GET
    ↓
Backend: /api/stock-analysis/:symbol
    ↓
    ├─ Fetch current quote (Alpha Vantage)
    ├─ Fetch 60-day history (Alpha Vantage)
    ├─ Calculate 6 technical indicators
    ├─ Identify 5+ risk factors
    ├─ Detect trading patterns
    └─ Return JSON
    ↓
    ↓ HTTP Response
    ↓
JavaScript: Display in modal
    ├─ Price info
    ├─ Technical indicators table
    ├─ Risk factors list
    └─ Patterns list
```

## 🎓 What You Learned

✓ Real-time API integration (Alpha Vantage)
✓ Technical indicator calculations (MA, RSI, MACD, Bollinger Bands)
✓ Risk identification algorithms
✓ Pattern recognition without ML
✓ Frontend-backend communication
✓ Async/await and Promise handling
✓ Data caching strategies
✓ Interval-based auto-refresh
✓ Modal/popup implementation
✓ Financial data visualization

## 🚀 Next Steps (Optional)

1. **Add more stocks** - Edit DEFAULT_STOCKS array
2. **Store predictions** - Add database for historical analysis
3. **Add notifications** - Email alerts for risk changes
4. **Build charts** - Use Chart.js for price history visualization
5. **Add portfolio tracker** - Track investments
6. **Implement ML** - Add LSTM predictions (future)
7. **Mobile app** - Convert to React Native

## 📞 Support

Check `IMPLEMENTATION_GUIDE.md` for detailed technical documentation
