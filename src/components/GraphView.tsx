import React, { useEffect, useRef, useState } from 'react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import { Node, Relationship } from '@neo4j-nvl/base';

interface GraphViewProps {
  nodes: Node[];
  relationships: Relationship[];
}

export function GraphView({ nodes = [], relationships = [] }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nvlRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-center when nodes change
  useEffect(() => {
    if (nvlRef.current && nodes && nodes.length > 0) {
      setTimeout(() => {
        nvlRef.current.fit();
      }, 100);
    }
  }, [nodes?.length]);

  return (
    <div ref={containerRef} className="w-full h-full bg-transparent relative overflow-hidden">
      {dimensions.width > 0 && (
        <InteractiveNvlWrapper
          ref={nvlRef}
          nodes={nodes}
          rels={relationships}
          width={dimensions.width}
          height={dimensions.height}
          nvlOptions={{
            layout: 'forceDirected',
            initialZoom: 1,
            renderLabels: true,
          }}
          mouseEventHandlers={{
            onZoom: (zoom) => console.log('Zoom:', zoom),
            onPan: (pan) => console.log('Pan:', pan),
            onNodeClick: (node) => console.log('Node clicked:', node),
            onRelationshipClick: (rel) => console.log('Rel clicked:', rel),
          }}
        />
      )}
      
      <div className="absolute top-5 left-5 bg-bg-panel/80 backdrop-blur-md px-4 py-2.5 rounded-lg border border-border-theme shadow-xl pointer-events-none">
        <div className="flex gap-4 text-[12px] font-mono text-text-secondary">
          <span><b className="text-accent-blue font-bold">NODES:</b> {nodes?.length || 0}</span>
          <span><b className="text-accent-blue font-bold">EDGES:</b> {relationships?.length || 0}</span>
          <span><b className="text-accent-blue font-bold">LATENCY:</b> 14ms</span>
        </div>
      </div>

      <div className="absolute bottom-5 right-5 flex flex-col gap-1.5">
        {[
          { label: '+', action: () => {} },
          { label: '-', action: () => {} },
          { label: '⛶', action: () => nvlRef.current?.fit() },
          { label: '◎', action: () => {} },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            className="w-8 h-8 bg-bg-panel border border-border-theme text-text-secondary flex items-center justify-center rounded text-sm font-bold hover:bg-bg-shell hover:text-text-primary transition-all shadow-lg"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
