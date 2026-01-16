import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import styles from './Widgets.module.css';

type NewsItem = {
    title: string;
    link: string;
    pubDate: string;
    source: string;
    guid?: string;
};

// RSS to JSON proxy service (free tier limitations may apply, but works for demo)
const RSS_TO_JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

const NEWS_PROVIDERS = [
    { id: 'fox', name: 'Fox News', rss: 'https://moxie.foxnews.com/google-publisher/latest.xml' },
    { id: 'cnn', name: 'CNN', rss: 'http://rss.cnn.com/rss/edition.rss' },
    { id: 'bbc', name: 'BBC News', rss: 'http://feeds.bbci.co.uk/news/rss.xml' },
    { id: 'espn', name: 'ESPN', rss: 'https://www.espn.com/espn/rss/news' },
    { id: 'techcrunch', name: 'TechCrunch', rss: 'https://techcrunch.com/feed/' },
    { id: 'wsj', name: 'Wall Street Journal', rss: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
];

export function NewsFeedWidget() {
    const [selectedProvider, setSelectedProvider] = useState('fox');
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showProviderMenu, setShowProviderMenu] = useState(false);

    // Load saved provider
    useEffect(() => {
        const saved = localStorage.getItem('news_provider');
        if (saved && NEWS_PROVIDERS.find(p => p.id === saved)) {
            setSelectedProvider(saved);
        }
    }, []);

    // Fetch news when provider changes
    useEffect(() => {
        fetchNews(selectedProvider);
    }, [selectedProvider]);

    const fetchNews = async (providerId: string) => {
        setLoading(true);
        setError('');
        const provider = NEWS_PROVIDERS.find(p => p.id === providerId);
        if (!provider) return;

        try {
            const response = await fetch(`${RSS_TO_JSON}${encodeURIComponent(provider.rss)}`);
            const data = await response.json();

            if (data.status === 'ok') {
                // Ensure sorting by date descending to get the absolute latest
                const sortedItems = data.items.sort((a: NewsItem, b: NewsItem) =>
                    new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
                );
                setNews(sortedItems.slice(0, 10)); // Top 10 latest
            } else {
                throw new Error('Failed to load feed');
            }
        } catch (err) {
            console.error(err);
            setError('Unable to load live news. Access may be restricted.');
        } finally {
            setLoading(false);
        }
    };

    const handleProviderChange = (providerId: string) => {
        setSelectedProvider(providerId);
        localStorage.setItem('news_provider', providerId);
        setShowProviderMenu(false);
    };

    const formatTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffInConfig = now.getTime() - date.getTime();
            const diffInMinutes = Math.floor(diffInConfig / (1000 * 60));
            const diffInHours = Math.floor(diffInConfig / (1000 * 60 * 60));

            if (diffInMinutes < 1) return 'Just now';
            if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
            if (diffInHours < 24) return `${diffInHours}h ago`;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    const currentProviderName = NEWS_PROVIDERS.find(p => p.id === selectedProvider)?.name;

    return (
        <div className={styles.widgetContainer}>
            <div className={styles.widgetHeader}>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', position: 'relative' }}
                    onClick={() => setShowProviderMenu(!showProviderMenu)}
                    title="Change News Provider"
                >
                    <Newspaper size={18} className={styles.icon} />
                    <h3 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {currentProviderName} <ChevronDown size={14} style={{ opacity: 0.5 }} />
                    </h3>

                    {showProviderMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-lg)',
                            zIndex: 10,
                            width: '180px',
                            marginTop: '8px',
                            padding: '4px',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column'
                        }} onClick={(e) => e.stopPropagation()}>
                            {NEWS_PROVIDERS.map(provider => (
                                <button
                                    key={provider.id}
                                    onClick={() => handleProviderChange(provider.id)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '8px 12px',
                                        background: selectedProvider === provider.id ? 'var(--color-bg-subtle)' : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--color-text-main)',
                                        borderRadius: '4px',
                                        fontSize: '0.9rem'
                                    }}
                                    className="provider-option"
                                >
                                    {provider.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={() => fetchNews(selectedProvider)} className={styles.iconBtn} disabled={loading} title="Refresh Headlines">
                    <RefreshCw size={14} className={loading ? styles.spin : ''} />
                </button>
            </div>

            <div className={styles.newsList}>
                {error ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        <AlertCircle size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <p>{error}</p>
                    </div>
                ) : (
                    news.map((item, index) => (
                        <a
                            key={index}
                            href={item.link}
                            className={styles.newsItem}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={loading ? { opacity: 0.5 } : {}}
                        >
                            <div className={styles.newsContent}>
                                <h4 className={styles.newsTitle}>{item.title}</h4>
                                <div className={styles.newsMeta}>
                                    <span className={styles.source}>{currentProviderName}</span>
                                    <span className={styles.dot}>•</span>
                                    <span className={styles.time}>{formatTime(item.pubDate)}</span>
                                </div>
                            </div>
                            <ExternalLink size={12} className={styles.linkIcon} />
                        </a>
                    ))
                )}
                {!loading && news.length === 0 && !error && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No news found.
                    </div>
                )}
            </div>
        </div>
    );
}
