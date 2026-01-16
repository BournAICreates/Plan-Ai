import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './CustomSelect.module.css';

interface Option {
    value: string;
    label: string;
    color?: string; // Optional color specific to this option (e.g., for Priority)
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
}

export function CustomSelect({ value, onChange, options, placeholder, className }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div
            className={`${styles.container} ${className || ''}`}
            ref={containerRef}
        >
            <button
                type="button" // Prevent form submission
                className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={styles.value}>
                    {selectedOption ? selectedOption.label : placeholder || 'Select...'}
                </span>
                <ChevronDown size={14} className={styles.arrow} />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={`${styles.option} ${option.value === value ? styles.selected : ''}`}
                            onClick={() => handleSelect(option.value)}
                            style={option.color ? { color: option.color } : {}}
                        >
                            {option.label}
                            {option.value === value && <Check size={14} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
