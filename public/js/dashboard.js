// Stock state management
let stockDataCache = {};
let analysisCache = {};
let stockFetchErrors = {}; // Track errors per stock
let loadingState = {
  isLoading: false,
  hasError: false,
  errorMessage: "",
};

// Using US stocks that work with free Finnhub tier
// (NSE symbols require paid Finnhub subscription)
const DEFAULT_STOCKS = [
  "AAPL", // Apple
  "MSFT", // Microsoft
  "GOOGL", // Google
  "AMZN", // Amazon
  "TSLA", // Tesla
  "NVDA", // Nvidia
  "META", // Meta
  "NFLX", // Netflix
  "INTC", // Intel
  "AMD", // AMD
];

// Stock names mapping for US stocks
const STOCK_NAMES = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corporation",
  GOOGL: "Alphabet Inc. (Google)",
  AMZN: "Amazon.com Inc.",
  TSLA: "Tesla Inc.",
  NVDA: "NVIDIA Corporation",
  META: "Meta Platforms (Facebook)",
  NFLX: "Netflix Inc.",
  INTC: "Intel Corporation",
  AMD: "Advanced Micro Devices",
};

function getDisplaySymbol(symbol) {
  // Remove market suffix if present (e.g., .NS, .BSE, .L)
  return symbol.replace(/\.(NS|BSE|L|TO|V)$/i, "");
}

// Fetch real stock data from backend API with proper error handling
async function fetchStockData(symbol, retryCount = 0) {
  const maxRetries = 2;

  try {
    console.log(`[FETCH] ${symbol} (attempt ${retryCount + 1})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`/api/stock/${symbol}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // ✅ Check response status
    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        `[ERROR] ${symbol} - Status ${response.status}:`,
        errorData.message,
      );

      stockFetchErrors[symbol] = {
        error: errorData.message || "Failed to fetch stock data",
        status: response.status,
        timestamp: new Date().toLocaleTimeString(),
      };

      // Retry on 5xx errors, not 4xx
      if (response.status >= 500 && retryCount < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retryCount + 1)),
        ); // Exponential backoff
        return fetchStockData(symbol, retryCount + 1);
      }

      return null;
    }

    const data = await response.json();

    if (!data.success) {
      console.error(`[ERROR] ${symbol} - API returned error:`, data.message);
      stockFetchErrors[symbol] = {
        error: data.message || "Invalid stock data",
        timestamp: new Date().toLocaleTimeString(),
      };
      return null;
    }

    // ✅ Validate data structure
    if (!data.price || typeof data.price !== "number") {
      console.error(`[ERROR] ${symbol} - Invalid price data:`, data);
      stockFetchErrors[symbol] = {
        error: "Invalid price data received",
        timestamp: new Date().toLocaleTimeString(),
      };
      return null;
    }

    // ✅ Cache successful data
    stockDataCache[symbol] = {
      symbol: data.symbol,
      displaySymbol: getDisplaySymbol(data.symbol),
      name: STOCK_NAMES[data.symbol] || getDisplaySymbol(data.symbol),
      price: data.price,
      change: data.change,
      changePct: data.changePct,
      timestamp: data.timestamp,
    };

    // Clear error for this stock on success
    delete stockFetchErrors[symbol];

    console.log(`[SUCCESS] ${symbol} - $${data.price.toFixed(2)}`);
    return stockDataCache[symbol];
  } catch (error) {
    console.error(`[ERROR] ${symbol} - Exception:`, error.message);

    stockFetchErrors[symbol] = {
      error: error.message || "Network error",
      timestamp: new Date().toLocaleTimeString(),
    };

    // Retry on network errors
    if (retryCount < maxRetries && error instanceof TypeError) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (retryCount + 1)),
      );
      return fetchStockData(symbol, retryCount + 1);
    }

    return null;
  }
}

