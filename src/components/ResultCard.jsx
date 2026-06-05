import { useState, useCallback } from 'react';
import styles from './ResultCard.module.css';

export default function ResultCard({ status, result, error, progress, onRetry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = result; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [result]);

  if (status === 'idle') return null;

  if (status === 'analyzing') {
    return (
      <div className={styles.progress}>
        <div className={styles.spinner} />
        <p className={styles.progressText}>{progress || '正在分析视频...'}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.error}>
        <span>{error}</span>
        {onRetry && <button className={styles.retryBtn} onClick={onRetry}>重试</button>}
      </div>
    );
  }

  if (status === 'done' && result) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.label}>▸ 反推提示词</span>
          <button className={`${styles.copyBtn} ${copied ? styles.copied : ''}`} onClick={handleCopy}>
            {copied ? '✓ 已复制' : '复制全部'}
          </button>
        </div>
        <div className={styles.content}>{result}</div>
      </div>
    );
  }

  return null;
}
