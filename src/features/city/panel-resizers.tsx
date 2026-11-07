import { useEffect, useRef } from 'react';

export function PanelResizers({ onResize, onExploreExpand }: { onResize: () => void; onExploreExpand?: () => void }) {
  const layer = useRef<HTMLDivElement>(null);
  const notify = useRef(onResize);
  const expand = useRef(onExploreExpand);
  useEffect(() => { expand.current = onExploreExpand; }, [onExploreExpand]);
  useEffect(() => { notify.current = onResize; }, [onResize]);
  useEffect(() => {
    const host = layer.current, workspace = host?.parentElement;
    if (!host || !workspace) return;
    let saved: Record<string, number> = {};
    try {
      const stored = JSON.parse(localStorage.getItem('myarad.panel-sizes.v1') || '{}');
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) saved = stored;
    } catch {}
    const controls = new Map<HTMLElement, { handle: HTMLDivElement; heightHandle: HTMLDivElement; originalWidth: string }>();
    let frame = 0;
    const persist = () => { try { localStorage.setItem('myarad.panel-sizes.v1', JSON.stringify(saved)); } catch {} };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    function measure() {
      if (!workspace || !host) return;
      const bounds = workspace.getBoundingClientRect(), mobile = window.innerWidth <= 700;
      for (const [panel, control] of controls) if (!panel.isConnected) { control.handle.remove(); control.heightHandle.remove(); controls.delete(panel); observer.unobserve(panel); }
      for (const panel of workspace.querySelectorAll<HTMLElement>(':scope > aside')) {
        const id = panel.classList.contains('detail-panel') ? 'details' : panel.classList.contains('event-news') ? 'news' : panel.classList.contains('transport-sidebar') ? 'transport' : 'explore';
        let control = controls.get(panel);
        if (!control) {
          const handle = document.createElement('div');
          handle.className = 'panel-resize-handle'; handle.tabIndex = 0; handle.setAttribute('role', 'separator');
          handle.setAttribute('aria-label', id === 'details' ? 'Redimensionează rezultatele și detaliile' : 'Redimensionează panoul principal');
          handle.title = 'Trage pentru redimensionare · Săgeți pentru ajustare · Dublu clic pentru resetare';
          handle.appendChild(document.createElement('span')); host.appendChild(handle);
          const heightHandle = document.createElement('div');
          heightHandle.className = 'panel-resize-handle horizontal'; heightHandle.tabIndex = 0;
          heightHandle.setAttribute('role', 'separator'); heightHandle.setAttribute('aria-orientation', 'horizontal');
          heightHandle.setAttribute('aria-label', id === 'details' ? 'Ajustează înălțimea rezultatelor și detaliilor' : 'Ajustează înălțimea panoului principal');
          heightHandle.title = 'Trage în sus sau în jos pentru înălțime · Dublu clic pentru înălțimea completă';
          heightHandle.appendChild(document.createElement('span')); host.appendChild(heightHandle);
          control = { handle, heightHandle, originalWidth: panel.style.width }; controls.set(panel, control); observer.observe(panel);
        }
        const { handle, heightHandle, originalWidth } = control;
        const desktopHeightKey = `${id}.desktop-height`;
        if (!mobile && Number.isFinite(saved[desktopHeightKey])) panel.style.setProperty('--user-desktop-panel-height', `${Math.max(Math.min(180, bounds.height), Math.min(bounds.height, saved[desktopHeightKey]))}px`);
        else panel.style.removeProperty('--user-desktop-panel-height');
        const key = `${id}.${mobile ? 'height' : 'width'}`;
        const otherWidth = [...workspace.querySelectorAll<HTMLElement>(':scope > aside')].filter((other) => other !== panel && getComputedStyle(other).display !== 'none' && getComputedStyle(other).position !== 'absolute').reduce((sum, other) => sum + other.getBoundingClientRect().width, 0);
        const max = mobile ? bounds.height * .92 : Math.max(180, Math.min(800, bounds.width * .65, bounds.width - otherWidth - 180));
        const min = Math.min(mobile ? 200 : 260, max);
        const apply = (value: number) => {
          const size = Math.round(Math.max(min, Math.min(max, value)));
          if (mobile) panel.style.setProperty('--user-panel-height', `${size}px`);
          else { panel.style.width = `${size}px`; panel.style.maxWidth = 'none'; }
          saved[key] = size; schedule();
          if (mobile && id === 'explore') expand.current?.();
        };
        if (mobile) panel.style.width = originalWidth;
        if (Number.isFinite(saved[key])) {
          const size = Math.round(Math.max(min, Math.min(max, saved[key])));
          if (mobile) panel.style.setProperty('--user-panel-height', `${size}px`);
          else { panel.style.width = `${size}px`; panel.style.maxWidth = 'none'; }
        }
        else if (!mobile) panel.style.width = originalWidth;
        handle.hidden = !panel.getClientRects().length || getComputedStyle(panel).display === 'none';
        const rect = panel.getBoundingClientRect(), right = id === 'details';
        Object.assign(handle.style, mobile ? { left: `${rect.left - bounds.left}px`, top: `${Math.max(0, rect.top - bounds.top)}px`, width: `${rect.width}px`, height: '30px' } : { left: `${(right ? rect.left : rect.right) - bounds.left - 6}px`, top: `${rect.top - bounds.top}px`, width: '12px', height: `${rect.height}px` });
        heightHandle.hidden = mobile || handle.hidden || id === 'explore';
        Object.assign(heightHandle.style, { left: `${rect.left - bounds.left}px`, top: `${Math.min(bounds.height - 16, rect.bottom - bounds.top - 8)}px`, width: `${rect.width}px`, height: '16px' });
        heightHandle.setAttribute('aria-valuemin', String(Math.min(180, Math.round(bounds.height))));
        heightHandle.setAttribute('aria-valuemax', String(Math.round(bounds.height)));
        heightHandle.setAttribute('aria-valuenow', String(Math.round(rect.height)));
        const applyHeight = (value: number) => {
          const size = Math.round(Math.max(Math.min(180, bounds.height), Math.min(bounds.height, value)));
          saved[desktopHeightKey] = size;
          panel.style.setProperty('--user-desktop-panel-height', `${size}px`); schedule();
        };
        heightHandle.onpointerdown = (e) => {
          if (e.button !== 0) return;
          e.preventDefault(); heightHandle.setPointerCapture(e.pointerId);
          const start = e.clientY, initial = rect.height;
          heightHandle.onpointermove = (move) => applyHeight(initial + move.clientY - start);
          const end = () => { heightHandle.onpointermove = null; persist(); };
          heightHandle.onpointerup = end; heightHandle.onpointercancel = end; heightHandle.onlostpointercapture = end;
        };
        heightHandle.onkeydown = (e) => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Home' && e.key !== 'End') return;
          e.preventDefault(); applyHeight(e.key === 'Home' ? 180 : e.key === 'End' ? bounds.height : rect.height + (e.key === 'ArrowDown' ? 24 : -24)); persist();
        };
        heightHandle.ondblclick = () => { delete saved[desktopHeightKey]; panel.style.removeProperty('--user-desktop-panel-height'); persist(); schedule(); };
        if (handle.classList.contains('horizontal') !== mobile) handle.classList.toggle('horizontal', mobile);
        handle.setAttribute('aria-orientation', mobile ? 'horizontal' : 'vertical');
        handle.setAttribute('aria-valuemin', String(Math.round(min))); handle.setAttribute('aria-valuemax', String(Math.round(max)));
        handle.setAttribute('aria-valuenow', String(Math.round(mobile ? rect.height : rect.width)));
        handle.onpointerdown = (e) => {
          if (e.button !== 0) return;
          e.preventDefault(); handle.setPointerCapture(e.pointerId);
          const start = mobile ? e.clientY : e.clientX, initial = mobile ? Math.min(rect.height, bounds.bottom - rect.top) : rect.width;
          handle.onpointermove = (move) => apply(initial + ((mobile ? move.clientY : move.clientX) - start) * (mobile || right ? -1 : 1));
          const end = () => { handle.onpointermove = null; persist(); };
          handle.onpointerup = end; handle.onpointercancel = end; handle.onlostpointercapture = end;
        };
        handle.onkeydown = (e) => {
          const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 24 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -24 : 0;
          if (!delta) return; e.preventDefault(); apply((mobile ? Math.min(rect.height, bounds.bottom - rect.top) : rect.width) + delta * (mobile || right ? -1 : 1)); persist();
        };
        handle.ondblclick = () => { apply(mobile ? bounds.height * .65 : id === 'news' ? 440 : 360); persist(); };
      }
      notify.current();
    }
    observer.observe(workspace);
    const mutations = new MutationObserver(schedule);
    mutations.observe(workspace, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', schedule); schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); mutations.disconnect(); window.removeEventListener('resize', schedule); for (const { handle, heightHandle } of controls.values()) { handle.remove(); heightHandle.remove(); } };
  }, []);
  return <div ref={layer} className="panel-resize-layer" />;
}
