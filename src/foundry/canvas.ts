import { ActorType } from '@src/entities/entity-types';
import { overlay } from '@src/init';
import { NotificationType, notify } from './foundry-apps';
import { localize } from './localization';
import type { ValuesType } from 'utility-types';
import type { SceneEP } from '../entities/scene';
import type { CanvasLayers } from './foundry-cont';

/** An area effect's shape, in scene distance units and degrees. */
export type AreaTemplateData = {
  t: 'circle' | 'cone';
  distance: number;
  /** Cone opening, in degrees. */
  angle?: number;
  /** Cone direction, in degrees (0 points right). */
  direction?: number;
};

/**
 * A placed area on a scene. Since V14 these are Region documents; the
 * `templateId` name is kept because it is stored in chat and item flags.
 */
export type PlacedTemplateIDs = {
  templateId: string;
  sceneId: string;
};

const DEFAULT_CONE_ANGLE = 53.13;

type Point = { x: number; y: number };

type ShapeSource = {
  type: string;
  x: number;
  y: number;
  radius: number;
  angle?: number;
  rotation?: number;
  curvature?: string;
};

const distancePixels = (scene: SceneEP) => scene.grid.size / scene.grid.distance;

const shapeData = (
  { t, distance, angle, direction = 0 }: AreaTemplateData,
  { x, y }: Point,
  pixelsPerUnit: number,
): ShapeSource => {
  const radius = distance * pixelsPerUnit;
  return t === 'cone'
    ? {
        type: 'cone',
        x,
        y,
        radius,
        angle: angle ?? DEFAULT_CONE_ANGLE,
        rotation: direction,
        curvature: 'round',
      }
    : { type: 'circle', x, y, radius };
};

/** Whether this user may place area templates (Regions since V14). */
export const canPlaceAreas = () => game.user.can('REGION_CREATE');

let placing = false;

/**
 * Let the user place an area on the current scene: it follows the pointer,
 * the wheel rotates it, left-click places it and right-click or Escape
 * cancels. Starts at `origin` (panning there) or the view center.
 */
export const placeAreaTemplate = async (
  data: AreaTemplateData,
  { origin }: { origin?: Point | null } = {},
): Promise<PlacedTemplateIDs | null> => {
  const canvas = readyCanvas();
  if (!canvas || placing) return null;
  if (game.paused && !game.user.isGM) {
    notify(NotificationType.Warn, localize('placeWhilePaused'));
    return null;
  }

  const { scene, stage, activeLayer, tokens } = canvas;
  const start = origin ?? { x: stage.pivot.x, y: stage.pivot.y };
  const level = (canvas as unknown as { level?: { id: string } }).level;
  const regionData = {
    name: localize('areaEffect'),
    color: game.user.color,
    shapes: [shapeData(data, start, distancePixels(scene))],
    // Non-template regions default to only showing on the Region layer.
    visibility: (
      CONST as unknown as { REGION_VISIBILITY: { ALWAYS: number } }
    ).REGION_VISIBILITY.ALWAYS,
    displayMeasurements: true,
    highlightMode: 'coverage',
    ...(level ? { levels: [level.id] } : {}),
    ownership: {
      [game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    },
  };

  placing = true;
  overlay.faded = true;
  if (origin) canvas.pan(origin);
  try {
    const region = await canvas.regions.placeRegion(regionData);
    return region ? { templateId: region.id, sceneId: scene.id } : null;
  } finally {
    placing = false;
    overlay.faded = false;
    // Placement switches to the Region layer unless tokens were active.
    if (activeLayer !== tokens && canvas.activeLayer !== activeLayer) {
      activeLayer.activate();
    }
  }
};

const findPlacedRegion = (ids: PlacedTemplateIDs | null | undefined) =>
  ids ? game.scenes.get(ids.sceneId)?.regions.get(ids.templateId) : undefined;

/** Whether a stored area still exists (areas from before V14 may not). */
export const placedTemplateExists = (
  ids: PlacedTemplateIDs | null | undefined,
) => !!findPlacedRegion(ids);

export const deletePlacedTemplate = async (
  ids: PlacedTemplateIDs | undefined | null,
) => {
  await findPlacedRegion(ids)?.delete();
};

export const editPlacedTemplate = (
  ids: PlacedTemplateIDs | null | undefined,
) => {
  const region = findPlacedRegion(ids);
  if (region && readyCanvas()?.scene.id === ids?.sceneId) {
    region.sheet?.render(true);
  }
};

/** Change a placed area's shape, keeping its position and direction. */
export const updatePlacedTemplate = (
  ids: PlacedTemplateIDs,
  changed: Partial<AreaTemplateData>,
) => {
  const region = findPlacedRegion(ids);
  const [shape, ...otherShapes] = (region?._source.shapes ??
    []) as ShapeSource[];
  const scene = game.scenes.get(ids.sceneId);
  if (!region || !shape || !scene) return;
  const pixelsPerUnit = distancePixels(scene);
  const next = shapeData(
    {
      t: changed.t ?? (shape.type === 'cone' ? 'cone' : 'circle'),
      distance: changed.distance ?? shape.radius / pixelsPerUnit,
      angle: changed.angle ?? shape.angle,
      direction: changed.direction ?? shape.rotation,
    },
    shape,
    pixelsPerUnit,
  );
  return region.update({ shapes: [next, ...otherShapes] });
};

/**
 * Visible tokens inside a placed area on the current scene. Uses
 * testInsideRegion, not RegionDocument#tokens: that set is filled
 * asynchronously and is still empty right after placement.
 */
export const getVisibleTokensWithinTemplate = (
  ids: PlacedTemplateIDs | null | undefined,
) => {
  const contained = new Set<Token>();
  const canvas = readyCanvas();
  const region = findPlacedRegion(ids);
  if (!canvas || !region || canvas.scene.id !== ids?.sceneId) return contained;
  for (const token of canvas.tokens.placeables) {
    if (token.isVisible && token.document.testInsideRegion(region)) {
      contained.add(token);
    }
  }
  return contained;
};

type CanvasProps = {
  scene: SceneEP;
  stage: import('pixi.js').Application['stage'];
  // dimensions: ReturnType<typeof Canvas['getDimensions']>;
  dimensions: { size: number; distance: number; distancePixels: number };
  hud: HeadsUpDisplay;
  activeLayer: ValuesType<CanvasLayers>;
  app: import('pixi.js').Application;
  pan: (location: Partial<Record<'x' | 'y' | 'scale', number>>) => void;
};

export const controlledToken = () => {
  const canvas = readyCanvas();
  if (!canvas) return null;
  const { controlled } = canvas.tokens;
  return (
    controlled.find((t) => t.actor?.type === ActorType.Character) ??
    controlled[0] ??
    (game.user.character?.getActiveTokens(true, false)[0] as Token | undefined)
  );
};

export const readyCanvas = () => {
  const { Canvas } = foundry.canvas;
  return canvas instanceof Canvas && canvas.ready
    ? (canvas as Omit<Canvas, keyof CanvasProps> & CanvasLayers & CanvasProps)
    : null;
};
