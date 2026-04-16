import React, { useState, useRef } from 'react';
import { Terminal, Play, Trash2, RotateCcw, Loader2, Upload } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface WebShellProps {
  onExecute: (query: string) => Promise<void>;
  onClear: () => Promise<void>;
  onRestore: (query?: string) => Promise<void>;
  isPresenter: boolean;
}

const CYPHER_TEMPLATES = [
  { 
    name: 'Add Profile with Hobby', 
    template: "MERGE (p:Person {name: '$NAME'}) SET p.hobby = '$HOBBY', p.age = $AGE RETURN p",
    fields: ['NAME', 'HOBBY', 'AGE']
  },
  { 
    name: 'Add Profile with Movie', 
    template: "MERGE (p:Person {name: '$NAME'}) SET p.favoriteMovie = '$MOVIE', p.age = $AGE RETURN p",
    fields: ['NAME', 'MOVIE', 'AGE']
  },
  { 
    name: 'Link by Shared Hobby', 
    template: "MATCH (p1:Person {hobby: '$HOBBY'}), (p2:Person {hobby: '$HOBBY'}) WHERE p1 <> p2 MERGE (p1)-[:SHARED_INTEREST {type: 'hobby'}]->(p2) RETURN p1, p2",
    fields: ['HOBBY']
  },
  { 
    name: 'Link by Shared Movie', 
    template: "MATCH (p1:Person {favoriteMovie: '$MOVIE'}), (p2:Person {favoriteMovie: '$MOVIE'}) WHERE p1 <> p2 MERGE (p1)-[:SHARED_INTEREST {type: 'movie'}]->(p2) RETURN p1, p2",
    fields: ['MOVIE']
  },
  { 
    name: 'Find Same Interest', 
    template: "MATCH (p:Person {name: '$NAME'})-[:SHARED_INTEREST]-(other) RETURN p, other",
    fields: ['NAME']
  },
  {
    name: 'Delete My Profile',
    template: "MATCH (p:Person {name: '$NAME'}) DETACH DELETE p",
    fields: ['NAME']
  }
];

