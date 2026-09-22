import type { EntityType } from './foundry-cont';
import type { Class } from 'type-fest';
import type { SceneEP } from '@src/entities/scene';

type HookType = keyof Pick<
  typeof Hooks,
  'on' | 'off' | 'once' | 'call' | 'callAll'
>;

export enum MutateEvent {
  PreCreate = 'preCreate',
  Create = 'create',
  PreUpdate = 'preUpdate',
  Update = 'update',
  PreDelete = 'preDelete',
  Delete = 'delete',
}

/**
 * Hook an application event by the app's class name (e.g. 'ChatLog').
 * Takes a name rather than the class so that registering at import time never
 * depends on a core namespace path, which could throw if core moves a class.
 * ApplicationV2 fires the hook for every class in its inheritance chain, on
 * every render; check options.isFirstRender for one-time work.
 */
export const applicationHook = ({
  app,
  hook,
  event,
  callback,
}: {
  app: string;
  hook: HookType;
  event: 'render' | 'close';
  callback: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app: any,
    html: HTMLElement,
    context: unknown,
    options: { isFirstRender?: boolean } | undefined,
  ) => void;
}) => Hooks[hook](event + app, callback);

export const mutateEntityHook = <T extends EntityType, E = InstanceType<T>>({
  entity,
  hook,
  event,
  callback: cb,
}: {
  entity: T;
  hook: HookType;
  event: MutateEvent | 'hover';
  callback: (ent: E, more: unknown) => void;
}) => Hooks[hook](event + entity.documentName, cb);

export const mutatePlaceableHook = <
  T extends Pick<
    PlaceableObject,
    'uuid' | 'clone' | 'refresh' | '_canHUD' | 'document'
  >,
  >({
    entity,
    hook,
    event,
    callback: cb,
  }: {
    entity: Class<T>;
    hook: HookType;
    event: MutateEvent;
    callback: (
      entData: T extends { document: unknown } ? T['document'] : unknown,
      change: unknown,
    ) => void;
  }) => Hooks[hook](event + entity.name, cb);
