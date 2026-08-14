import { describe, it, expect } from 'vitest';
import {
  State,
  ALL_STATES,
  getRelativeConditions,
  getNaturalCurvature,
  getOppositeFoot,
  getOppositeDirection,
  getOppositeEdge,
  calculateNextState,
} from '../src/domain/models';

describe('Domain Models - State', () => {
  it('should create valid State correctly', () => {
    const s = new State('L', 'F', 'O');
    expect(s.toString()).toBe('LFO');
    expect(s.foot).toBe('L');
    expect(s.direction).toBe('F');
    expect(s.edge).toBe('O');
  });

  it('should parse State from string', () => {
    const s = State.fromString('lfo');
    expect(s.toString()).toBe('LFO');
    expect(s.foot).toBe('L');
  });

  it('should throw error on invalid State format or values', () => {
    expect(() => new State('X', 'F', 'O')).toThrow("Invalid foot: 'X'");
    expect(() => new State('L', 'U', 'O')).toThrow("Invalid direction: 'U'");
    expect(() => new State('L', 'F', 'Z')).toThrow("Invalid edge: 'Z'");
    expect(() => State.fromString('LF')).toThrow('Invalid state format');
  });

  it('should calculate relative conditions correctly', () => {
    const s1 = State.fromString('LFO');
    const s2 = State.fromString('LBI');
    const conds = getRelativeConditions(s1, s2);
    expect(conds.same_foot).toBe(true);
    expect(conds.same_dir).toBe(false);
    expect(conds.same_edge).toBe(false);

    const s3 = State.fromString('RFO');
    const conds2 = getRelativeConditions(s1, s3);
    expect(conds2.same_foot).toBe(false);
    expect(conds2.same_dir).toBe(true);
    expect(conds2.same_edge).toBe(true);
  });

  it('should flip attributes correctly', () => {
    expect(getOppositeFoot('L')).toBe('R');
    expect(getOppositeFoot('R')).toBe('L');
    expect(getOppositeDirection('F')).toBe('B');
    expect(getOppositeDirection('B')).toBe('F');
    expect(getOppositeEdge('O')).toBe('I');
    expect(getOppositeEdge('I')).toBe('O');
  });

  it('should calculate next state based on physical conditions', () => {
    const start = State.fromString('LFI');

    // Case A: same foot, opposite dir, opposite edge (Three-turn) => LBO
    const nextThreeTurn = calculateNextState(start, {
      same_foot: true,
      same_dir: false,
      same_edge: false,
    });
    expect(nextThreeTurn.toString()).toBe('LBO');

    // Case B: opposite foot, opposite dir, same edge (Mohawk) => RBI
    const nextMohawk = calculateNextState(start, {
      same_foot: false,
      same_dir: false,
      same_edge: true,
    });
    expect(nextMohawk.toString()).toBe('RBI');

    // Case C: same foot, same dir, opposite edge (Change of edge) => LFO
    const nextCoe = calculateNextState(start, {
      same_foot: true,
      same_dir: true,
      same_edge: false,
    });
    expect(nextCoe.toString()).toBe('LFO');
  });

  it('should compute natural curvature accurately', () => {
    expect(getNaturalCurvature(State.fromString('LFO'))).toBe('CCW');
    expect(getNaturalCurvature(State.fromString('LFI'))).toBe('CW');
    expect(getNaturalCurvature(State.fromString('RFO'))).toBe('CW');
    expect(getNaturalCurvature(State.fromString('RFI'))).toBe('CCW');
  });

  it('should contain all 8 states in ALL_STATES', () => {
    expect(ALL_STATES.length).toBe(8);
    const strings = ALL_STATES.map((s) => s.toString());
    expect(strings).toEqual(['LFO', 'LFI', 'LBO', 'LBI', 'RFO', 'RFI', 'RBO', 'RBI']);
  });
});