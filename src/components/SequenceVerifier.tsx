import { useState } from 'preact/hooks';
import { ChoreographyEngine, Move, VerificationResponse, MoveVerificationResponse } from '../services/engine';
import { ALL_STATES } from '../domain/models';
import { ChoreographyTrail } from './ChoreographyTrail';

interface StepItem {
  state: string;
  move: Move | null;
}

interface Props {
  engine: ChoreographyEngine;
  onLoadPath: (path: StepItem[]) => void;
}

export function SequenceVerifier({ engine, onLoadPath }: Props) {
  const [mode, setMode] = useState<'state' | 'move'>('state');
  const [startStateSelect, setStartStateSelect] = useState('');
  const [inputVal, setInputVal] = useState('LFO -> LFI -> RFI -> RBO');
  const [stateResult, setStateResult] = useState<VerificationResponse | null>(null);
  const [moveResult, setMoveResult] = useState<MoveVerificationResponse | null>(null);

  const handleVerify = () => {
    if (!inputVal.trim()) return;

    if (mode === 'state') {
      const res = engine.verifySequence(inputVal);
      setStateResult(res);
      setMoveResult(null);
    } else {
      const moveIds = inputVal
        .split(/->|,|\s+/)
        .map((m) => m.trim().toLowerCase())
        .filter((m) => m.length > 0);

      const res = engine.verifyMoveSequence(
        moveIds,
        startStateSelect ? (startStateSelect as any) : undefined
      );
      setMoveResult(res);
      setStateResult(null);
    }
  };

  const handleLoadStatePath = () => {
    if (!stateResult || !stateResult.valid || !stateResult.transitions) return;
    const path: StepItem[] = [];
    stateResult.transitions.forEach((t, idx) => {
      if (idx === 0) {
        path.push({ state: t.from_state.toString(), move: t.selected_move });
      } else {
        path[path.length - 1].move = t.selected_move;
      }
      path.push({ state: t.to_state.toString(), move: null });
    });
    onLoadPath(path);
  };

  const handleLoadMovePath = () => {
    if (!moveResult || !moveResult.valid || !moveResult.trace) return;
    const path: StepItem[] = [];
    moveResult.trace.forEach((step, idx) => {
      if (idx === 0) {
        path.push({ state: step.from_state.toString(), move: step.move });
      } else {
        path[path.length - 1].move = step.move;
      }
      path.push({ state: step.to_state.toString(), move: null });
    });
    onLoadPath(path);
  };

  return (
    <div className="ice-card rounded-2xl p-6">
      <h2 className="text-lg font-semibold flex items-center text-emerald-400 mb-3">
        <i className="fa-solid fa-spell-check mr-2"></i> 2. 物理步法序列校验器
      </h2>

      {/* 模式切换 */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => {
            setMode('state');
            setInputVal('LFO -> LFI -> RFI -> RBO');
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded transition ${
            mode === 'state'
              ? 'bg-emerald-600 text-white border border-emerald-500'
              : 'bg-slate-800 text-slate-300 border border-slate-700/60'
          }`}
        >
          状态流校验
        </button>
        <button
          onClick={() => {
            setMode('move');
            setInputVal('stroke -> forward_inside_three_turn');
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded transition ${
            mode === 'move'
              ? 'bg-emerald-600 text-white border border-emerald-500'
              : 'bg-slate-800 text-slate-300 border border-slate-700/60'
          }`}
        >
          步法流校验
        </button>
      </div>

      {mode === 'move' && (
        <div className="mb-3">
          <label className="block text-[10px] text-slate-400 mb-1">
            起始用刃状态 (可选，默认自动推导)
          </label>
          <select
            value={startStateSelect}
            onChange={(e) => setStartStateSelect((e.target as HTMLSelectElement).value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500"
          >
            <option value="">自动推导</option>
            {ALL_STATES.map((s) => (
              <option key={s.toString()} value={s.toString()}>
                {s.toString()}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="text-xs text-slate-400 mb-3">
        {mode === 'state'
          ? '支持对任意输入的边缘状态转移序列进行分析翻译。'
          : '输入一组纯步法动作 ID（逗号或空格、英文箭头隔开），自动推导演化轨迹。'}
      </p>

      <div className="space-y-3">
        <input
          type="text"
          value={inputVal}
          onInput={(e) => setInputVal((e.target as HTMLInputElement).value)}
          placeholder={
            mode === 'state'
              ? '例: LFO -> LFI -> RFI -> RBO'
              : '例: stroke -> forward_inside_three_turn'
          }
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-slate-200"
        />
        <button
          onClick={handleVerify}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm transition shadow-lg shadow-emerald-950/20"
        >
          <i className="fa-solid fa-magnifying-glass mr-1"></i> 进行验证解析
        </button>
      </div>

      {/* 结果展示 */}
      {stateResult && (
        <div className="mt-4 space-y-3">
          {!stateResult.valid ? (
            <div className="p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20">
              <p className="text-rose-400 font-semibold">
                <i className="fa-solid fa-circle-xmark mr-1"></i> 校验失败
              </p>
              <p className="text-xs text-slate-300 mt-2">{stateResult.error}</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 bg-emerald-950/20 border border-emerald-900/50 rounded-lg flex items-center justify-between">
                <p className="text-emerald-400 text-xs font-bold flex items-center">
                  <i className="fa-solid fa-circle-check mr-2"></i> 验证成功
                </p>
                <span className="text-[10px] text-slate-500 font-mono">Verified Path</span>
              </div>

              <button
                onClick={handleLoadStatePath}
                className="w-full text-left bg-slate-900/40 border border-slate-800 hover:border-sky-400/50 hover:bg-sky-400/5 p-4 rounded-xl transition-all group"
              >
                <div className="flex justify-between items-center">
                  <ChoreographyTrail
                    path={stateResult.transitions!.reduce<StepItem[]>((acc, t, idx) => {
                      if (idx === 0)
                        acc.push({ state: t.from_state.toString(), move: t.selected_move });
                      else acc[acc.length - 1].move = t.selected_move;
                      acc.push({ state: t.to_state.toString(), move: null });
                      return acc;
                    }, [])}
                    onUndo={() => {}}
                    isMini={true}
                  />
                  <span className="text-[10px] font-semibold px-2 py-1 rounded bg-sky-950/60 text-sky-400 border border-sky-900 shrink-0 ml-4">
                    难度: {stateResult.total_difficulty}
                  </span>
                </div>
              </button>

              {stateResult.is_ambiguous && (
                <div className="text-[10px] text-amber-400/80 bg-amber-950/20 p-2 rounded border border-amber-900/50">
                  <i className="fa-solid fa-circle-nodes mr-1"></i> 存在物理歧义候选动作。
                </div>
              )}
            </>
          )}
        </div>
      )}

      {moveResult && (
        <div className="mt-4 space-y-3">
          {!moveResult.valid ? (
            <div className="p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20">
              <p className="text-rose-400 font-semibold">
                <i className="fa-solid fa-circle-xmark mr-1"></i> 校验失败
              </p>
              <p className="text-xs text-slate-300 mt-2">{moveResult.error}</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 bg-emerald-950/20 border border-emerald-900/50 rounded-lg flex items-center justify-between">
                <p className="text-emerald-400 text-xs font-bold flex items-center">
                  <i className="fa-solid fa-circle-check mr-2"></i> 演算成功
                </p>
                <span className="text-[10px] text-slate-500 font-mono">Trace Inference</span>
              </div>

              <button
                onClick={handleLoadMovePath}
                className="w-full text-left bg-slate-900/40 border border-slate-800 hover:border-sky-400/50 hover:bg-sky-400/5 p-4 rounded-xl transition-all group"
              >
                <div className="flex justify-between items-center">
                  <ChoreographyTrail
                    path={moveResult.trace!.reduce<StepItem[]>((acc, step, idx) => {
                      if (idx === 0)
                        acc.push({ state: step.from_state.toString(), move: step.move });
                      else acc[acc.length - 1].move = step.move;
                      acc.push({ state: step.to_state.toString(), move: null });
                      return acc;
                    }, [])}
                    onUndo={() => {}}
                    isMini={true}
                  />
                  <span className="text-[10px] font-semibold px-2 py-1 rounded bg-sky-950/60 text-sky-400 border border-sky-900 shrink-0 ml-4">
                    难度: {moveResult.total_difficulty}
                  </span>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}