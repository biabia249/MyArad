import { useEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };
function constrain(point: Point, size: number): Point {
  const nav = [...document.querySelectorAll('.mobile-page-nav')].find(node => node.getBoundingClientRect().height > 0);
  const bottom = nav?.getBoundingClientRect().top ?? window.innerHeight;
  return {
    x: Math.max(8, Math.min(point.x, window.innerWidth - size - 8)),
    y: Math.max(8, Math.min(point.y, bottom - size - 8)),
  };
}
export function VasileLauncher({ label, onOpen }: { label: string; onOpen: () => void }) {
  const [point, setPoint] = useState<Point | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const ignoreClick = useRef(false);
  useEffect(() => {
    const resize = () => setPoint(current => current ? constrain(current, button.current?.offsetWidth || 60) : null);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return <button ref={button} className="vasile-launcher" aria-label={label} title={label}
    style={point ? { left: point.x, top: point.y, right: 'auto', bottom: 'auto' } : undefined}
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
      ignoreClick.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const current = drag.current;
      if (!current || current.id !== event.pointerId) return;
      const dx = event.clientX - current.x, dy = event.clientY - current.y;
      if (Math.hypot(dx, dy) > 6) current.moved = true;
      if (current.moved) setPoint(constrain({ x: current.left + dx, y: current.top + dy }, event.currentTarget.offsetWidth));
    }}
    onPointerUp={event => {
      if (drag.current?.id !== event.pointerId) return;
      ignoreClick.current = drag.current.moved;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { drag.current = null; ignoreClick.current = true; }}
    onClick={event => {
      if (ignoreClick.current && event.detail !== 0) { ignoreClick.current = false; return; }
      onOpen();
    }}>
    <span className="vasile-launcher-letter" aria-hidden="true">V</span>
    <span className="vasile-launcher-name" aria-hidden="true">Vasile</span>
  </button>;
}