// Fetch detailed analysis with technical indicators and risk factors
async function fetchStockAnalysis(symbol) {
  try {
    const response = await fetch(`/api/stock-analysis/${symbol}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[ERROR] Analysis for ${symbol}:`, errorData.message);
      return null;
    }

    const data = await response.json();
    if (data.success) {
      analysisCache[symbol] = data;
      return data;
    }
  } catch (error) {
    console.error(`[ERROR] Exception fetching analysis for ${symbol}:`, error);
  }
  return null;
}

// Update all stock data at once - PARALLEL fetching
async function updateAllStockData() {
  const stockSymbols = DEFAULT_STOCKS;

  loadingState.isLoading = true;
  loadingState.hasError = false;
  loadingState.errorMessage = "";
  stockFetchErrors = {};

  console.log(`[START] Fetching ${stockSymbols.length} stocks in parallel...`);

  try {
    // ✅ Use Promise.all() for parallel fetching instead of sequential await
    const results = await Promise.all(
      stockSymbols.map((symbol) => fetchStockData(symbol)),
    );

    const successCount = results.filter(Boolean).length;
    const failureCount = stockSymbols.length - successCount;

    console.log(
      `[COMPLETE] Fetched ${successCount}/${stockSymbols.length} stocks`,
    );

    if (failureCount > 0) {
      loadingState.hasError = true;
      loadingState.errorMessage = `⚠️ ${failureCount} stock(s) failed to load. Check API key or symbols.`;
      console.warn(`[WARN] ${failureCount} stocks failed to fetch`);
    }
    loadingState.isLoading = false;
    renderStocks();
    renderFavorites();
  } catch (error) {
    console.error("[ERROR] Critical error in updateAllStockData:", error);
    loadingState.hasError = true;
    loadingState.errorMessage =
      "Critical error loading stocks. Please refresh the page.";
    loadingState.isLoading = false;
    renderStocks();
  }
}
const newsItems = [
  {
    headline: "US-China tariff talks drive semiconductor demand",
    summary:
      "After fresh trade discussions, chip stocks are expected to rally while export-heavy manufacturing names may stay volatile.",
    image: "https://via.placeholder.com/800x450?text=Market+News+Story",
    source: "Global Markets",
  },
  {
    headline: "EU sanctions pressure energy and defense suppliers",
    summary:
      "Sanctions are shifting investor interest toward renewable energy and defense contractors, while certain European exporters may soften.",
    image: "https://via.placeholder.com/800x450?text=Market+News+Story",
    source: "GeoEconomy",
  },
  {
    headline: "OPEC output cut strengthens oil and commodity markets",
    summary:
      "Crude producers and energy infrastructure stocks are likely to rise, while consumer discretionary sectors may face headwinds.",
    image: "https://via.placeholder.com/800x450?text=Market+News+Story",
    source: "EnergyWatch",
  },
  {
    headline: "Russia-Ukraine tensions lift defense and agriculture plays",
    summary:
      "Heightened geopolitical risk is pushing defense suppliers higher, while grain and fertilizer names may see increased volatility.",
    image: "https://via.placeholder.com/800x450?text=Market+News+Story",
    source: "Market Brief",
  },

  {
    headline: "Global markets rally after tech earnings beat expectations",
    summary:
      "Investors are reacting positively as the largest names post stronger than expected results.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    source: "MarketPulse",
  },
  {
    headline: "Energy sector leads gains amid policy optimism",
    summary:
      "Oil and renewable stocks saw broad demand after new infrastructure announcements.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    source: "TradeWire",
  },
  {
    headline: "Central bank signals gradual rate path, markets stay calm",
    summary:
      "Interest rate expectations remain stable as investors digest the latest guidance.",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
    source: "Finance Daily",
  },
];

const settingsState = {
  notifications: true,
  autoRefresh: true,
  darkMode: true,
  reminders: false,
};

const storageUser =
  typeof window !== "undefined" && window.currentUser
    ? window.currentUser
    : "guest";
