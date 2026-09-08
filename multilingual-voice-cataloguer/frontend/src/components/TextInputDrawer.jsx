import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Send } from 'lucide-react';

export default function TextInputDrawer({ language, onProcessText, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');

  const sampleTexts = {
    gu: 'આ એક પરંપરાગત કચ્છી બાંધણી સાડી છે, જે શુદ્ધ ગજી સિલ્કમાંથી બનાવેલી છે. તેમાં લાલ અને પીળા રંગનું બારીક કામ છે. કાચો માલ ₹1500, મજૂરી ₹1000, કિંમત ₹3500 છે.',
    mr: 'ही एक अस्सल पैठणी साडी आहे, जी येवला येथे शुद्ध रेशीम आणि सोन्याच्या जरीने हातमागावर विणलेली आहे. पदरावर मोराची नक्षी आहे. कच्चा माल ₹2500, मजुरी ₹1500, किंमत ₹6000 आहे.',
    hi: 'यह एक शुद्ध बनारसी कतान सिल्क साड़ी है, जिसे वाराणसी में हथकरघे पर सोने और चांदी की जरी से बुना गया है। पल्लू पर मोर और फूलों की बूटी है। कच्चा माल ₹3500, मजदूरी ₹2000, न्यूनतम मूल्य ₹8000 है।'
  };

  const langNames = {
    gu: 'Gujarati',
    mr: 'Marathi',
    hi: 'Hindi'
  };

  const langName = langNames[language] || 'Hindi';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onProcessText(inputText);
  };

  const handleUseSample = () => {
    setInputText(sampleTexts[language] || '');
  };

  return (
    <div style={{ marginTop: '20px', borderTop: '1px dashed #E2DDD5', paddingTop: '16px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 4px',
          color: '#777',
          fontSize: '13px',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={15} />
          <span>Developer & Evaluator Option: Test with Text Input (POST /api/catalog/generate-text)</span>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>
              Textile Description Text ({langName}):
            </label>
            <button
              type="button"
              onClick={handleUseSample}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Insert sample text
            </button>
          </div>
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={disabled}
            placeholder={`Enter artisan textile description in ${langName}...`}
            className={language === 'gu' ? 'indic-gu' : 'indic-mr'}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #D5CEBF',
              fontSize: '14px',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={disabled || !inputText.trim()}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', gap: '6px' }}
            >
              <Send size={14} />
              <span>Generate Catalog from Text</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
