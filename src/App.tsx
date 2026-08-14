import { useState, useEffect, useMemo } from 'preact/hooks';
import { ChoreographyEngine, Move } from './services/engine';
import { State } from './domain/models';
import { Header } from './components/Header';
import { ManualChoreographer } from './components/ManualChoreographer';
import { MetricsCard } from './components/MetricsCard';
import { SequenceVerifier } from './components/SequenceVerifier';
import { AutoGenerator } from './components/AutoGenerator';
import { PathSearcher } from './components/PathSearcher';

interface StepItem {
  state: string;
  move: Move | null;
}

const STORAGE_KEY = 'fsm_skating_path';

export function App() {
  const engine = useMemo(() => new ChoreographyEngine(), []);

  const [path, setPath] = useState<StepItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to restore path:', e);
      }
    }
    return [{ state: 'LFO', move: null }];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(path));
    } catch (e) {
      console.error('Failed to save path:', e);
    }
  }, [path]);

  const handleSelectStartState = (stateStr: string) => {
    setPath([{ state: stateStr, move: null }]);
  };

  const handleChooseNextMove = (nextState: State, move: Move) => {
    setPath((prev) => {
      const copy = [...prev];
      copy[copy.length - 1].move = move;
      copy.push({ state: nextState.toString(), move: null });
      return copy;
    });
  };

  const handleUndoMove = () => {
    setPath((prev) => {
      if (prev.length <= 1) return prev;
      const copy = prev.slice(0, -1);
      copy[copy.length - 1].move = null;
      return copy;
    });
  };

  const handleReset = () => {
    const start = path[0]?.state || 'LFO';
    setPath([{ state: start, move: null }]);
  };

  return (
    <div className="container mx-auto px-4 max-w-6xl py-8 min-h-screen">
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 左侧 7 格: 交互式沙盒 */}
        <div className="lg:col-span-7 space-y-6">
          <ManualChoreographer
            engine={engine}
            path={path}
            onSelectStartState={handleSelectStartState}
            onChooseNextMove={handleChooseNextMove}
            onUndoMove={handleUndoMove}
            onReset={handleReset}
            onImportPath={setPath}
          />
        </div>

        {/* 右侧 5 格: 统计/校验/生成/搜索 */}
        <div className="lg:col-span-5 space-y-6">
          <MetricsCard path={path} />
          <SequenceVerifier engine={engine} onLoadPath={setPath} />
          <AutoGenerator engine={engine} onGeneratePath={setPath} />
          <PathSearcher engine={engine} onLoadPath={setPath} />
        </div>
      </div>
    </div>
  );
}