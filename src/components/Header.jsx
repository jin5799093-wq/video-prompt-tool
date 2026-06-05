import styles from './Header.module.css';

export default function Header({ theme, onToggleTheme, onOpenHistory }) {
  return (
    <header className={styles.header}>
      <a href="/" className={styles.title}>🎬 视频反推提示词</a>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={onOpenHistory}>
          📋 历史
        </button>
        <a href="/admin" className={styles.btn}>
          ⚙
        </a>
        <button className={styles.themeBtn} onClick={onToggleTheme} title="切换主题">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
}
