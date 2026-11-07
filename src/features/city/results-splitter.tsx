import { useEffect, useRef } from 'react';

export function ResultsSplitter({ page }: { page: string }) {
  const handle = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; height: number } | null>(null);
  const storageKey = `myarad.results-split.${page}`;
  function apply(height: number) {
    const panel = handle.current?.parentElement;
    const controls = handle.current?.previousElementSibling as HTMLElement | null;
    if (!panel || !controls) return;
    const max = Math.max(80, panel.clientHeight - 160);
    const next = Math.round(Math.max(80, Math.min(max, height)));
    controls.style.height = `${next}px`;
    handle.current?.setAttribute('aria-valuenow', String(next));
    try { localStorage.setItem(storageKey, String(next)); } catch {}
  }
  useEffect(() => {
    const panel = handle.current?.parentElement;
    const controls = handle.current?.previousElementSibling as HTMLElement | null;
    if (!panel || !controls) return;
    const restore = () => {
      try {
        const value = Number(localStorage.getItem(storageKey));
        if (value > 0 && Number.isFinite(value)) {
          const next = Math.round(Math.max(80, Math.min(Math.max(80, panel.clientHeight - 160), value)));
          controls.style.height = `${next}px`;
        }
      } catch {}
      handle.current?.setAttribute('aria-valuenow', String(Math.round(controls.getBoundingClientRect().height)));
      handle.current?.setAttribute('aria-valuemax', String(Math.max(80, panel.clientHeight - 160)));
    };
    const observer = new ResizeObserver(restore); observer.observe(panel); restore();
    return () => observer.disconnect();
  }, [storageKey]);
  return <div ref={handle} className="results-splitter" role="separator" aria-orientation="horizontal" aria-label="Ajustează înălțimea listei de rezultate" aria-valuemin={80} tabIndex={0} title="Trage în sus pentru mai multe rezultate · Dublu clic pentru resetare"
    onPointerDown={(e) => {
      if (e.button !== 0) return;
      const controls = e.currentTarget.previousElementSibling;
      if (!controls) return;
      e.preventDefault(); drag.current = { y: e.clientY, height: controls.getBoundingClientRect().height };
      e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={(e) => { if (drag.current) apply(drag.current.height + e.clientY - drag.current.y); }}
    onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
    onKeyDown={(e) => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault(); const controls = e.currentTarget.previousElementSibling;
      apply(e.key === 'Home' ? 80 : e.key === 'End' ? 100000 : (controls?.getBoundingClientRect().height || 200) + (e.key === 'ArrowDown' ? 24 : -24));
    }}
    onDoubleClick={() => {
      const controls = handle.current?.previousElementSibling as HTMLElement | null;
      if (controls) controls.style.removeProperty('height');
      try { localStorage.removeItem(storageKey); } catch {}
    }}><span /></div>;
}
