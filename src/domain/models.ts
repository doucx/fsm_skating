export type Foot = 'L' | 'R';
export type Direction = 'F' | 'B';
export type Edge = 'O' | 'I';

export interface RelativeConditions {
  same_foot: boolean;
  same_dir: boolean;
  same_edge: boolean;
}

export class State {
  readonly foot: Foot;
  readonly direction: Direction;
  readonly edge: Edge;

  constructor(foot: string, direction: string, edge: string) {
    const f = foot.toUpperCase();
    const d = direction.toUpperCase();
    const e = edge.toUpperCase();

    if (f !== 'L' && f !== 'R') {
      throw new Error(`Invalid foot: '${foot}'. Must be 'L' or 'R'.`);
    }
    if (d !== 'F' && d !== 'B') {
      throw new Error(`Invalid direction: '${direction}'. Must be 'F' or 'B'.`);
    }
    if (e !== 'O' && e !== 'I') {
      throw new Error(`Invalid edge: '${edge}'. Must be 'O' or 'I'.`);
    }

    this.foot = f as Foot;
    this.direction = d as Direction;
    this.edge = e as Edge;
  }

  static fromString(s: string): State {
    const trimmed = s.trim().toUpperCase();
    if (trimmed.length !== 3) {
      throw new Error(`Invalid state format: '${s}'. Must be 3 characters, e.g., 'LFO'.`);
    }
    return new State(trimmed[0], trimmed[1], trimmed[2]);
  }

  toString(): string {
    return `${this.foot}${this.direction}${this.edge}`;
  }

  toJSON(): string {
    return this.toString();
  }

  equals(other: State): boolean {
    return (
      this.foot === other.foot &&
      this.direction === other.direction &&
      this.edge === other.edge
    );
  }
}

export const ALL_STATES: readonly State[] = [
  new State('L', 'F', 'O'),
  new State('L', 'F', 'I'),
  new State('L', 'B', 'O'),
  new State('L', 'B', 'I'),
  new State('R', 'F', 'O'),
  new State('R', 'F', 'I'),
  new State('R', 'B', 'O'),
  new State('R', 'B', 'I'),
];

export function getRelativeConditions(s1: State, s2: State): RelativeConditions {
  return {
    same_foot: s1.foot === s2.foot,
    same_dir: s1.direction === s2.direction,
    same_edge: s1.edge === s2.edge,
  };
}

export function getNaturalCurvature(state: State): 'CW' | 'CCW' {
  if (state.foot === 'L') {
    if (state.direction === 'F') {
      return state.edge === 'O' ? 'CCW' : 'CW';
    } else {
      return state.edge === 'O' ? 'CW' : 'CCW';
    }
  } else {
    if (state.direction === 'F') {
      return state.edge === 'O' ? 'CW' : 'CCW';
    } else {
      return state.edge === 'O' ? 'CCW' : 'CW';
    }
  }
}

export function getOppositeFoot(foot: Foot | string): Foot {
  return foot.toUpperCase() === 'L' ? 'R' : 'L';
}

export function getOppositeDirection(direction: Direction | string): Direction {
  return direction.toUpperCase() === 'F' ? 'B' : 'F';
}

export function getOppositeEdge(edge: Edge | string): Edge {
  return edge.toUpperCase() === 'O' ? 'I' : 'O';
}

export function calculateNextState(
  currentState: State,
  conditions: Partial<RelativeConditions>
): State {
  const sameFoot = conditions.same_foot ?? true;
  const sameDir = conditions.same_dir ?? true;
  const sameEdge = conditions.same_edge ?? true;

  const nextFoot = sameFoot ? currentState.foot : getOppositeFoot(currentState.foot);
  const nextDir = sameDir ? currentState.direction : getOppositeDirection(currentState.direction);
  const nextEdge = sameEdge ? currentState.edge : getOppositeEdge(currentState.edge);

  return new State(nextFoot, nextDir, nextEdge);
}