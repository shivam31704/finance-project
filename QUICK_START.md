# 🎯 QUICK START - 5 Minutes to Working Dashboard

## Step 1: Get Finnhub API Key (2 minutes)

1. Go to: https://finnhub.io/register
2. Sign up with email (free)
3. Click "Dashboard"
4. Copy your API key (looks like: `c...`)

## Step 2: Configure (1 minute)

```bash
# In terminal, from project directory:
cp .env.example .env

# Windows: Edit .env in notepad
# Linux/Mac: Edit with nano .env
```

Find this line:

```
FINNHUB_KEY=your_finnhub_api_key_here
```

Replace with your key:

```
FINNHUB_KEY=c1234567890abcdef
```

Save file.

## Step 3: Start Server (30 seconds)

```bash
node app.js
```

You should see:

```
server is running on port 8080
```

## Step 4: Open Dashboard (30 seconds)

1. Open: http://localhost:8080
2. Login with:
   - Username: `testuser`
   - Password: `ZonicDemo!23`
3. Click "Stocks" tab
4. Wait 5-10 seconds
5. ✅ Stocks should load!

---

## What Was Fixed?

| Issue             | Status                                     |
| ----------------- | ------------------------------------------ |
| Stocks never load | ✅ Fixed - Loads in 2-5 seconds            |
| 404 errors        | ✅ Fixed - API provider changed to Finnhub |
| No error messages | ✅ Fixed - Clear error UI                  |
| Slow loading      | ✅ Fixed - Parallel fetching               |
| Silent failures   | ✅ Fixed - Logging and retry logic         |

---

## What to Test

✅ **Stocks Load** - Should see 10 stock cards with prices
✅ **Click Stock** - Shows technical analysis
✅ **Add to Favorites** - Star icon works
✅ **Settings Tab** - Can toggle dark mode
✅ **News Tab** - Shows financial news
✅ **Logout** - Returns to login

---

## Having Issues?

### "Socket timeout" error

- API key is invalid
- Go back to Step 1, get a new key

### Stocks show $0 or "N/A"

- API key not set
- Restart server: `Ctrl+C`, then `node app.js`

### "Cannot GET /api/stock/..."

- Server not running
- Run: `node app.js`

### Still loading after 30 seconds

- Check browser console: F12 → Console tab
- Should see errors there
- Share errors in support

---

## Next Steps

- Read: [SETUP_AND_TESTING_GUIDE.md](SETUP_AND_TESTING_GUIDE.md) for full testing
- Read: [FIX_SUMMARY.md](FIX_SUMMARY.md) for technical details
- Configure: Add more stocks by editing [public/js/dashboard.js](public/js/dashboard.js) line 11

---

That's it! Happy analyzing! 🚀
