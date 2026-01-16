import { Quote } from 'lucide-react';
import styles from './Dashboard.module.css';

const QUOTES = [
    { text: "I can do all things through Christ who strengthens me.", author: "Philippians 4:13" },
    { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", author: "Jeremiah 29:11" },
    { text: "Trust in the Lord with all your heart and lean not on your own understanding.", author: "Proverbs 3:5" },
    { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", author: "Joshua 1:9" },
    { text: "The Lord is my shepherd, I lack nothing.", author: "Psalm 23:1" },
    { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.", author: "Isaiah 40:31" },
    { text: "Let all that you do be done in love.", author: "1 Corinthians 16:14" },
    { text: "This is the day that the Lord has made; let us rejoice and be glad in it.", author: "Psalm 118:24" },
    { text: "And we know that in all things God works for the good of those who love him.", author: "Romans 8:28" },
    { text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind.", author: "Romans 12:2" },
    { text: "Now faith is confidence in what we hope for and assurance about what we do not see.", author: "Hebrews 11:1" },
    { text: "The Lord is my light and my salvation—whom shall I fear?", author: "Psalm 27:1" },
    { text: "Come to me, all you who are weary and burdened, and I will give you rest.", author: "Matthew 11:28" },
    { text: "If God is for us, who can be against us?", author: "Romans 8:31" },
    { text: "Be still, and know that I am God.", author: "Psalm 46:10" },
];

export function DailyQuote() {
    // Determine quote based on the day of the year
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const quote = QUOTES[dayOfYear % QUOTES.length];

    return (
        <div className={styles.quoteCard}>
            <Quote size={18} className={styles.quoteIcon} />
            <div className={styles.quoteContent}>
                <p className={styles.quoteText}>"{quote.text}"</p>
                <cite className={styles.quoteAuthor}>— {quote.author}</cite>
            </div>
        </div>
    );
}