const storageKey = encodeURIComponent(storageUser);
const favoritesKey = `zonicFavorites_${storageKey}`;
const settingsKey = `zonicSettings_${storageKey}`;

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(favoritesKey) || "[]");
  } catch (error) {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(favoritesKey, JSON.stringify(favorites));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey) || "{}");
    return { ...settingsState, ...saved };
  } catch (error) {
    return { ...settingsState };
  }
}

function saveSettings(settings) {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
}

function renderStocks() {
  const container = document.getElementById("stocksGrid");
  const favorites = new Set(loadFavorites());

  // Use cached data or show loading/error state
  const stocks = DEFAULT_STOCKS.map((symbol) => stockDataCache[symbol]).filter(
    Boolean,
  );

  // ✅ Show Loading State
  if (loadingState.isLoading) {
    container.innerHTML =
      '<div style="text-align: center; color: rgba(255, 255, 255, 0.7); grid-column: 1/-1; padding: 40px;">' +
      '<i class="fa-solid fa-spinner" style="animation: spin 1s linear infinite; font-size: 24px; margin-bottom: 10px;"></i>' +
      "<p>Loading stock data...</p></div>";
    return;
  }

  // ✅ Show Error State with Details
  if (stocks.length === 0 && Object.keys(stockFetchErrors).length > 0) {
    let errorHtml = '<div style="grid-column: 1/-1; padding: 20px;">';
    errorHtml +=
      '<div style="background: rgba(255, 107, 107, 0.2); border-left: 4px solid #ff6b6b; padding: 16px; border-radius: 6px; margin-bottom: 20px;">';
    errorHtml +=
      '<div style="color: #ff6b6b; font-weight: bold; margin-bottom: 10px;">⚠️ Failed to Load Stock Data</div>';
    errorHtml += '<div style="color: rgba(255,255,255,0.8); font-size: 14px;">';

    Object.entries(stockFetchErrors).forEach(([symbol, errorInfo]) => {
      errorHtml += `<div style="margin-bottom: 8px;">`;
      errorHtml += `<strong>${symbol}</strong>: ${errorInfo.error}`;
      errorHtml += `</div>`;
    });

    errorHtml += "</div></div>";
    errorHtml += '<div style="color: rgba(255,255,255,0.6); font-size: 13px;">';
    errorHtml += "<p><strong>Possible issues:</strong></p>";
    errorHtml += '<ul style="margin: 10px 0; padding-left: 20px;">';
    errorHtml += "<li>Invalid API key or quota exceeded</li>";
    errorHtml += "<li>Network connection error</li>";
    errorHtml += "<li>Stock symbol not found or not supported</li>";
    errorHtml += "<li>API rate limit exceeded (5 requests/minute)</li>";
    errorHtml += "</ul>";
    errorHtml +=
      '<p><button onclick="location.reload()" style="background: #64ffc8; color: #1a1a2e; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Retry Loading</button></p>';
    errorHtml += "</div>";
    errorHtml += "</div>";

    container.innerHTML = errorHtml;
    return;
  }

  // ✅ Show Warning if some stocks failed but some loaded
  if (loadingState.hasError && stocks.length > 0) {
    const warningDiv = document.createElement("div");
    warningDiv.style.cssText = `
      grid-column: 1/-1;
      background: rgba(255, 165, 0, 0.2);
      border-left: 4px solid #ffa500;
      padding: 12px;
      border-radius: 6px;
      color: #ffa500;
      font-size: 13px;
      margin-bottom: 10px;
    `;
    warningDiv.innerHTML = `
      ⚠️ ${loadingState.errorMessage}
      <br><small style="color: rgba(255,255,255,0.5); display: block; margin-top: 6px;">
        Loaded: ${stocks.length}/${DEFAULT_STOCKS.length} stocks
      </small>
    `;
    container.prepend(warningDiv);
  }

  // ✅ Show Stock Cards
  const stockCardsHtml = stocks
    .map((stock) => {
      const isFav = favorites.has(stock.symbol);
      const changeClass = stock.change >= 0 ? "positive" : "negative";
      return `
        <article class="stock-card card-glow" data-symbol="${stock.symbol}">
          <div class="stock-card-top">
            <div>
              <span class="stock-symbol">${stock.displaySymbol}</span>
              <p>${stock.name}</p>
            </div>
            <button class="stock-fav ${isFav ? "active" : ""}" data-symbol="${stock.symbol}" aria-label="Toggle favourite">
              <i class="fa-solid fa-star"></i>
            </button>
          </div>
          <div class="stock-price">
            <strong>$${stock.price.toFixed(2)}</strong>
            <span class="price-change ${changeClass}">${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)} (${stock.changePct.toFixed(2)}%)</span>
          </div>
          <div class="stock-sparkline">
            <div class="sparkline-line"></div>
          </div>
          <small style="color: rgba(255,255,255,0.5); margin-top: 8px;">Updated: ${stock.timestamp || "N/A"}</small>
        </article>
      `;
    })
    .join("");

  // Clear previous content and add stock cards
  if (stocks.length > 0) {
    // Keep warning if it exists, just update cards
    const existingWarning = container.querySelector('[style*="grid-column"]');
    if (existingWarning && Object.keys(stockFetchErrors).length > 0) {
      container.innerHTML = existingWarning.outerHTML + stockCardsHtml;
    } else {
      container.innerHTML = stockCardsHtml;
    }
  } else {
    container.innerHTML = `
      <div style="text-align: center; color: rgba(255, 255, 255, 0.7); grid-column: 1/-1; padding: 40px;">
        <p>No stocks loaded. Check your API configuration.</p>
      </div>
    `;
    return;
  }

  // ✅ Attach event listeners
  container.querySelectorAll(".stock-fav").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const symbol = button.dataset.symbol;
      const currentFavorites = new Set(loadFavorites());
      if (currentFavorites.has(symbol)) {
        currentFavorites.delete(symbol);
      } else {
        currentFavorites.add(symbol);
      }
      saveFavorites([...currentFavorites]);
      renderStocks();
      renderFavorites();
    });
  });

  container.querySelectorAll(".stock-card").forEach((card) => {
    card.addEventListener("click", () => {
      const symbol = card.dataset.symbol;
      showStockAnalysis(symbol);
    });
  });
}

