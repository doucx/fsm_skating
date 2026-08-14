import rawConfig from '../../config/moves_config.yaml';
import {
  State,
  ALL_STATES,
  getRelativeConditions,
  getNaturalCurvature,
  calculateNextState,
} from '../domain/models';

export interface MoveRawData {
  id: string;
  name: string;
  category: string;
  difficulty: number;
  turn_rotation?: string;
  conditions: {
    same_foot: boolean;
    same_dir: boolean;
    same_edge: boolean;
  };
  start_constraints?: {
    dir?: string;
    edge?: string;
  };
  geometry_config?: {
    radius_factor?: number;
    sweep_angle_factor?: number;
  };
}

export interface ConfigData {
  categories?: Record<string, string>;
  moves?: MoveRawData[];
}

export interface Move {
  id: string;
  name: string;
  category: string;
  difficulty: number;
  turn_rotation?: string;
  conditions: {
    same_foot: boolean;
    same_dir: boolean;
    same_edge: boolean;
  };
  start_constraints?: {
    dir?: string;
    edge?: string;
  };
  rotation_dir?: 'CW' | 'CCW' | null;
  geometry_config?: {
    radius_factor?: number;
    sweep_angle_factor?: number;
  };
}

export interface MoveOption {
  target_state: State;
  move: Move;
}

export interface TransitionDetail {
  from_state: State;
  to_state: State;
  candidate_moves: Move[];
  selected_move: Move;
}

export interface VerificationResponse {
  valid: boolean;
  error?: string;
  states?: State[];
  transitions?: TransitionDetail[];
  total_difficulty: number;
  is_ambiguous: boolean;
}

export interface MoveVerificationDetail {
  from_state: State;
  move: Move;
  to_state: State;
}

export interface MoveVerificationResponse {
  valid: boolean;
  error?: string;
  trace?: MoveVerificationDetail[];
  total_difficulty: number;
}

export function checkMatch(
  currentState: State,
  targetState: State,
  moveConfig: MoveRawData
): boolean {
  const conditions = moveConfig.conditions || {};
  const actualConditions = getRelativeConditions(currentState, targetState);

  if (
    conditions.same_foot !== actualConditions.same_foot ||
    conditions.same_dir !== actualConditions.same_dir ||
    conditions.same_edge !== actualConditions.same_edge
  ) {
    return false;
  }

  if (moveConfig.start_constraints) {
    const constraints = moveConfig.start_constraints;
    if (constraints.dir && currentState.direction !== constraints.dir) {
      return false;
    }
    if (constraints.edge && currentState.edge !== constraints.edge) {
      return false;
    }
  }

  return true;
}

interface ChoreoSearchNode {
  f_score: number;
  current_state: State;
  path_depth: number;
  path: Array<[State, Move | null]>;
  accumulated_difficulty: number;
  categories_used: Set<string>;
  cw_count: number;
  ccw_count: number;
}

class MinHeap<T> {
  private heap: Array<{ priority: number; id: number; data: T }> = [];

  push(priority: number, id: number, data: T) {
    this.heap.push({ priority, id, data });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): { priority: number; id: number; data: T } | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  get length(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(index, parent) < 0) {
        this.swap(index, parent);
        index = parent;
      } else {
        break;
      }
    }
  }

  private sinkDown(index: number) {
    const len = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < len && this.compare(left, smallest) < 0) {
        smallest = left;
      }
      if (right < len && this.compare(right, smallest) < 0) {
        smallest = right;
      }

      if (smallest !== index) {
        this.swap(index, smallest);
        index = smallest;
      } else {
        break;
      }
    }
  }

  private compare(i: number, j: number): number {
    if (this.heap[i].priority !== this.heap[j].priority) {
      return this.heap[i].priority - this.heap[j].priority;
    }
    return this.heap[i].id - this.heap[j].id;
  }

  private swap(i: number, j: number) {
    const tmp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = tmp;
  }
}

export class ChoreographyEngine {
  readonly moves: MoveRawData[];
  readonly categories: Record<string, string>;
  readonly distance_matrix: Record<string, Record<string, number>>;

  constructor(configData?: ConfigData) {
    const config = configData || (rawConfig as ConfigData);
    this.moves = config.moves || [];
    this.categories = config.categories || {};
    this.distance_matrix = this.buildDistanceMatrix();
  }

