# 🚀 ZONIC STOCK DASHBOARD - SETUP & TESTING GUIDE

## ✅ Prerequisites

- Node.js 14+ installed
- npm or yarn package manager
- Internet connection
- API keys (see API Setup section below)

---

## 📋 QUICK START (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Get API Keys

**Finnhub (Recommended - Supports NSE + Global Stocks):**

- Go to https://finnhub.io/register
- Sign up (free tier available)
- Copy your API key

**NewsAPI (Optional - For Financial News):**

- Go to https://newsapi.org/
- Sign up (free tier available)
- Copy your API key

### 3. Configure Environment

```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your API keys
# Linux/Mac: nano .env
# Windows: notepad .env
```

### 4. Start Server

```bash
node app.js
```

### 5. Access Dashboard

- Open: http://localhost:8080
- Login:
  - Username: `testuser`
  - Password: `ZonicDemo!23`

---

## 🔑 API Setup in Detail

### Option 1: Finnhub (RECOMMENDED) ⭐

**Why Finnhub?**

- ✅ Supports NSE (Indian) stocks
- ✅ Supports global stocks
- ✅ 60 requests/minute (free tier)
- ✅ Better data reliability
- ✅ Standardized responses

**Setup Steps:**

1. Visit https://finnhub.io/
2. Click "Sign up" (free)
3. Enter email and password
4. Go to Dashboard → API Keys
5. Copy your token (starts with `c...`)
6. Add to `.env`: `FINNHUB_KEY=your_token_here`

**Supported Symbols:**

- NSE (India): `INFY`, `TCS`, `RELIANCE`, `HDFCBANK.NS`, `ICICIBANK.NS`
- US: `AAPL`, `GOOGL`, `MSFT`
- Europe: `ASML.AS`, `MC.PA`

**Test Your Key:**

```bash
curl "https://finnhub.io/api/v1/quote?symbol=INFY&token=YOUR_KEY"
```

---

### Option 2: Alpha Vantage (NOT Recommended) ❌

**Why NOT for Zonic?**

- ❌ Does NOT support NSE (Indian) stocks
- ⚠️ Only 5 requests per minute
- ⚠️ Older API, inconsistent responses

**Use only if you want US stocks only.**

---

### Option 3: Upstox API (For NSE Only) 🇮🇳

If you only want Indian NSE stocks, Upstox is excellent:

- Visit https://developer.upstox.com/
- Sign up and get API credentials
- Modify backend to use Upstox endpoint

---

## 🧪 TESTING CHECKLIST

### Phase 1: Backend API Testing (10 minutes)

#### Test 1: Check Server is Running

```bash
# In terminal:
curl http://localhost:8080

# Expected: HTML homepage
```

#### Test 2: Test Stock API Endpoint

```bash
# Single stock quote
curl "http://localhost:8080/api/stock/INFY"

# Expected response:
{
  "success": true,
  "symbol": "INFY",
  "price": 1234.56,
  "change": 12.34,
  "changePct": 1.01,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Test 3: Test with Invalid Symbol

```bash
curl "http://localhost:8080/api/stock/INVALIDXYZ"

# Expected: 404 error with message
{
  "success": false,
  "message": "Stock symbol not found: INVALIDXYZ",
  "error": "INVALID_SYMBOL"
}
```

#### Test 4: Test Caching

```bash
# First request (should hit API):
curl "http://localhost:8080/api/stock/TCS"
# Check terminal: [API CALL] Fetching stock quote for TCS

# Second request immediately after (should use cache):
curl "http://localhost:8080/api/stock/TCS"
# Check terminal: [CACHE HIT] TCS
```

#### Test 5: Test News API

```bash
curl "http://localhost:8080/api/news"

