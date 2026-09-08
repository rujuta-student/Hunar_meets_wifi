import React from 'react';
import { Sparkles, Volume2 } from 'lucide-react';

export default function SampleAudioPicker({ onSelectSample, disabled }) {
  const samples = [
    {
      id: 'gu_bandhani',
      title: 'Gujarati: Kutchi Bandhani Saree (Tie-Dye Silk)',
      lang: 'gu',
      text: 'આ એક પરંપરાગત કચ્છી બાંધણી સાડી છે, જે શુદ્ધ ગજી સિલ્કમાંથી બનાવેલી છે...',
      audioPath: '/sample_audio/gujarati_bandhani_sample.mp3',
    },
    {
      id: 'mr_paithani',
      title: 'Marathi: Yeola Paithani Saree (Handloom Silk)',
      lang: 'mr',
      text: 'ही एक अस्सल पैठणी साडी आहे, जी येवला येथे शुद्ध रेशीम आणि सोन्याच्या जरीने...',
      audioPath: '/sample_audio/marathi_paithani_sample.mp3',
    },
    {
      id: 'hi_banarasi',
      title: 'Hindi: Banarasi Katan Silk Saree (Zari Brocade)',
      lang: 'hi',
      text: 'यह एक शुद्ध बनारसी कतान सिल्क साड़ी है, जिसे वाराणसी में हथकरघे पर सोने और चांदी की जरी से बुना गया है...',
      audioPath: '/sample_audio/hindi_banarasi_sample.mp3',
    }
  ];

  return (
    <div className="samples-container">
      <div className="samples-label">
        <Sparkles size={12} style={{ display: 'inline', marginRight: '4px', color: 'var(--color-accent)' }} />
        Quick Test Textile Voice Samples (ઝડપી નમૂનાઓ / जलद नमुना ऑडिओ / त्वरित वॉइस सैंपल):
      </div>
      <div className="sample-pills">
        {samples.map((sample) => (
          <button
            key={sample.id}
            type="button"
            disabled={disabled}
            className="sample-pill"
            onClick={() => onSelectSample(sample)}
          >
            <Volume2 size={14} color="var(--color-primary)" />
            <span>{sample.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
