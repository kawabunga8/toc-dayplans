'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';

const EXIT_DURATION_MS = 180;

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const childrenRef = useRef(children);
  const [outgoing, setOutgoing] = useState<{ key: string; node: ReactNode } | null>(null);

  // Capture the previous page's content during render (before this render commits)
  // so it can keep fading out while the new page fades/zooms in underneath.
  // See: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (prevPathnameRef.current !== pathname) {
    setOutgoing({ key: prevPathnameRef.current, node: childrenRef.current });
    prevPathnameRef.current = pathname;
  }
  childrenRef.current = children;

  useEffect(() => {
    if (!outgoing) return;
    const timer = setTimeout(() => setOutgoing(null), EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [outgoing]);

  return (
    <div style={{ position: 'relative' }}>
      {outgoing && (
        <div
          key={outgoing.key}
          className="page-zoom-out"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          {outgoing.node}
        </div>
      )}
      <div key={pathname} className="page-zoom-in">
        {children}
      </div>
    </div>
  );
}
