import { useEffect, useRef, useState } from 'preact/hooks';
import { CanvasRenderer, TrackerInfo } from '../web/renderer';
import { computeGeometry, parseState } from '../web/geometry';
import { Move } from '../services/engine';

interface Props {
  path: Array<{ state: string; move: Move | null }>;
}

const BASE_ANIM_DURATION = 1500;

export function CanvasView({ path }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const [isAnimating, setIsAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [trackerInfo, setTrackerInfo] = useState<TrackerInfo | null>(null);
  const [tooltipText, setTooltipText] = useState<string>('--');
  const [tooltipLeft, setTooltipLeft] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState(false);

  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }
  }, []);

  const drawPath = () => {
    if (!canvasRef.current || !rendererRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const targetW = Math.floor(rect.width);
    const targetH = Math.floor(rect.height);

    if (
      targetW > 0 &&
      targetH > 0 &&
      (canvas.width !== targetW || canvas.height !== targetH)
    ) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const geometry = computeGeometry(path);
    rendererRef.current.draw(geometry);

    const fFactor = document.fullscreenElement
      ? rendererRef.current.zoomFactor
      : 1.0;
    const tracker = rendererRef.current.drawTracker(
      geometry,
      animProgress,
      fFactor
    );
    setTrackerInfo(tracker);
  };

  useEffect(() => {
    drawPath();
  }, [path, animProgress]);

  // Animation Loop
  useEffect(() => {
    if (!isAnimating) return;

    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = (timestamp: number) => {
      if (isDraggingRef.current) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      const totalSteps = Math.max(1, path.length - 1);
      const totalDuration = (totalSteps * BASE_ANIM_DURATION) / playbackSpeed;

      setAnimProgress((prev) => {
        const next = prev + deltaTime / totalDuration;
        if (next >= 1.0) {
          setIsAnimating(false);
          return 1.0;
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAnimating, playbackSpeed, path.length]);

  const toggleAnimation = () => {
    if (path.length <= 1) return;
    if (isAnimating) {
      setIsAnimating(false);
    } else {
      if (animProgress >= 1.0) setAnimProgress(0);
      setIsAnimating(true);
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('canvas-container');
    if (!document.fullscreenElement && container) {
      container.requestFullscreen().catch((err) => {
        console.error(`无法进入全屏模式: ${err.message}`);
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const handleProgressJump = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    setAnimProgress(progress);
  };

  const geometry = computeGeometry(path);
  const totalLength = geometry.arcs.reduce((acc, arc) => acc + arc.length, 0);

  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
        <span className="flex items-center">
          <i className="fa-solid fa-person-skating mr-2 text-sky-400"></i>
          ❄️ 轨迹动态模拟
        </span>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleAnimation}
            className="play-btn px-3 py-1 rounded-md border border-sky-500/50 bg-sky-500/10 text-sky-400 text-[10px] flex items-center"
          >
            <i
              className={`fa-solid ${
                isAnimating
                  ? 'fa-pause'
                  : animProgress >= 1.0
                  ? 'fa-rotate-right'
                  : 'fa-play'
              } mr-1.5`}
            ></i>
            <span>
              {isAnimating
                ? '暂停回放'
                : animProgress >= 1.0
                ? '再次播放'
                : '开始回放'}
            </span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="text-[10px] text-slate-400 hover:text-sky-300 transition normal-case flex items-center"
          >
            <i className="fa-solid fa-expand mr-1"></i> 全屏
          </button>
        </div>
      </h3>

      <div
        id="canvas-container"
        className="bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 glow-ice relative group"
      >
        {/* HUD Overlay */}
        {(isAnimating || animProgress > 0) && trackerInfo && (
          <div className="anim-overlay absolute top-4 left-4 z-10">
            <div className="bg-slate-950/90 backdrop-blur-xl border border-sky-500/20 rounded-xl p-4 min-w-[210px] shadow-2xl flex flex-col space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center">
                  <i className="fa-solid fa-backward-step mr-1.5 text-slate-500"></i>{' '}
                  刚刚的动作：
                </span>
                <span className="font-bold text-slate-300 truncate max-w-[100px]">
                  {trackerInfo.prevMove}
                </span>
              </div>

              <div className="flex items-center justify-between border-y border-slate-800/80 py-2">
                <span className="text-slate-400 text-xs flex items-center">
                  <i className="fa-solid fa-person-skating mr-1.5 text-sky-400"></i>{' '}
                  滑行状态：
                </span>
                <span className="text-2xl font-black text-sky-400 font-mono tracking-tighter">
                  {trackerInfo.state}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center">
                  <i className="fa-solid fa-forward-step mr-1.5 text-amber-500"></i>{' '}
                  下一个动作：
                </span>
                <span className="font-bold text-amber-400 truncate max-w-[100px]">
                  {trackerInfo.nextMove}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar Container */}
        <div
          className="progress-container absolute bottom-0 left-0 w-full h-1.5 bg-slate-950/80 z-20 overflow-visible"
          onMouseDown={(e) => {
            isDraggingRef.current = true;
            const rect = e.currentTarget.getBoundingClientRect();
            handleProgressJump(e.clientX, rect);

            const onMouseMove = (moveEvt: MouseEvent) => {
              if (isDraggingRef.current) handleProgressJump(moveEvt.clientX, rect);
            };
            const onMouseUp = () => {
              isDraggingRef.current = false;
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            setTooltipLeft(x);
            setShowTooltip(true);

            const hoverProgress = Math.max(0, Math.min(1, x / rect.width));
            setTooltipText(`${Math.round(hoverProgress * 100)}%`);
          }}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Segments Layer */}
          <div className="absolute inset-0 w-full h-full flex overflow-hidden opacity-40">
            {totalLength > 0 &&
              geometry.arcs.map((arc, idx) => {
                const widthPercent = (arc.length / totalLength) * 100;
                const isLeft = parseState(arc.state).isLeft;
                return (
                  <div
                    key={idx}
                    className="timeline-segment"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: isLeft ? '#0ea5e9' : '#f97316',
                    }}
                  />
                );
              })}
          </div>

          {/* Progress Bar */}
          <div
            id="anim-progress-bar"
            className="h-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.6)] relative z-10 pointer-events-none"
            style={{ width: `${animProgress * 100}%` }}
          >
            <div className="absolute right-0 top-0 h-full w-0.5 bg-white shadow-[0_0_10px_#fff]"></div>
          </div>

          {/* Tooltip */}
          {showTooltip && (
            <div
              id="progress-tooltip"
              className="absolute bottom-4 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] text-slate-300 whitespace-nowrap z-30"
              style={{ left: `${tooltipLeft}px`, opacity: 1 }}
            >
              {tooltipText}
            </div>
          )}
        </div>

        {/* Controls Overlay */}
        <div
          id="fullscreen-controls"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        >
          <div className="bg-slate-900/90 backdrop-blur-xl border border-sky-500/20 rounded-full px-6 py-2.5 flex items-center space-x-6 shadow-2xl pointer-events-auto">
            <button
              onClick={toggleAnimation}
              className="text-sky-400 hover:text-sky-300 transition-colors flex items-center space-x-2"
            >
              <i
                className={`fa-solid ${isAnimating ? 'fa-pause' : 'fa-play'} text-lg`}
              ></i>
              <span className="text-xs font-bold uppercase tracking-widest">
                {isAnimating ? '暂停' : '播放'}
              </span>
            </button>
            <div className="h-4 w-[1px] bg-slate-700"></div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPlaybackSpeed(0.5)}
                className={`speed-btn px-2 py-0.5 rounded text-[10px] border border-transparent ${
                  playbackSpeed === 0.5 ? 'active' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                0.5x
              </button>
              <button
                onClick={() => setPlaybackSpeed(1.0)}
                className={`speed-btn px-2 py-0.5 rounded text-[10px] border border-transparent ${
                  playbackSpeed === 1.0 ? 'active' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                1.0x
              </button>
            </div>
            <div className="h-4 w-[1px] bg-slate-700"></div>
            <button
              onClick={toggleFullscreen}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-compress"></i>
            </button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          className="w-full h-[200px] block"
          width={600}
          height={200}
        />
      </div>
    </div>
  );
}