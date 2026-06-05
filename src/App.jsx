import { useState, useCallback } from 'react';
import { useTheme } from './hooks/useTheme';
import { useHistory } from './hooks/useHistory';
import Header from './components/Header';
import HistoryPanel from './components/HistoryPanel';
import Home from './pages/Home';
import styles from './App.module.css';

function getPath() {
  return window.location.pathname;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const history = useHistory();
  const [showHistory, setShowHistory] = useState(false);
  const [path, setPath] = useState(getPath);

  window.addEventListener('popstate', () => setPath(getPath()));

  const navigate = useCallback((p) => {
    window.history.pushState({}, '', p);
    setPath(p);
  }, []);

  const handleHistorySelect = useCallback((item) => {
    setShowHistory(false);
  }, []);

  return (
    <div className={styles.app} data-theme={theme}>
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenHistory={() => setShowHistory(true)}
      />
      <Home history={history} />
      {showHistory && (
        <HistoryPanel
          items={history.items}
          onClose={() => setShowHistory(false)}
          onSelect={handleHistorySelect}
          onDelete={history.removeItem}
          onClear={history.clearHistory}
        />
      )}
    </div>
  );
}
