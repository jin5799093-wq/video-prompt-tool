const BASE = '/api';

export async function analyzeVideo(gridImage, audio, duration, frameCount) {
  const body = { gridImage, duration, frameCount };
  if (audio) {
    body.audioBase64 = audio.base64;
    body.audioMimeType = audio.mimeType;
  }

  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const msg = typeof json.error === 'string' ? json.error : JSON.stringify(json.error || json);
    throw new Error(msg || '分析失败');
  }
  return json.prompt;
}

/** 新版：直接上传视频文件，用 gemini-webapi 分析 */
export async function analyzeVideoFile(file) {
  const form = new FormData();
  form.append('video', file);

  const res = await fetch(`${BASE}/analyze-video`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const msg = typeof json.error === 'string' ? json.error : JSON.stringify(json.error || json);
    throw new Error(msg || '分析失败');
  }
  return json.prompt;
}

export async function verifyAdmin(password) {
  const res = await fetch(`${BASE}/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const msg = typeof json.error === 'string' ? json.error : JSON.stringify(json.error || json);
    throw new Error(msg || '验证失败');
  }
  return json.systemPrompt;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
