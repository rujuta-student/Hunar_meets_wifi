import React from 'react';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

export default function StatusTracker({ currentStep }) {
  const steps = [
    { id: 1, label: 'Audio Reception & Validation', desc: 'Checking file format and saving secure temporary audio' },
    { id: 2, label: 'Speech-to-Text Recognition', desc: 'faster-whisper transcribing explicit Gujarati / Marathi / Hindi audio' },
    { id: 3, label: 'Bilingual Translation', desc: 'Translating transcript to Hindi and English' },
    { id: 4, label: 'AI Catalog Generation', desc: 'Structuring authentic artisan story and textile attributes' },
  ];

  return (
    <div className="status-card">
      <div className="section-title">
        <Loader2 size={18} className="spin" color="var(--color-primary)" />
        <span>Executing AI Pipeline... (કૃપા કરીને રાહ જુઓ / कृपया प्रतीक्षा करा / कृपया प्रतीक्षा करें)</span>
      </div>

      <div className="status-steps">
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          let statusClass = '';
          if (isCompleted) statusClass = 'completed';
          else if (isActive) statusClass = 'active';

          return (
            <div key={step.id} className={`status-step ${statusClass}`}>
              <div className="step-indicator">
                {isCompleted ? (
                  <CheckCircle2 size={18} color="#15803D" />
                ) : isActive ? (
                  <Loader2 size={18} className="spin" color="white" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-secondary)' }}>
                  {step.label}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
