import { useRef, useState, useCallback } from 'react';
import styles from './VideoUploader.module.css';

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_EXT = '.mp4,.mov,.webm';
const MAX_SIZE = 500 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export default function VideoUploader({ file, onFileChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState('');

  const validateAndSet = useCallback((f) => {
    setLocalError('');
    if (!ALLOWED_TYPES.includes(f.type)) {
      setLocalError('仅支持 MP4 / MOV / WEBM 格式');
      return;
    }
    if (f.size > MAX_SIZE) {
      setLocalError('文件大小不能超过 500MB');
      return;
    }
    onFileChange(f);
  }, [onFileChange]);

  if (file) {
    return (
      <div className={styles.preview}>
        <div className={styles.previewLeft}>
          <div className={styles.videoWrap}>
            <video src={URL.createObjectURL(file)} muted className={styles.thumb} />
            <div className={styles.playIcon}>▶</div>
          </div>
        </div>
        <div className={styles.previewRight}>
          <p className={styles.fname}>{file.name}</p>
          <p className={styles.fsize}>{formatSize(file.size)}</p>
          <button className={styles.removeBtn} onClick={() => onFileChange(null)}>
            移除视频
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) validateAndSet(f); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
      onClick={() => inputRef.current?.click()}
    >
      <div className={styles.iconWrap}>
        <span className={styles.uploadIcon}>⬆</span>
      </div>
      <p className={styles.mainText}>拖拽视频到此处 或 点击上传</p>
      <p className={styles.subText}>支持 MP4 / MOV / WEBM · 最大 500MB · 自动压缩至15秒</p>
      <input ref={inputRef} type="file" accept={ALLOWED_EXT} style={{display:'none'}}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSet(f); e.target.value=''; }} />
      {localError && <p className={styles.error}>{localError}</p>}
    </div>
  );
}