# Expected: Array of news articles
{
  "success": true,
  "articles": [
    {
      "headline": "...",
      "summary": "...",
      "source": "...",
      "url": "..."
    }
  ]
}
```

---

### Phase 2: Frontend Testing (10 minutes)

#### Test 1: Page Loads

1. Open http://localhost:8080
2. See login page
3. Login with: `testuser` / `ZonicDemo!23`
4. ✅ Should redirect to dashboard

#### Test 2: Stocks Load

1. In dashboard, click "Stocks" tab
2. Wait 5-10 seconds
3. ✅ Should see 10 stock cards with prices

**What to look for:**

- Stock symbols display correctly (RELIANCE, TCS, INFY, etc.)
- Prices show (not $0)
- Change/% change displays (green or red)
- No "Loading..." message after 15 seconds

#### Test 3: Error Handling

1. Stop the Node.js server: `Ctrl+C`
2. Refresh dashboard page
3. Click "Stocks" tab
4. ✅ Should see error message, not infinite "Loading..."
5. Start server again: `node app.js`
6. Click "Retry Loading" button
7. ✅ Stocks should load

#### Test 4: Caching Works

1. Load stocks (should take 5-10 seconds)
2. Go to "Favorites" tab
3. Go back to "Stocks" tab
4. ✅ Stocks should load instantly (from cache)

#### Test 5: Parallel Loading Performance

1. Open developer tools: F12 → Network tab
2. Click "Stocks" tab
3. Observe network requests
4. ✅ Should see ~10 stock requests firing in parallel
5. ✅ Total load time should be ~5-10 seconds (not 10+ seconds)

#### Test 6: Stock Analysis Modal

1. In Stocks view, click any stock card
2. ✅ Should see technical indicators (MA 20, RSI, etc.)
3. ✅ Should see risk analysis
4. ✅ Should see price patterns
5. Close modal with X button

#### Test 7: Favorites

1. Click star icon on a stock card
2. ✅ Star should fill in
3. Go to "Favourite Stocks" tab
4. ✅ Should see the favorited stock
5. Go back to "Stocks", click star again
6. ✅ Star should empty
7. Go to "Favourite Stocks"
8. ✅ Stock should disappear

#### Test 8: News Loading

1. Click "News" tab
2. ✅ Should see news articles loading
3. ✅ After 5-10 seconds, should see news cards with:
   - Headlines
   - Summaries
   - Source names
   - Clickable links

#### Test 9: Settings

1. Click "Settings" tab
2. Toggle "Notifications" - ✅ Should toggle
3. Toggle "Dark Mode" - ✅ Background should change
4. Refresh page - ✅ Settings should persist
5. Go back to "Stocks" - ✅ Settings saved

#### Test 10: Logout

1. Click "Logout" button
2. ✅ Should redirect to homepage
3. Try accessing `/dashboard` directly
4. ✅ Should redirect back to homepage (protected route)

---

### Phase 3: Load Testing (5 minutes)

#### Test: Rapid Clicks

1. Open Stocks view
2. Rapidly click different stock cards
3. ✅ Each should open analysis modal
4. ✅ No crashes or errors
5. ✅ Modals should load analysis data

#### Test: Multiple Page Loads

1. Refresh page 5 times quickly
2. ✅ Each load should work
3. ✅ No duplicate API calls (caching works)

---

### Phase 4: Error Scenarios (5 minutes)

#### Scenario 1: Invalid API Key

1. Edit `.env`: Change `FINNHUB_KEY=invalid_key_123`
2. Restart server: `Ctrl+C`, then `node app.js`
3. Refresh dashboard
4. ✅ Should see error: "Failed to load stock data"
5. Fix the key and restart

#### Scenario 2: Rate Limit (Simulate)

1. Rapidly refresh page 20+ times in 1 minute
2. May see rate limit error from Finnhub
3. ✅ Error should display to user
4. Wait 60 seconds
5. ✅ Should recover and load

#### Scenario 3: Network Error (Simulate)

1. Disconnect internet
2. Refresh dashboard
3. ✅ Should show error with retry button
4. Reconnect internet
5. Click "Retry Loading"
6. ✅ Should load successfully

#### Scenario 4: Invalid Symbol

1. Edit `dashboard.js`: Change a symbol to `INVALIDXYZ`
2. Refresh dashboard
3. ✅ Should show error for that symbol
4. Other symbols should load fine

---

## 🐛 Debugging Tips

### Check Backend Logs

```bash
# Terminal where server runs shows:
[FETCH] INFY (attempt 1)
[API CALL] Fetching stock quote for INFY from Finnhub
[SUCCESS] INFY - $1234.56