function renderFavorites() {
  const container = document.getElementById("favoritesGrid");
  const emptyState = document.getElementById("favoritesEmpty");
  const favorites = new Set(loadFavorites());
  const selection = DEFAULT_STOCKS.map(
    (symbol) => stockDataCache[symbol],
  ).filter((stock) => stock && favorites.has(stock.symbol));

  if (!selection.length) {
    container.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  container.innerHTML = selection
    .map((stock) => {
      const changeClass = stock.change >= 0 ? "positive" : "negative";
      return `
          <article class="stock-card card-glow" data-symbol="${stock.symbol}">
            <div class="stock-card-top">
              <div>
                <span class="stock-symbol">${stock.displaySymbol}</span>
                <p>${stock.name}</p>
              </div>
              <button class="stock-fav active" data-symbol="${stock.symbol}" aria-label="Remove favourite">
                <i class="fa-solid fa-star"></i>
              </button>
            </div>
            <div class="stock-price">
              <strong>$${stock.price.toFixed(2)}</strong>
              <span class="price-change ${changeClass}">${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)} (${stock.changePct.toFixed(2)}%)</span>
            </div>
            <div class="stock-sparkline">
              <div class="sparkline-line"></div>
            </div>
          </article>
        `;
    })
    .join("");

  container.querySelectorAll(".stock-fav").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const symbol = button.dataset.symbol;
      const currentFavorites = new Set(loadFavorites());
      if (currentFavorites.has(symbol)) {
        currentFavorites.delete(symbol);
      }
      saveFavorites([...currentFavorites]);
      renderStocks();
      renderFavorites();
    });
  });

  container.querySelectorAll(".stock-card").forEach((card) => {
    card.addEventListener("click", () => {
      const symbol = card.dataset.symbol;
      showStockAnalysis(symbol);
    });
  });
}

