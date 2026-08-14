import { useState } from 'preact/hooks';
import { ChoreographyEngine, Move } from '../services/engine';
import { State, ALL_STATES, getNaturalCurvature } from '../domain/models';
import { CanvasView } from './CanvasView';
import { ChoreographyTrail } from './ChoreographyTrail';

interface StepItem {
  state: string;
  move: Move | null;
}

interface Props {
  engine: ChoreographyEngine;
  path: StepItem[];
  onSelectStartState: (stateStr: string) => void;
  onChooseNextMove: (nextState: State, move: Move) => void;
  onUndoMove: () => void;
  onReset: () => void;
  onImportPath: (importedPath: StepItem[]) => void;
}

const STATE_DESC_MAP: Record<string, string> = {
  LFO: '左脚 (L) | 向前 (F) | 外刃 (O)',
  LFI: '左脚 (L) | 向前 (F) | 内刃 (I)',
  LBO: '左脚 (L) | 向后 (B) | 外刃 (O)',
  LBI: '左脚 (L) | 向后 (B) | 内刃 (I)',
  RFO: '右脚 (R) | 向前 (F) | 外刃 (O)',
  RFI: '右脚 (R) | 向前 (F) | 内刃 (I)',
  RBO: '右脚 (R) | 向后 (B) | 外刃 (O)',
  RBI: '右脚 (R) | 向后 (B) | 内刃 (I)',
};

