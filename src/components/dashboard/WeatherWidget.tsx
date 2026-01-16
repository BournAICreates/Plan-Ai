import { useEffect, useState } from 'react';
import { Cloud, CloudRain, CloudSnow, Sun, Wind, CloudLightning, Loader2, MapPin, Umbrella } from 'lucide-react';
import styles from './Dashboard.module.css';

interface WeatherDay {
    temperature: number; // For today, this is current. For tomorrow, this is max.
    temperatureMin?: number; // Only for tomorrow
    weatherCode: number;
    precipitationChance: number;
}

interface WeatherData {
    today: WeatherDay;
    tomorrow: WeatherDay;
    city: string;
}

export function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'today' | 'tomorrow'>('today');

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;

                    // Fetch weather data
                    // We need daily max/min for tomorrow, and daily precip/code for tomorrow.
                    const weatherRes = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto`
                    );
                    const weatherData = await weatherRes.json();

                    setWeather({
                        today: {
                            temperature: Math.round(weatherData.current.temperature_2m),
                            weatherCode: weatherData.current.weather_code,
                            precipitationChance: weatherData.daily?.precipitation_probability_max?.[0] ?? 0,
                        },
                        tomorrow: {
                            temperature: Math.round(weatherData.daily.temperature_2m_max[1]),
                            temperatureMin: Math.round(weatherData.daily.temperature_2m_min[1]),
                            weatherCode: weatherData.daily.weather_code[1],
                            precipitationChance: weatherData.daily.precipitation_probability_max[1] ?? 0,
                        },
                        city: 'Local Weather'
                    });
                } catch (err) {
                    setError('Failed to fetch weather');
                } finally {
                    setLoading(false);
                }
            },
            (err) => {
                console.error(err);
                setError('Location access denied');
                setLoading(false);
            }
        );
    }, []);

    const getWeatherIcon = (code: number) => {
        // WMO Weather interpretation codes (WW)
        if (code === 0 || code === 1) return <Sun size={32} className="text-yellow-500" />;
        if (code === 2 || code === 3) return <Cloud size={32} className="text-gray-400" />;
        if (code >= 45 && code <= 48) return <Wind size={32} className="text-gray-500" />;
        if (code >= 51 && code <= 67) return <CloudRain size={32} className="text-blue-400" />;
        if (code >= 71 && code <= 77) return <CloudSnow size={32} className="text-blue-200" />;
        if (code >= 80 && code <= 82) return <CloudRain size={32} className="text-blue-500" />;
        if (code >= 95 && code <= 99) return <CloudLightning size={32} className="text-yellow-600" />;
        return <Sun size={32} className="text-yellow-500" />;
    };

    const getWeatherDescription = (code: number) => {
        if (code === 0) return 'Clear sky';
        if (code === 1) return 'Mainly clear';
        if (code === 2) return 'Partly cloudy';
        if (code === 3) return 'Overcast';
        if (code >= 45 && code <= 48) return 'Foggy';
        if (code >= 51 && code <= 55) return 'Drizzle';
        if (code >= 56 && code <= 57) return 'Freezing Drizzle';
        if (code >= 61 && code <= 65) return 'Rain';
        if (code >= 66 && code <= 67) return 'Freezing Rain';
        if (code >= 71 && code <= 77) return 'Snow';
        if (code >= 80 && code <= 82) return 'Rain showers';
        if (code >= 85 && code <= 86) return 'Snow showers';
        if (code >= 95 && code <= 99) return 'Thunderstorm';
        return 'Clear';
    };

    if (loading) {
        return (
            <div className={styles.card} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-text-muted)' }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.card} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem'
            }}>
                <Cloud size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                {error}
            </div>
        );
    }

    const currentData = view === 'today' ? weather?.today : weather?.tomorrow;

    return (
        <div className={styles.card} style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            isolation: 'isolate' // Creates a new stacking context
        }}>
            {/* Background decoration */}
            <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: 'radial-gradient(circle, var(--color-primary-light) 0%, transparent 70%)',
                opacity: 0.1,
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
                position: 'relative',
                zIndex: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} />
                    <span>{weather?.city}</span>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    backgroundColor: 'var(--bg-hover)',
                    borderRadius: '0.5rem',
                    padding: '2px',
                    gap: '2px',
                    cursor: 'pointer',
                    zIndex: 30, // Extra high z-index
                    position: 'relative'
                }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setView('today');
                        }}
                        style={{
                            border: 'none',
                            background: view === 'today' ? 'var(--bg-card)' : 'transparent',
                            color: view === 'today' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                            padding: '2px 8px',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: view === 'today' ? 600 : 400,
                            boxShadow: view === 'today' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            pointerEvents: 'auto'
                        }}
                    >
                        Today
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setView('tomorrow');
                        }}
                        style={{
                            border: 'none',
                            background: view === 'tomorrow' ? 'var(--bg-card)' : 'transparent',
                            color: view === 'tomorrow' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                            padding: '2px 8px',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: view === 'tomorrow' ? 600 : 400,
                            boxShadow: view === 'tomorrow' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            pointerEvents: 'auto'
                        }}
                    >
                        Tmrw
                    </button>
                </div>
            </div>

            {currentData && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-text-main)', lineHeight: 1 }}>
                            {currentData.temperature}°
                            {view === 'tomorrow' && currentData.temperatureMin && (
                                <span style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>
                                    / {currentData.temperatureMin}°
                                </span>
                            )}
                        </div>
                        <div style={{
                            color: 'var(--color-text-muted)',
                            marginTop: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <span>{getWeatherDescription(currentData.weatherCode)}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)' }} title="Chance of precipitation">
                                <Umbrella size={14} />
                                <span>{currentData.precipitationChance}%</span>
                            </div>
                        </div>
                    </div>
                    <div style={{
                        color: 'var(--color-primary)'
                    }}>
                        {getWeatherIcon(currentData.weatherCode)}
                    </div>
                </div>
            )}
        </div>
    );
}
