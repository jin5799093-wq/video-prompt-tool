// 浏览器端从视频中提取关键帧 + 合成一张大图 + 提取音频
const MAX_FRAMES = 36; // 最多36帧（6×6）
const FRAME_INTERVAL = 1; // 秒

// 获取视频时长（秒）
export function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    setTimeout(() => { URL.revokeObjectURL(url); resolve(0); }, 5000);
  });
}

// 将多张帧合成为一张网格大图
function makeGrid(frames) {
  return new Promise((resolve) => {
    const n = frames.length;
    // 计算网格布局
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);

    const cellW = 320;
    const cellH = 180;

    const canvas = document.createElement('canvas');
    canvas.width = cols * cellW;
    canvas.height = rows * cellH;
    const ctx = canvas.getContext('2d');

    let loaded = 0;
    const imgs = [];

    frames.forEach((base64, i) => {
      const img = new Image();
      img.onload = () => {
        imgs[i] = img;
        loaded++;
        if (loaded === n) {
          // 全部加载完毕，绘制网格
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          imgs.forEach((img, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = col * cellW;
            const y = row * cellH;

            // 等比缩放填充单元格
            const scale = Math.min(cellW / img.width, cellH / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const cx = x + (cellW - w) / 2;
            const cy = y + (cellH - h) / 2;

            ctx.fillStyle = '#000';
            ctx.fillRect(x, y, cellW, cellH);
            ctx.drawImage(img, cx, cy, w, h);

            // 帧序号
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.font = '11px monospace';
            ctx.fillText(`${idx + 1}`, x + 4, y + 14);

            // 时间标注
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '10px monospace';
            ctx.fillText(`${idx}s`, x + 4, y + cellH - 6);
          });

          resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === n && imgs.some(Boolean)) {
          // 至少有一张加载成功
          resolve(null);
        }
      };
      img.src = base64;
    });

    setTimeout(() => resolve(null), 10000);
  });
}

// 提取关键帧并合成一张大图
export function extractFramesGrid(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const frames = [];

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const totalFrames = Math.min(MAX_FRAMES, Math.max(1, Math.floor(duration / FRAME_INTERVAL)));

      const extractNext = () => {
        if (frames.length >= totalFrames) {
          finish();
          return;
        }

        const seekTime = frames.length * FRAME_INTERVAL;
        video.currentTime = Math.min(seekTime, duration - 0.1);
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const maxW = 640;
        const ratio = maxW / Math.max(video.videoWidth, 1);
        canvas.width = maxW;
        canvas.height = Math.round(Math.max(video.videoHeight, 1) * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.7));

        if (frames.length < totalFrames) {
          extractNext();
        } else {
          finish();
        }
      };

      const finish = async () => {
        URL.revokeObjectURL(url);
        if (frames.length === 0) {
          resolve({ grid: null, frames: [] });
          return;
        }
        const grid = await makeGrid(frames);
        resolve({ grid, frames, count: frames.length });
      };

      extractNext();
    };

    video.onerror = () => { URL.revokeObjectURL(url); resolve({ grid: null, frames: [], count: 0 }); };
    setTimeout(() => { if (frames.length === 0) { URL.revokeObjectURL(url); resolve({ grid: null, frames: [], count: 0 }); } }, 60000);
  });
}

// 提取音频（base64 webm）
export function extractAudio(file) {
  return new Promise((resolve) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadedmetadata = () => {
        const duration = Math.min(video.duration, 60);
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);

        const chunks = [];
        const recorder = new MediaRecorder(dest.stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus' : 'audio/webm',
        });

        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          const reader = new FileReader();
          reader.onload = () => {
            URL.revokeObjectURL(url);
            audioCtx.close();
            resolve({ base64: reader.result.split(',')[1], mimeType: blob.type });
          };
          reader.onerror = () => { URL.revokeObjectURL(url); audioCtx.close(); resolve(null); };
          reader.readAsDataURL(blob);
        };

        recorder.start();
        video.currentTime = 0;

        video.ontimeupdate = () => {
          if (video.currentTime >= duration) { recorder.stop(); video.pause(); }
        };
        video.play().catch(() => { recorder.stop(); URL.revokeObjectURL(url); audioCtx.close(); resolve(null); });
      };

      video.onerror = () => { URL.revokeObjectURL(url); audioCtx.close(); resolve(null); };
      setTimeout(() => resolve(null), 65000);
    } catch { resolve(null); }
  });
}
