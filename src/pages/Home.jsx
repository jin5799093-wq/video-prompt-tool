import { useState, useCallback, useRef, useEffect } from 'react';
import VideoUploader from '../components/VideoUploader';
import ResultCard from '../components/ResultCard';
import { useAnalyze } from '../hooks/useAnalyze';
import styles from './Home.module.css';

export default function Home({ history }) {
  const [file, setFile] = useState(null);
  const { status, result, error, progress, analyzeFile, reset } = useAnalyze();
  const processingRef = useRef(false);
  const [barWidth, setBarWidth] = useState(0);

  // Animate progress bar
  useEffect(() => {
    if (status === 'analyzing') {
      setBarWidth(0);
      const t = setInterval(() => {
        setBarWidth(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 800);
      return () => clearInterval(t);
    } else if (status === 'done') {
      setBarWidth(100);
    } else {
      setBarWidth(0);
    }
  }, [status]);

  const handleFileChange = useCallback((f) => { setFile(f); reset(); }, [reset]);

  const handleAnalyze = useCallback(async () => {
    if (!file || processingRef.current) return;
    processingRef.current = true;
    try { await analyzeFile(file); }
    finally { processingRef.current = false; }
  }, [file, analyzeFile]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.badge}>AI Video Prompt Generator</span>
        <h1 className={styles.title}>必爆大量视频提示词反推</h1>
        <p className={styles.subtitle}>
          上传任意 AI 生成视频，自动反推完整提示词。支持 Kling、Runway、Pika、Sora、Luma 等主流模型。
        </p>
      </header>

      {/* Steps */}
      <div className={styles.steps}>
        {['上传视频', '智能分析', '生成提示词'].map((s, i) => (
          <div key={i} className={styles.step}>
            <span className={styles.stepNum}>{i + 1}</span>
            <span className={styles.stepLabel}>{s}</span>
            {i < 2 && <span className={styles.stepArrow}>→</span>}
          </div>
        ))}
      </div>

      {/* Upload Card */}
      <div className={styles.card}>
        <VideoUploader file={file} onFileChange={handleFileChange} />
        {file && (
          <div className={styles.actionBar}>
            <button
              className={styles.btn}
              onClick={handleAnalyze}
              disabled={status === 'analyzing'}
            >
              {status === 'analyzing' ? (
                <><span className={styles.spin} /> 深度分析中...</>
              ) : (
                <>开始反推提示词</>
              )}
            </button>
            <p className={styles.hint}>
              自动压缩至15秒 · Gemini 超细颗粒度分析 · 完全免费
            </p>
          </div>
        )}
        {/* Progress Bar */}
        {status === 'analyzing' && (
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${barWidth}%` }} />
            </div>
            <div className={styles.progressLabel}>
              <span>{progress}</span>
              <span>{Math.round(barWidth)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      <ResultCard
        status={status} result={result} error={error}
        progress={progress} onRetry={handleAnalyze}
      />

      {/* Footer */}
      <footer className={styles.footer}>
        <p>支持 Kling · Runway · Pika · Sora · Luma · 即梦 · 可灵 等主流 AI 视频模型</p>
        <p>分析结果仅供学习参考 · 请遵守各平台使用条款</p>
      </footer>
    </div>
  );
}