  private buildDistanceMatrix(): Record<string, Record<string, number>> {
    const matrix: Record<string, Record<string, number>> = {};

    for (const start of ALL_STATES) {
      const startStr = start.toString();
      matrix[startStr] = {};
      for (const target of ALL_STATES) {
        matrix[startStr][target.toString()] = Infinity;
      }
    }

    for (const start of ALL_STATES) {
      const startStr = start.toString();
      const queue: Array<[State, number]> = [[start, 0]];
      matrix[startStr][startStr] = 0;
      const visited = new Set<string>([startStr]);

      while (queue.length > 0) {
        const [curr, dist] = queue.shift()!;
        const options = this.getPossibleTransitions(curr);
        for (const opt of options) {
          const nxtStr = opt.target_state.toString();
          if (!visited.has(nxtStr)) {
            visited.add(nxtStr);
            matrix[startStr][nxtStr] = dist + 1;
            queue.push([opt.target_state, dist + 1]);
          }
        }
      }
    }

    return matrix;
  }

  buildMove(moveData: MoveRawData, currentState: State): Move {
    const turnRot = moveData.turn_rotation;
    let absRot: 'CW' | 'CCW' | null = null;

    if (turnRot === 'natural') {
      absRot = getNaturalCurvature(currentState);
    } else if (turnRot === 'opposite') {
      const startCurv = getNaturalCurvature(currentState);
      absRot = startCurv === 'CCW' ? 'CW' : 'CCW';
    }

    return {
      id: moveData.id,
      name: moveData.name,
      category: moveData.category,
      difficulty: moveData.difficulty,
      turn_rotation: moveData.turn_rotation,
      conditions: moveData.conditions,
      start_constraints: moveData.start_constraints,
      rotation_dir: absRot,
      geometry_config: moveData.geometry_config,
    };
  }

  getPossibleTransitions(
    currentState: State,
    maxDifficulty: number = 999
  ): MoveOption[] {
    const results: MoveOption[] = [];

    for (const targetState of ALL_STATES) {
      if (targetState.equals(currentState)) {
        continue;
      }

      for (const moveData of this.moves) {
        if (checkMatch(currentState, targetState, moveData)) {
          const diff = moveData.difficulty ?? 0;
          if (diff <= maxDifficulty) {
            const moveObj = this.buildMove(moveData, currentState);
            results.push({
              target_state: targetState,
              move: moveObj,
            });
          }
        }
      }
    }

    results.sort((a, b) => {
      if (a.move.difficulty !== b.move.difficulty) {
        return a.move.difficulty - b.move.difficulty;
      }
      return a.move.name.localeCompare(b.move.name);
    });

    return results;
  }

  verifySequence(sequenceStr: string): VerificationResponse {
    const parts = sequenceStr
      .split('->')
      .map((p) => p.trim().toUpperCase())
      .filter((p) => p.length > 0);

    const states: State[] = [];
    for (const part of parts) {
      try {
        states.push(State.fromString(part));
      } catch (e: any) {
        return {
          valid: false,
          error: `状态字符 '${part}' 格式有误: ${e.message}`,
          total_difficulty: 0,
          is_ambiguous: false,
        };
      }
    }

    if (states.length < 2) {
      return {
        valid: false,
        error: '状态序列中至少需要包含 2 个有效状态才能进行转移校验。',
        total_difficulty: 0,
        is_ambiguous: false,
      };
    }

    const transitionsDetails: TransitionDetail[] = [];
    let totalDifficulty = 0;

    for (let i = 0; i < states.length - 1; i++) {
      const sFrom = states[i];
      const sTo = states[i + 1];

      if (sFrom.equals(sTo)) {
        return {
          valid: false,
          error: `第 ${i + 1} 步转移出现原地停滞 (${sFrom} -> ${sTo})，这不符合动力学步法转移规则。`,
          total_difficulty: 0,
          is_ambiguous: false,
        };
      }

      const matchedMoves: Move[] = [];
      for (const moveData of this.moves) {
        if (checkMatch(sFrom, sTo, moveData)) {
          matchedMoves.push(this.buildMove(moveData, sFrom));
        }
      }

      if (matchedMoves.length === 0) {
        return {
          valid: false,
          error: `无法识别的物理转移: 从状态 ${sFrom} 无法直接通过任何已知动作转移到 ${sTo}。`,
          total_difficulty: 0,
          is_ambiguous: false,
        };
      }

      matchedMoves.sort((a, b) => {
        if (a.difficulty !== b.difficulty) {
          return a.difficulty - b.difficulty;
        }
        return a.name.localeCompare(b.name);
      });

      transitionsDetails.push({
        from_state: sFrom,
        to_state: sTo,
        candidate_moves: matchedMoves,
        selected_move: matchedMoves[0],
      });
      totalDifficulty += matchedMoves[0].difficulty;
    }

    const isAmbiguous = transitionsDetails.some(
      (t) => t.candidate_moves.length > 1
    );

    return {
      valid: true,
      states,
      transitions: transitionsDetails,
      total_difficulty: totalDifficulty,
      is_ambiguous: isAmbiguous,
    };
  }

