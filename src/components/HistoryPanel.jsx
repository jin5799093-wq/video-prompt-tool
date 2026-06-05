import styles from './HistoryPanel.module.css';

function formatTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HistoryPanel({ items, onClose, onSelect, onDelete, onClear, activeId }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>📋 历史记录</span>
          <div>
            {items.length > 0 && (
              <button className={styles.clearBtn} onClick={onClear}>清空</button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>暂无历史记录</div>
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <div
                key={item.id}
                className={`${styles.item} ${activeId === item.id ? styles.active : ''}`}
                onClick={() => onSelect?.(item)}
              >
                {item.thumbnail ? (
                  <img className={styles.thumb} src={item.thumbnail} alt="" />
                ) : (
                  <div className={styles.thumbPlaceholder}>🎬</div>
                )}
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{item.fileName}</div>
                  <div className={styles.itemPrompt}>{item.promptPreview}</div>
                  <div className={styles.itemTime}>{formatTime(item.createdAt)}</div>
                </div>
                <button
                  className={styles.itemDelete}
                  onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