[CACHE HIT] TCS
```

### Check Browser Console

```bash
# Browser DevTools (F12) → Console shows:
[FETCH] INFY (attempt 1)
[API CALL] Fetching stock quote for INFY from Finnhub
[SUCCESS] INFY - $1234.56
```

### Common Errors & Solutions

#### "404 - Stock not found"

- **Cause**: Finnhub API key invalid or symbol not supported
- **Solution**:
  1. Verify API key in .env is correct
  2. Test curl request directly
  3. Try with US stock (AAPL) to test API key validity

#### "Loading..." never ends

- **Cause**: API not responding or invalid key
- **Solution**:
  1. Check browser console for errors (F12)
  2. Check server terminal for [ERROR] logs
  3. Verify API key and internet connection
  4. Check rate limits (Finnhub: 60/min)

#### Stocks load slow (>30 seconds)

- **Cause**: Sequential fetching (should be fixed in new code)
- **Solution**:
  1. Verify you're using latest code with Promise.all()
  2. Check network tab for parallel requests
  3. Check API response times

#### "Cache not working"

- **Cause**: Requests hitting API every time
- **Solution**:
  1. Verify cache code is present in backend
  2. Check terminal for [CACHE HIT] messages
  3. Clear page cache: `Ctrl+Shift+R`

---

## 📊 Monitoring Performance

### API Response Times

Expected with Finnhub:

- Single stock: 200-500ms
- 10 stocks (parallel): 1-3 seconds total
- News: 500ms-1s

### Memory Usage

- Node process should use: 50-150 MB
- Monitor with: `top` (Linux/Mac) or Task Manager (Windows)

### Network Requests

- Stocks: 10 parallel requests
- News: 1 request
- Total bandwidth: <100 KB

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Remove hardcoded API keys
- [ ] Use environment variables only
- [ ] Enable HTTPS (if live)
- [ ] Set strong JWT_SECRET
- [ ] Configure CORS properly
- [ ] Add rate limiting middleware
- [ ] Add request logging
- [ ] Add error tracking (Sentry)
- [ ] Test with real user load
- [ ] Document API endpoints
- [ ] Add health check endpoint
- [ ] Set up monitoring and alerts

---

## 📚 Additional Resources

### API Documentation

- Finnhub: https://finnhub.io/docs/api/quote
- NewsAPI: https://newsapi.org/docs/endpoints/everything
- Alpha Vantage: https://www.alphavantage.co/documentation/

### Code References

- Backend routes: [routes/appRoutes.js](routes/appRoutes.js)
- Frontend logic: [public/js/dashboard.js](public/js/dashboard.js)
- Environment config: [.env.example](.env.example)

---

## ❓ FAQ

**Q: How often are stocks updated?**
A: Every 5 minutes (configurable in dashboard.js, line 614).

**Q: Can I add more stocks?**
A: Yes, edit `DEFAULT_STOCKS` array in dashboard.js.

**Q: What symbols are supported?**
A: Any symbol Finnhub supports (US, NSE, Europe, etc).

**Q: Is my API key secure?**
A: API keys in .env are NOT committed to git (.gitignore protects them).

**Q: Can I use multiple API providers?**
A: Yes, add fallback logic in backend routes.

---

## 📞 Support

For issues:

1. Check debugging tips above
2. Review browser console (F12)
3. Review server logs (terminal)
4. Check .env configuration
5. Test API key directly with curl

---

Last Updated: 2024