function renderNews() {
  const ticker = document.getElementById("newsTicker");
  const grid = document.getElementById("newsGrid");

  // Show loading state
  grid.innerHTML =
    '<div style="text-align: center; color: rgba(255, 255, 255, 0.7); grid-column: 1/-1; padding: 40px;">' +
    '<i class="fa-solid fa-spinner" style="animation: spin 1s linear infinite; font-size: 24px; margin-bottom: 10px;"></i>' +
    "<p>Loading financial news...</p></div>";

  // Fetch news from API
  fetch("/api/news")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      if (!data.success || !data.articles || data.articles.length === 0) {
        grid.innerHTML = `
          <div style="text-align: center; color: rgba(255, 255, 255, 0.7); grid-column: 1/-1; padding: 40px;">
            <p>⚠️ ${data.message || "No news available"}</p>
            <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 10px;">
              Using fallback news data...
            </p>
          </div>
        `;
        // Show fallback news
        ticker.innerHTML = newsItems
          .map((item) => `<span>${item.headline}</span>`)
          .join("<span class='ticker-divider'>•</span>");
        grid.innerHTML += renderNewsCards(newsItems);
        return;
      }

      const articles = data.articles || [];

      // Update ticker with headlines
      ticker.innerHTML = articles
        .map((item) => `<span>${item.headline}</span>`)
        .join("<span class='ticker-divider'>•</span>");

      // Render news grid with cards
      grid.innerHTML = renderNewsCards(articles);
    })
    .catch((error) => {
      console.error("[ERROR] Error fetching news:", error);

      // Show error state with fallback
      grid.innerHTML = `
        <div style="text-align: center; color: rgba(255, 255, 255, 0.7); grid-column: 1/-1; padding: 40px;">
          <p>❌ ${error.message || "Failed to load news"}</p>
          <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 10px;">
            Using fallback news data...
          </p>
        </div>
      `;

      // Fallback to static news if API fails
      ticker.innerHTML = newsItems
        .map((item) => `<span>${item.headline}</span>`)
        .join("<span class='ticker-divider'>•</span>");
      grid.innerHTML += renderNewsCards(newsItems);
    });
}