export function WebShell({ onExecute, onClear, onRestore, isPresenter }: WebShellProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'expert' | 'easy'>('easy');
  const [selectedTemplate, setSelectedTemplate] = useState(CYPHER_TEMPLATES[0]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExecute = async (finalQuery?: string) => {
    const q = finalQuery || query;
    if (!q.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      await onExecute(q);
      setStatus({ type: 'success', message: 'Query executed successfully' });
      if (mode === 'expert') setQuery('');
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Execution failed' });
    } finally {
      setLoading(false);
    }
  };

  const buildEasyQuery = () => {
    let q = selectedTemplate.template;
    selectedTemplate.fields.forEach(field => {
      const val = fieldValues[field] || '';
      q = q.replace(`$${field}`, val);
    });
    return q;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      setStatus({ type: 'error', message: 'Please upload a .txt file' });
      return;
    }

    setLoading(true);
    setStatus(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        await onRestore(content);
        setStatus({ type: 'success', message: `Seed loaded from ${file.name}` });
      } catch (error: any) {
        setStatus({ type: 'error', message: error.message || 'File load failed' });
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Failed to read file' });
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleAction = async (action: () => Promise<void>, successMsg: string) => {
    setLoading(true);
    setStatus(null);
    try {
      await action();
      setStatus({ type: 'success', message: successMsg });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Action failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-bg-panel border-b border-border-theme flex flex-col shrink-0">
      <div className="h-10 px-4 flex items-center gap-2.5 bg-bg-shell border-b border-border-theme">
        <div className="flex bg-bg-panel rounded p-0.5 border border-border-theme">
          <button 
            onClick={() => setMode('easy')}
            className={cn("px-2 py-1 text-[10px] font-bold rounded transition-all", mode === 'easy' ? "bg-accent-blue text-white" : "text-text-secondary hover:text-text-primary")}
          >
            EASY
          </button>
          <button 
            onClick={() => setMode('expert')}
            className={cn("px-2 py-1 text-[10px] font-bold rounded transition-all", mode === 'expert' ? "bg-accent-blue text-white" : "text-text-secondary hover:text-text-primary")}
          >
            EXPERT
          </button>
        </div>

        {isPresenter && (
          <div className="flex gap-2 ml-4 border-l border-border-theme pl-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".txt" 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-3 py-1.5 bg-bg-panel border border-accent-blue text-accent-blue rounded text-[11px] font-bold uppercase transition-all hover:bg-accent-blue/10 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Upload size={14} />
              UPLOAD SEED
            </button>
            <button
              onClick={() => handleAction(onRestore, 'Database restored')}
              disabled={loading}
              className="px-3 py-1.5 bg-bg-panel border border-border-theme text-text-secondary rounded text-[11px] font-bold uppercase transition-all hover:bg-bg-shell disabled:opacity-50"
            >
              DEFAULT SEED
            </button>
            <button
              onClick={() => handleAction(onClear, 'Database nuked')}
              disabled={loading}
              className="px-3 py-1.5 bg-bg-panel border border-accent-red text-accent-red rounded text-[11px] font-bold uppercase transition-all hover:bg-accent-red/10 disabled:opacity-50"
            >
              NUKE DATABASE
            </button>
          </div>
        )}

        <div className="ml-auto text-text-secondary text-[11px] font-mono opacity-60">
          {isPresenter ? 'PRESENTER MODE' : 'VIEWER MODE'}
        </div>
      </div>

      <div className="p-5 bg-bg-shell relative group">
        {mode === 'expert' ? (
          <div className="flex gap-2.5 font-mono text-sm">
            <span className="text-accent-blue shrink-0 select-none">cypher&gt;</span>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="MATCH (n) RETURN n LIMIT 25..."
              className="w-full h-20 bg-transparent border-none outline-none text-text-primary caret-accent-blue resize-none placeholder:text-text-secondary/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleExecute();
                }
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-text-secondary uppercase">Template:</span>
              <select 
                className="bg-bg-panel border border-border-theme text-text-primary text-xs rounded px-2 py-1 outline-none focus:border-accent-blue"
                value={selectedTemplate.name}
                onChange={(e) => {
                  const t = CYPHER_TEMPLATES.find(t => t.name === e.target.value)!;
                  setSelectedTemplate(t);
                  setFieldValues({});
                }}
              >
                {CYPHER_TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {selectedTemplate.fields.map(field => (
                <div key={field} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">{field}</label>
                  <input 
                    type="text"
                    value={fieldValues[field] || ''}
                    onChange={(e) => setFieldValues(prev => ({ ...prev, [field]: e.target.value }))}
                    className="bg-bg-panel border border-border-theme rounded px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-blue transition-all"
                    placeholder={`Enter ${field.toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 p-3 bg-bg-panel/50 rounded border border-border-theme/50 font-mono text-[10px] text-text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
              <span className="text-accent-blue">PREVIEW:</span> {buildEasyQuery()}
            </div>
          </div>
        )}
        
        <button
          onClick={() => handleExecute(mode === 'easy' ? buildEasyQuery() : undefined)}
          disabled={loading || (mode === 'expert' && !query.trim())}
          className="absolute bottom-4 right-4 p-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded transition-all disabled:opacity-30 shadow-[0_0_15px_rgba(0,140,193,0.2)]"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
        </button>
      </div>

      {status && (
        <div className={cn(
          "text-[11px] font-mono px-4 py-1.5 border-t border-b",
          status.type === 'success' ? "bg-accent-green/5 border-accent-green/20 text-accent-green" : "bg-accent-red/5 border-accent-red/20 text-accent-red"
        )}>
          {status.type === 'success' ? '// ' : '!! '} {status.message}
        </div>
      )}
    </div>
  );
}
