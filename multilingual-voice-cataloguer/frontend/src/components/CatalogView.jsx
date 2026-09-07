import React, { useState } from 'react';
import { Copy, Download, RefreshCw, Check, BookOpen, Layers, Tag, Clock, Palette, Sparkles, Coins, Hammer, Receipt } from 'lucide-react';

export default function CatalogView({ data, onReset }) {
  const [activeTab, setActiveTab] = useState('english'); // 'english' | 'hindi' | 'both'
  const [copied, setCopied] = useState(false);

  if (!data || !data.catalog) return null;

  const { transcript, input_language, input_method, translations, catalog } = data;
  const englishCatalog = catalog.english || {};
  const hindiCatalog = catalog.hindi || {};

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artisan_catalog_${input_language}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCatalogContent = (item, isHindi = false) => {
    return (
      <div className={`catalog-product-card ${isHindi ? 'indic-mr' : ''}`}>
        <h2 className="catalog-title">{item.title}</h2>
        <p className="catalog-desc">{item.description}</p>

        <div className="attributes-grid">
          <div className="attribute-item">
            <span className="attribute-label">
              <Layers size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {isHindi ? 'श्रेणी (Category)' : 'Category'}
            </span>
            <p className="attribute-value">{item.category}</p>
          </div>

          <div className="attribute-item">
            <span className="attribute-label">
              <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {isHindi ? 'वस्त्र / बुनाई शैली (Textile & Weave Type)' : 'Textile / Weave Type'}
            </span>
            <p className="attribute-value">{item.craft_type}</p>
          </div>

          <div className="attribute-item">
            <span className="attribute-label">
              <Tag size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {isHindi ? 'सामग्री (Material)' : 'Material'}
            </span>
            <p className="attribute-value">{item.material}</p>
          </div>

          <div className="attribute-item">
            <span className="attribute-label">
              <Palette size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {isHindi ? 'रंग (Color)' : 'Color'}
            </span>
            <p className="attribute-value">{item.color}</p>
          </div>

          <div className="attribute-item">
            <span className="attribute-label">
              <BookOpen size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {isHindi ? 'डिज़ाइन (Design / Motifs)' : 'Design / Motifs'}
            </span>
            <p className="attribute-value">{item.design}</p>
          </div>

          <div className="attribute-item">
            <span className="attribute-label">
              <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {isHindi ? 'निर्माण समय (Production Time)' : 'Production Time'}
            </span>
            <p className="attribute-value">{item.production_time}</p>
          </div>

          <div className="attribute-item">
            <span className="attribute-label">
              <Receipt size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {isHindi ? 'सामग्री लागत (Material Cost)' : 'Material Cost'}
            </span>
            <p className="attribute-value" style={{ color: item.material_cost && item.material_cost !== 'Not specified by artisan' && item.material_cost !== 'कारीगर द्वारा निर्दिष्ट नहीं' ? '#B84A22' : 'inherit' }}>
              {item.material_cost || (isHindi ? 'कारीगर द्वारा निर्दिष्ट नहीं' : 'Not specified by artisan')}
            </p>
          </div>

          <div className="attribute-item">
            <span className="attribute-label">
              <Hammer size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {isHindi ? 'श्रम लागत (Labor Cost)' : 'Labor Cost'}
            </span>
            <p className="attribute-value" style={{ color: item.labor_cost && item.labor_cost !== 'Not specified by artisan' && item.labor_cost !== 'कारीगर द्वारा निर्दिष्ट नहीं' ? '#B84A22' : 'inherit' }}>
              {item.labor_cost || (isHindi ? 'कारीगर द्वारा निर्दिष्ट नहीं' : 'Not specified by artisan')}
            </p>
          </div>

          <div className="attribute-item" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <span className="attribute-label" style={{ color: '#C2410C', fontWeight: 700 }}>
              <Coins size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {isHindi ? 'न्यूनतम मूल्य (Minimum Price)' : 'Minimum Price'}
            </span>
            <p className="attribute-value" style={{ color: '#C2410C', fontWeight: 700, fontSize: '15px' }}>
              {item.minimum_price || (isHindi ? 'कारीगर द्वारा निर्दिष्ट नहीं' : 'Not specified by artisan')}
            </p>
          </div>
        </div>

        {item.cultural_significance && (
          <div style={{ marginTop: '16px', background: '#FFFBF5', padding: '14px', borderRadius: '8px', border: '1px solid #F1E2CE' }}>
            <span className="attribute-label" style={{ color: 'var(--color-primary)' }}>
              🏛️ {isHindi ? 'सांस्कृतिक महत्व (Cultural Significance)' : 'Cultural Significance'}
            </span>
            <p style={{ fontSize: '14px', marginTop: '4px', color: 'var(--color-secondary)' }}>
              {item.cultural_significance}
            </p>
          </div>
        )}

        {item.keywords && item.keywords.length > 0 && (
          <div className="keywords-wrapper">
            <span className="attribute-label">
              🏷️ {isHindi ? 'खोज टैग (Keywords)' : 'Catalog Keywords'}
            </span>
            <div className="keyword-chips">
              {item.keywords.map((kw, idx) => (
                <span key={idx} className="keyword-chip">
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="section-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="var(--color-primary)" />
          <span>Generated Artisan Textile & Handloom Catalog</span>
        </div>
        <span className="brand-badge" style={{ margin: 0 }}>
          {input_language === 'gu' ? 'Gujarati (ગુજરાતી)' : input_language === 'mr' ? 'Marathi (मराठी)' : 'Hindi (हिंदी)'} Voice Input
        </span>
      </div>

      {/* Spoken Transcript & Translations */}
      <div className="transcript-box">
        <div className="transcript-header">
          <span className="attribute-label">Original Artisan Voice Note ({input_language.toUpperCase()})</span>
          <span className="transcript-tag">faster-whisper transcript</span>
        </div>
        <p className={`transcript-text ${input_language === 'gu' ? 'indic-gu' : 'indic-mr'}`}>
          "{transcript}"
        </p>

        {translations && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #E2DDD5' }}>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#888' }}>HINDI TRANSLATION: </span>
              <span className="indic-mr" style={{ fontSize: '13px', color: '#444' }}>{translations.hindi}</span>
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#888' }}>ENGLISH TRANSLATION: </span>
              <span style={{ fontSize: '13px', color: '#444' }}>{translations.english}</span>
            </div>
          </div>
        )}
      </div>

      {/* Catalog Language Tabs */}
      <div className="catalog-tabs">
        <button
          type="button"
          className={`catalog-tab ${activeTab === 'english' ? 'active' : ''}`}
          onClick={() => setActiveTab('english')}
        >
          🇬🇧 English Catalog
        </button>
        <button
          type="button"
          className={`catalog-tab ${activeTab === 'hindi' ? 'active' : ''}`}
          onClick={() => setActiveTab('hindi')}
        >
          🇮🇳 हिंदी सूची (Hindi Catalog)
        </button>
        <button
          type="button"
          className={`catalog-tab ${activeTab === 'both' ? 'active' : ''}`}
          onClick={() => setActiveTab('both')}
        >
          🌐 Side-by-Side View
        </button>
      </div>

      {/* Catalog Content */}
      {activeTab === 'english' && renderCatalogContent(englishCatalog, false)}
      {activeTab === 'hindi' && renderCatalogContent(hindiCatalog, true)}
      {activeTab === 'both' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>English Catalog</h4>
            {renderCatalogContent(englishCatalog, false)}
          </div>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>हिंदी सूची (Hindi Catalog)</h4>
            {renderCatalogContent(hindiCatalog, true)}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-bar">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-secondary" onClick={handleCopyJson}>
            {copied ? <Check size={16} color="#15803D" /> : <Copy size={16} />}
            <span>{copied ? 'Copied JSON!' : 'Copy Raw JSON'}</span>
          </button>
          <button type="button" className="btn-secondary" onClick={handleDownloadJson}>
            <Download size={16} />
            <span>Download Catalog</span>
          </button>
        </div>

        <button type="button" className="btn-secondary" onClick={onReset} style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
          <RefreshCw size={16} />
          <span>Process Another Voice Note</span>
        </button>
      </div>
    </div>
  );
}
