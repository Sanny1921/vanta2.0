import { useState, useRef, useEffect } from 'react';
import { useUI } from '../context/UIContext';
import '../css/ThemeSwitcher.css';

export default function ThemeSwitcher() {
  const { theme, setTheme, accent, setAccent } = useUI();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const accents = [
    { name: 'purple', label: 'Purple', color: '#8b5cf6' },
    { name: 'blue', label: 'Blue', color: '#3b82f6' },
    { name: 'emerald', label: 'Emerald', color: '#10b981' },
    { name: 'rose', label: 'Rose', color: '#f43f5e' },
    { name: 'amber', label: 'Amber', color: '#f59e0b' }
  ];

  return (
    <div className="vanta-theme-switcher" ref={containerRef}>
      <button
        type="button"
        className={`switcher-toggle-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Customize theme"
        aria-expanded={isOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35249 19.5 5.59945 19.75 5.59945 20.0882C5.59945 20.3547 5.48512 20.6105 5.28189 20.7818C4.94319 21.0673 4.29606 21 3.5 21C2.67157 21 2 21.6716 2 22.5C2 23.3284 2.67157 24 3.5 24H12Z" />
          <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
          <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
          <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
          <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {isOpen && (
        <div className="switcher-dropdown-panel">
          <div className="switcher-section">
            <span className="switcher-section-title">THEME MODE</span>
            <div className="segmented-control">
              <button
                type="button"
                className={`segment-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
              <button
                type="button"
                className={`segment-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
            </div>
          </div>

          <div className="switcher-section">
            <span className="switcher-section-title">ACCENT COLOR</span>
            <div className="accent-picker-row">
              {accents.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={`accent-dot-btn ${accent === item.name ? 'active' : ''}`}
                  style={{ backgroundColor: item.color }}
                  onClick={() => setAccent(item.name)}
                  title={item.label}
                  aria-label={`Select ${item.label} accent`}
                >
                  {accent === item.name && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
