import { resolveRoamerExitLegs, resolveRoamerExitPath } from '../resolveRoamerExitPath';

describe('resolveRoamerExitPath', () => {
  const SCREEN_W = 400;
  const SCREEN_H = 800;

  it('routes leg 1 through the matched rose', () => {
    const path = resolveRoamerExitPath({
      waypointX: 200,
      waypointY: 300,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
    });
    expect(path.leg1).toEqual({ x: 200, y: 300 });
  });

  it('exits the top edge when the rose is closest to it', () => {
    const path = resolveRoamerExitPath({
      waypointX: 200,
      waypointY: 100,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
    });
    expect(path.exitEdge).toBe('top');
    expect(path.leg2).toEqual({ x: 200, y: -180 });
  });

  it('exits the bottom edge when the rose is closest to it', () => {
    const path = resolveRoamerExitPath({
      waypointX: 200,
      waypointY: 700,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
    });
    expect(path.exitEdge).toBe('bottom');
    expect(path.leg2).toEqual({ x: 200, y: 980 });
  });

  it('exits the left edge when the rose is closest to it', () => {
    const path = resolveRoamerExitPath({
      waypointX: 50,
      waypointY: 400,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
    });
    expect(path.exitEdge).toBe('left');
    expect(path.leg2).toEqual({ x: -180, y: 400 });
  });

  it('exits the right edge when the rose is closest to it', () => {
    const path = resolveRoamerExitPath({
      waypointX: 380,
      waypointY: 400,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
    });
    expect(path.exitEdge).toBe('right');
    expect(path.leg2).toEqual({ x: 580, y: 400 });
  });

  it('ties break to the earlier edge in scan order (top first)', () => {
    const path = resolveRoamerExitPath({
      waypointX: 200,
      waypointY: 200,
      screenWidth: 400,
      screenHeight: 400,
    });
    expect(path.exitEdge).toBe('top');
  });

  it('honours a custom margin', () => {
    const path = resolveRoamerExitPath({
      waypointX: 200,
      waypointY: 100,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      margin: 60,
    });
    expect(path.leg2).toEqual({ x: 200, y: -60 });
  });
});

describe('resolveRoamerExitLegs', () => {
  it('flattens the path into leg coordinates', () => {
    const legs = resolveRoamerExitLegs({
      waypointX: 120,
      waypointY: 300,
      screenWidth: 400,
      screenHeight: 800,
    });
    expect(legs.leg1X).toBe(120);
    expect(legs.leg1Y).toBe(300);
    expect(legs.leg2X).toBe(-180);
    expect(legs.leg2Y).toBe(300);
  });
});