  verifyMoveSequence(
    moveIds: string[],
    startState?: State
  ): MoveVerificationResponse {
    if (!moveIds || moveIds.length === 0) {
      return { valid: false, error: '动作 ID 序列不能为空。', total_difficulty: 0 };
    }

    const moveDb: Record<string, MoveRawData> = {};
    for (const m of this.moves) {
      moveDb[m.id] = m;
    }

    let currentState = startState;
    if (!currentState) {
      const firstMoveData = moveDb[moveIds[0]];
      if (!firstMoveData) {
        return {
          valid: false,
          error: `无法识别序列起始处的动作 ID: ${moveIds[0]}`,
          total_difficulty: 0,
        };
      }
      const constraints = firstMoveData.start_constraints || {};
      const dirC = constraints.dir || 'F';
      const edgeC = constraints.edge || 'O';
      currentState = new State('L', dirC, edgeC);
    }

    const traceDetails: MoveVerificationDetail[] = [];
    let totalDifficulty = 0;

    for (let idx = 0; idx < moveIds.length; idx++) {
      const moveId = moveIds[idx];
      const moveData = moveDb[moveId];
      if (!moveData) {
        return {
          valid: false,
          error: `在第 ${idx + 1} 步检测到未知动作 ID: '${moveId}'`,
          total_difficulty: 0,
        };
      }

      const constraints = moveData.start_constraints;
      if (constraints) {
        if (constraints.dir && currentState.direction !== constraints.dir) {
          return {
            valid: false,
            error: `第 ${idx + 1} 步动作校验失败：动作 '${moveData.name}' 要求以 '${constraints.dir}' 向起滑，但当前滑行状态为 '${currentState}'。`,
            total_difficulty: 0,
          };
        }
        if (constraints.edge && currentState.edge !== constraints.edge) {
          return {
            valid: false,
            error: `第 ${idx + 1} 步动作校验失败：动作 '${moveData.name}' 要求以 '${constraints.edge}' 内外刃起滑，但当前滑行状态为 '${currentState}'。`,
            total_difficulty: 0,
          };
        }
      }

      const nextState = calculateNextState(currentState, moveData.conditions);
      const moveObj = this.buildMove(moveData, currentState);

      traceDetails.push({
        from_state: currentState,
        move: moveObj,
        to_state: nextState,
      });

      totalDifficulty += moveObj.difficulty;
      currentState = nextState;
    }

    return {
      valid: true,
      trace: traceDetails,
      total_difficulty: totalDifficulty,
    };
  }

  generateSequence(
    steps: number,
    maxDifficulty: number,
    startState?: State
  ): Array<[State, Move | null]> | null {
    if (steps <= 0) return [];

    const initState =
      startState || ALL_STATES[Math.floor(Math.random() * ALL_STATES.length)];

    const shuffle = <T>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const dfs = (
      currState: State,
      remainingSteps: number
    ): Array<[State, Move]> | null => {
      if (remainingSteps === 0) return [];

      const options = this.getPossibleTransitions(currState, maxDifficulty);
      if (options.length === 0) return null;

      const shuffledOptions = shuffle(options);

      for (const opt of shuffledOptions) {
        const subPath = dfs(opt.target_state, remainingSteps - 1);
        if (subPath !== null) {
          return [[opt.target_state, opt.move], ...subPath];
        }
      }

      return null;
    };

    const subPath = dfs(initState, steps);
    if (subPath === null) return null;

    const result: Array<[State, Move | null]> = [];
    let curr = initState;
    for (const [nxtState, move] of subPath) {
      result.push([curr, move]);
      curr = nxtState;
    }
    result.push([curr, null]);

    return result;
  }

