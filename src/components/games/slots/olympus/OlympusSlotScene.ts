/**
 * Backwards-compatible re-export — the rebuilt scene lives in OlympusScene.ts.
 * Existing imports of `OlympusSlotScene` keep working.
 */
export {
  OlympusSlotScene,
  type SpinOutcome,
  type OlympusSceneEvents,
  COLS, ROWS, CELL, GAP, GRID_W, GRID_H,
} from './OlympusScene';
