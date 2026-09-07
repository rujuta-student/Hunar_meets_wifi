import React from 'react';
import { Globe } from 'lucide-react';

export default function LanguageSelector({ selectedLanguage, onSelectLanguage, disabled }) {
  const languages = [
    {
      code: 'gu',
      name: 'Gujarati',
      native: 'ગુજરાતી',
      scriptClass: 'indic-gu',
      region: 'Kutch / Gujarat Handlooms & Textiles'
    },
    {
      code: 'mr',
      name: 'Marathi',
      native: 'मराठी',
      scriptClass: 'indic-mr',
      region: 'Paithan / Yeola Silk Textiles'
    },
    {
      code: 'hi',
      name: 'Hindi',
      native: 'हिंदी',
      scriptClass: 'indic-mr',
      region: 'Varanasi / Banarasi / Indian Textiles'
    }
  ];

  return (
    <div className="card">
      <div className="section-title">
        <Globe size={18} color="#B84A22" />
        <span>1. Select Artisan Spoken Language / ભાષા પસંદ કરો / भाषा निवडा / भाषा चुनें</span>
      </div>

      <div className="lang-selector-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {languages.map((lang) => {
          const isActive = selectedLanguage === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              disabled={disabled}
              className={`lang-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectLanguage(lang.code)}
            >
              {isActive && <span className="lang-badge">Selected</span>}
              <span className={`lang-native ${lang.scriptClass}`}>{lang.native}</span>
              <span className="lang-english">{lang.name}</span>
              <span style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{lang.region}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
