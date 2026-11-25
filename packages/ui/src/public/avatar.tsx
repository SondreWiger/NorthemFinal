import { initials } from '@northem/core/format';
import { rng } from '../micro';

/** Photo, or a generated portrait tile with initials. */
export function Avatar({ name, src, size = 56, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className={`nm-avatar ${className ?? ''}`} loading="lazy" />;
  }
  const r = rng(name);
  const hue = Math.floor(r() * 360);
  return (
    <span className={`nm-avatar nm-avatar-gen ${className ?? ''}`} style={{ width: size, height: size, fontSize: size * 0.36,
      background: `linear-gradient(${Math.floor(r() * 360)}deg, hsl(${hue} 35% 30%), hsl(${(hue + 40) % 360} 45% 18%))` }} aria-label={name} role="img">
      {initials(name)}
    </span>
  );
}
