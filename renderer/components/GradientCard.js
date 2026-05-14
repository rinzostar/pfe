// Reusable gradient card component with icon, title, subtitle, and action
export default function GradientCard({ icon, title, subtitle, gradient = 'var(--bg-gradient)', onClick, active, delay = 0 }) {
  return (
    <div 
      onClick={onClick}
      className={`hierarchy-card ${active ? 'active' : ''}`}
      style={{ 
        animationDelay: `${delay}ms`,
        border: active ? '2px solid var(--accent)' : undefined
      }}
    >
      <div className="hierarchy-icon-wrap" style={{ background: gradient }}>
        <span className="hierarchy-icon">{icon}</span>
      </div>
      <div className="title">{title}</div>
      <div className="desc">{subtitle}</div>
      {active && <div className="active-indicator">✓</div>}
    </div>
  );
}
