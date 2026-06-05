# 必爆大量视频提示词反推

上传任意 AI 生成视频，自动反推完整提示词。支持 Kling / Runway / Pika / Sora / Luma 等主流模型。

## 快速开始

### 1. 安装依赖
```bash
npm install
pip install gemini-webapi
```

### 2. 配置 Gemini Cookie
打开 [gemini.google.com](https://gemini.google.com) 并登录，F12 → Application → Cookies，复制 `__Secure-1PSID` 和 `__Secure-1PSIDTS` 的值，写入项目根目录的 `.cookie` 文件（第一行 1PSID，第二行 1PSIDTS）。

### 3. 启动
```bash
npm run dev
```
打开 http://localhost:5173

## 部署

### 前端（Vercel）
```bash
npm run build
```
`dist/` 目录可直接部署到 Vercel。

### 后端
后端依赖 Python + ffmpeg + Gemini cookies，建议在本地或 VPS 运行：
```bash
python gemini_analyze.py <视频路径>
```

## 技术栈
- React 18 + Vite
- Python + gemini-webapi
- FFmpeg 视频压缩
