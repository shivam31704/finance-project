// Top 10 Indian stocks to track using Alpha Vantage symbol suffixes
const DEFAULT_STOCKS = [
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
  "INFY.NS",
  "HINDUNILVR.NS",
  "SBIN.NS",
  "AXISBANK.NS",
  "LT.NS",
  "BHARTIARTL.NS",
];

// In-memory cache for stock data with analysis
let stockDataCache = {};
let analysisCache = {};

// Stock name mapping for Indian companies
const STOCK_NAMES = {
  "RELIANCE.NS": "Reliance Industries",
  "TCS.NS": "Tata Consultancy Services",
  "HDFCBANK.NS": "HDFC Bank",
  "ICICIBANK.NS": "ICICI Bank",
  "INFY.NS": "Infosys",
  "HINDUNILVR.NS": "Hindustan Unilever",
  "SBIN.NS": "State Bank of India",
  "AXISBANK.NS": "Axis Bank",
  "LT.NS": "Larsen & Toubro",
  "BHARTIARTL.NS": "Bharti Airtel",
};

function getDisplaySymbol(symbol) {
  return symbol.replace(/\.(NS|BSE)$/i, "");
}

// Fetch real stock data from backend API
async function fetchStockData(symbol) {
  try {
    const response = await fetch(`/api/stock/${symbol}`);
    const data = await response.json();
    if (data.success) {
      stockDataCache[symbol] = {
        symbol: data.symbol,
        displaySymbol: getDisplaySymbol(data.symbol),
        name: STOCK_NAMES[data.symbol] || getDisplaySymbol(data.symbol),
        price: data.price,
        change: data.change,
        changePct: data.changePct,
        timestamp: data.timestamp,
      };
      return stockDataCache[symbol];
    }
  } catch (error) {
    console.error(`Error fetching stock ${symbol}:`, error);
  }
  return null;
}

// Fetch detailed analysis with technical indicators and risk factors
async function fetchStockAnalysis(symbol) {
  try {
    const response = await fetch(`/api/stock-analysis/${symbol}`);
    const data = await response.json();
    if (data.success) {
      analysisCache[symbol] = data;
      return data;
    }
  } catch (error) {
    console.error(`Error fetching analysis for ${symbol}:`, error);
  }
  return null;
}

// Update all stock data at once
async function updateAllStockData() {
  const stockSymbols = DEFAULT_STOCKS;
  for (const symbol of stockSymbols) {
    await fetchStockData(symbol);
  }
  renderStocks();
  renderFavorites();
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

  // Use cached data or show loading state
  const stocks = DEFAULT_STOCKS.map((symbol) => stockDataCache[symbol]).filter(
    Boolean,
  );

  if (stocks.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: rgba(255, 255, 255, 0.7); grid-column: 1/-1;">Loading stock data...</p>';
    return;
  }

  container.innerHTML = stocks
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

  // Add click handler to view detailed analysis
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
    '<p style="text-align: center; color: rgba(255, 255, 255, 0.7); grid-column: 1/-1;">Loading news...</p>';

  // Fetch news from API
  fetch("/api/news")
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        grid.innerHTML = `<p style="text-align: center; color: rgba(255, 255, 255, 0.7); grid-column: 1/-1;">⚠️ ${data.message}</p>`;
        return;
      }

      const articles = data.articles || [];

      // Update ticker with headlines
      ticker.innerHTML = articles
        .map((item) => `<span>${item.headline}</span>`)
        .join("<span class='ticker-divider'>•</span>");

      // Render news grid with cards
      grid.innerHTML = articles
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
    })
    .catch((error) => {
      console.error("Error fetching news:", error);
      grid.innerHTML = `<p style="text-align: center; color: rgba(255, 255, 255, 0.7); grid-column: 1/-1;">Failed to load news. Check console for details.</p>`;
      // Fallback to static news if API fails
      ticker.innerHTML = newsItems
        .map((item) => `<span>${item.headline}</span>`)
        .join("<span class='ticker-divider'>•</span>");
      grid.innerHTML = newsItems
        .map(
          (item) => `
            <article class="news-card card-glow">
              <div class="news-image" style="background-image: url('${item.image}')"></div>
              <div class="news-content">
                <a href="javascript:void(0);" title="Read more"></a>
                <span class="news-source">${item.source}</span>
                <h3>${item.headline}</h3>
                <p>${item.summary}</p>
              </div>
            </article>
          `,
        )
        .join("");
    });
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
    await fetchStockAnalysis(symbol);
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
      <button onclick="this.closest('.stock-analysis-modal').remove()" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;">&times;</button>
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

window.addEventListener("DOMContentLoaded", initDashboard);
