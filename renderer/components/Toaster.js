import { useEffect, useState } from 'react';
import { subscribe, dismiss } from '../lib/toast';

export default function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => subscribe((evt) => {
    if (evt.type === 'add') setItems(prev => [...prev, evt.toast]);
    else setItems(prev => prev.filter(t => t.id !== evt.id));
  }), []);

  return (
    <div className="toaster">
      {items.map(t => (
        <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismiss(t.id)} role="status">
          {t.kind === 'success' && <span aria-hidden>✓</span>}
          {t.kind === 'error' && <span aria-hidden>!</span>}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
