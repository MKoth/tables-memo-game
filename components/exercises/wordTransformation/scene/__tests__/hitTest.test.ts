import { pickSceneHitTarget, type SceneHitTarget } from '../hitTest';

const letters: SceneHitTarget[] = [
  { kind: 'letter', position: 0, centerX: 100, centerY: 100, diameter: 40 },
  { kind: 'letter', position: 1, centerX: 160, centerY: 100, diameter: 40 },
];

const picker: SceneHitTarget[] = [
  { kind: 'picker', id: 'a', centerX: 100, centerY: 200, diameter: 44 },
];

describe('pickSceneHitTarget', () => {
  it('hits a letter at its center', () => {
    const hit = pickSceneHitTarget(100, 100, letters);
    expect(hit).not.toBeNull();
    if (hit != null && hit.kind === 'letter') {
      expect(hit.position).toBe(0);
    }
  });

  it('hits within the circle radius but not outside', () => {
    const inside = pickSceneHitTarget(119, 100, letters);
    expect(inside != null && inside.kind === 'letter' && inside.position === 0).toBe(true);
    expect(pickSceneHitTarget(121, 100, letters)).toBeNull();
  });

  it('picks the nearest target when circles overlap', () => {
    const overlapping: SceneHitTarget[] = [
      { kind: 'letter', position: 0, centerX: 100, centerY: 100, diameter: 60 },
      { kind: 'letter', position: 1, centerX: 120, centerY: 100, diameter: 60 },
    ];
    const hit = pickSceneHitTarget(115, 100, overlapping);
    expect(hit != null && hit.kind === 'letter' && hit.position === 1).toBe(true);
  });

  it('hits picker items and returns their id', () => {
    const hit = pickSceneHitTarget(100, 200, picker);
    expect(hit != null && hit.kind === 'picker' && hit.id === 'a').toBe(true);
  });

  it('returns null when nothing contains the point', () => {
    expect(pickSceneHitTarget(50, 50, [...letters, ...picker])).toBeNull();
  });

  it('returns null for an empty target list', () => {
    expect(pickSceneHitTarget(100, 100, [])).toBeNull();
  });
});
