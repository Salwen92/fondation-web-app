'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#9333ea',
    primaryTextColor: '#fff',
    primaryBorderColor: '#7c3aed',
    lineColor: '#6b7280',
    secondaryColor: '#1e293b',
    tertiaryColor: '#334155',
    background: '#0f172a',
    mainBkg: '#1e293b',
    secondBkg: '#334155',
    tertiaryBkg: '#475569',
    textColor: '#f3f4f6',
    labelColor: '#fff',
    errorBkgColor: '#991b1b',
    errorTextColor: '#fca5a5',
  },
});

export function MermaidRenderer({ chart }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.contentLoaded();
    }
  }, []);

  return (
    <div className="my-6 flex justify-center">
      <div 
        ref={ref}
        className="mermaid bg-slate-900/50 p-4 rounded-lg border border-border/20"
      >
        {chart}
      </div>
    </div>
  );
}