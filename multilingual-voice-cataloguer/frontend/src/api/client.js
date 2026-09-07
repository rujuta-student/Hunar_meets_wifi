const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Sends recorded or uploaded audio to the FastAPI backend.
 * Uses multipart/form-data:
 *   - audio: Blob / File
 *   - language: 'gu' | 'mr'
 */
export async function generateCatalogFromAudio(audioBlobOrFile, language) {
  const formData = new FormData();
  
  // Ensure filename with valid audio extension
  const filename = audioBlobOrFile.name || `recording_${Date.now()}.webm`;
  formData.append('audio', audioBlobOrFile, filename);
  formData.append('language', language);

  const response = await fetch(`${BASE_URL}/api/catalog/generate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.detail) {
        errMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errMsg);
  }

  return await response.json();
}

/**
 * Direct text generation endpoint (useful for tests or direct input)
 */
export async function generateCatalogFromText(text, language) {
  const response = await fetch(`${BASE_URL}/api/catalog/generate-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.detail) {
        errMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return await response.json();
}

/**
 * Checks backend health status
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) return { status: 'offline' };
    return await response.json();
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}
