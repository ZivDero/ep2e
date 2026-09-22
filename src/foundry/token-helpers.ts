import { conditionIcons } from '@src/features/conditions';
import { nonNegative } from '@src/utility/helpers';
import { concat, first, pipe, uniq } from 'remeda';
import type { ActorEP, MaybeToken } from '../entities/actor/actor';
import { readyCanvas } from './canvas';

export const panToToken = (token: Token) => {
  if (token?.isVisible && token.scene?.isView) {
    token.control();
    readyCanvas()?.animatePan({
      x: token.x,
      y: token.y,
      scale: undefined,
      speed: undefined,
    });
  }
};

export const releaseTargetToken = (token: Token) =>
  token.setTarget(false, { releaseOthers: false });

export const releaseAllTargets = () =>
  first([...game.user.targets])?.setTarget(false, { releaseOthers: true });

export const activeTokenStatusEffects = ({ document: data, actor }: Token) =>
  ((actor as ActorEP | undefined)?.conditions ?? []).map(
    (condition) => conditionIcons[condition],
  )

export const distanceBetweenTokens = (tokenA: Token, tokenB: Token) => {
  // Straight line between centers, including elevation. measurePath's
  // `distance` applies the grid's diagonal rule; `euclidean` doesn't.
  let distance = readyCanvas()!.grid.measurePath([
    { ...tokenA.center, elevation: tokenA.document.elevation },
    { ...tokenB.center, elevation: tokenB.document.elevation },
  ]).euclidean;

  const gridScale = readyCanvas()?.scene.grid.distance || 1;

  if (tokenB.document.width === tokenB.document.height) {
    distance -= (tokenB.document.width / 2) * gridScale;
  }

  return nonNegative(Math.round(distance * 10) / 10);
};

export const getTokenPlaceable = (
  tokenDoc: MaybeToken,
  actor?: ActorEP | null,
) => {
  return (
    tokenDoc?.object ??
    (actor?.getActiveTokens(true, false)[0] as undefined | Token)
  );
};
