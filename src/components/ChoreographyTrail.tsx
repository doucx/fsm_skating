import { Move } from '../services/engine';

export interface StepItem {
  state: string;
  move: Move | null;
}

interface Props {
  path: StepItem[];
  onUndo: () => void;
  isMini?: boolean;
}

export function ChoreographyTrail({ path, onUndo, isMini = false }: Props) {
  const size = isMini
    ? {
        state: 'px-1.5 py-0.5 text-[10px]',
        move: 'px-1.5 py-0.5 text-[9px]',
        diff: 'text-[7px]',
        arrow: 'text-[8px]',
      }
    : {
        state: 'px-2.5 py-1 text-xs',
        move: 'px-2.5 py-1 text-[10px]',
        diff: 'text-[8px]',
        arrow: 'text-[9px]',
      };

  return (
    <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
      {path.map((step, idx) => {
        const miniName = step.move ? step.move.name.split(' ')[0] : '';
        const rotIcon = step.move?.rotation_dir
          ? step.move.rotation_dir === 'CW'
            ? ' ↻'
            : ' ↺'
          : '';

        return (
          <span key={idx} className="flex items-center">
            <span
              className={`${size.state} font-bold font-mono tracking-wider bg-sky-950 text-sky-300 rounded-md border border-sky-800 glow-ice flex items-center shrink-0`}
            >
              {step.state}
            </span>

            {step.move && (
              <>
                <span className={`${size.arrow} text-slate-600 self-center px-0.5`}>
                  <i className="fa-solid fa-chevron-right"></i>
                </span>
                <div
                  className={`flex items-center space-x-1.5 ${size.move} bg-amber-950/40 border border-amber-500/40 rounded-md shadow-[0_0_10px_rgba(245,158,11,0.25)] text-amber-400 font-semibold shrink-0`}
                >
                  <span className="tracking-tight">
                    {miniName}
                    {rotIcon}
                  </span>
                  <span
                    className={`px-1 py-0.2 bg-amber-500 text-slate-950 rounded-[3px] ${size.diff} font-extrabold leading-none scale-90 origin-right`}
                  >
                    {step.move.difficulty}级
                  </span>
                </div>
                <span className={`${size.arrow} text-slate-600 self-center px-0.5`}>
                  <i className="fa-solid fa-chevron-right"></i>
                </span>
              </>
            )}
          </span>
        );
      })}

      {!isMini && path.length > 1 && (
        <button
          onClick={onUndo}
          className="ml-auto px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs text-rose-400 transition"
        >
          <i className="fa-solid fa-arrow-rotate-left mr-1"></i> 回撤
        </button>
      )}
    </div>
  );
}