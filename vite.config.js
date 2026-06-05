import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const API_PORT = 3001;

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

function readBodyRaw(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function splitMultipart(buffer, boundary) {
  const parts = [];
  const str = buffer.toString('binary');
  const sections = str.split(boundary);
  for (const section of sections) {
    if (!section.includes('Content-Disposition')) continue;
    const headerEnd = section.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const header = section.slice(0, headerEnd);
    const nameMatch = header.match(/name="([^"]+)"/);
    const filenameMatch = header.match(/filename="([^"]+)"/);
    const dataStart = headerEnd + 4;
    let data = section.slice(dataStart);
    if (data.endsWith('\r\n')) data = data.slice(0, -2);
    parts.push({
      name: nameMatch?.[1] || '',
      filename: filenameMatch?.[1] || null,
      data: Buffer.from(data, 'binary'),
    });
  }
  return parts;
}

function jsonReply(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function apimartPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.apimart.ai',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 180000,
    };
    const hreq = https.request(options, (hres) => {
      let raw = '';
      hres.on('data', (c) => (raw += c));
      hres.on('end', () => {
        try { resolve({ status: hres.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: hres.statusCode, data: raw }); }
      });
    });
    hreq.on('timeout', () => { hreq.destroy(); reject(new Error('APIMart 请求超时')); });
    hreq.on('error', reject);
    hreq.write(data);
    hreq.end();
  });
}

function localApiServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (req.url === '/api/admin' && req.method === 'POST') {
        const raw = await readBody(req);
        const { password } = JSON.parse(raw);
        if (password !== ADMIN_PASSWORD) {
          return jsonReply(res, 401, { success: false, error: '密码错误' });
        }
        return jsonReply(res, 200, { success: true, systemPrompt: SYSTEM_PROMPT });
      }

      // ===== 新版：直接上传视频，用 gemini-webapi =====
      if (req.url === '/api/analyze-video' && req.method === 'POST') {

        // 接收 multipart/form-data 中的视频文件
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
          return jsonReply(res, 400, { success: false, error: '需要 multipart/form-data' });
        }

        const boundary = '--' + contentType.split('boundary=')[1];
        const buffer = await readBodyRaw(req);
        const parts = splitMultipart(buffer, boundary);
        const videoPart = parts.find(p => p.filename);
        if (!videoPart) {
          return jsonReply(res, 400, { success: false, error: '未找到视频文件' });
        }

        const tmpDir = os.tmpdir();
        const tmpFile = path.join(tmpDir, `video_${Date.now()}.mp4`);
        fs.writeFileSync(tmpFile, videoPart.data);
        console.log('[api] 收到视频:', tmpFile, `(${(videoPart.data.length / 1024 / 1024).toFixed(1)} MB)`);

        // 调用 Python gemini-webapi 分析
        const pythonScript = path.join(process.cwd(), 'gemini_analyze.py');

        try {
          const result = await new Promise((resolve, reject) => {
            const proc = spawn('python', [pythonScript, tmpFile], {
              timeout: 180000,
              maxBuffer: 1024 * 1024,
            });
            let stdout = '', stderr = ''; proc.stdout.setEncoding("utf8");
            proc.stdout.on('data', d => stdout += d);
            proc.stderr.on('data', d => stderr += d);
            proc.on('close', code => {
              if (code !== 0) reject(new Error(stderr || `退出码 ${code}`));
              else resolve(stdout.trim());
            });
            proc.on('error', reject);
          });

          // 清理临时文件
          try { fs.default.unlinkSync(tmpFile); } catch {}

          return jsonReply(res, 200, { success: true, prompt: result });
        } catch (err) {
          console.error('[api] Gemini 分析失败:', err.message);
          try { fs.default.unlinkSync(tmpFile); } catch {}
          return jsonReply(res, 500, { success: false, error: err.message });
        }
      }

      if (req.url === '/api/analyze' && req.method === 'POST') {
        const raw = await readBody(req);
        const body = JSON.parse(raw);
        const { gridImage, audioBase64, audioMimeType, duration, frameCount } = body;

        if (!gridImage) {
          return jsonReply(res, 400, { success: false, error: '缺少视频帧数据' });
        }

        console.log(`[api] 收到网格图(${frameCount}帧), 视频时长 ${duration || '?'}s${audioBase64 ? ' + 音频' : ''}`);

        // 音频（如果有）
        const audioParts = audioBase64 ? [{
          type: 'input_audio',
          input_audio: { data: audioBase64, format: audioMimeType?.includes('webm') ? 'webm' : 'wav' },
        }] : [];

        const durationInfo = duration ? `原始视频时长：约 ${duration} 秒。` : '';
        const frameInfo = frameCount ? `从视频中每秒提取一帧，共 ${frameCount} 帧，合成为一张网格大图（左上角为第0秒，右下角为最后一秒，每帧标注了秒数）。` : '';

        const userContent = [
          {
            type: 'text',
            text: `${durationInfo}${frameInfo}\n请综合分析这张帧序列网格图的视觉风格、场景变化、动作趋势、光影和镜头语言，反推出一条完整的 AI 视频生成提示词。${audioBase64 ? '\n\n同时提供了视频的音频轨道，请结合音频中的对话、音效和背景音进行分析。' : ''}`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${gridImage}` },
          },
          ...audioParts,
        ];

        const payload = {
          model: 'gemini-3.1-pro-preview',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          stream: false,
          max_tokens: 4096,
        };

        console.log('[api] 调用 APIMart...');
        const result = await apimartPost('/v1/chat/completions', payload);
        console.log('[api] APIMart 状态:', result.status);

        if (result.status !== 200) {
          const errMsg =
            typeof result.data?.error === 'string' ? result.data.error
            : result.data?.error?.message || `API 错误 (${result.status})`;
          return jsonReply(res, result.status, { success: false, error: errMsg });
        }

        const prompt = result.data?.choices?.[0]?.message?.content || '';
        console.log('[api] 成功, 提示词长度:', prompt.length);
        return jsonReply(res, 200, { success: true, prompt });
      }

      jsonReply(res, 404, { success: false, error: 'Not found' });
    } catch (err) {
      console.error('[api] 错误:', err);
      jsonReply(res, 500, { success: false, error: err.message || String(err) });
    }
  });

  server.listen(API_PORT, () => {
    console.log(`[api] 本地 API 服务已启动: http://localhost:${API_PORT}`);
  });
}

export default defineConfig({
  plugins: [
    react(),
    { name: 'local-api-server', configureServer() { localApiServer(); } },
  ],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
