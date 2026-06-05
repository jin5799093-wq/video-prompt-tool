const COMPRESS_THRESHOLD = 50 * 1024 * 1024; // 50MB
const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const MAX_DURATION = 30; // 秒
const TARGET_BITRATE = 1_000_000; // 1Mbps

export async function compressVideoIfNeeded(file) {
  if (file.size <= COMPRESS_THRESHOLD) {
    return file; // 无需压缩
  }

  return compressVideo(file);
}

function compressVideo(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      // 限制时长
      const duration = Math.min(video.duration, MAX_DURATION);

      // 计算输出分辨率
      let outW = video.videoWidth || TARGET_WIDTH;
      let outH = video.videoHeight || TARGET_HEIGHT;
      if (outW > TARGET_WIDTH || outH > TARGET_HEIGHT) {
        const ratio = Math.min(TARGET_WIDTH / outW, TARGET_HEIGHT / outH);
        outW = Math.round(outW * ratio);
        outH = Math.round(outH * ratio);
        // 确保偶数
        outW = outW - (outW % 2);
        outH = outH - (outH % 2);
      }

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(30); // 30fps
      const chunks = [];

      // 尝试用支持的编码格式
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: TARGET_BITRATE,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.webm'), {
          type: mimeType,
        });
        URL.revokeObjectURL(url);
        resolve(compressedFile);
      };

      recorder.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('视频压缩失败'));
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('视频加载失败'));
      };

      // 播放到 canvas 进行压缩
      video.currentTime = 0;
      video.ontimeupdate = () => {
        if (video.currentTime >= duration) {
          recorder.stop();
          video.pause();
          return;
        }
        ctx.drawImage(video, 0, 0, outW, outH);
      };

      recorder.start(100); // 每100ms一个chunk
      video.play().catch(() => {
        // 某些浏览器需要用户手势才能 play，回退到逐帧 seek
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      // 压缩失败，回退到原始文件
      resolve(file);
    };
  });
}
