class ScrobbleX {
    constructor() {
        this.currentPage = "dashboard"
        this.currentTab = "trending"
        this.stockChart = null
        this.stockData = this.generateMockStocks()
        this.currentTradeStock = null
        this.userData = this.loadUserData()
        this.cache = new Map()
        this.debounceTimers = new Map()
        this.observers = new Map()
        this.init()
    }

    loadUserData() {
        const defaultData = {
            balance: 1000,
            portfolio: [],
            transactions: [],
            watchlist: [],
            achievements: [],
            joinDate: new Date().toISOString(),
        }

        const saved = localStorage.getItem("scrobblex_user_data")
        return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData
    }

    saveUserData() {
        this.debounce(
            "saveUserData",
            () => {
                localStorage.setItem("scrobblex_user_data", JSON.stringify(this.userData))
            },
            500,
        )
    }

    debounce(key, func, delay) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key))
        }

        const timer = setTimeout(() => {
            func()
            this.debounceTimers.delete(key)
        }, delay)

        this.debounceTimers.set(key, timer)
    }

    get userBalance() {
        return this.userData.balance
    }

    set userBalance(value) {
        this.userData.balance = value
        this.saveUserData()
    }

    init() {
        console.log("init start")
        this.setupNavigation()
        this.setupTabs()
        this.setupMobileMenu()
        this.setupSearch()
        this.setupChart()
        this.setupModal()
        this.setupIntersectionObserver()
        this.updateBalanceDisplay()
        this.loadPage("dashboard")

        setTimeout(() => {
            this.showNotification("Welcome to ScrobbleX!", "success")
        }, 1000)

        console.log("init successful")
    }

    setupIntersectionObserver() {
        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            const element = entry.target
                            if (element.dataset.lazy === "chart" && !element.dataset.loaded) {
                                this.createStockChart()
                                element.dataset.loaded = "true"
                            }
                        }
                    })
                },
                { threshold: 0.1 },
            )

            this.observers.set("lazy", observer)
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll(".nav-item a")
        navItems.forEach((item) => {
            item.addEventListener("click", (e) => {
                e.preventDefault()
                const page = item.getAttribute("data-page")
                this.loadPage(page)

                document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"))
                item.parentElement.classList.add("active")
            })
        })
    }

    setupTabs() {
        const tabBtns = document.querySelectorAll(".tab-btn")

        tabBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                const tab = btn.getAttribute("data-tab")
                this.switchTab(tab)
            })
        })
    }

    setupMobileMenu() {
        const toggle = document.querySelector(".mobile-menu-toggle")
        const sidebar = document.querySelector(".sidebar")

        if (toggle) {
            toggle.addEventListener("click", () => {
                sidebar.classList.toggle("active")
                document.body.classList.toggle("sidebar-open")
            })
        }

        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 1024) {
                if (!e.target.closest(".sidebar") && !e.target.closest(".mobile-menu-toggle")) {
                    sidebar.classList.remove("active")
                    document.body.classList.remove("sidebar-open")
                }
            }
        })
    }

    setupSearch() {
        const searchInput = document.getElementById("searchInput")

        searchInput.addEventListener("input", (e) => {
            this.debounce(
                "search",
                () => {
                    this.performSearch(e.target.value)
                },
                300,
            )
        })

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".search-container")) {
                this.clearSearchResults()
            }
        })
    }

    performSearch(query) {
        if (!query.trim()) {
            this.clearSearchResults()
            return
        }

        const cacheKey = `search_${query.toLowerCase()}`
        if (this.cache.has(cacheKey)) {
            this.displaySearchResults(this.cache.get(cacheKey), query)
            return
        }

        const results = this.stockData.filter(
            (stock) =>
                stock.name.toLowerCase().includes(query.toLowerCase()) ||
                stock.symbol.toLowerCase().includes(query.toLowerCase()),
        )

        this.cache.set(cacheKey, results)
        this.displaySearchResults(results, query)
    }

    displaySearchResults(results, query) {
        let dropdown = document.getElementById("searchDropdown")
        if (!dropdown) {
            dropdown = document.createElement("div")
            dropdown.id = "searchDropdown"
            dropdown.className = "search-dropdown"
            document.querySelector(".search-container").appendChild(dropdown)
        }

        if (results.length === 0) {
            dropdown.innerHTML = `
            <div class="search-result-item no-results">
                <i class="fas fa-search"></i>
                <span>No results found for "${query}"</span>
            </div>
        `
        } else {
            const fragment = document.createDocumentFragment()
            results.forEach((stock) => {
                const item = document.createElement("div")
                item.className = "search-result-item"
                item.onclick = () => this.selectSearchResult(stock.symbol)
                item.innerHTML = `
          <div class="search-result-avatar">${stock.symbol.substring(0, 2)}</div>
          <div class="search-result-info">
              <div class="search-result-name">${stock.name}</div>
              <div class="search-result-symbol">$${stock.symbol}</div>
          </div>
          <div class="search-result-price">
              <div class="price">$${stock.price.toFixed(2)}</div>
              <div class="change ${stock.change >= 0 ? "positive" : "negative"}">
                  ${this.formatPercent(stock.change)}
              </div>
          </div>
        `
                fragment.appendChild(item)
            })
            dropdown.innerHTML = ""
            dropdown.appendChild(fragment)
        }

        dropdown.style.display = "block"
    }

    selectSearchResult(symbol) {
        this.clearSearchResults()
        document.getElementById("searchInput").value = ""
        this.openStockDetails(symbol)
    }

    clearSearchResults() {
        const dropdown = document.getElementById("searchDropdown")
        if (dropdown) {
            dropdown.style.display = "none"
        }
    }

    setupChart() {
        const rangeBtns = document.querySelectorAll(".range-btn")
        rangeBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                const range = btn.getAttribute("data-range")
                this.updateChartRange(range)

                rangeBtns.forEach((b) => b.classList.remove("active"))
                btn.classList.add("active")
            })
        })

        const chartContainer = document.getElementById("stockChart")
        if (chartContainer && this.observers.has("lazy")) {
            chartContainer.dataset.lazy = "chart"
            this.observers.get("lazy").observe(chartContainer)
        } else {
            setTimeout(() => {
                this.createStockChart()
            }, 100)
        }
    }

    setupModal() {
        const modal = document.getElementById("tradeModal")
        const closeBtn = modal.querySelector(".modal-close")

        closeBtn.addEventListener("click", () => {
            this.closeModal()
        })

        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                this.closeModal()
            }
        })

        const tradeTabs = document.querySelectorAll(".trade-tab")
        tradeTabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                const tradeType = tab.getAttribute("data-trade")
                this.switchTradeTab(tradeType)
            })
        })

        const shareInput = document.getElementById("shareAmount")
        shareInput.addEventListener("input", () => {
            this.debounce(
                "tradeEstimate",
                () => {
                    this.updateTradeEstimate()
                },
                100,
            )
        })

        const executeBtn = document.getElementById("executeTradeBtn")
        executeBtn.addEventListener("click", () => {
            this.executeTrade()
        })
    }

    updateBalanceDisplay() {
        requestAnimationFrame(() => {
            const balanceElement = document.getElementById("userBalance")
            if (balanceElement) {
                balanceElement.textContent = `${this.userBalance.toLocaleString()} SC`
            }

            const availableBalance = document.getElementById("availableBalance")
            if (availableBalance) {
                availableBalance.textContent = `$${this.userBalance.toFixed(2)}`
            }
        })
    }

    loadPage(page) {
        this.currentPage = page
        console.log(`Loading ${page} page`)

        document.querySelectorAll(".page-content").forEach((pageEl) => {
            pageEl.style.display = "none"
        })

        const pageElement = document.getElementById(`${page}Page`)
        if (pageElement) {
            pageElement.style.display = "block"
        }

        switch (page) {
            case "dashboard":
                this.updateMarketOverviewData()
                this.debounce(
                    "renderTrending",
                    () => {
                        this.renderTrendingStocks()
                    },
                    50,
                )
                break
            case "market":
                this.renderMarketPage()
                break
            case "portfolio":
                this.renderPortfolioPage()
                break
            case "leaderboard":
                this.renderLeaderboardPage()
                break
        }
    }

    renderMarketPage() {
        const container = document.getElementById("marketGrid")
        if (!container) return

        const fragment = document.createDocumentFragment()

        this.stockData.forEach((stock) => {
            const stockCard = document.createElement("div")
            stockCard.className = "stock-card"
            stockCard.onclick = () => this.openStockDetails(stock.symbol)
            stockCard.innerHTML = `
        <div class="stock-header">
            <div class="stock-avatar">${stock.symbol.substring(0, 2)}</div>
            <div class="stock-info">
                <h4>${stock.name}</h4>
                <div class="stock-symbol">$${stock.symbol}</div>
            </div>
            <button class="watchlist-add" onclick="event.stopPropagation(); app.addToWatchlist('${stock.symbol}')" title="Add to watchlist">
                <i class="fas fa-eye"></i>
            </button>
        </div>
        <div class="stock-metrics">
            <div class="stock-price">$${stock.price.toFixed(2)}</div>
            <div class="stock-change ${stock.change >= 0 ? "positive" : "negative"}">
                <i class="fas fa-arrow-${stock.change >= 0 ? "up" : "down"}"></i>
                ${this.formatPercent(stock.change)}
            </div>
        </div>
        <div class="stock-volume">
            Volume: ${this.formatNumber(stock.volume)}
        </div>
      `
            fragment.appendChild(stockCard)
        })

        container.innerHTML = ""
        container.appendChild(fragment)
    }

    renderPortfolioPage() {
        const container = document.getElementById("portfolioTable")
        if (!container) return

        const portfolioValue = this.calculatePortfolioValue()
        const totalInvested = this.calculateTotalInvested()
        const totalGainLoss = portfolioValue - totalInvested
        const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0

        document.getElementById("portfolioTotalValue").textContent = `$${portfolioValue.toFixed(2)}`
        document.getElementById("portfolioTotalGainLoss").innerHTML = `
      <span class="${totalGainLoss >= 0 ? "positive" : "negative"}">
        ${totalGainLoss >= 0 ? "+" : ""}$${Math.abs(totalGainLoss).toFixed(2)} 
        (${totalGainLoss >= 0 ? "+" : ""}${totalGainLossPercent.toFixed(1)}%)
      </span>
    `
        document.getElementById("portfolioHoldingsCount").textContent = this.userData.portfolio.length

        if (this.userData.portfolio.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-briefcase"></i>
          <h4>No Holdings Yet</h4>
          <p>Start trading to build your portfolio</p>
        </div>
      `
            return
        }

        const tableHTML = `
      <div class="portfolio-table-header">
        <div>Artist</div>
        <div>Shares</div>
        <div>Avg Price</div>
        <div>Current Price</div>
        <div>Market Value</div>
        <div>P&L</div>
      </div>
    `

        const fragment = document.createDocumentFragment()
        const tableDiv = document.createElement("div")
        tableDiv.innerHTML = tableHTML

        this.userData.portfolio.forEach((holding) => {
            const currentStock = this.stockData.find((s) => s.symbol === holding.symbol)
            if (!currentStock) return

            const currentValue = holding.shares * currentStock.price
            const investedValue = holding.shares * holding.avgPrice
            const gainLoss = currentValue - investedValue
            const gainLossPercent = (gainLoss / investedValue) * 100

            const row = document.createElement("div")
            row.className = "portfolio-table-row"
            row.onclick = () => this.openStockDetails(holding.symbol)
            row.innerHTML = `
        <div class="portfolio-artist">
          <div class="portfolio-artist-avatar">${holding.symbol.substring(0, 2)}</div>
          <div class="portfolio-artist-info">
            <h4>${currentStock.name}</h4>
            <div class="portfolio-artist-symbol">$${holding.symbol}</div>
          </div>
        </div>
        <div class="portfolio-table-cell">${holding.shares}</div>
        <div class="portfolio-table-cell">$${holding.avgPrice.toFixed(2)}</div>
        <div class="portfolio-table-cell">$${currentStock.price.toFixed(2)}</div>
        <div class="portfolio-table-cell">$${currentValue.toFixed(2)}</div>
        <div class="portfolio-table-cell ${gainLoss >= 0 ? "positive" : "negative"}">
          ${gainLoss >= 0 ? "+" : ""}$${Math.abs(gainLoss).toFixed(2)} (${gainLoss >= 0 ? "+" : ""}${gainLossPercent.toFixed(1)}%)
        </div>
      `
            tableDiv.appendChild(row)
        })

        fragment.appendChild(tableDiv)
        container.innerHTML = ""
        container.appendChild(fragment)
    }

    renderLeaderboardPage() {
        const container = document.getElementById("leaderboardTable")
        if (!container) return

        const leaderboardData = this.generateMockLeaderboard()

        const tableHTML = `
      <div class="leaderboard-header">
        <div>Rank</div>
        <div>Trader</div>
        <div>Portfolio Value</div>
        <div>Total Return</div>
        <div class="trades-col">Trades</div>
      </div>
    `

        const fragment = document.createDocumentFragment()
        const tableDiv = document.createElement("div")
        tableDiv.innerHTML = tableHTML

        leaderboardData.forEach((trader, index) => {
            const row = document.createElement("div")
            row.className = "leaderboard-row"

            let rankClass = ""
            if (index === 0) rankClass = "gold"
            else if (index === 1) rankClass = "silver"
            else if (index === 2) rankClass = "bronze"

            row.innerHTML = `
        <div class="leaderboard-rank ${rankClass}">${index + 1}</div>
        <div class="leaderboard-user">
          <div class="leaderboard-avatar">${trader.username.substring(0, 2).toUpperCase()}</div>
          <div class="leaderboard-username">${trader.username}</div>
        </div>
        <div class="leaderboard-cell">$${trader.portfolioValue.toLocaleString()}</div>
        <div class="leaderboard-cell ${trader.totalReturn >= 0 ? "positive" : "negative"}">
          ${trader.totalReturn >= 0 ? "+" : ""}${trader.totalReturn.toFixed(1)}%
        </div>
        <div class="leaderboard-cell trades-col">${trader.totalTrades}</div>
      `
            tableDiv.appendChild(row)
        })

        fragment.appendChild(tableDiv)
        container.innerHTML = ""
        container.appendChild(fragment)
    }

    generateMockLeaderboard() {
        const usernames = [
            "sigma12",
            "skib1dit0ilet",
            "thosewhoknow",
            "balkanrage",
            "brawlStars",
            "kevinheart",
            "chimpanzinibanananini",
            "brainr0t",
            "boiiwhatyousayaboutPH0NK",
            "tspmo",
            "sybau",
            "neighborh00d",
            "gr0wag4rdenf4n",
            "iamsteve",
            "Fstudent",
        ]

        return usernames
            .map((username, index) => ({
                username,
                portfolioValue: Math.floor(Math.random() * 50000) + 10000,
                totalReturn: (Math.random() - 0.3) * 100,
                totalTrades: Math.floor(Math.random() * 200) + 50,
            }))
            .sort((a, b) => b.totalReturn - a.totalReturn)
    }

    switchTab(tab) {
        document.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.classList.remove("active")
        })

        document.querySelector(`[data-tab="${tab}"]`).classList.add("active")

        document.querySelectorAll(".tab-pane").forEach((pane) => {
            pane.classList.remove("active")
        })

        document.getElementById(tab).classList.add("active")

        this.currentTab = tab
        console.log(`Switched to ${tab} tab`)

        this.loadTabContent(tab)
    }

    loadTabContent(tab) {
        const cacheKey = `tab_${tab}`

        if (this.cache.has(cacheKey) && Date.now() - this.cache.get(`${cacheKey}_timestamp`) < 30000) {
            return
        }

        switch (tab) {
            case "trending":
                this.renderTrendingStocks()
                break
            case "portfolio":
                this.renderPortfolio()
                break
            case "watchlist":
                this.renderWatchlist()
                break
            case "news":
                this.renderNewsFeed()
                break
            case "history":
                this.renderTransactionHistory()
                break
        }

        this.cache.set(cacheKey, true)
        this.cache.set(`${cacheKey}_timestamp`, Date.now())
    }

    renderNewsFeed() {
        const container = document.getElementById("newsFeed")
        if (!container) return

        const newsItems = this.generateMockNews()

        const fragment = document.createDocumentFragment()
        const feedDiv = document.createElement("div")
        feedDiv.className = "news-feed"

        newsItems.forEach((item) => {
            const newsItem = document.createElement("div")
            newsItem.className = "news-item"
            newsItem.innerHTML = `
        <div class="news-header">
            <div class="news-icon ${item.type}">
                <i class="fas ${item.icon}"></i>
            </div>
            <div class="news-content-text">
                <div class="news-title">${item.title}</div>
                <div class="news-time">${item.time}</div>
            </div>
        </div>
      `
            feedDiv.appendChild(newsItem)
        })

        fragment.appendChild(feedDiv)
        container.innerHTML = ""
        container.appendChild(fragment)
    }

    generateMockNews() {
        return [
            {
                title: "Taylor Swift's new album drives $TAYLOR up 15.3%",
                time: "2 hours ago",
                type: "positive",
                icon: "fa-arrow-up",
            },
            {
                title: "The Weeknd's streaming numbers decline, $WEEKND falls 7.2%",
                time: "4 hours ago",
                type: "negative",
                icon: "fa-arrow-down",
            },
            {
                title: "Kendrick Lamar announces tour dates, $KLAMAR surges",
                time: "6 hours ago",
                type: "positive",
                icon: "fa-calendar",
            },
            {
                title: "Billie Eilish collaborates with major brand, $BILLIE stable",
                time: "1 day ago",
                type: "neutral",
                icon: "fa-handshake",
            },
            {
                title: "Post Malone's latest single hits #1, $POSTY gains momentum",
                time: "1 day ago",
                type: "positive",
                icon: "fa-music",
            },
            {
                title: "Music industry reports record streaming numbers",
                time: "2 days ago",
                type: "neutral",
                icon: "fa-chart-bar",
            },
        ]
    }

    renderPortfolio() {
        const container = document.getElementById("portfolioHoldings")
        if (!container) return

        if (this.userData.portfolio.length === 0) {
            container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-briefcase"></i>
                <h4>No Holdings Yet</h4>
                <p>Start trading to build your portfolio</p>
            </div>
        `
            return
        }

        const portfolioValue = this.calculatePortfolioValue()
        const totalInvested = this.calculateTotalInvested()
        const totalGainLoss = portfolioValue - totalInvested
        const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0

        const summaryElement = document.querySelector(".portfolio-summary .portfolio-value")
        if (summaryElement) {
            summaryElement.innerHTML = `
            <span class="value">$${portfolioValue.toFixed(2)}</span>
            <span class="change ${totalGainLoss >= 0 ? "positive" : "negative"}">
                ${totalGainLoss >= 0 ? "+" : ""}$${Math.abs(totalGainLoss).toFixed(2)} 
                (${totalGainLoss >= 0 ? "+" : ""}${totalGainLossPercent.toFixed(1)}%)
            </span>
        `
        }

        const fragment = document.createDocumentFragment()
        const listDiv = document.createElement("div")
        listDiv.className = "portfolio-list"

        this.userData.portfolio.forEach((holding) => {
            const currentStock = this.stockData.find((s) => s.symbol === holding.symbol)
            if (!currentStock) return

            const currentValue = holding.shares * currentStock.price
            const investedValue = holding.shares * holding.avgPrice
            const gainLoss = currentValue - investedValue
            const gainLossPercent = (gainLoss / investedValue) * 100

            const portfolioRow = document.createElement("div")
            portfolioRow.className = "portfolio-row"
            portfolioRow.onclick = () => this.openStockDetails(holding.symbol)
            portfolioRow.innerHTML = `
            <div class="portfolio-direction-icon ${gainLoss >= 0 ? "positive" : "negative"}">
                <i class="fas fa-arrow-${gainLoss >= 0 ? "up" : "down"}"></i>
            </div>
            <div class="portfolio-details">
                <div class="portfolio-main-line">
                    <span class="portfolio-action-type">HOLD</span>
                    <span class="portfolio-symbol">$${holding.symbol}</span>
                    <span class="portfolio-name">${currentStock.name}</span>
                </div>
                <div class="portfolio-meta-line">
                    <span>${holding.shares} shares</span>
                    <span>@ $${holding.avgPrice.toFixed(2)}</span>
                    <span>Current: $${currentStock.price.toFixed(2)}</span>
                </div>
            </div>
            <div class="portfolio-value">
                <div class="portfolio-current-value">$${currentValue.toFixed(2)}</div>
                <div class="portfolio-gain-loss ${gainLoss >= 0 ? "positive" : "negative"}">
                    ${gainLoss >= 0 ? "+" : ""}$${gainLoss.toFixed(2)}
                </div>
            </div>
            <div class="portfolio-actions">
                <button class="btn-small btn-primary" onclick="event.stopPropagation(); app.quickTrade('${holding.symbol}', 'buy')">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn-small btn-danger" onclick="event.stopPropagation(); app.quickTrade('${holding.symbol}', 'sell')">
                    <i class="fas fa-minus"></i>
                </button>
            </div>
        `
            listDiv.appendChild(portfolioRow)
        })

        fragment.appendChild(listDiv)
        container.innerHTML = ""
        container.appendChild(fragment)
    }

    renderWatchlist() {
        const container = document.getElementById("watchlistItems")
        if (!container) return

        if (this.userData.watchlist.length === 0) {
            container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-eye"></i>
                <h4>Your Watchlist is Empty</h4>
                <p>Add artists to keep track of their performance</p>
            </div>
        `
            return
        }

        const watchlistStocks = this.userData.watchlist
            .map((symbol) => this.stockData.find((s) => s.symbol === symbol))
            .filter(Boolean)

        const fragment = document.createDocumentFragment()
        const listDiv = document.createElement("div")
        listDiv.className = "watchlist-list"

        watchlistStocks.forEach((stock) => {
            const watchlistRow = document.createElement("div")
            watchlistRow.className = "watchlist-row"
            watchlistRow.onclick = () => this.openStockDetails(stock.symbol)
            watchlistRow.innerHTML = `
            <div class="watchlist-direction-icon">
                <i class="fas fa-eye"></i>
            </div>
            <div class="watchlist-details">
                <div class="watchlist-main-line">
                    <span class="watchlist-symbol">$${stock.symbol}</span>
                    <span class="watchlist-name">${stock.name}</span>
                </div>
                <div class="watchlist-meta-line">
                    <span>Vol: ${this.formatNumber(stock.volume)}</span>
                    <span>${stock.genre}</span>
                </div>
            </div>
            <div class="watchlist-value">
                <div class="watchlist-current-price">$${stock.price.toFixed(2)}</div>
                <div class="watchlist-change ${stock.change >= 0 ? "positive" : "negative"}">
                    ${this.formatPercent(stock.change)}
                </div>
            </div>
            <div class="watchlist-actions">
                <button class="btn-small btn-primary" onclick="event.stopPropagation(); app.openStockDetails('${stock.symbol}')">
                    <i class="fas fa-chart-line"></i>
                </button>
                <button class="btn-small btn-secondary" onclick="event.stopPropagation(); app.removeFromWatchlist('${stock.symbol}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `
            listDiv.appendChild(watchlistRow)
        })

        fragment.appendChild(listDiv)
        container.innerHTML = ""
        container.appendChild(fragment)
    }

    renderTransactionHistory() {
        const container = document.getElementById("transactionHistory")
        if (!container) return

        if (this.userData.transactions.length === 0) {
            container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h4>No Transaction History</h4>
                <p>Your trading history will appear here</p>
            </div>
        `
            return
        }

        const groupedTransactions = this.groupTransactionsByDate(this.userData.transactions)
        const fragment = document.createDocumentFragment()
        const historyDiv = document.createElement("div")
        historyDiv.className = "transaction-history"

        Object.entries(groupedTransactions).forEach(([date, transactions]) => {
            const groupDiv = document.createElement("div")
            groupDiv.className = "transaction-group"

            const headerDiv = document.createElement("div")
            headerDiv.className = "transaction-date-header"
            headerDiv.innerHTML = `
        <h3>${this.formatDateHeader(date)}</h3>
        <span class="transaction-count">${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}</span>
      `

            const listDiv = document.createElement("div")
            listDiv.className = "transaction-list"

            transactions.forEach((transaction) => {
                const itemDiv = document.createElement("div")
                itemDiv.className = `transaction-item ${transaction.type}`
                itemDiv.innerHTML = `
          <div class="transaction-icon">
              <i class="fas fa-arrow-${transaction.type === "buy" ? "down" : "up"}"></i>
          </div>
          <div class="transaction-details">
              <div class="transaction-main">
                  <span class="transaction-type">${transaction.type.toUpperCase()}</span>
                  <span class="transaction-symbol">$${transaction.symbol}</span>
                  <span class="transaction-name">${transaction.name}</span>
              </div>
              <div class="transaction-meta">
                  <span class="transaction-shares">${transaction.shares} shares</span>
                  <span class="transaction-price">@ $${transaction.price.toFixed(2)}</span>
                  <span class="transaction-time">${this.formatTime(transaction.date)}</span>
              </div>
          </div>
          <div class="transaction-amount ${transaction.type}">
              <span class="amount">${transaction.type === "buy" ? "-" : "+"}$${transaction.total.toFixed(2)}</span>
          </div>
        `
                listDiv.appendChild(itemDiv)
            })

            groupDiv.appendChild(headerDiv)
            groupDiv.appendChild(listDiv)
            historyDiv.appendChild(groupDiv)
        })

        fragment.appendChild(historyDiv)
        container.innerHTML = ""
        container.appendChild(fragment)
    }

    groupTransactionsByDate(transactions) {
        const groups = {}
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        transactions.forEach((transaction) => {
            const transactionDate = new Date(transaction.date)
            let dateKey

            if (this.isSameDay(transactionDate, today)) {
                dateKey = "today"
            } else if (this.isSameDay(transactionDate, yesterday)) {
                dateKey = "yesterday"
            } else {
                dateKey = transactionDate.toDateString()
            }

            if (!groups[dateKey]) {
                groups[dateKey] = []
            }
            groups[dateKey].push(transaction)
        })

        return groups
    }

    isSameDay(date1, date2) {
        return (
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
        )
    }

    formatDateHeader(dateKey) {
        if (dateKey === "today") return "Today"
        if (dateKey === "yesterday") return "Yesterday"

        const date = new Date(dateKey)
        const today = new Date()
        const diffTime = Math.abs(today - date)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays <= 7) {
            return date.toLocaleDateString("en-US", { weekday: "long" })
        } else {
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
            })
        }
    }

    formatTime(dateString) {
        const date = new Date(dateString)
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
    }

    calculatePortfolioValue() {
        return this.userData.portfolio.reduce((total, holding) => {
            const currentStock = this.stockData.find((s) => s.symbol === holding.symbol)
            return total + (currentStock ? holding.shares * currentStock.price : 0)
        }, 0)
    }

    calculateTotalInvested() {
        return this.userData.portfolio.reduce((total, holding) => {
            return total + holding.shares * holding.avgPrice
        }, 0)
    }

    quickTrade(symbol, type) {
        const stock = this.stockData.find((s) => s.symbol === symbol)
        if (!stock) return

        this.currentTradeStock = stock
        this.openStockDetails(symbol)

        setTimeout(() => {
            const tradeTab = document.querySelector(`[data-trade="${type}"]`)
            if (tradeTab) {
                tradeTab.click()
            }
        }, 100)
    }

    addToWatchlist(symbol) {
        if (!this.userData.watchlist.includes(symbol)) {
            this.userData.watchlist.push(symbol)
            this.saveUserData()
            this.showNotification(`Added ${symbol} to watchlist`, "success")

            if (this.currentTab === "watchlist") {
                this.renderWatchlist()
            }
        } else {
            this.showNotification(`${symbol} is already in your watchlist`, "info")
        }
    }

    removeFromWatchlist(symbol) {
        this.userData.watchlist = this.userData.watchlist.filter((s) => s !== symbol)
        this.saveUserData()
        this.showNotification(`Removed ${symbol} from watchlist`, "info")

        if (this.currentTab === "watchlist") {
            this.renderWatchlist()
        }
    }

    generateMockStocks() {
        const artists = [
            { symbol: "TAYLOR", name: "Taylor Swift", genre: "Pop" },
            { symbol: "DRAKE", name: "Drake", genre: "Hip-Hop" },
            { symbol: "KLAMAR", name: "Kendrick Lamar", genre: "Hip-Hop" },
            { symbol: "BILLIE", name: "Billie Eilish", genre: "Alternative" },
            { symbol: "WEEKND", name: "The Weeknd", genre: "R&B" },
            { symbol: "ARIANA", name: "Ariana Grande", genre: "Pop" },
            { symbol: "POSTY", name: "Post Malone", genre: "Hip-Hop" },
            { symbol: "DUALIPA", name: "Dua Lipa", genre: "Pop" },
            { symbol: "SHEERAN", name: "Ed Sheeran", genre: "Pop" },
            { symbol: "ADELE", name: "Adele", genre: "Soul" },
        ]

        return artists.map((artist) => ({
            ...artist,
            price: 15 + Math.random() * 30,
            change: (Math.random() - 0.5) * 20,
            volume: Math.floor(Math.random() * 5000000) + 1000000,
            marketCap: Math.floor(Math.random() * 1000000000) + 100000000,
        }))
    }

    updateMarketOverviewData() {
        const totalMarketCap = this.stockData.reduce((sum, stock) => sum + stock.price * 1000000, 0)
        const totalVolume = this.stockData.reduce((sum, stock) => sum + stock.volume, 0)

        const sortedByChange = [...this.stockData].sort((a, b) => b.change - a.change)
        const topGainer = sortedByChange[0]
        const topLoser = sortedByChange[sortedByChange.length - 1]

        requestAnimationFrame(() => {
            document.getElementById("marketCapValue").textContent = this.formatCurrency(totalMarketCap)
            document.getElementById("volumeValue").textContent = this.formatCurrency(totalVolume)
            document.getElementById("topGainerValue").textContent = `$${topGainer.symbol}`
            document.getElementById("topLoserValue").textContent = `$${topLoser.symbol}`

            const topGainerChangeEl = document.getElementById("topGainerChange")
            const topLoserChangeEl = document.getElementById("topLoserChange")

            topGainerChangeEl.innerHTML = `
          <i class="fas fa-arrow-up"></i>
          <span>${this.formatPercent(topGainer.change)}</span>
      `

            topLoserChangeEl.innerHTML = `
          <i class="fas fa-arrow-down"></i>
          <span>${this.formatPercent(topLoser.change)}</span>
      `

            topLoserChangeEl.className = "card-change negative"
        })
    }

    renderTrendingStocks() {
        const container = document.getElementById("trendingStocks")
        if (!container) return

        container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Loading trending stocks...</span>
        </div>
    `

        setTimeout(() => {
            const trendingStocks = this.stockData.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6)

            const fragment = document.createDocumentFragment()

            trendingStocks.forEach((stock) => {
                const stockCard = document.createElement("div")
                stockCard.className = "stock-card"
                stockCard.onclick = () => this.openStockDetails(stock.symbol)
                stockCard.innerHTML = `
          <div class="stock-header">
              <div class="stock-avatar">${stock.symbol.substring(0, 2)}</div>
              <div class="stock-info">
                  <h4>${stock.name}</h4>
                  <div class="stock-symbol">$${stock.symbol}</div>
              </div>
              <button class="watchlist-add" onclick="event.stopPropagation(); app.addToWatchlist('${stock.symbol}')" title="Add to watchlist">
                  <i class="fas fa-eye"></i>
              </button>
          </div>
          <div class="stock-metrics">
              <div class="stock-price">$${stock.price.toFixed(2)}</div>
              <div class="stock-change ${stock.change >= 0 ? "positive" : "negative"}">
                  <i class="fas fa-arrow-${stock.change >= 0 ? "up" : "down"}"></i>
                  ${this.formatPercent(stock.change)}
              </div>
          </div>
          <div class="stock-volume">
              Volume: ${this.formatNumber(stock.volume)}
          </div>
        `
                fragment.appendChild(stockCard)
            })

            container.innerHTML = ""
            container.appendChild(fragment)
            console.log("trending stocks rendered")
        }, 800)
    }

    openStockDetails(symbol) {
        const stock = this.stockData.find((s) => s.symbol === symbol)
        if (!stock) return

        this.currentTradeStock = stock

        const modal = document.getElementById("tradeModal")
        const title = document.getElementById("modalTitle")
        const currentPrice = document.getElementById("currentPrice")

        title.textContent = `Trade ${stock.name}`
        currentPrice.textContent = `$${stock.price.toFixed(2)}`

        modal.classList.add("active")
        document.body.style.overflow = "hidden"

        this.updateTradeEstimate()
    }

    closeModal() {
        const modal = document.getElementById("tradeModal")
        modal.classList.remove("active")
        document.body.style.overflow = ""
    }

    switchTradeTab(type) {
        document.querySelectorAll(".trade-tab").forEach((tab) => {
            tab.classList.remove("active")
        })

        document.querySelector(`[data-trade="${type}"]`).classList.add("active")

        const executeBtn = document.getElementById("executeTradeBtn")
        executeBtn.textContent = type === "buy" ? "Buy Shares" : "Sell Shares"
        executeBtn.className = `btn btn-block ${type === "buy" ? "btn-primary" : "btn-danger"}`

        if (type === "sell") {
            const holding = this.userData.portfolio.find((h) => h.symbol === this.currentTradeStock.symbol)
            const maxShares = holding ? holding.shares : 0
            const shareInput = document.getElementById("shareAmount")
            shareInput.max = maxShares
            if (shareInput.value > maxShares) {
                shareInput.value = maxShares
            }
        } else {
            document.getElementById("shareAmount").removeAttribute("max")
        }

        this.updateTradeEstimate()
    }

    updateTradeEstimate() {
        if (!this.currentTradeStock) return

        const shares = Number.parseInt(document.getElementById("shareAmount").value) || 0
        const price = this.currentTradeStock.price
        const total = shares * price

        document.getElementById("estimatedTotal").textContent = `$${total.toFixed(2)}`
        document.getElementById("availableBalance").textContent = `$${this.userBalance.toFixed(2)}`
    }

    executeTrade() {
        if (!this.currentTradeStock) return

        const shares = Number.parseInt(document.getElementById("shareAmount").value) || 0
        const tradeType = document.querySelector(".trade-tab.active").getAttribute("data-trade")
        const total = shares * this.currentTradeStock.price

        if (shares <= 0) {
            this.showNotification("Please enter a valid number of shares", "error")
            return
        }

        if (tradeType === "buy" && total > this.userBalance) {
            this.showNotification("Insufficient funds", "error")
            return
        }

        if (tradeType === "sell") {
            const holding = this.userData.portfolio.find((h) => h.symbol === this.currentTradeStock.symbol)
            if (!holding || holding.shares < shares) {
                this.showNotification("Insufficient shares to sell", "error")
                return
            }
        }

        this.showLoading()

        setTimeout(() => {
            const transaction = {
                id: Date.now(),
                type: tradeType,
                symbol: this.currentTradeStock.symbol,
                name: this.currentTradeStock.name,
                shares: shares,
                price: this.currentTradeStock.price,
                total: total,
                date: new Date().toISOString(),
                timestamp: Date.now(),
            }

            if (tradeType === "buy") {
                this.userBalance -= total
                this.addToPortfolio(this.currentTradeStock.symbol, shares, this.currentTradeStock.price)
            } else {
                this.userBalance += total
                this.removeFromPortfolio(this.currentTradeStock.symbol, shares)
            }

            this.userData.transactions.unshift(transaction)
            this.saveUserData()

            this.cache.clear()

            this.updateBalanceDisplay()
            this.hideLoading()
            this.closeModal()

            this.showNotification(
                `Successfully ${tradeType === "buy" ? "bought" : "sold"} ${shares} shares of ${this.currentTradeStock.symbol}`,
                "success",
            )

            if (this.currentTab === "portfolio") {
                this.renderPortfolio()
            }
            if (this.currentTab === "history") {
                this.renderTransactionHistory()
            }
            if (this.currentPage === "portfolio") {
                this.renderPortfolioPage()
            }
        }, 1500)
    }

    addToPortfolio(symbol, shares, price) {
        const existing = this.userData.portfolio.find((item) => item.symbol === symbol)

        if (existing) {
            const totalShares = existing.shares + shares
            const totalValue = existing.shares * existing.avgPrice + shares * price
            existing.shares = totalShares
            existing.avgPrice = totalValue / totalShares
        } else {
            this.userData.portfolio.push({
                symbol: symbol,
                shares: shares,
                avgPrice: price,
                addedDate: new Date().toISOString(),
            })
        }
    }

    removeFromPortfolio(symbol, shares) {
        const existing = this.userData.portfolio.find((item) => item.symbol === symbol)

        if (existing) {
            existing.shares -= shares
            if (existing.shares <= 0) {
                this.userData.portfolio = this.userData.portfolio.filter((item) => item.symbol !== symbol)
            }
        }
    }

    resetUserData() {
        localStorage.removeItem("scrobblex_user_data")
        this.userData = this.loadUserData()
        this.cache.clear()
        this.updateBalanceDisplay()
        this.showNotification("User data reset successfully", "info")

        if (this.currentPage === "dashboard") {
            this.loadTabContent(document.querySelector(".tab-btn.active").getAttribute("data-tab"))
        }
    }

    showNotification(message, type = "info") {
        const notification = document.createElement("div")
        notification.className = `notification notification-${type}`
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `

        document.body.appendChild(notification)

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove()
            }
        }, 5000)

        notification.querySelector(".notification-close").addEventListener("click", () => {
            notification.remove()
        })
    }

    getNotificationIcon(type) {
        const icons = {
            success: "check-circle",
            error: "exclamation-circle",
            warning: "exclamation-triangle",
            info: "info-circle",
        }
        return icons[type] || icons.info
    }

    showLoading() {
        const loading = document.createElement("div")
        loading.className = "loading-overlay active"
        loading.id = "loadingOverlay"
        loading.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Processing trade...</p>
            </div>
        `
        document.body.appendChild(loading)
    }

    hideLoading() {
        const loading = document.getElementById("loadingOverlay")
        if (loading) {
            loading.remove()
        }
    }

    createStockChart() {
        const ctx = document.getElementById("stockChart")
        if (!ctx || this.stockChart) return

        const data = this.generateChartData("1W")

        this.stockChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: "KLAMAR Price",
                        data: data.prices,
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: "#10b981",
                        pointHoverBorderColor: "#ffffff",
                        pointHoverBorderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: "easeInOutQuart",
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        mode: "index",
                        intersect: false,
                        backgroundColor: "rgba(30, 30, 46, 0.9)",
                        titleColor: "#ffffff",
                        bodyColor: "#b8b8d1",
                        borderColor: "#2d3748",
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: (context) => context[0].label,
                            label: (context) => `$${context.parsed.y.toFixed(2)}`,
                        },
                    },
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false,
                        },
                        ticks: {
                            color: "#6c7293",
                            font: {
                                size: 11,
                            },
                        },
                    },
                    y: {
                        display: true,
                        position: "right",
                        grid: {
                            color: "rgba(45, 55, 72, 0.3)",
                            drawBorder: false,
                        },
                        ticks: {
                            color: "#6c7293",
                            font: {
                                size: 11,
                            },
                            callback: (value) => "$" + value.toFixed(2),
                        },
                    },
                },
                interaction: {
                    intersect: false,
                    mode: "index",
                },
            },
        })

        console.log("stock chart created")
    }

    generateChartData(range) {
        const cacheKey = `chart_${range}`
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)
        }

        const now = new Date()
        const data = { labels: [], prices: [] }
        let days,
            basePrice = 24.35

        switch (range) {
            case "1D":
                days = 1
                break
            case "1W":
                days = 7
                break
            case "1M":
                days = 30
                break
            case "3M":
                days = 90
                break
            default:
                days = 7
        }

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now)
            date.setDate(date.getDate() - i)

            if (range === "1D") {
                data.labels.push(
                    date.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                )
            } else {
                data.labels.push(
                    date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    }),
                )
            }

            const volatility = 0.02
            const change = (Math.random() - 0.5) * volatility
            basePrice = basePrice * (1 + change)
            data.prices.push(Number(basePrice.toFixed(2)))
        }

        this.cache.set(cacheKey, data)
        return data
    }

    updateChartRange(range) {
        if (!this.stockChart) return

        const newData = this.generateChartData(range)
        this.stockChart.data.labels = newData.labels
        this.stockChart.data.datasets[0].data = newData.prices
        this.stockChart.update("active")

        console.log(`chart updated to ${range} range`)
    }

    formatCurrency(amount) {
        if (amount >= 1000000000) {
            return "$" + (amount / 1000000000).toFixed(1) + "B"
        } else if (amount >= 1000000) {
            return "$" + (amount / 1000000).toFixed(0) + "M"
        } else {
            return "$" + amount.toLocaleString()
        }
    }

    formatPercent(value) {
        return (value >= 0 ? "+" : "") + value.toFixed(1) + "%"
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + "M"
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + "K"
        }
        return num.toString()
    }

    destroy() {
        this.debounceTimers.forEach((timer) => clearTimeout(timer))
        this.debounceTimers.clear()

        this.observers.forEach((observer) => observer.disconnect())
        this.observers.clear()

        this.cache.clear()

        if (this.stockChart) {
            this.stockChart.destroy()
            this.stockChart = null
        }
    }
}

let app
document.addEventListener("DOMContentLoaded", () => {
    app = new ScrobbleX()
})

window.addEventListener("beforeunload", () => {
    if (app) {
        app.destroy()
    }
})