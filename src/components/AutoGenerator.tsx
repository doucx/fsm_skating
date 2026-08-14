import { useState } from 'preact/hooks';
import { ChoreographyEngine, Move } from '../services/engine';

interface StepItem {
  state: string;
  move: Move | null;
}

interface Props {
  engine: ChoreographyEngine;
  onGeneratePath: (path: StepItem[]) => void;
}

export function AutoGenerator({ engine, onGeneratePath }: Props) {
  const [steps, setSteps] = useState(6);
  const [maxDiff, setMaxDiff] = useState(3);

  const handleGenerate = () => {
    const res = engine.generateSequence(steps, maxDiff);
    if (!res) {
      alert('[-] 生成失败：在设定的难度限制下未能规划出路线。');
      return;
    }
    const path: StepItem[] = res.map(([s, m]) => ({
      state: s.toString(),
      move: m,
    }));
    onGeneratePath(path);
  };

  return (
    <div className="ice-card rounded-2xl p-6">
      <h2 className="text-lg font-semibold flex items-center text-amber-400 mb-3">
        <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> 3. 智能轨迹自动生成器
      </h2>
      <p className="text-xs text-slate-400 mb-3">
        基于滑行演化逻辑，自动规划出不进入“死胡同”的滑跑方案。
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">规划总动作步数</label>
          <input
            type="number"
            value={steps}
            onInput={(e) => setSteps(parseInt((e.target as HTMLInputElement).value) || 1)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-200"
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">最大动作难度上限</label>
          <input
            type="number"
            value={maxDiff}
            max={5}
            min={1}
            onInput={(e) => setMaxDiff(parseInt((e.target as HTMLInputElement).value) || 1)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-200"
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg text-sm transition"
      >
        <i className="fa-solid fa-route mr-1"></i> 自动一键规划路径
      </button>
    </div>
  );
}