export function ManualChoreographer({
  engine,
  path,
  onSelectStartState,
  onChooseNextMove,
  onUndoMove,
  onReset,
  onImportPath,
}: Props) {
  const [maxDiff, setMaxDiff] = useState(5);
  const [copySuccess, setCopySuccess] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const currStep = path[path.length - 1];
  const currStateObj = State.fromString(currStep.state);
  const options = engine.getPossibleTransitions(currStateObj, maxDiff);

  const curve = getNaturalCurvature(currStateObj);
  const isCW = curve === 'CW';

  const trajectorySource = JSON.stringify(
    path.map((s) => ({
      state: s.state,
      move_id: s.move ? s.move.id : null,
    }))
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trajectorySource);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    } catch (e) {
      console.error('复制失败: ', e);
    }
  };

  const handleImport = () => {
    const raw = jsonText.trim() || trajectorySource;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        alert('导入失败：请输入合法的 JSON 数组');
        return;
      }
      const statesList = parsed.map((item) => item.state).filter(Boolean);
      if (statesList.length < 1) {
        alert('导入失败：数据中未包含有效状态。');
        return;
      }

      if (statesList.length === 1) {
        onImportPath([{ state: statesList[0], move: null }]);
        return;
      }

      const seq = statesList.join(' -> ');
      const res = engine.verifySequence(seq);
      if (!res.valid || !res.transitions) {
        alert(`导入失败，校验未通过: ${res.error}`);
        return;
      }

      const newPath: StepItem[] = [];
      for (let i = 0; i < res.transitions.length; i++) {
        const t = res.transitions[i];
        const expectedMoveId = parsed[i] ? parsed[i].move_id : null;
        let matchedMove = t.candidate_moves.find((m) => m.id === expectedMoveId);
        if (!matchedMove) matchedMove = t.selected_move;

        newPath.push({
          state: t.from_state.toString(),
          move: matchedMove,
        });
      }
      const lastT = res.transitions[res.transitions.length - 1];
      newPath.push({
        state: lastT.to_state.toString(),
        move: null,
      });

      onImportPath(newPath);
    } catch (err: any) {
      alert(`导入解析失败: ${err.message}`);
    }
  };

  return (
    <div className="ice-card rounded-2xl p-6 glow-ice">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center text-sky-300">
          <i className="fa-solid fa-compass mr-2"></i> 1. 交互式手动编排沙盒
        </h2>
        <button
          onClick={onReset}
          className="text-xs text-rose-400 hover:text-rose-300 flex items-center transition"
        >
          <i className="fa-solid fa-rotate-left mr-1"></i> 重置编排
        </button>
      </div>

      {/* 参数设定 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs text-slate-400 mb-1">起始状态设定</label>
          <select
            value={path[0].state}
            onChange={(e) => onSelectStartState((e.target as HTMLSelectElement).value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-sky-500"
          >
            {ALL_STATES.map((s) => (
              <option key={s.toString()} value={s.toString()}>
                {s.toString()} - {STATE_DESC_MAP[s.toString()]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">最大允许动作难度</label>
          <select
            value={maxDiff}
            onChange={(e) => setMaxDiff(parseInt((e.target as HTMLSelectElement).value))}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-sky-500"
          >
            <option value={5}>难度 5 (全动作开放)</option>
            <option value={4}>难度 4 (不包含后外转三等)</option>
            <option value={3}>难度 3 (基础蹬冰/中度动作)</option>
            <option value={1}>难度 1 (标准蹬冰步)</option>
          </select>
        </div>
      </div>

      {/* Canvas 渲染区 */}
      <CanvasView path={path} />

      {/* 当前状态 Card */}
      <div className="flex items-center space-x-4 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-6">
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg p-3 text-center min-w-[70px] glow-ice">
          <span className="text-2xl font-bold tracking-wider">{currStep.state}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-200">
            {STATE_DESC_MAP[currStep.state] || ''}
          </h3>
          <p className="text-xs text-sky-400 mt-1 flex items-center">
            <i className="fa-solid fa-yin-yang mr-1"></i> 滑行惯性圆弧:{' '}
            <span className={`ml-1 font-semibold ${isCW ? 'text-sky-300' : 'text-teal-300'}`}>
              {isCW ? 'CW 顺时针 ↻' : 'CCW 逆时针 ↺'}
            </span>
          </p>
        </div>
      </div>

      {/* 已规划轨迹 */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          🐾 已规划轨迹流向
        </h3>
        <div className="bg-slate-900/60 rounded-xl p-4 min-h-[64px] flex flex-wrap items-center gap-2 border border-slate-800">
          <ChoreographyTrail path={path} onUndo={onUndoMove} />
        </div>
      </div>

      {/* 源码导入导出 */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          📦 轨迹流源代码（支持导入/导出）
        </h3>
        <div className="flex space-x-2">
          <textarea
            rows={3}
            value={jsonText || trajectorySource}
            onInput={(e) => setJsonText((e.target as HTMLTextAreaElement).value)}
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 outline-none focus:border-sky-500"
          />
          <div className="flex flex-col space-y-2 justify-center">
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition flex items-center justify-center space-x-1 min-w-[80px]"
            >
              <i className={`fa-solid ${copySuccess ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
              <span>{copySuccess ? '已复制' : '复制'}</span>
            </button>
            <button
              onClick={handleImport}
              className="px-3 py-2 bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded-lg text-xs text-sky-300 transition flex items-center justify-center space-x-1 min-w-[80px]"
            >
              <i className="fa-solid fa-file-import"></i>
              <span>导入</span>
            </button>
          </div>
        </div>
      </div>

      {/* FSM 引擎推荐分支 */}
      <div>
        <h3 className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-3">
          ⬇️ FSM 动力学引擎推荐分支 (已排序)
        </h3>
        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2">
          {options.length === 0 ? (
            <p className="text-xs text-rose-400/80 p-2 border border-rose-950 bg-rose-950/20 rounded-lg">
              ⚠️ 当前状态下没有符合最大难度限制的有效滑行变体！请宽限难度限制。
            </p>
          ) : (
            options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => onChooseNextMove(opt.target_state, opt.move)}
                className="w-full text-left bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/60 rounded-xl p-3 flex justify-between items-center transition group"
              >
                <div>
                  <span className="font-bold text-slate-200 group-hover:text-sky-300 transition tracking-wider mr-2">
                    {currStep.state} ──▶ {opt.target_state.toString()}
                  </span>
                  {opt.move.rotation_dir === 'CW' && (
                    <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded-md ml-2">
                      ↻ 顺旋转
                    </span>
                  )}
                  {opt.move.rotation_dir === 'CCW' && (
                    <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded-md ml-2">
                      ↺ 逆旋转
                    </span>
                  )}
                  <div className="text-xs text-slate-400 mt-1">{opt.move.name}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-sky-400">
                    难度: {opt.move.difficulty}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
