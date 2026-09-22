import { reposition } from 'nanopop';

export enum NotificationType {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export const notify = (
  type: NotificationType,
  message: string,
  { permanent = false } = {},
) => {
  ui.notifications.notify(message, type, { permanent });
};

type PositionableApp = {
  element: HTMLElement;
  setPosition(position: { left?: number; top?: number }): unknown;
};

/**
 * Move an ApplicationV2 window next to the element that opened it. Call from
 * a first-render hook: the app's element is already in the document then.
 */
export const positionApp = (app: PositionableApp, relative: HTMLElement) => {
  const rect = relative.getBoundingClientRect();
  if (!rect.top && !rect.left) return;
  const { element } = app;
  if (!(element instanceof HTMLElement) || !element.isConnected) return;
  reposition(relative, element, { position: 'bottom' });
  const { top, left } = element.getBoundingClientRect();
  app.setPosition({ left, top: top - 3 });
};

const pickers = new WeakMap<
  object,
  InstanceType<typeof foundry.applications.apps.FilePicker.implementation>
>();

export const openImagePicker = (
  key: object,
  currentSrc: string,
  callback: (path: string) => void,
) => {
  const picker = pickers.get(key);
  if (picker?.rendered) closeImagePicker(key);
  else {
    const newPicker = new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current: currentSrc,
      callback,
    });

    pickers.set(key, newPicker);
    newPicker.browse(currentSrc, {});
  }
};

export const closeImagePicker = (key: object) => {
  const picker = pickers.get(key);
  if (picker) {
    picker.close({});
    pickers.delete(key);
  }
};

