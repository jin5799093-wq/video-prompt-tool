import { useState, useCallback } from 'react';
import { verifyAdmin } from '../services/api';
import styles from './Admin.module.css';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [error, setError] = useState('');

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    try {
      const prompt = await verifyAdmin(password);
      setSystemPrompt(prompt);
      setAuthenticated(true);
    } catch (err) {
      setError(err.message);
    }
  }, [password]);

  if (!authenticated) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>⚙ 后台管理</h1>
        <form className={styles.form} onSubmit={handleLogin}>
          <input
            className={styles.input}
            type="password"
            placeholder="请输入管理密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button className={styles.submitBtn} type="submit">验证</button>
        </form>
        {error && <div className={styles.error}>{error}</div>}
        <a href="/" className={styles.backLink}>← 返回首页</a>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>⚙ 后台管理</h1>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>当前系统指令</div>
        <textarea
          className={styles.textarea}
          value={systemPrompt}
          readOnly
        />
      </div>

      <div className={styles.hint}>
        💡 如需修改系统指令，请前往{' '}
        <a href="https://vercel.com/dashboard" target="_blank" rel="noopener">
          Vercel 控制台
        </a>{' '}
        → 选择本项目 → Settings → Environment Variables → 修改 <code>SYSTEM_PROMPT</code>{' '}
        → 重新部署生效。
      </div>

      <a href="/" className={styles.backLink}>← 返回首页</a>
    </div>
  );
}
