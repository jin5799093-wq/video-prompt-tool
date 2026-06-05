import { useState, useCallback, useRef } from 'react';
import { analyzeVideoFile } from '../services/api';

export function useAnalyze() {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const resultRef = useRef('');

  /** 帧网格模式 (旧版 APIMart) */
  const analyze = useCallback(async (gridImage, audio, duration, frameCount) => {
    setStatus('analyzing');
    setError('');
    setResult('');
    setProgress('正在分析视频...');

    try {
      const prompt = await analyzeVideo(gridImage, audio, duration, frameCount);
      setResult(prompt);
      resultRef.current = prompt;
      setStatus('done');
      setProgress('');
      return prompt;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      setProgress('');
      throw err;
    }
  }, []);

  /** 视频直传模式 (新版 Gemini) */
  const analyzeFile = useCallback(async (file) => {
    setStatus('analyzing');
    setError('');
    setResult('');
    setProgress('正在上传视频到 Gemini 分析...');

    try {
      const prompt = await analyzeVideoFile(file);
      setResult(prompt);
      resultRef.current = prompt;
      setStatus('done');
      setProgress('');
      return prompt;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      setProgress('');
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult('');
    resultRef.current = '';
    setError('');
    setProgress('');
  }, []);

  return { status, result, resultRef, error, progress, analyze, analyzeFile, reset };
}
