# 📚 API Setup Guide

This project integrates with NewsAPI and Alpha Vantage to fetch real-time financial data. Follow the steps below to get your API keys.

## 🔑 Getting Your API Keys

### 1. **NewsAPI** (For Financial News)

1. Go to: https://newsapi.org/
2. Click **"Register"** or **"Sign Up"**
3. Complete the registration form
4. Verify your email
5. Copy your API key from the dashboard
6. Replace `your_newsapi_key_here` in [routes/appRoutes.js](routes/appRoutes.js) with your key

**Free Tier Limits:**

- 100 requests per day
- 30 days retention
- Perfect for development and testing

---

### 2. **Alpha Vantage** (For Stock Prices & Technical Indicators)

1. Go to: https://www.alphavantage.co/
2. Scroll down and enter your email in the **API Key** form
3. Click **"GET FREE API KEY"**
4. Check your email for the API key
5. Replace `your_alphavantage_key_here` in [routes/appRoutes.js](routes/appRoutes.js) with your key

**Free Tier Limits:**

- 5 API calls per minute
- 500 calls per day
- Sufficient for real-time data updates

---

## 🚀 Using Environment Variables (Recommended)

Instead of hardcoding API keys, use environment variables:

### Step 1: Install dotenv package

```bash
npm install dotenv
```

### Step 2: Create a `.env` file in the root directory

```
NEWS_API_KEY=your_newsapi_key_here
ALPHA_VANTAGE_KEY=your_alphavantage_key_here
```

### Step 3: Update [app.js](app.js)

Add this at the top of the file:

```javascript
require("dotenv").config();
```

### Step 4: Update [routes/appRoutes.js](routes/appRoutes.js)

Change:

```javascript
const NEWS_API_KEY = process.env.NEWS_API_KEY || "your_newsapi_key_here";
const ALPHA_VANTAGE_KEY =
  process.env.ALPHA_VANTAGE_KEY || "your_alphavantage_key_here";
```

Now your API keys will be loaded from the `.env` file.

---

## 🔒 Security Note

⚠️ **DO NOT commit `.env` file to Git!**

Add this to your `.gitignore`:

```
.env
node_modules/
```

---

## ✅ Testing the APIs

Once you've added your API keys, restart the server:

```bash
npm start
```

### Test NewsAPI endpoint:

```
http://localhost:8080/api/news
```

### Test Stock API endpoint:

```
http://localhost:8080/api/stock/AAPL
```

You should see JSON responses with news articles and stock data.

---

## 📊 Available Endpoints

### Get Financial News

**GET** `/api/news`

Response:

```json
{
  "success": true,
  "articles": [
    {
      "headline": "...",
      "summary": "...",
      "image": "...",
      "source": "...",
      "url": "...",
      "publishedAt": "..."
    }
  ]
}
```

### Get Stock Quote

**GET** `/api/stock/:symbol`

Example: `/api/stock/AAPL`

Response:

```json
{
  "success": true,
  "symbol": "AAPL",
  "price": 184.28,
  "change": 2.14,
  "changePct": 1.18,
  "timestamp": "2026-05-07"
}
```

---

## 🎯 Next Steps

1. ✅ Get API keys from NewsAPI and Alpha Vantage
2. ✅ Add them to [routes/appRoutes.js](routes/appRoutes.js) or `.env` file
3. ✅ Restart the server
4. ✅ Visit `/dashboard` and check the News section

The news cards will now display real articles with images and clickable links! 🚀
