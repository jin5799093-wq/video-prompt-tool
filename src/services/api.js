// 本地开发用空字符串（走 Vite proxy），生产用 Render 后端地址
const BASE = import.meta.env.VITE_API_BASE || '';

export async function analyzeVideoFile(file) {
  const form = new FormData();
  form.append('video', file);

  const res = await fetch(`${BASE}/api/analyze-video`, {
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
