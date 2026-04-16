/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebShell } from './components/WebShell';
import { GraphView } from './components/GraphView';
import { Node, Relationship } from '@neo4j-nvl/base';
import { cn } from './lib/utils';

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isPresenter, setIsPresenter] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsPresenter(params.get('presenter') === 'true');
  }, []);

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/graph');
      const data = await res.json();
      setNodes(data.nodes);
      setRelationships(data.relationships);
    } catch (error) {
      console.error('Failed to fetch graph:', error);
    }
  }, []);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      fetchGraph();
    });

    newSocket.on('REFRESH_GRAPH', () => {
      console.log('Server requested graph refresh');
      fetchGraph();
    });

    return () => {
      newSocket.close();
    };
  }, [fetchGraph]);

  const handleExecute = async (query: string) => {
    const res = await fetch('/api/cypher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Execution failed');
    }
  };

  const handleClear = async () => {
    const res = await fetch('/api/clear', { method: 'POST' });
    if (!res.ok) throw new Error('Clear failed');
  };

  const handleRestore = async (query?: string) => {
    const res = await fetch('/api/restore', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('Restore failed');
  };

  return (
    <div className="flex flex-col h-screen bg-bg-darker text-text-primary overflow-hidden font-sans">
      {/* Header */}
      <header className="h-12 px-5 bg-bg-panel border-b border-border-theme flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-accent-blue rounded-full shadow-[0_0_10px_rgba(0,140,193,0.3)]" />
          <span className="font-bold text-sm tracking-widest text-text-primary">NEO_DASH v2.0</span>
        </div>
        <div className="flex items-center gap-4">
          {isPresenter && (
            <div className="px-2 py-0.5 rounded border border-accent-blue bg-accent-blue/10 text-accent-blue text-[10px] font-bold tracking-widest uppercase animate-pulse">
              Presenter
            </div>
          )}
          <div className="flex items-center gap-2 text-xs font-mono text-accent-green">
            <div className={cn("w-2 h-2 rounded-full", socket?.connected ? "bg-accent-green shadow-[0_0_8px_rgba(74,222,128,0.5)]" : "bg-accent-red")} />
            <span>WS: {socket?.connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>
        </div>
      </header>

      {/* Top 40% - Web Shell */}
      <div className="h-[40%] flex flex-col bg-bg-panel border-b border-border-theme overflow-hidden">
        <WebShell 
          onExecute={handleExecute} 
          onClear={handleClear} 
          onRestore={handleRestore} 
          isPresenter={isPresenter}
        />
        <div className="flex-1 bg-bg-shell p-4 font-mono text-xs text-text-secondary overflow-auto">
          <div className="text-text-code mb-2">// System ready. Waiting for Cypher input...</div>
          <p className="opacity-70">Ready for Cypher commands. Use Ctrl+Enter to execute.</p>
        </div>
      </div>

      {/* Bottom 60% - Graph View */}
      <div className="h-[60%] relative bg-[radial-gradient(circle_at_50%_50%,#1a1f26_0%,#05070a_100%)]">
        <GraphView nodes={nodes} relationships={relationships} />
      </div>
    </div>
  );
}

