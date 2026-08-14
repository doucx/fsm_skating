import { Move } from '../services/engine';
import { State } from '../domain/models';

export interface ParsedStateInfo {
  foot: string | null;
  direction: string | null;
  edge: string | null;
  isLeft: boolean;
  isForward: boolean;
  isOutside: boolean;
}

export function parseState(stateInput: string | State): ParsedStateInfo {
  const stateStr = typeof stateInput === 'string' ? stateInput : stateInput.toString();
  if (!stateStr || stateStr.length !== 3) {
    return {
      foot: null,
      direction: null,
      edge: null,
      isLeft: false,
      isForward: false,
      isOutside: false,
    };
  }
  const foot = stateStr[0].toUpperCase();
  const direction = stateStr[1].toUpperCase();
  const edge = stateStr[2].toUpperCase();
  return {
    foot,
    direction,
    edge,
    isLeft: foot === 'L',
    isForward: direction === 'F',
    isOutside: edge === 'O',
  };
}

export function getCurvature(stateInput: string | State): 'CW' | 'CCW' {
  const { isLeft, isForward, isOutside } = parseState(stateInput);
  let isCW = false;
  if (isLeft) {
    isCW = isForward ? !isOutside : isOutside;
  } else {
    isCW = isForward ? isOutside : !isOutside;
  }
  return isCW ? 'CW' : 'CCW';
}

export interface Point2D {
  x: number;
  y: number;
  theta: number;
}

export interface ArcSegment {
  points: Point2D[];
  length: number;
  state: string;
  move: Move | null;
}

export interface GeometryNode {
  x: number;
  y: number;
  label: string;
  category: string;
  state: string;
  move?: Move | null;
}

export interface ComputedGeometry {
  nodes: GeometryNode[];
  arcs: ArcSegment[];
}

export function getArcProgressInfo(arc: ArcSegment, s: number): Point2D {
  const points = arc.points;
  const totalSegments = points.length - 1;
  const rawIdx = s * totalSegments;
  const idx = Math.floor(rawIdx);
  const frac = rawIdx - idx;

  if (idx >= totalSegments) {
    return points[totalSegments];
  }

  const p0 = points[idx];
  const p1 = points[idx + 1];

  const interpX = p0.x + (p1.x - p0.x) * frac;
  const interpY = p0.y + (p1.y - p0.y) * frac;
  const interpTheta = p0.theta + (p1.theta - p0.theta) * frac;

  return { x: interpX, y: interpY, theta: interpTheta };
}

export interface PathStep {
  state: string | State;
  move?: Move | null;
}

export function computeGeometry(
  pathData: PathStep[],
  R = 50,
  sweepAngle = Math.PI * 0.65
): ComputedGeometry {
  if (!pathData || pathData.length === 0) return { nodes: [], arcs: [] };

  const nodes: GeometryNode[] = [];
  const arcs: ArcSegment[] = [];
  let x = 0;
  let y = 0;
  let theta = 0; // 0 radians (horizontal right)

  const firstStateStr =
    typeof pathData[0].state === 'string'
      ? pathData[0].state
      : pathData[0].state.toString();

  nodes.push({
    x,
    y,
    label: 'START',
    category: 'start',
    state: firstStateStr,
  });

  const DECAY_COEFF = 0.18;
  const INTEGRATION_STEPS = 40;

  for (let i = 0; i < pathData.length; i++) {
    const step = pathData[i];
    const stateStr =
      typeof step.state === 'string' ? step.state : step.state.toString();

    const geomConfig = step.move?.geometry_config || {};
    const radiusFactor =
      geomConfig.radius_factor !== undefined ? geomConfig.radius_factor : 1.0;
    const sweepAngleFactor =
      geomConfig.sweep_angle_factor !== undefined
        ? geomConfig.sweep_angle_factor
        : 1.0;

    const currentR = R * radiusFactor;
    const currentSweepAngle = sweepAngle * sweepAngleFactor;

    const curve = getCurvature(stateStr);
    const K = curve === 'CW' ? -1 : 1;

    const points: Point2D[] = [];
    points.push({ x, y, theta });

    const dPhi = currentSweepAngle / INTEGRATION_STEPS;
    let arcLength = 0;

    for (let j = 0; j < INTEGRATION_STEPS; j++) {
      const s = (j + 0.5) / INTEGRATION_STEPS;
      const R_inst = currentR * (1 - DECAY_COEFF * s);

      const dTheta = -K * dPhi;
      const ds = R_inst * dPhi;
      arcLength += ds;

      const thetaMid = theta + dTheta / 2;

      x += ds * Math.cos(thetaMid);
      y += ds * Math.sin(thetaMid);
      theta += dTheta;

      points.push({ x, y, theta });
    }

    arcs.push({
      points,
      length: arcLength,
      state: stateStr,
      move: step.move || null,
    });

    const isLast = i === pathData.length - 1;
    const nextStepStateStr =
      !isLast && pathData[i + 1]
        ? typeof pathData[i + 1].state === 'string'
          ? (pathData[i + 1].state as string)
          : pathData[i + 1].state.toString()
        : '';

    nodes.push({
      x,
      y,
      label: isLast ? 'END' : step.move ? step.move.name : '',
      category: isLast ? 'end' : step.move ? step.move.category : 'point',
      state: isLast ? '' : nextStepStateStr,
      move: step.move || null,
    });
  }

  return { nodes, arcs };
}