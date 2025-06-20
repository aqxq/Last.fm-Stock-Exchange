class ScrobbleX {
    constructor() {
        this.currentPage = "dashboard"
        this.currentTab = "trending"
        this.stockChart = null
        this.stockData = this.generateMockStocks()
        this.currentTradeStock = null
        this.userBalance = 10000
        this.init()
    }

    init() {
        this.setupNavigation()
        this.setupTabs()
        this.setupMobileMenu()
        this.setupSearch()
        this.setupChart()
        this.setupModal()
        this.updateBalanceDisplay()
        console.log("init succesful")
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
        let searchTimeout

        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchTimeout)
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value)
            }, 300)
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

        const results = this.stockData.filter(
            (stock) =>
                stock.name.toLowerCase().includes(query.toLowerCase()) ||
                stock.symbol.toLowerCase().includes(query.toLowerCase()),
        )

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
            dropdown.innerHTML = results
                .map(
                    (stock) => `
            <div class="search-result-item" onclick="app.selectSearchResult('${stock.symbol}')">
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
            </div>
        `,
                )
                .join("")
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

        setTimeout(() => {
            this.createStockChart()
        }, 100)
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
            this.updateTradeEstimate()
        })

        const executeBtn = document.getElementById("executeTradeBtn")
        executeBtn.addEventListener("click", () => {
            this.executeTrade()
        })
    }

    updateBalanceDisplay() {
        const balanceElement = document.getElementById("userBalance")
        if (balanceElement) {
            balanceElement.textContent = `${this.userBalance.toLocaleString()} SC`
        }

        const availableBalance = document.getElementById("availableBalance")
        if (availableBalance) {
            availableBalance.textContent = `$${this.userBalance.toFixed(2)}`
        }
    }

    loadPage(page) {
        this.currentPage = page
        console.log(`Loading ${page} page`)

        if (page === "dashboard") {
            this.updateMarketOverviewData()
            setTimeout(() => {
                this.renderTrendingStocks()
            }, 50)
        }
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
        switch (tab) {
            case "trending":
                this.renderTrendingStocks()
                break
            case "portfolio":
                console.log("Loading portfolio")
                break
            case "watchlist":
                console.log("Loading watchlist")
                break
            case "news":
                console.log("Loading news")
                break
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

            container.innerHTML = trendingStocks
                .map(
                    (stock) => `
          <div class="stock-card" onclick="app.openStockDetails('${stock.symbol}')">
              <div class="stock-header">
                  <div class="stock-avatar">${stock.symbol.substring(0, 2)}</div>
                  <div class="stock-info">
                      <h4>${stock.name}</h4>
                      <div class="stock-symbol">$${stock.symbol}</div>
                  </div>
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
          </div>
      `,
                )
                .join("")

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
            alert("Please enter a valid number of shares")
            return
        }

        if (tradeType === "buy" && total > this.userBalance) {
            alert("Insufficient funds")
            return
        }

        if (tradeType === "buy") {
            this.userBalance -= total
        } else {
            this.userBalance += total
        }

        this.updateBalanceDisplay()
        this.closeModal()

        console.log(
            `Successfully ${tradeType === "buy" ? "bought" : "sold"} ${shares} shares of ${this.currentTradeStock.symbol}`,
        )
    }

    createStockChart() {
        const ctx = document.getElementById("stockChart")
        if (!ctx) return

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
}

let app
document.addEventListener("DOMContentLoaded", () => {
    app = new ScrobbleX()
})