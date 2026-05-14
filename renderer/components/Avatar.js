// Deterministic avatar with subtle color from name/id.
const PALETTES = [
  ['#0a0a0a', '#fff'], ['#1f3a8a', '#fff'], ['#0f766e', '#fff'],
  ['#7c2d12', '#fff'], ['#581c87', '#fff'], ['#831843', '#fff'],
  ['#0c4a6e', '#fff'], ['#365314', '#fff'],
];

function hash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name) {
  return (name || 'U').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
}

export default function Avatar({ name, id, size = 32, fontSize }) {
  const [bg, fg] = PALETTES[hash(id || name) % PALETTES.length];
  return (
    <div
      className="avatar"
      style={{
        width: size, height: size,
        background: bg, color: fg,
        fontSize: fontSize || Math.round(size * 0.38),
      }}
    >
      {initials(name)}
    </div>
  );
}
