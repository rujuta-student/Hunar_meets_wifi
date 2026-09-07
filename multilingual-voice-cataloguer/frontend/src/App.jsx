import React, { useState } from 'react';
import { Mic, UploadCloud, Sparkles, AlertCircle } from 'lucide-react';
import LanguageSelector from './components/LanguageSelector';
import AudioRecorder from './components/AudioRecorder';
import AudioUploader from './components/AudioUploader';
import SampleAudioPicker from './components/SampleAudioPicker';
import StatusTracker from './components/StatusTracker';
import CatalogView from './components/CatalogView';
import TextInputDrawer from './components/TextInputDrawer';
import { generateCatalogFromAudio, generateCatalogFromText } from './api/client';

export default function App() {
  const [language, setLanguage] = useState('gu'); // 'gu' | 'mr'
  const [inputTab, setInputTab] = useState('record'); // 'record' | 'upload'
  const [audioData, setAudioData] = useState(null); // Blob | File
  const [audioName, setAudioName] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [catalogResult, setCatalogResult] = useState(null);
  const [error, setError] = useState(null);

  const handleLanguageSelect = (langCode) => {
    setLanguage(langCode);
  };

  const handleAudioReady = (blobOrFile, name) => {
    setAudioData(blobOrFile);
    setAudioName(name);
    setError(null);
  };

  const handleSelectSample = async (sample) => {
    try {
      setLanguage(sample.lang);
      const response = await fetch(sample.audioPath);
      const blob = await response.blob();
      const file = new File([blob], `${sample.id}.mp3`, { type: 'audio/mpeg' });
      setAudioData(file);
      setAudioName(`${sample.id}.mp3`);
      setError(null);
    } catch (err) {
      console.error('Failed to load sample audio:', err);
      setError('Failed to load sample audio file.');
    }
  };

  const handleProcessAudio = async () => {
    if (!audioData) {
      setError('Please record audio or select an audio file first.');
      return;
    }

    setIsProcessing(true);
    setCurrentStep(1);
    setError(null);

    // Progressive step indicator animations
    const timerStep2 = setTimeout(() => setCurrentStep(2), 1200);
    const timerStep3 = setTimeout(() => setCurrentStep(3), 3500);
    const timerStep4 = setTimeout(() => setCurrentStep(4), 5500);

    try {
      const result = await generateCatalogFromAudio(audioData, language);
      clearTimeout(timerStep2);
      clearTimeout(timerStep3);
      clearTimeout(timerStep4);
      setCurrentStep(5); // all completed
      setCatalogResult(result);
    } catch (err) {
      clearTimeout(timerStep2);
      clearTimeout(timerStep3);
      clearTimeout(timerStep4);
      setError(err.message || 'Error occurred while generating catalog.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessText = async (text) => {
    setIsProcessing(true);
    setCurrentStep(3); // Start directly at translation
    setError(null);

    const timerStep4 = setTimeout(() => setCurrentStep(4), 1500);

    try {
      const result = await generateCatalogFromText(text, language);
      clearTimeout(timerStep4);
      setCurrentStep(5);
      setCatalogResult(result);
    } catch (err) {
      clearTimeout(timerStep4);
      setError(err.message || 'Error occurred while generating catalog from text.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setAudioData(null);
    setAudioName(null);
    setCatalogResult(null);
    setError(null);
    setCurrentStep(1);
  };

  return (
    <div className="container">

      {/* Global Error Banner */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Results View or Input Interface */}
      {catalogResult ? (
        <CatalogView data={catalogResult} onReset={handleReset} />
      ) : (
        <>
          {/* Step 1: Language Selector */}
          <LanguageSelector
            selectedLanguage={language}
            onSelectLanguage={handleLanguageSelect}
            disabled={isProcessing}
          />

          {/* Step 2: Voice Input Card */}
          <div className="card">
            <div className="section-title">
              <Mic size={18} color="var(--color-primary)" />
              <span>2. Spoken Artisan Voice Note / અવાજ નોંધ / व्हॉइस नोट / आवाज़ नोट</span>
            </div>

            {/* Input Method Switcher */}
            <div className="input-tabs">
              <button
                type="button"
                className={`input-tab-btn ${inputTab === 'record' ? 'active' : ''}`}
                onClick={() => setInputTab('record')}
                disabled={isProcessing}
              >
                <Mic size={16} />
                <span>🎙️ Tap to Speak (Browser Mic)</span>
              </button>
              <button
                type="button"
                className={`input-tab-btn ${inputTab === 'upload' ? 'active' : ''}`}
                onClick={() => setInputTab('upload')}
                disabled={isProcessing}
              >
                <UploadCloud size={16} />
                <span>📁 Upload Audio File</span>
              </button>
            </div>

            {/* Recorder or Uploader */}
            {inputTab === 'record' ? (
              <AudioRecorder onAudioReady={handleAudioReady} disabled={isProcessing} />
            ) : (
              <AudioUploader onFileReady={handleAudioReady} disabled={isProcessing} />
            )}

            {/* Quick Test Samples */}
            <SampleAudioPicker onSelectSample={handleSelectSample} disabled={isProcessing} />

            {/* Generate Catalog Action Button */}
            <button
              type="button"
              className="btn-primary"
              disabled={isProcessing || !audioData}
              onClick={handleProcessAudio}
            >
              <Sparkles size={20} />
              <span>
                {isProcessing
                  ? 'Processing AI Pipeline...'
                  : audioData
                  ? `Process Audio (${audioName || 'Recorded voice'}) ➔ Generate Textile Catalog`
                  : 'Record or Select Textile Audio to Continue'}
              </span>
            </button>
          </div>

          {/* Processing Status Tracker */}
          {isProcessing && <StatusTracker currentStep={currentStep} />}

          {/* Developer Text Input Drawer */}
          <TextInputDrawer
            language={language}
            onProcessText={handleProcessText}
            disabled={isProcessing}
          />
        </>
      )}
    </div>
  );
}
