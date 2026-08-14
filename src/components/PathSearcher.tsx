import { useState } from 'preact/hooks';
import { ChoreographyEngine, Move } from '../services/engine';
import { ALL_STATES, State } from '../domain/models';
import { ChoreographyTrail } from './ChoreographyTrail';

interface StepItem {
  state: string;
  move: Move | null;
}

interface Props {
  engine: ChoreographyEngine;
  onLoadPath: (path: StepItem[]) => void;
}

export function PathSearcher({ engine, onLoadPath }: Props) {
  const [tabMode, setTabMode] = useState<'basic' | 'advanced'>('basic');
  const [startState, setStartState] = useState('RFO');
  const [endState, setEndState] = useState('LBO');
  const [interCount, setInterCount] = useState(2);
  const [maxDiff, setMaxDiff] = useState(5);
  const [maxResults, setMaxResults] = useState(10);

  const [wStep, setWStep] = useState(10.0);
  const [wDiff, setWDiff] = useState(3.0);
  const [wBalance, setWBalance] = useState(15.0);
  const [wDiversity, setWDiversity] = useState(20.0);

  const [results, setResults] = useState<Array<Array<[State, Move | null]>> | null>(null);

  const handleSearch = () => {
    const startObj = State.fromString(startState);
    const endObj = State.fromString(endState);
    const weights = {
      step_cost: wStep,
      difficulty_bonus: wDiff,
      balance_penalty: wBalance,
      diversity_penalty: wDiversity,
    };

    const paths = engine.searchPaths(
      startObj,
      endObj,
      interCount,
      maxDiff,
      maxResults,
      weights
    );
    setResults(paths);
  };

  const handleSelectRoute = (route: Array<[State, Move | null]>) => {
    const path: StepItem[] = route.map(([s, m]) => ({
      state: s.toString(),
      move: m,
    }));
    onLoadPath(path);
  };

  return (
    <div className="ice-card rounded-2xl p-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold flex items-center text-sky-400">
          <i className="fa-solid fa-route mr-2"></i> 4. 物理路径搜索器
        </h2>
        <div className="flex bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/50">
          <button
            onClick={() => setTabMode('basic')}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${
              tabMode === 'basic'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            基础
          </button>
          <button
            onClick={() => setTabMode('advanced')}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${
              tabMode === 'advanced'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            高级
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        基于物理规则与启发式度量，检索起止状态间指定步数的最优路径方案。
      </p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">起始用刃状态</label>
            <select
              value={startState}
              onChange={(e) => setStartState((e.target as HTMLSelectElement).value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-sky-500"
            >
              {ALL_STATES.map((s) => (
                <option key={s.toString()} value={s.toString()}>
                  {s.toString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">结束用刃状态</label>
            <select
              value={endState}
              onChange={(e) => setEndState((e.target as HTMLSelectElement).value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-sky-500"
            >
              {ALL_STATES.map((s) => (
                <option key={s.toString()} value={s.toString()}>
                  {s.toString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">中间间隔状态数</label>
            <input
              type="number"
              value={interCount}
              min={0}
              onInput={(e) => setInterCount(parseInt((e.target as HTMLInputElement).value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">最大动作难度</label>
            <input
              type="number"
              value={maxDiff}
              min={1}
              max={5}
              onInput={(e) => setMaxDiff(parseInt((e.target as HTMLInputElement).value) || 1)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">最大结果数量</label>
            <input
              type="number"
              value={maxResults}
              min={1}
              onInput={(e) => setMaxResults(parseInt((e.target as HTMLInputElement).value) || 1)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none text-slate-200"
            />
          </div>
        </div>

        {tabMode === 'advanced' && (
          <div className="mb-4 p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 space-y-4">
            <h4 className="text-[10px] font-bold text-sky-500 uppercase tracking-widest flex items-center">
              <i className="fa-solid fa-sliders mr-2"></i> A* 启发式搜索权重微调
            </h4>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400">单步执行代价 (Step Cost)</span>
                  <span className="text-sky-400 font-mono">{wStep.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={0.5}
                  value={wStep}
                  onInput={(e) => setWStep(parseFloat((e.target as HTMLInputElement).value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400">难度奖励系数 (Diff Bonus)</span>
                  <span className="text-amber-400 font-mono">{wDiff.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={0.1}
                  value={wDiff}
                  onInput={(e) => setWDiff(parseFloat((e.target as HTMLInputElement).value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400">方向失调惩罚 (Balance Penalty)</span>
                  <span className="text-teal-400 font-mono">{wBalance.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={0.5}
                  value={wBalance}
                  onInput={(e) => setWBalance(parseFloat((e.target as HTMLInputElement).value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400">缺乏多样性惩罚 (Diversity Penalty)</span>
                  <span className="text-indigo-400 font-mono">{wDiversity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={0.5}
                  value={wDiversity}
                  onInput={(e) => setWDiversity(parseFloat((e.target as HTMLInputElement).value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSearch}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 rounded-lg text-sm transition shadow-lg shadow-sky-950/20"
        >
          <i className="fa-solid fa-magnifying-glass mr-1"></i> 一键检索可行路径
        </button>
      </div>

      {/* 检索结果路线列表 */}
      {results && (
        <div className="mt-4 space-y-3">
          <h3 className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">
            ⬇️ 检索结果路线列表
          </h3>
          {results.length === 0 ? (
            <p className="text-xs text-rose-400/80 p-2 border border-rose-950 bg-rose-950/20 rounded-lg">
              ⚠️ 未检索到任何合规路径！请尝试改变起止用刃、调整间隔数或放宽难度限制。
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {results.map((route, idx) => {
                const totalDiff = route.reduce(
                  (sum, step) => sum + (step[1] ? step[1].difficulty : 0),
                  0
                );
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectRoute(route)}
                    className="w-full text-left bg-slate-900/40 border border-slate-800 hover:border-sky-400/50 hover:bg-sky-400/5 p-4 rounded-xl transition-all group outline-none"
                  >
                    <div className="flex justify-between items-center">
                      <ChoreographyTrail
                        path={route.map(([s, m]) => ({
                          state: s.toString(),
                          move: m,
                        }))}
                        onUndo={() => {}}
                        isMini={true}
                      />
                      <span className="text-[10px] font-semibold px-2 py-1 rounded bg-sky-950/60 text-sky-400 border border-sky-900 shrink-0 ml-4">
                        难度: {totalDiff}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}