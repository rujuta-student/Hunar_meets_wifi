import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, Trash2 } from 'lucide-react';

export default function AudioUploader({ onFileReady, disabled }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    if (!file) return;

    // Validate type
    const validExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg', '.flac', '.aac'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt && !file.type.startsWith('audio/')) {
      alert(`Please select an audio file (${validExtensions.join(', ')})`);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onFileReady(file, file.name);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileReady(null, null);
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
        disabled={disabled}
      />

      {!selectedFile ? (
        <div
          className={`upload-dropzone ${isDragOver ? 'dragover' : ''}`}
          onClick={() => !disabled && fileInputRef.current && fileInputRef.current.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <UploadCloud className="upload-icon" />
          <p style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>
            Choose an audio file or drag & drop here
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Supports MP3, WAV, M4A, WebM, OGG (Max 25MB)
          </p>
        </div>
      ) : (
        <div className="audio-preview">
          <FileAudio size={24} color="var(--color-primary)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedFile.name}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          {previewUrl && <audio controls src={previewUrl} style={{ height: '36px' }} />}
          <button
            type="button"
            className="btn-secondary"
            onClick={clearFile}
            title="Remove file"
            style={{ padding: '8px 10px' }}
          >
            <Trash2 size={16} color="#DC2626" />
          </button>
        </div>
      )}
    </div>
  );
}