  checkLibraryIntegrity(): Record<
    string,
    {
      name: string;
      implemented: string[];
      missing: string[];
      generic_count: number;
    }
  > {
    const categories =
      Object.keys(this.categories).length > 0
        ? this.categories
        : {
            three_turn: '转三步 (Three-Turn)',
            bracket: '括弧步 (Bracket)',
            rocker: '摇滚步 (Rocker)',
            counter: '计数步 (Counter)',
            mohawk: '莫霍克步 (Mohawk)',
            choctaw: '乔克陶步 (Choctaw)',
          };

    const required = ['FO', 'FI', 'BO', 'BI'];
    const report: Record<
      string,
      {
        name: string;
        implemented: string[];
        missing: string[];
        generic_count: number;
      }
    > = {};

    for (const [catId, catName] of Object.entries(categories)) {
      report[catId] = {
        name: catName,
        implemented: [],
        missing: [...required],
        generic_count: 0,
      };
    }

    for (const move of this.moves) {
      const catId = move.category;
      if (!catId || !report[catId]) continue;

      const constraints = move.start_constraints;
      if (constraints && constraints.dir && constraints.edge) {
        const variant = `${constraints.dir}${constraints.edge}`;
        if (required.includes(variant)) {
          if (!report[catId].implemented.includes(variant)) {
            report[catId].implemented.push(variant);
          }
          const missIdx = report[catId].missing.indexOf(variant);
          if (missIdx !== -1) {
            report[catId].missing.splice(missIdx, 1);
          }
        }
      } else {
        report[catId].generic_count += 1;
      }
    }

    return report;
  }

  searchPaths(
    startState: State,
    endState: State,
    intermediateCount: number,
    maxDifficulty: number = 5,
    maxResults: number = 10,
    weights?: Record<string, number>
  ): Array<Array<[State, Move | null]>> {
    const targetSteps = intermediateCount + 1;
    const results: Array<Array<[State, Move | null]>> = [];

    const w = weights || {};
    const C_STEP = w.step_cost ?? 10.0;
    const C_DIFF = w.difficulty_bonus ?? 3.0;
    const C_BALANCE = w.balance_penalty ?? 15.0;
    const C_DIVERSITY = w.diversity_penalty ?? 20.0;

    const TARGET_CATEGORIES = 4;

    const openSet = new MinHeap<ChoreoSearchNode>();
    let nodeId = 0;

    const initNode: ChoreoSearchNode = {
      f_score: 0.0,
      current_state: startState,
      path_depth: 0,
      path: [[startState, null]],
      accumulated_difficulty: 0,
      categories_used: new Set<string>(),
      cw_count: 0,
      ccw_count: 0,
    };

    openSet.push(initNode.f_score, nodeId, initNode);
    const closedSet = new Set<string>();

    while (openSet.length > 0 && results.length < maxResults) {
      const popped = openSet.pop();
      if (!popped) break;
      const curr = popped.data;

      if (curr.path_depth === targetSteps) {
        if (curr.current_state.equals(endState)) {
          results.push(curr.path);
        }
        continue;
      }

      const catSorted = Array.from(curr.categories_used).sort().join(',');
      const stateKey = `${curr.current_state.toString()}_${curr.path_depth}_${catSorted}_${curr.cw_count}_${curr.ccw_count}`;

      if (closedSet.has(stateKey)) {
        continue;
      }
      closedSet.add(stateKey);

      const options = this.getPossibleTransitions(
        curr.current_state,
        maxDifficulty
      );

      for (const opt of options) {
        const nextState = opt.target_state;
        const move = opt.move;

        const remainingSteps = targetSteps - (curr.path_depth + 1);
        const minDist =
          this.distance_matrix[nextState.toString()]?.[endState.toString()] ??
          Infinity;

        if (remainingSteps < minDist) {
          continue;
        }

        const nextCategories = new Set(curr.categories_used);
        nextCategories.add(move.category);

        const nextCw = curr.cw_count + (move.rotation_dir === 'CW' ? 1 : 0);
        const nextCcw = curr.ccw_count + (move.rotation_dir === 'CCW' ? 1 : 0);

        const nextPath: Array<[State, Move | null]> = [
          ...curr.path.slice(0, -1),
          [curr.current_state, move],
          [nextState, null],
        ];

        const gScore =
          (curr.path_depth + 1) * C_STEP -
          (curr.accumulated_difficulty + move.difficulty) * C_DIFF;

        const hDist = remainingSteps * C_STEP;
        const balDiff = Math.abs(nextCw - nextCcw);
        const minFinalBalDiff = Math.max(0, balDiff - remainingSteps);
        const hBal = minFinalBalDiff * C_BALANCE;

        const missingCats = Math.max(
          0,
          TARGET_CATEGORIES - nextCategories.size - remainingSteps
        );
        const hDiv = missingCats * C_DIVERSITY;

        const fScore = gScore + hDist + hBal + hDiv;

        const nextNode: ChoreoSearchNode = {
          f_score: fScore,
          current_state: nextState,
          path_depth: curr.path_depth + 1,
          path: nextPath,
          accumulated_difficulty: curr.accumulated_difficulty + move.difficulty,
          categories_used: nextCategories,
          cw_count: nextCw,
          ccw_count: nextCcw,
        };

        nodeId += 1;
        openSet.push(fScore, nodeId, nextNode);
      }
    }

    return results;
  }
}