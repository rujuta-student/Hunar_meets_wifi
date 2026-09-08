import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, Wand2, Pipette, RotateCcw, Image as ImageIcon, Eye, Loader2 } from 'lucide-react';

const WORK_MAX = 900;   // working canvas cap, keeps live editing smooth
const ORIG_MAX = 4000;  // hard cap so huge photos don't blow up memory

function sampleBorderColor(imgData) {
  const { data, width, height } = imgData;
  let r = 0, g = 0, b = 0, n = 0;
  const step = Math.max(1, Math.floor(width / 100));
  for (let x = 0; x < width; x += step) {
    for (const y of [0, height - 1]) {
      const i = (y * width + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  const vstep = Math.max(1, Math.floor(height / 100));
  for (let y = 0; y < height; y += vstep) {
    for (const x of [0, width - 1]) {
      const i = (y * width + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  return n ? { r: r / n, g: g / n, b: b / n } : { r: 255, g: 255, b: 255 };
}

function removeBackground(imgData, ref, toleranceVal, featherVal) {
  const { data } = imgData;
  const tol = (toleranceVal / 100) * 260;
  const feat = Math.max(1, (featherVal / 100) * 150);
  for (let p = 0; p < data.length; p += 4) {
    const dr = data[p] - ref.r, dg = data[p + 1] - ref.g, db = data[p + 2] - ref.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    let alpha;
    if (dist <= tol) alpha = 0;
    else if (dist >= tol + feat) alpha = 255;
    else alpha = ((dist - tol) / feat) * 255;
    data[p + 3] = Math.min(data[p + 3], alpha);
  }
  return imgData;
}

function applyLighting(imgData, brightnessVal, contrastVal, exposureVal) {
  const { data } = imgData;
  const B = brightnessVal * 2.0;
  const cf = contrastVal * 2.55;
  const C = (259 * (cf + 255)) / (255 * (259 - cf));
  const E = Math.pow(2, exposureVal / 50);
  for (let p = 0; p < data.length; p += 4) {
    for (let c = 0; c < 3; c++) {
      let v = data[p + c] * E;
      v = C * (v - 128) + 128 + B;
      data[p + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  return imgData;
}

function computeAutoLevels(imgData) {
  const { data } = imgData;
  const hist = new Array(256).fill(0);
  let total = 0;
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] < 10) continue;
    const luma = Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
    hist[luma]++;
    total++;
  }
  if (!total) return { brightness: 0, contrast: 0, exposure: 0 };
  const lowCut = total * 0.01, highCut = total * 0.99;
  let cum = 0, lowVal = 0, highVal = 255;
  for (let i = 0; i < 256; i++) { cum += hist[i]; if (cum >= lowCut) { lowVal = i; break; } }
  cum = 0;
  for (let i = 255; i >= 0; i--) { cum += hist[i]; if (cum >= (total - highCut)) { highVal = i; break; } }
  if (highVal <= lowVal) return { brightness: 0, contrast: 0, exposure: 0 };
  const range = highVal - lowVal;
  const contrastVal = Math.max(-100, Math.min(100, ((255 / range) - 1) * 60));
  const midpoint = (lowVal + highVal) / 2;
  const brightnessVal = Math.max(-100, Math.min(100, (128 - midpoint) / 2));
  return { brightness: Math.round(brightnessVal), contrast: Math.round(contrastVal), exposure: 0 };
}

export default function ImageStudio() {
  const [sourceCanvas, setSourceCanvas] = useState(null);
  const [origCanvas, setOrigCanvas] = useState(null);
  const [fileName, setFileName] = useState('');
  const [hasImage, setHasImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [bgEnabled, setBgEnabled] = useState(false);
  const [tolerance, setTolerance] = useState(28);
  const [feather, setFeather] = useState(12);
  const [bgColor, setBgColor] = useState(null);
  const [pickMode, setPickMode] = useState(false);

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [exposure, setExposure] = useState(0);

  const [maxDim, setMaxDim] = useState(1200);
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(85);

  const [outStats, setOutStats] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const previewCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const debounceRef = useRef(null);

  const loadImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ow = img.naturalWidth, oh = img.naturalHeight;
      const origScale = Math.min(1, ORIG_MAX / Math.max(ow, oh));
      const fw = Math.round(ow * origScale), fh = Math.round(oh * origScale);
      const oc = document.createElement('canvas');
      oc.width = fw; oc.height = fh;
      oc.getContext('2d').drawImage(img, 0, 0, fw, fh);

      const scale = Math.min(1, WORK_MAX / Math.max(fw, fh));
      const w = Math.round(fw * scale), h = Math.round(fh * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(oc, 0, 0, w, h);

      setOrigCanvas(oc);
      setSourceCanvas(c);
      setFileName(file.name);
      setHasImage(true);
      setBgColor(null);
      setBgEnabled(false);
      setBrightness(0); setContrast(0); setExposure(0);
      setMaxDim(Math.min(1600, Math.max(fw, fh)));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  function renderPreview() {
    const canvas = previewCanvasRef.current;
    if (!canvas || !sourceCanvas) return;
    const w = sourceCanvas.width, h = sourceCanvas.height;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(sourceCanvas, 0, 0);
    if (showOriginal) return;

    let imgData = ctx.getImageData(0, 0, w, h);
    if (bgEnabled) {
      const ref = bgColor || sampleBorderColor(imgData);
      imgData = removeBackground(imgData, ref, tolerance, feather);
    }
    if (brightness !== 0 || contrast !== 0 || exposure !== 0) {
      imgData = applyLighting(imgData, brightness, contrast, exposure);
    }
    ctx.putImageData(imgData, 0, 0);
    updateStats(canvas);
  }

  function updateStats(canvas) {
    const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
    const w = Math.max(1, Math.round(canvas.width * scale));
    const h = Math.max(1, Math.round(canvas.height * scale));
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const octx = out.getContext('2d');
    if (format !== 'png') { octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, w, h); }
    octx.drawImage(canvas, 0, 0, w, h);
    const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    out.toBlob((blob) => {
      if (blob) setOutStats({ width: w, height: h, size: blob.size });
    }, mime, format === 'png' ? undefined : quality / 100);
  }

  useEffect(() => {
    if (!sourceCanvas) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(renderPreview, 25);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceCanvas, bgEnabled, tolerance, feather, bgColor, brightness, contrast, exposure, maxDim, format, quality, showOriginal]);

  function handleAutoEnhance() {
    const canvas = previewCanvasRef.current;
    if (!canvas || !sourceCanvas) return;
    const ctx = canvas.getContext('2d');
    const base = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { brightness: b, contrast: c, exposure: e } = computeAutoLevels(base);
    setBrightness(b); setContrast(c); setExposure(e);
  }

  function handleCanvasClick(e) {
    if (!pickMode || !sourceCanvas) return;
    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((e.clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((e.clientY - rect.top) * scaleY)));
    const sctx = sourceCanvas.getContext('2d');
    const px = sctx.getImageData(x, y, 1, 1).data;
    setBgColor({ r: px[0], g: px[1], b: px[2] });
    setBgEnabled(true);
    setPickMode(false);
  }

  function handleReset() {
    setBgEnabled(false); setBgColor(null);
    setTolerance(28); setFeather(12);
    setBrightness(0); setContrast(0); setExposure(0);
  }

  async function handleDownload() {
    if (!origCanvas) return;
    setDownloading(true);
    await new Promise((r) => setTimeout(r, 20));
    const w = origCanvas.width, h = origCanvas.height;
    const work = document.createElement('canvas');
    work.width = w; work.height = h;
    const wctx = work.getContext('2d');
    wctx.drawImage(origCanvas, 0, 0);
    let imgData = wctx.getImageData(0, 0, w, h);
    if (bgEnabled) {
      const ref = bgColor || sampleBorderColor(imgData);
      imgData = removeBackground(imgData, ref, tolerance, feather);
    }
    if (brightness !== 0 || contrast !== 0 || exposure !== 0) {
      imgData = applyLighting(imgData, brightness, contrast, exposure);
    }
    wctx.putImageData(imgData, 0, 0);

    const scale = Math.min(1, maxDim / Math.max(w, h));
    const ow = Math.max(1, Math.round(w * scale)), oh = Math.max(1, Math.round(h * scale));
    const out = document.createElement('canvas');
    out.width = ow; out.height = oh;
    const octx = out.getContext('2d');
    if (format !== 'png') { octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, ow, oh); }
    octx.drawImage(work, 0, 0, ow, oh);
    const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    out.toBlob((blob) => {
      setDownloading(false);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const base = (fileName.replace(/\.[^.]+$/, '') || 'image');
      a.href = url;
      a.download = `${base}-studio.${format === 'jpeg' ? 'jpg' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, mime, format === 'png' ? undefined : quality / 100);
  }

  const kb = (n) => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="studio-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

        .studio-root {
          --bg: #ECE6D8;
          --panel: #FFFFFF;
          --panel-2: #F5F0E4;
          --ink: #221F1A;
          --ink-soft: #706753;
          --line: #DBD2BC;
          --accent: #35506B;
          --accent-ink: #FFFFFF;
          --brass: #B4842A;
          --danger: #A6432F;
          font-family: 'Inter', system-ui, sans-serif;
          color: var(--ink);
          background: var(--bg);
          min-height: 100%;
          width: 100%;
          box-sizing: border-box;
          padding: 20px;
        }
        .studio-root *, .studio-root *::before, .studio-root *::after { box-sizing: border-box; }

        .studio-shell {
          max-width: 1180px;
          margin: 0 auto;
          background: var(--panel-2);
          border: 1px solid var(--line);
        }

        .studio-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 26px 18px;
          border-bottom: 1px solid var(--line);
          flex-wrap: wrap;
        }
        .studio-title {
          font-family: 'Big Shoulders Display', sans-serif;
          font-weight: 800;
          font-size: 30px;
          letter-spacing: 0.02em;
          line-height: 1;
          margin: 0;
        }
        .studio-sub {
          font-size: 13px;
          color: var(--ink-soft);
          margin-top: 4px;
        }

        .studio-body {
          display: grid;
          grid-template-columns: 300px 1fr;
        }
        @media (max-width: 820px) {
          .studio-body { grid-template-columns: 1fr; }
        }

        .rail {
          border-right: 1px solid var(--line);
          background: var(--panel-2);
        }
        @media (max-width: 820px) {
          .rail { border-right: none; border-bottom: 1px solid var(--line); order: 2; }
        }

        .rail-section {
          padding: 18px 22px;
          border-bottom: 1px solid var(--line);
        }
        .rail-section:last-child { border-bottom: none; }
        .rail-section[data-disabled="true"] { opacity: 0.45; pointer-events: none; }

        .rail-h {
          font-family: 'Big Shoulders Display', sans-serif;
          font-weight: 700;
          font-size: 17px;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          margin: 0 0 4px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .row { margin-top: 12px; }
        .row-label {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          color: var(--ink-soft);
          margin-bottom: 5px;
        }
        .row-label b { color: var(--ink); font-weight: 600; }
        .row-label span.val {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          color: var(--ink);
        }

        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 3px;
          background: var(--line);
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 15px; height: 15px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid #fff;
          box-shadow: 0 0 0 1px var(--line);
          cursor: pointer;
          margin-top: -6px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 15px; height: 15px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid #fff;
          box-shadow: 0 0 0 1px var(--line);
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-runnable-track { height: 3px; }

        .toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12.5px;
          color: var(--ink-soft);
          user-select: none;
        }
        .toggle .box {
          width: 30px; height: 17px;
          border-radius: 10px;
          background: var(--line);
          position: relative;
          transition: background 0.15s ease;
          flex-shrink: 0;
        }
        .toggle .box::after {
          content: '';
          position: absolute;
          top: 2px; left: 2px;
          width: 13px; height: 13px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.15s ease;
        }
        .toggle input { display: none; }
        .toggle input:checked + .box { background: var(--accent); }
        .toggle input:checked + .box::after { transform: translateX(13px); }

        .btn {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 13px;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: #fff;
          padding: 9px 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: opacity 0.12s ease;
        }
        .btn:hover { opacity: 0.85; }
        .btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .btn.ghost {
          background: transparent;
          color: var(--ink);
          border: 1px solid var(--line);
        }
        .btn.ghost:hover { border-color: var(--ink); opacity: 1; }
        .btn.accent { background: var(--accent); border-color: var(--accent); }
        .btn.brass { background: var(--brass); border-color: var(--brass); }
        .btn.small { padding: 6px 10px; font-size: 12px; }
        .btn.full { width: 100%; justify-content: center; }

        select {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          padding: 7px 9px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--ink);
        }

        .main {
          display: flex;
          flex-direction: column;
          min-height: 480px;
        }
        @media (max-width: 820px) { .main { order: 1; } }

        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 18px;
          border-bottom: 1px solid var(--line);
          background: var(--panel);
          flex-wrap: wrap;
        }
        .toolbar-left { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

        .canvas-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 26px;
          background:
            repeating-conic-gradient(#EFE9DB 0% 25%, #E4DDC9 0% 50%) 50% / 22px 22px;
        }
        .canvas-wrap canvas {
          max-width: 100%;
          max-height: 58vh;
          box-shadow: 0 0 0 1px rgba(34,31,26,0.18);
          background: transparent;
          cursor: default;
        }
        .canvas-wrap canvas.pick { cursor: crosshair; }

        .dropzone {
          flex: 1;
          margin: 26px;
          border: 1.5px dashed var(--line);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 40px;
          color: var(--ink-soft);
          text-align: center;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .dropzone.drag { border-color: var(--accent); background: rgba(53,80,107,0.05); }
        .dropzone h3 {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          color: var(--ink);
        }
        .dropzone p { margin: 0; font-size: 13px; max-width: 320px; }

        .readout {
          display: flex;
          gap: 8px;
          padding: 12px 18px;
          border-top: 1px solid var(--line);
          background: var(--panel);
          flex-wrap: wrap;
          align-items: center;
        }
        .chip {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          padding: 5px 9px;
          border: 1px solid var(--line);
          background: var(--panel-2);
          color: var(--ink-soft);
        }
        .chip b { color: var(--ink); font-weight: 500; }
        .readout .spacer { flex: 1; }
      `}</style>

      <div className="studio-shell">
        <div className="studio-header">
          <div>
            <p className="studio-title">AI Image Studio</p>
            <p className="studio-sub">Background removal, lighting correction, and export sizing for product photography.</p>
          </div>
          {hasImage && (
            <button className="btn ghost small" onClick={handleReset}>
              <RotateCcw size={14} /> Reset adjustments
            </button>
          )}
        </div>

        <div className="studio-body">
          <div className="rail">
            <div className="rail-section" data-disabled={!hasImage}>
              <p className="rail-h">
                Background
                <label className="toggle">
                  <input type="checkbox" checked={bgEnabled} onChange={(e) => setBgEnabled(e.target.checked)} />
                  <span className="box" />
                </label>
              </p>
              <div className="row" data-disabled={!bgEnabled}>
                <div className="row-label"><b>Tolerance</b><span className="val">{tolerance}</span></div>
                <input type="range" min="0" max="100" value={tolerance} onChange={(e) => setTolerance(+e.target.value)} disabled={!bgEnabled} />
              </div>
              <div className="row">
                <div className="row-label"><b>Edge feather</b><span className="val">{feather}</span></div>
                <input type="range" min="0" max="100" value={feather} onChange={(e) => setFeather(+e.target.value)} disabled={!bgEnabled} />
              </div>
              <div className="row" style={{ display: 'flex', gap: 8 }}>
                <button className={`btn ${pickMode ? 'accent' : 'ghost'} small`} onClick={() => setPickMode((p) => !p)}>
                  <Pipette size={13} /> {pickMode ? 'Click image…' : 'Pick color'}
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 10, lineHeight: 1.4 }}>
                Works best on a flat studio backdrop. Defaults to sampling the image edges — use the eyedropper for a precise pick.
              </p>
            </div>

            <div className="rail-section" data-disabled={!hasImage}>
              <p className="rail-h">Lighting</p>
              <div className="row">
                <div className="row-label"><b>Brightness</b><span className="val">{brightness > 0 ? `+${brightness}` : brightness}</span></div>
                <input type="range" min="-100" max="100" value={brightness} onChange={(e) => setBrightness(+e.target.value)} />
              </div>
              <div className="row">
                <div className="row-label"><b>Contrast</b><span className="val">{contrast > 0 ? `+${contrast}` : contrast}</span></div>
                <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(+e.target.value)} />
              </div>
              <div className="row">
                <div className="row-label"><b>Exposure</b><span className="val">{exposure > 0 ? `+${exposure}` : exposure}</span></div>
                <input type="range" min="-100" max="100" value={exposure} onChange={(e) => setExposure(+e.target.value)} />
              </div>
              <div className="row">
                <button className="btn brass full small" onClick={handleAutoEnhance}>
                  <Wand2 size={13} /> Auto enhance
                </button>
              </div>
            </div>

            <div className="rail-section" data-disabled={!hasImage}>
              <p className="rail-h">Export</p>
              <div className="row">
                <div className="row-label"><b>Max dimension</b><span className="val">{maxDim}px</span></div>
                <input type="range" min="200" max={origCanvas ? Math.max(origCanvas.width, origCanvas.height) : 3000} value={maxDim} onChange={(e) => setMaxDim(+e.target.value)} />
              </div>
              <div className="row" style={{ display: 'flex', gap: 8 }}>
                <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ flex: 1 }}>
                  <option value="png">PNG (supports transparency)</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              {format !== 'png' && (
                <div className="row">
                  <div className="row-label"><b>Quality</b><span className="val">{quality}</span></div>
                  <input type="range" min="30" max="100" value={quality} onChange={(e) => setQuality(+e.target.value)} />
                </div>
              )}
              {format !== 'png' && bgEnabled && (
                <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 8, lineHeight: 1.4 }}>
                  {format.toUpperCase()} doesn't support transparency — the removed background will be filled white on export.
                </p>
              )}
            </div>
          </div>

          <div className="main">
            <div className="toolbar">
              <div className="toolbar-left">
                <button className="btn ghost small" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={13} /> {hasImage ? 'Replace photo' : 'Upload photo'}
                </button>
                {hasImage && (
                  <button
                    className="btn ghost small"
                    onMouseDown={() => setShowOriginal(true)}
                    onMouseUp={() => setShowOriginal(false)}
                    onMouseLeave={() => setShowOriginal(false)}
                    onTouchStart={() => setShowOriginal(true)}
                    onTouchEnd={() => setShowOriginal(false)}
                  >
                    <Eye size={13} /> Hold to compare
                  </button>
                )}
              </div>
              <button className="btn accent" onClick={handleDownload} disabled={!hasImage || downloading}>
                {downloading ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                {downloading ? 'Preparing…' : 'Download'}
              </button>
            </div>

            {hasImage ? (
              <div className="canvas-wrap">
                <canvas ref={previewCanvasRef} className={pickMode ? 'pick' : ''} onClick={handleCanvasClick} />
              </div>
            ) : (
              <div
                className={`dropzone ${dragOver ? 'drag' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); loadImage(e.dataTransfer.files?.[0]); }}
              >
                <ImageIcon size={30} strokeWidth={1.5} />
                <h3>Drop a product photo here</h3>
                <p>Or click to browse. Works best with a single subject on a solid backdrop.</p>
              </div>
            )}

            <div className="readout">
              {outStats ? (
                <>
                  <span className="chip"><b>{outStats.width}</b> × <b>{outStats.height}</b></span>
                  <span className="chip">{format.toUpperCase()}</span>
                  <span className="chip">≈ <b>{kb(outStats.size)}</b></span>
                  {bgEnabled && <span className="chip">bg removed</span>}
                </>
              ) : (
                <span className="chip">no image loaded</span>
              )}
              <span className="spacer" />
              {hasImage && <span className="chip">{fileName}</span>}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => loadImage(e.target.files?.[0])}
      />
    </div>
  );
}
