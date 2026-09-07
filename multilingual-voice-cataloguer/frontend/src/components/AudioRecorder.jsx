import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2 } from 'lucide-react';

export default function AudioRecorder({ onAudioReady, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Select best supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onAudioReady(audioBlob, `voice_recording_${Date.now()}.webm`);
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250); // slices every 250ms
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Microphone error:', err);
      setError('Could not access microphone. Please check browser permissions or upload an audio file instead.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
    onAudioReady(null, null);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="recorder-box">
      {error && (
        <div className="error-banner" style={{ width: '100%', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {!isRecording ? (
        <button
          type="button"
          disabled={disabled}
          className="record-btn-big"
          onClick={startRecording}
          title="Tap to start recording"
        >
          <Mic size={36} />
        </button>
      ) : (
        <button
          type="button"
          className="record-btn-big recording"
          onClick={stopRecording}
          title="Tap to stop recording"
        >
          <Square size={32} />
        </button>
      )}

      {isRecording && (
        <div className="record-timer">
          ● Recording: {formatTimer(duration)}
        </div>
      )}

      <div className="record-instruction">
        {isRecording
          ? 'Listening to artisan textile description... Tap square button when finished speaking.'
          : audioUrl
          ? 'Voice note recorded! You can listen below or re-record.'
          : '🎙️ Tap to Speak (બોલવા માટે ટેપ કરો / बोलण्यासाठी टॅप करा / बोलने के लिए टैप करें)'}
      </div>

      {audioUrl && !isRecording && (
        <div className="audio-preview">
          <audio controls src={audioUrl} />
          <button
            type="button"
            className="btn-secondary"
            onClick={clearAudio}
            title="Delete and re-record"
            style={{ padding: '8px 12px' }}
          >
            <Trash2 size={16} color="#DC2626" />
          </button>
        </div>
      )}
    </div>
  );
}
