import { describe, it, expect, beforeEach } from 'vitest';
import { ChoreographyEngine } from '../src/services/engine';
import { State } from '../src/domain/models';

describe('ChoreographyEngine Services Suite', () => {
  let engine: ChoreographyEngine;

  beforeEach(() => {
    engine = new ChoreographyEngine();
  });

  it('should load moves config correctly', () => {
    expect(engine.moves.length).toBeGreaterThan(0);
    expect(engine.moves[0].id).toBe('change_of_edge');
  });

  it('should filter possible transitions correctly', () => {
    const current = State.fromString('LFO');
    const results = engine.getPossibleTransitions(current);

    const lfiMoves = results.filter((r) => r.target_state.toString() === 'LFI');
    expect(lfiMoves.length).toBeGreaterThanOrEqual(1);
    expect(lfiMoves[0].move.id).toBe('change_of_edge');
  });

  it('should infer rotation direction correctly', () => {
    const current = State.fromString('LFO');
    const results = engine.getPossibleTransitions(current);

    const lbiMoves = results.filter((r) => r.target_state.toString() === 'LBI');
    expect(lbiMoves.length).toBeGreaterThanOrEqual(2);

    const threeTurn = lbiMoves.find((m) => m.move.id.includes('three_turn'))!;
    const bracket = lbiMoves.find((m) => m.move.id.includes('bracket'))!;

    expect(threeTurn.move.rotation_dir).toBe('CCW');
    expect(bracket.move.rotation_dir).toBe('CW');
  });

  it('should verify sequence correctly', () => {
    const res = engine.verifySequence('RFI -> LBI');
    expect(res.valid).toBe(true);
    expect(res.transitions![0].selected_move.id).toBe('forward_inside_mohawk');
  });

  it('should reject invalid sequence with standing still', () => {
    const res = engine.verifySequence('LFO -> LFO');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('原地停滞');
  });

  it('should generate sequence within max difficulty', () => {
    const path = engine.generateSequence(5, 3, State.fromString('LFO'));
    expect(path).not.toBeNull();
    expect(path!.length).toBe(6);
    for (let i = 0; i < path!.length - 1; i++) {
      const move = path![i][1]!;
      expect(move.difficulty).toBeLessThanOrEqual(3);
    }
  });

  it('should pass library integrity check', () => {
    const report = engine.checkLibraryIntegrity();
    const coreCategories = [
      'three_turn',
      'bracket',
      'rocker',
      'counter',
      'mohawk',
      'choctaw',
    ];
    for (const cat of coreCategories) {
      expect(report[cat]).toBeDefined();
      expect(report[cat].implemented.length).toBe(4);
      expect(report[cat].missing.length).toBe(0);
      expect(report[cat].generic_count).toBe(0);
    }
  });

  it('should detect DAG ambiguity in sequence verification', () => {
    // 1. Unique path
    const resUnique = engine.verifySequence('LFO -> LFI');
    expect(resUnique.valid).toBe(true);
    expect(resUnique.is_ambiguous).toBe(false);

    // 2. Ambiguous path (LFI -> LBO has both three-turn and bracket)
    const resAmbiguous = engine.verifySequence('LFI -> LBO');
    expect(resAmbiguous.valid).toBe(true);
    expect(resAmbiguous.is_ambiguous).toBe(true);
    expect(resAmbiguous.transitions![0].candidate_moves.length).toBeGreaterThanOrEqual(2);

    // 3. Long chain ambiguity
    const resLong = engine.verifySequence('LFO -> LFI -> LBO');
    expect(resLong.valid).toBe(true);
    expect(resLong.is_ambiguous).toBe(true);
  });

  it('should verify move sequence successfully', () => {
    const start = State.fromString('LFO');
    const moves = ['stroke', 'forward_inside_three_turn'];

    const res = engine.verifyMoveSequence(moves, start);
    expect(res.valid).toBe(true);
    expect(res.trace!.length).toBe(2);

    // Step 1: LFO --(Stroke)--> RFI
    const step1 = res.trace![0];
    expect(step1.from_state.toString()).toBe('LFO');
    expect(step1.move.id).toBe('stroke');
    expect(step1.to_state.toString()).toBe('RFI');

    // Step 2: RFI --(Forward Inside Three-Turn)--> RBO
    const step2 = res.trace![1];
    expect(step2.from_state.toString()).toBe('RFI');
    expect(step2.move.id).toBe('forward_inside_three_turn');
    expect(step2.to_state.toString()).toBe('RBO');

    expect(res.total_difficulty).toBe(3);
  });

  it('should handle default start state in move sequence verification', () => {
    const moves = ['forward_outside_three_turn'];
    const res = engine.verifyMoveSequence(moves);
    expect(res.valid).toBe(true);
    expect(res.trace![0].from_state.toString()).toBe('LFO');
  });

  it('should reject move sequence with start constraint violations', () => {
    const start = State.fromString('LBO');
    const moves = ['forward_outside_three_turn'];

    const res = engine.verifyMoveSequence(moves, start);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("要求以 'F' 向起滑");
  });

  it('should search direct adjacent paths', () => {
    const start = State.fromString('LFO');
    const end = State.fromString('LFI');

    const paths = engine.searchPaths(start, end, 0);
    expect(paths.length).toBeGreaterThanOrEqual(1);

    for (const p of paths) {
      expect(p.length).toBe(2);
      expect(p[0][0].toString()).toBe('LFO');
      expect(p[1][0].toString()).toBe('LFI');
      expect(p[0][1]!.id).toBe('change_of_edge');
    }
  });

  it('should search paths with intermediate states', () => {
    const start = State.fromString('LFO');
    const end = State.fromString('RBO');

    const paths = engine.searchPaths(start, end, 1);
    expect(paths.length).toBeGreaterThan(0);

    for (const p of paths) {
      expect(p.length).toBe(3);
      expect(p[0][0].toString()).toBe('LFO');
      expect(p[2][0].toString()).toBe('RBO');
      expect(p[0][1]).not.toBeNull();
      expect(p[1][1]).not.toBeNull();
      expect(p[2][1]).toBeNull();
    }
  });

  it('should return empty when search path has no solution under difficulty limits', () => {
    const start = State.fromString('LFO');
    const end = State.fromString('RFO');

    const paths = engine.searchPaths(start, end, 0, 1);
    expect(paths.length).toBe(0);
  });
});