function renderNewsCards(articles) {
  return articles
    .map(
      (item) => `
        <article class="news-card card-glow">
          <div class="news-image" style="background-image: url('${item.image}')"></div>
          <div class="news-content">
            <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="Read full article"></a>
            <span class="news-source">${item.source}</span>
            <h3>${item.headline}</h3>
            <p>${item.summary}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderSettings() {
  const current = loadSettings();
  document.getElementById("toggleNotifications").checked =
    current.notifications;
  document.getElementById("toggleAutoRefresh").checked = current.autoRefresh;
  document.getElementById("toggleDarkMode").checked = current.darkMode;
  document.getElementById("toggleReminders").checked = current.reminders;
  applyTheme(current.darkMode);
}

function applyTheme(darkMode) {
  document.body.classList.toggle("dark-mode", darkMode);
}

// Display detailed stock analysis modal
async function showStockAnalysis(symbol) {
  // Fetch analysis if not cached
  if (!analysisCache[symbol]) {
    const analysis = await fetchStockAnalysis(symbol);
    if (!analysis) {
      // ✅ Show user-friendly error message
      const errorModal = document.createElement("div");
      errorModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
      `;

      const errorContent = document.createElement("div");
      errorContent.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 1px solid rgba(255, 107, 107, 0.3);
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(255, 107, 107, 0.1);
      `;

      errorContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #ff6b6b;">⚠️ Error Loading Analysis</h2>
          <button onclick="this.closest('div').parentElement.remove()" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        
        <div style="color: rgba(255,255,255,0.8); margin-bottom: 20px;">
          <p>Unable to load detailed analysis for <strong>${symbol}</strong>.</p>
          <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 10px;">
            Possible causes:
          </p>
          <ul style="font-size: 13px; color: rgba(255,255,255,0.6); margin: 5px 0; padding-left: 20px;">
            <li>API rate limit exceeded</li>
            <li>Insufficient historical data</li>
            <li>Stock symbol not found</li>
            <li>Network connectivity issue</li>
          </ul>
        </div>
        
        <button onclick="this.closest('div').parentElement.remove(); updateAllStockData();" 
          style="width: 100%; padding: 10px; background: #64ffc8; color: #1a1a2e; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
          Retry
        </button>
      `;

      errorModal.appendChild(errorContent);
      document.body.appendChild(errorModal);

      errorModal.addEventListener("click", (e) => {
        if (e.target === errorModal) {
          errorModal.remove();
        }
      });

      return;
    }
  }

  const analysis = analysisCache[symbol];
  if (!analysis) {
    alert("Failed to load analysis for " + symbol);
    return;
  }

  const modal = document.createElement("div");
  modal.className = "stock-analysis-modal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  `;

  const content = document.createElement("div");
  content.style.cssText = `
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid rgba(100, 255, 200, 0.3);
    border-radius: 12px;
    padding: 24px;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(100, 255, 200, 0.1);
  `;

  const riskColor =
    analysis.riskAnalysis.severity === "high"
      ? "#ff6b6b"
      : analysis.riskAnalysis.severity === "medium"
        ? "#ffa500"
        : "#4CAF50";

  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #64ffc8;">${symbol}</h2>
      <button onclick="this.closest('div').closest('div').parentElement.remove()" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;">&times;</button>
    </div>

    <div style="margin-bottom: 24px; padding: 12px; background: rgba(100, 255, 200, 0.1); border-left: 3px solid #64ffc8; border-radius: 4px;">
      <div style="font-size: 24px; color: #64ffc8; font-weight: bold;">$${analysis.current.price.toFixed(2)}</div>
      <div style="color: ${analysis.current.change >= 0 ? "#4CAF50" : "#ff6b6b"}; font-size: 14px; margin-top: 4px;">
        ${analysis.current.change >= 0 ? "+" : ""}${analysis.current.change.toFixed(2)} (${analysis.current.changePct.toFixed(2)}%)
      </div>
      <div style="color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 4px;">Updated: ${analysis.current.timestamp}</div>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #64ffc8; margin-bottom: 12px;">📊 Technical Indicators</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
        <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px;">
          <div style="color: rgba(255,255,255,0.6);">MA 20</div>
          <div style="color: #64ffc8; font-weight: bold;">${analysis.technicalIndicators.ma20 || "N/A"}</div>
        </div>
        <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px;">
          <div style="color: rgba(255,255,255,0.6);">MA 50</div>
          <div style="color: #64ffc8; font-weight: bold;">${analysis.technicalIndicators.ma50 || "N/A"}</div>
        </div>
        <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px;">
          <div style="color: rgba(255,255,255,0.6);">MA 200</div>
          <div style="color: #64ffc8; font-weight: bold;">${analysis.technicalIndicators.ma200 || "N/A"}</div>
        </div>
        <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px;">
          <div style="color: rgba(255,255,255,0.6);">RSI (14)</div>
          <div style="color: #64ffc8; font-weight: bold;">${analysis.technicalIndicators.rsi || "N/A"}</div>
        </div>
      </div>
      
      ${
        analysis.technicalIndicators.bollingerBands
          ? `
        <div style="margin-top: 12px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px;">
          <div style="color: rgba(255,255,255,0.6); margin-bottom: 8px;">Bollinger Bands</div>
          <div style="font-size: 12px;">
            <div>Upper: <span style="color: #64ffc8;">${analysis.technicalIndicators.bollingerBands.upper}</span></div>
            <div>Middle: <span style="color: #64ffc8;">${analysis.technicalIndicators.bollingerBands.middle}</span></div>
            <div>Lower: <span style="color: #64ffc8;">${analysis.technicalIndicators.bollingerBands.lower}</span></div>
          </div>
        </div>
      `
          : ""
      }
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #ff6b6b; margin-bottom: 12px;">⚠️ Risk Factors (${analysis.riskAnalysis.severity.toUpperCase()})</h3>
      <div style="margin-bottom: 10px;">
        ${
          analysis.riskAnalysis.risks.length > 0
            ? analysis.riskAnalysis.risks
                .map(
                  (r) =>
                    `<div style="padding: 8px; background: rgba(255,107,107,0.2); border-radius: 4px; margin-bottom: 6px; color: #ff6b6b; font-size: 13px;">🔴 ${r}</div>`,
                )
                .join("")
            : '<div style="color: rgba(255,255,255,0.5); font-size: 13px;">No critical risks detected</div>'
        }
      </div>
      <div>
        ${
          analysis.riskAnalysis.warnings.length > 0
            ? analysis.riskAnalysis.warnings
                .map(
                  (w) =>
                    `<div style="padding: 8px; background: rgba(255,165,0,0.2); border-radius: 4px; margin-bottom: 6px; color: #ffa500; font-size: 13px;">⚠️ ${w}</div>`,
                )
                .join("")
            : ""
        }
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #64ffc8; margin-bottom: 12px;">📈 Patterns Detected</h3>
      <div>
        ${
          analysis.patterns.length > 0
            ? analysis.patterns
                .map(
                  (p) =>
                    `<div style="padding: 8px; background: rgba(100,255,200,0.2); border-radius: 4px; margin-bottom: 6px; color: #64ffc8; font-size: 13px;">✓ ${p}</div>`,
                )
                .join("")
            : '<div style="color: rgba(255,255,255,0.5); font-size: 13px;">No patterns detected</div>'
        }
      </div>
    </div>
  `;

  content.style.color = "#fff";
  modal.appendChild(content);
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function bindSettingsControls() {
  [
    ["toggleNotifications", "notifications"],
    ["toggleAutoRefresh", "autoRefresh"],
    ["toggleDarkMode", "darkMode"],
    ["toggleReminders", "reminders"],
  ].forEach(([elementId, settingKey]) => {
    const input = document.getElementById(elementId);
    if (!input) return;
    input.addEventListener("change", () => {
      const updated = loadSettings();
      updated[settingKey] = input.checked;
      saveSettings(updated);
      if (settingKey === "darkMode") {
        applyTheme(input.checked);
      }
    });
  });
}

function showSection(sectionId) {
  document.querySelectorAll(".dashboard-section").forEach((section) => {
    section.classList.toggle("active", section.id === `${sectionId}Section`);
  });
  document.querySelectorAll(".dashboard-nav .nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionId);
  });
}

function handleNavigation(event) {
  const target = event.currentTarget;
  const section = target.dataset.section;
  if (!section) return;
  if (section === "logout") {
    window.location.href = "/logout";
    return;
  }
  showSection(section);
}

function setSidebarState(isOpen) {
  document.body.classList.toggle("sidebar-open", isOpen);
}

function toggleSidebar() {
  setSidebarState(!document.body.classList.contains("sidebar-open"));
}

document.getElementById("sidebarClose")?.addEventListener("click", () => {
  setSidebarState(false);
});

document
  .getElementById("sidebarOpen")
  ?.addEventListener("click", toggleSidebar);

function initDashboard() {
  document.querySelectorAll(".dashboard-nav .nav-link").forEach((button) => {
    button.addEventListener("click", handleNavigation);
  });
  document
    .querySelector(".logout-link")
    ?.addEventListener("click", handleNavigation);
  setSidebarState(true);

  // Load initial stock data
  updateAllStockData();

  renderNews();
  renderSettings();
  bindSettingsControls();

  // Auto-refresh stock data every 5 minutes (300000 ms)
  setInterval(updateAllStockData, 300000);

  // Also refresh on page focus (when user comes back to tab)
  window.addEventListener("focus", updateAllStockData);
}

// Initialize immediately since script is loaded at end of HTML
// DOMContentLoaded will have already fired by this point
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initDashboard);
} else {
  // DOM is already loaded, initialize immediately
  initDashboard();
}
