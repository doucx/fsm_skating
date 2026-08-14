export function Header() {
  return (
    <header className="mb-8 flex flex-col md:flex-row justify-between items-center border-b border-slate-700 pb-6">
      <div className="flex items-center space-x-3">
        <div className="text-4xl text-sky-400 animate-pulse">
          <i className="fa-regular fa-snowflake"></i>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-sky-400 to-teal-300 bg-clip-text text-transparent">
            花样滑冰 FSM 步法编排沙盒
          </h1>
          <p className="text-sm text-slate-400">
            基于有限状态机 (FSM) 的滑冰动力学与多样性自动校验系统
          </p>
        </div>
      </div>
      <div className="mt-4 md:mt-0 flex space-x-3 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center">
          <i className="fa-solid fa-bolt mr-1.5"></i> Mode: Pure TS (Offline SPA)
        </span>
      </div>
    </header>
  );
}