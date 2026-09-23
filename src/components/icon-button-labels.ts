import { IconButton } from '@material/mwc-icon-button';
import { IconButtonToggle } from '@material/mwc-icon-button-toggle';

// Most of EP's icon buttons have no label, and MWC falls back to the icon's
// ligature ("more_vert") as the accessible name. Name them from their tooltip,
// or from the icon when there is none. An explicit aria-label always wins.

const lang = (key: string, fallback: string) => {
  const path = `EP2E.${key}`;
  return game.i18n?.has(path) ? game.i18n.localize(path) : fallback;
};

const iconLabels: Record<string, () => string> = {
  edit: () => lang('edit', 'Edit'),
  add: () => lang('add', 'Add'),
  launch: () => 'Open',
  change_history: () => lang('history', 'History'),
  more_vert: () => 'More options',
  settings: () => lang('settings', 'Settings'),
  save: () => lang('save', 'Save'),
  close: () => lang('close', 'Close'),
  clear: () => lang('delete', 'Remove'),
  delete_outline: () => lang('delete', 'Delete'),
  delete_forever: () => lang('delete', 'Delete'),
  restore_from_trash: () => 'Restore',
  chevron_left: () => 'Previous',
  chevron_right: () => 'Next',
  keyboard_arrow_left: () => 'Previous',
  keyboard_arrow_right: () => 'Next',
  arrow_backward: () => 'Back',
  arrow_forward: () => 'Forward',
  fast_rewind: () => 'Rewind',
  fast_forward: () => 'Fast forward',
  expand_more: () => 'Expand',
  expand_less: () => 'Collapse',
  place: () => 'Place',
  refresh: () => 'Refresh',
  power_settings_new: () => 'Toggle active',
  settings_power: () => 'Toggle active',
  play_arrow: () => 'Start',
  visibility_off: () => 'Hide',
  swap_horiz: () => 'Swap',
  done: () => 'Done',
  check: () => 'Confirm',
  cancel: () => 'Cancel',
  remove: () => 'Remove',
  remove_circle_outline: () => 'Remove',
  insert_photo: () => 'Change image',
  favorite: () => 'Favorite',
  favorite_border: () => 'Favorite',
  ac_unit: () => 'Environment',
  casino: () => 'Roll',
};

const labelFor = (el: HTMLElement, icon: string | undefined) => {
  const tooltip = el.dataset['epTooltip'] || el.title;
  if (tooltip) return tooltip;
  if (!icon) return '';
  const known = iconLabels[icon];
  if (known) return known();
  const words = icon.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const autoLabel = Symbol('autoLabel');

type Labelled = HTMLElement & {
  ariaLabel: string;
  icon?: string;
  onIcon?: string;
  offIcon?: string;
  on?: boolean;
  [autoLabel]?: string;
};

for (const Base of [IconButton, IconButtonToggle]) {
  const proto = Base.prototype as unknown as {
    update(this: Labelled, changed: Map<PropertyKey, unknown>): void;
  };
  const { update } = proto;
  proto.update = function (changed) {
    if (!this.ariaLabel || this.ariaLabel === this[autoLabel]) {
      const icon = this.icon || (this.on ? this.onIcon : this.offIcon);
      const label = labelFor(this, icon);
      this[autoLabel] = label;
      this.ariaLabel = label;
    }
    update.call(this, changed);
  };
}
