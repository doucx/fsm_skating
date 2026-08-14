import { describe, it, expect } from 'vitest';
import { parseState, getCurvature, computeGeometry, getArcProgressInfo } from '../src/web/geometry';
import { State } from '../src/domain/models';

describe('Geometry Computations Suite', () => {
  it('should parse state string or State object correctly', () => {
    const info = parseState('LFO');
    expect(info.isLeft).toBe(true);
    expect(info.isForward).toBe(true);
    expect(info.isOutside).toBe(true);

    const infoObj = parseState(State.fromString('RBI'));
    expect(infoObj.isLeft).toBe(false);
    expect(infoObj.isForward).toBe(false);
    expect(infoObj.isOutside).toBe(false);
  });

  it('should calculate curvature correctly', () => {
    expect(getCurvature('LFO')).toBe('CCW');
    expect(getCurvature('LFI')).toBe('CW');
    expect(getCurvature('RFO')).toBe('CW');
    expect(getCurvature('RFI')).toBe('CCW');
  });

  it('should compute geometry arcs and nodes properly', () => {
    const pathData = [
      {
        state: 'LFO',
        move: {
          id: 'change_of_edge',
          name: '变刃滑行',
          category: 'change_of_edge',
          difficulty: 1,
          conditions: { same_foot: true, same_dir: true, same_edge: false },
        },
      },
      { state: 'LFI', move: null },
    ];

    const geometry = computeGeometry(pathData);
    expect(geometry.nodes.length).toBe(3); // START, node1, END
    expect(geometry.arcs.length).toBe(2);

    expect(geometry.nodes[0].label).toBe('START');
    expect(geometry.nodes[1].label).toBe('变刃滑行');
    expect(geometry.nodes[2].label).toBe('END');

    expect(geometry.arcs[0].state).toBe('LFO');
    expect(geometry.arcs[1].state).toBe('LFI');
    expect(geometry.arcs[0].points.length).toBeGreaterThan(10);
  });

  it('should interpolate arc progress info correctly', () => {
    const pathData = [{ state: 'LFO', move: null }];
    const geometry = computeGeometry(pathData);
    const arc = geometry.arcs[0];

    const startPt = getArcProgressInfo(arc, 0);
    const midPt = getArcProgressInfo(arc, 0.5);
    const endPt = getArcProgressInfo(arc, 1.0);

    expect(startPt.x).toBe(arc.points[0].x);
    expect(endPt.x).toBe(arc.points[arc.points.length - 1].x);
    expect(midPt.x).toBeGreaterThan(startPt.x);
  });
});