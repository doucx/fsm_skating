import { Move } from '../services/engine';

interface StepItem {
  state: string;
  move: Move | null;
}

interface Props {
  path: StepItem[];
}

export function MetricsCard({ path }: Props) {
  const stepsCount = Math.max(0, path.length - 1);
  let totalDiff = 0;
  let cwCount = 0;
  let ccwCount = 0;

  path.forEach((s) => {
    if (s.move) {
      totalDiff += s.move.difficulty;
      if (s.move.rotation_dir === 'CW') cwCount++;
      if (s.move.rotation_dir === 'CCW') ccwCount++;
    }
  });

  const totalRots = cwCount + ccwCount;
  const cwWidth = totalRots > 0 ? (cwCount / totalRots) * 100 : 50;

  return (
    <div className="ice-card rounded-2xl p-6">
      <h2 className="text-lg font-semibold flex items-center text-teal-400 mb-4">
        <i className="fa-solid fa-chart-line mr-2"></i> ISU 多样性与难度度量
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
          <span className="block text-xs text-slate-400">总难度评分</span>
          <span className="text-2xl font-bold text-teal-400">{totalDiff}</span>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
          <span className="block text-xs text-slate-400">完成动作数</span>
          <span className="text-2xl font-bold text-sky-400">{stepsCount} 步</span>
        </div>
      </div>

      <div className="mt-4 bg-slate-850 rounded-xl p-3 border border-slate-700/50">
        <span className="block text-xs text-slate-400 mb-2">转体多样性平衡度分析</span>
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="text-slate-300">
            顺时针 (CW) 次数: <strong className="text-sky-300">{cwCount}</strong>
          </span>
          <span className="text-slate-300">
            逆时针 (CCW) 次数: <strong className="text-teal-300">{ccwCount}</strong>
          </span>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
          <div
            className="bg-sky-400 h-full transition-all"
            style={{ width: `${cwWidth}%` }}
          />
          <div
            className="bg-teal-400 h-full transition-all"
            style={{ width: `${100 - cwWidth}%` }}
          />
        </div>

        <p className="text-[11px] text-slate-400 mt-2 flex items-center">
          {totalRots > 0 ? (
            cwCount > 0 && ccwCount > 0 ? (
              <>
                <i className="fa-solid fa-circle-check text-emerald-400 mr-1"></i>
                <span className="text-emerald-400 font-semibold">
                  双向平衡良好！符合 ISU 高级别评级要求。
                </span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-triangle-exclamation text-amber-400 mr-1"></i>
                <span className="text-amber-400">
                  目前仅包含单一转弯。建议增加交替方向。
                </span>
              </>
            )
          ) : (
            <>
              <i className="fa-solid fa-info-circle text-sky-400 mr-1"></i>
              <span>暂不包含显著转体类步法。</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}