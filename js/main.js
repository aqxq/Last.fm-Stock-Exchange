class ScrobbleX {
    constructor() {
        this.currentTab = 'trending';
        this.stockChart = null;
        this.init();
    }

    init() {
        
        this.setupEventListeners();
        this.setupTabs();
        this.setupChart();
        console.log("init succesfully!");
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('dom loaded');
            setTimeout(() => {
                this.createStockChart();
            }, 100)
        });
    }

    setupTabs(){
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
              const tab = btn.getAttribute('data-tab');
              this.switchTab(tab);

        });
        });
    }

    setupChart(){
        const rangeBtns = document.querySelectorAll('.range-btn');
        rangeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const range = btn.getAttribute('data-range');
                this.updateChartRange(range);

                rangeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    createStockChart(){
        const ctx = document.getElementById('stockChart');
        if (!ctx) return;

        const data = this.generateChartData('1W');
        this.stockChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'KLAMAR Price',
                    data: data.prices,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#10b981',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(30, 30, 46, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#b8b8d1',
                        borderColor: '#2d3748',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(context){
                                return context[0].label;
                            },
                            label: function(context){
                                return `$${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6c7293',
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        display: true,
                        position: 'right',
                        grid: {
                            color: 'rgba(45, 55, 72, 0.3)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6c7293',
                            font: {
                                size: 11
                        },
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
        });

        console.log('stock chart created');
    }

    generateChartData(range) {
        const today = new Date();
        const data = {labels : [], prices: []};
        let days, basePrice = 24.35;

        switch(range) {
            case '1D':
                days = 1;
                break;
            case '1W':
                days = 7;
                break;
            case '1M':
                days = 30;
                break;
            case '3M':
                days = 90;
                break;
            default:
                days = 7;
        }
        for(let i = days; i >= 0; i--){
            const date = new Date();
            date.setDate(today.getDate() - i);

            if(range === '1D'){
                data.labels.push(date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }));
            } else {
                data.labels.push(date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                }));
            }

            const volatility = 0.02
            const change= (Math.random() - 0.5) * volatility;
            basePrice = basePrice * (1 + change);
            data.prices.push(basePrice.toFixed(2));
        }
        return data;
    }

    updateChartRange(range) {
        if (!this.stockChart) return;
        const newData = this.generateChartData(range);
        this.stockChart.data.labels = newData.labels;
        this.stockChart.data.datasets[0].data = newData.prices;
        this.stockChart.update('active');

        console.log('chart updated to range:', range);
    }

    switchTab(tab){
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        document.getElementById(tab).classList.add('active');

        this.currentTab = tab;
        console.log('swiched to tab:', tab);

        this.loadTabContent(tab);
    }

    loadTabContent(tab){
        switch(tab) {
            case 'trending':
                console.log('loading trending stocks');
                break;
            case 'portfolio':
                console.log('loafing portfolio');
                break;
            case 'watchlist':
                console.log('loading watchlist');
                break;
            case 'news':
                console.log('loading news');
                break;
        }
    }
}

const app = new ScrobbleX();



























/* commenting all this out for now
//tabs
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle){
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabPanes = document.querySelectorAll('.tab-pane');
            tabPanes.forEach(pane => pane.classList.remove('active'));
            const tabID = tab.getAttribute('data-tab');
            document.getElementById(tabID).classList.add('active');
        });
    });

    //calling funcs
    createStockChart();
    populateTrendingStocks();
    populatePortfolioHoldings();
    populateTransactions();
});

//chart
function createStockChart(){
    const ctx = document.getElementById('stockChart').getContext('2d');
    const dates = [];
    const prices = [];
    const today = new Date();

    for(let i = 6; i >= 0; i--){
        const date = new Date();
        date.setDate(today.getDate() - i);
        dates.push(date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}))
        prices.push(23+Math.random() * 2)
    }

    const stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'KLAMAR Price',
                data: prices,
                borderColor: '#8e44ad',
                backgroundColor: 'rgba(142, 68, 173, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    }); 
}


//mock data for front end for now
function populateTrendingStocks() {
    const trendingStocksContainer =
    document.querySelector('.trending-stocks');

    const trendingStocks = [
        {symbol: 'KLAMAR', name: 'Kendrick Lamar', price: 24.35, change: 5.3},
        {symbol: 'DRAKE', name: 'Drake', price: 21.87, change: 12.4},
        {symbol: 'LAUFEY', name: 'Laufey', price: 22.56, change: 1.7},
        {symbol: 'BILLIE', name: 'Billie Eilish', price: 15.89, change: 0.5},
        {symbol: 'CARTI', name: 'Playboi Carti', price: 18.72, change: -8.3},
        {symbol: 'WEEKND', name: 'The Weeknd', price: 19.45, change: 3.8}
    ];

    trendingStocksContainer.innerHTML = '';

    trendingStocks.forEach(stock => {
        const stockCard = document.createElement('div');
        stockCard.className = 'stock-card';
        const isPositive = stock.change >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeIcon = isPositive ? 'fa arrow-up' : 'fa arrow-down';

        stockCard.innerHTML = `
        <div class="stock-info">
            <div class="stock-avatar">${stock.symbol.substring(0,2)}</div>
            <div>
                <div class="stock-name">$${stock.symbol}</div>
                <div class="stock-artist">${stock.name}</div> 
            </div>
        </div>
        <div class="stock-price">
            <div class="stock-current"> $${stock.price.toFixed(2)}</div>
            <div class="stock-change ${changeClass}">
                <i class="fas ${changeIcon}"></i>
                ${isPositive ? '+' : ''}${stock.change}%
            </div>
        </div>
        `;
        trendingStocksContainer.appendChild(stockCard);
    });
}
    

//populate portfolio holdings w mock data
function populatePortfolioHoldings() {
    const holdingsContainer = document.querySelector('.holdings-body');
    
    const holdings = [
        {symbol: 'KLAMAR', name: 'Kendrick Lamar', shares: 25, price: 24.35, value: 608.75, change: 13.5},
        {symbol: 'WEEKND', name: 'The Weeknd', shares: 30, price: 19.45, value: 583.50, change: 6.9},
        {symbol: 'BILLIE', name: 'Billie Eilish', shares: 40, price: 15.89, value: 635.6, change: 7.7}
    ];

    holdingsContainer.innerHTML = '';
    holdings.forEach(holding => {
        const holdingRow = document.createElement('div');
        holdingRow.className = 'holding-row';
        const isPositive = holding.change >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        
        holdingRow.innerHTML = `
            <div class="col-large">
                <div class="holding-info">
                    <div class="stock-avatar">${holding.symbol.substring(0,2)}</div>
                    <div>
                        <div class stock-name>$${holding.symbol}</div>
                        <div class stock-artist>${holding.name}</div>
                    </div>
                </div>
            </div>
            <div class="col">${holding.shares}</div>
            <div class="col">${holding.price.toFixed(2)}</div>
            <div class="col">${holding.price.toFixed(2)}</div>
            <div class="col ${changeClass}">
                ${isPositive ? '+' : ''}${holding.change}%
            </div>
            <div class="col-small">
                <button class="action-button">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        `;
        
        holdingsContainer.appendChild(holdingRow);
    });
}

//transactions
function populateTransactions(){
    const transactionsContainer = document.querySelector('.transactions');
    if(!transactionsContainer) return;

    const transactions = [
        {type: 'buy', symbol: 'KLAMAR', name: 'Kendrick Lamar', shares: 10, price: 23.45, total: 234.50, date: 'May 10, 2:32 PM EST'},
        {type: 'sell', symbol: 'DRAKE', name: 'Drake', shares: 5, price: 19.87, total: 99.35, date: 'May 8, 9:15 AM EST'},
        {type: 'buy', symbol: 'BILLIE', name: 'Billie Eilish', shares: 15, price: 15.32, total: 229.80, date: 'May 5, 4:45 PM EST'},
        {type: 'buy', symbol: 'WEEKND', name: 'The Weeknd', shares: 8, price: 18.75, total: 150.00, date: 'May 3, 11:20 AM EST'}
    ]

    transactionsContainer.innerHTML = '';
    transactions.forEach(transaction => {
        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        const iconClass = transaction.type === 'buy' ? 'fa-arrow-up' : 'fa-arrow-down';

        transactionItem.innerHTML = `
            <div class="transaction-left">
                <div class="transaction-icon ${transaction.type}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div>
                    <div class="stock-name">$${transaction.symbol}</div>
                    <div class="stock-artist">${transaction.name}</div>
                </div>
            </div>
            <div class="transaction-middle">
                <div class="transaction-badge ${transaction.type}">${transaction.type}</div>
                <div class="transaction-details">
                    ${transaction.shares} shares @ $${transaction.price.toFixed(2)}
                </div>
            </div>
            <div class="transaction-right">
                <div class="transaction-amount">$${transaction.total.toFixed(2)}</div>
                <div class="transaction-date">${transaction.date}</div>
            </div>
        `;

        transactionsContainer.appendChild(transactionItem);
    });
}

console.log('loaded successfully!');
*/