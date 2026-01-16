import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Plus, Trash2, GripVertical } from 'lucide-react';
import styles from './Widgets.module.css';

const DEFAULT_STOCKS = [
    { symbol: 'BTC', price: 65430.00, change: 1250.50, changePercent: 1.95, isCrypto: true },
    { symbol: 'ETH', price: 3450.20, change: -45.10, changePercent: -1.25, isCrypto: true },
    { symbol: 'AAPL', price: 182.50, change: 1.25, changePercent: 0.69, isCrypto: false },
    { symbol: 'MSFT', price: 405.30, change: -2.10, changePercent: -0.52, isCrypto: false },
    { symbol: 'GOOGL', price: 142.80, change: 0.95, changePercent: 0.67, isCrypto: false },
];

export function StockTickerWidget() {
    const [stocks, setStocks] = useState(DEFAULT_STOCKS);
    const [loading, setLoading] = useState(false);
    const [newSymbol, setNewSymbol] = useState('');
    const [showAdd, setShowAdd] = useState(false);


    // Drag and Drop State
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const generateMockStock = (symbol: string) => ({
        symbol: symbol.toUpperCase(),
        price: Number((Math.random() * 1000 + 10).toFixed(2)),
        change: Number((Math.random() * 10 - 5).toFixed(2)),
        changePercent: Number((Math.random() * 5 - 2.5).toFixed(2)),
        isCrypto: ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP'].includes(symbol.toUpperCase())
    });

    // Load ALL symbols from local storage to preserve order
    useEffect(() => {
        const savedOrder = localStorage.getItem('stock_order_v2');
        if (savedOrder) {
            try {
                const symbols = JSON.parse(savedOrder);
                if (Array.isArray(symbols) && symbols.length > 0) {
                    const reconstructed = symbols.map(sym => {
                        const def = DEFAULT_STOCKS.find(d => d.symbol === sym);
                        return def ? { ...def } : generateMockStock(sym);
                    });
                    setStocks(reconstructed);
                }
            } catch (e) {
                console.error('Failed to parse saved stock order', e);
            }
        }

        // Fetch real data initially
        refreshStocks();
    }, []);

    const saveOrder = (currentStocks: typeof stocks) => {
        const symbols = currentStocks.map(s => s.symbol);
        localStorage.setItem('stock_order_v2', JSON.stringify(symbols));
    };

    const fetchCryptoPrices = async (symbols: string[]) => {
        const cryptoIds: { [key: string]: string } = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'SOL': 'solana',
            'DOGE': 'dogecoin',
            'XRP': 'ripple',
            'ADA': 'cardano'
        };

        const idsToFetch = symbols
            .filter(s => cryptoIds[s])
            .map(s => cryptoIds[s])
            .join(',');

        if (!idsToFetch) return {};

        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idsToFetch}&vs_currencies=usd&include_24hr_change=true`);
            const data = await response.json();
            return data;
        } catch (e) {
            console.error("CoinGecko fetch failed:", e);
            return {};
        }
    };

    const refreshStocks = async () => {
        setLoading(true);


        // 1. Fetch Real Crypto Data
        const cryptoSymbols = stocks.map(s => s.symbol.toUpperCase());
        const cryptoData = await fetchCryptoPrices(cryptoSymbols);

        // 2. Update Stocks (Real for Crypto, Simulated for Stocks)
        setStocks(prev => prev.map(s => {
            const sym = s.symbol.toUpperCase();

            // Map symbol to coingecko ID
            const cryptoMap: { [key: string]: string } = {
                'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
                'DOGE': 'dogecoin', 'XRP': 'ripple', 'ADA': 'cardano'
            };
            const coinId = cryptoMap[sym];

            if (coinId && cryptoData[coinId]) {
                const data = cryptoData[coinId];
                return {
                    ...s,
                    price: data.usd,
                    change: (data.usd * (data.usd_24h_change / 100)), // Approx absolute change
                    changePercent: data.usd_24h_change,
                    isCrypto: true
                };
            } else {
                // Simulate stock update if not crypto
                // In a production app, we would fetch from a premium Stock API here.
                const change = (Math.random() * 2 - 1); // Earlier range was too volatile
                return {
                    ...s,
                    price: Number((s.price + change).toFixed(2)),
                    change: Number((s.change + change / 20).toFixed(2)), // Smaller simulation steps
                    changePercent: Number((s.changePercent + change / 100).toFixed(2)),
                    isCrypto: false
                };
            }
        }));

        setLoading(false);
    };

    const handleAddSymbol = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSymbol.trim()) return;

        const symbol = newSymbol.toUpperCase().trim();
        if (stocks.some(s => s.symbol === symbol)) {
            setNewSymbol('');
            return;
        }

        const newStock = generateMockStock(symbol);
        const updatedStocks = [...stocks, newStock];
        setStocks(updatedStocks);
        saveOrder(updatedStocks);

        // Trigger fetch to see if we can get real data for it immediately
        setTimeout(refreshStocks, 100);

        setNewSymbol('');
        setShowAdd(false);
    };

    const removeStock = (symbol: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedStocks = stocks.filter(s => s.symbol !== symbol);
        setStocks(updatedStocks);
        saveOrder(updatedStocks);
    };

    // Drag Handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;
        const updatedStocks = [...stocks];
        const [movedItem] = updatedStocks.splice(draggedIndex, 1);
        updatedStocks.splice(index, 0, movedItem);
        setStocks(updatedStocks);
        saveOrder(updatedStocks);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div className={styles.widgetContainer}>
            <div className={styles.widgetHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={18} className={styles.icon} />
                    <h3 className={styles.title}>Market Watch</h3>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setShowAdd(!showAdd)} className={styles.iconBtn} title="Add Symbol" style={showAdd ? { color: 'var(--color-primary)', background: 'var(--color-bg-subtle)' } : {}}>
                        <Plus size={14} />
                    </button>
                    <button onClick={refreshStocks} className={styles.iconBtn} disabled={loading} title="Refresh Data">
                        <RefreshCw size={14} className={loading ? styles.spin : ''} />
                    </button>
                </div>
            </div>

            {showAdd && (
                <form onSubmit={handleAddSymbol} className={styles.addForm}>
                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            className={styles.input}
                            value={newSymbol}
                            onChange={(e) => setNewSymbol(e.target.value)}
                            placeholder="Add Symbol (e.g. BTC, ETH)"
                            autoFocus
                        />
                    </div>
                    <button type="submit" className={styles.submitBtn}>
                        <Plus size={18} />
                    </button>
                </form>
            )}

            <div className={styles.stockList}>
                {stocks.map((stock, index) => (
                    <div
                        key={stock.symbol}
                        className={`${styles.stockItem} ${draggedIndex === index ? styles.stockItemDragging : ''} ${dragOverIndex === index ? styles.stockItemOver : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                    >
                        <div className={styles.stockInfo} style={{ pointerEvents: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <GripVertical size={12} style={{ color: 'var(--color-border)', cursor: 'grab' }} />
                                <span className={styles.symbol}>{stock.symbol}</span>
                            </div>
                            <span className={styles.price}>${stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className={`${styles.change} ${stock.change >= 0 ? styles.positive : styles.negative}`}>
                                {stock.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {stock.change > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </div>
                            <button
                                onClick={(e) => removeStock(stock.symbol, e)}
                                className={styles.iconBtn}
                                style={{ color: '#ef4444', padding: '2px', opacity: 0.6 }}
                                title="Remove"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
