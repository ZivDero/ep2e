import {
  CombatActionType,
  tokenIsInCombat,
  TrackedCombatEntity,
  updateCombatState,
} from '@src/combat/combat-tracker';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import { enumValues } from '@src/data-enums';
import type { ActorEP } from '@src/entities/actor/actor';
import { ActorCreator } from '@src/entities/actor/components/actor-creator/actor-creator';
import { ActorType } from '@src/entities/entity-types';
import { ItemCreator } from '@src/entities/item/components/item-creator/item-creator';
import type { ItemDataEvent } from '@src/entities/item/components/item-creator/item-data-event';
import { ItemEP } from '@src/entities/item/item';
import { ConditionType } from '@src/features/conditions';
import { html, render } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined';
import { stopEvent } from 'weightless';
import { readyCanvas } from './canvas';
import { isKnownDrop, onlySetDragSource } from './drag-and-drop';
import type { TokenData } from './foundry-cont';
import { localize } from './localization';
import { gmIsConnected } from './misc-helpers';
import { activeTokenStatusEffects } from './token-helpers';

/**
 * Apply one patch to Foundry core. A core API that moved or changed then disables
 * only that patch instead of stopping the whole system from loading.
 */
const patch = (name: string, apply: () => void) => {
  try {
    apply();
  } catch (error) {
    console.error(`EP2e | Skipped core patch "${name}"`, error);
  }
};

export const overridePrototypes = () => {
  // Only offer EP characters (not sleeves or vehicles) as a user's character.
  // The V13+ sheet builds the <select> in a widget function it puts on the
  // render context, so filter that widget's options.
  patch('UserConfig character choices', () => {
    const { UserConfig } = foundry.applications.sheets;
    const { _prepareContext } = UserConfig.prototype;
    UserConfig.prototype._prepareContext = async function (
      ...args: unknown[]
    ) {
      const context = await _prepareContext.apply(this, args);
      const widget = context.characterWidget;
      if (typeof widget !== 'function') return context;
      const current = this.document?.character?.id;
      context.characterWidget = (...widgetArgs: unknown[]) => {
        const element = widget(...widgetArgs);
        if (element instanceof HTMLElement) {
          for (const option of element.querySelectorAll<HTMLOptionElement>(
            'select[name=character] option[value]',
          )) {
            const actor = option.value && game.actors.get(option.value);
            if (actor && actor.type !== ActorType.Character && actor.id !== current) {
              option.remove();
            }
          }
        }
        return element;
      };
      return context;
    };
  });

  patch('Token#_onUpdate', () => {
    const { _onUpdate } = foundry.canvas.placeables.Token.prototype;

    foundry.canvas.placeables.Token.prototype._onUpdate = function (
      data: Partial<TokenData>,
      options: unknown,
      userId: string,
    ) {
      _onUpdate.call(this, data, options, userId);
      this.actor?.render(false, {});
    };
  });

  patch('Token#_drawEffects', () => {
    foundry.canvas.placeables.Token.prototype._drawEffects = async function () {
      this.effects.renderable = false;

      // Clear Effects Container
      this.effects.removeChildren().forEach((c) => c.destroy());
      this.effects.bg = this.effects.addChild(new PIXI.Graphics());
      this.effects.overlay = null;

      this.effects.bg.zIndex = -1;

      // Same selection as core V14: effects whose showIcon setting asks for
      // an icon. The last overlay effect wins, as in core.
      const SHOW_ICON = (
        CONST as unknown as {
          ACTIVE_EFFECT_SHOW_ICON?: Record<'ALWAYS' | 'CONDITIONAL', number>;
        }
      ).ACTIVE_EFFECT_SHOW_ICON;
      const shown = (this.actor?.appliedEffects ?? []).filter(
        (effect: ActiveEffect) =>
          effect.img &&
          (SHOW_ICON
            ? effect.showIcon === SHOW_ICON.ALWAYS ||
              (effect.showIcon === SHOW_ICON.CONDITIONAL && effect.isTemporary)
            : effect.isTemporary),
      ) as ActiveEffect[];
      const overlay = [...shown]
        .reverse()
        .find((effect) => effect.getFlag('core', 'overlay'));

      // Draw effects
      const promises = [];
      for (const effect of shown) {
        promises.push(
          effect === overlay
            ? this._drawOverlay(effect.img, effect.tint)
            : this._drawEffect(effect.img, effect.tint),
        );
      }

      const effects = activeTokenStatusEffects(this);
      for (const iconPath of effects) {
        promises.push(this._drawEffect(iconPath, null));
      }
      await Promise.allSettled(promises);
      this.effects.sortChildren();

      this.effects.renderable = true;
      //@ts-ignore
      this.renderFlags.set({ refreshEffects: true });
    };
  });

  patch('TokenDocument#inCombat', () => {
    Object.defineProperty(TokenDocument.prototype, 'inCombat', {
      get(this: TokenDocument): boolean {
        return this.object ? tokenIsInCombat(this.object) : false;
      },
    });
  });

  patch('TokenHUD', () => {
    const { TokenHUD } = foundry.applications.hud;

    const { getData: getTokenData, _getStatusEffectChoices, _prepareContext } = TokenHUD.prototype;

    TokenHUD.prototype._prepareContext = async function (options: unknown) {
      const context = (await _prepareContext.call(this, options)) as {
        canToggleCombat: boolean;
        combatClass: 'active' | '';
      }
      context.canToggleCombat = gmIsConnected();
      context.combatClass =
        this.object && tokenIsInCombat(this.object) ? 'active' : '';

      return context;
    };

    TokenHUD.DEFAULT_OPTIONS.actions.combat = function (event: Event) {
      const button = (event.currentTarget as HTMLElement).querySelector("button[data-action='combat']");
      event.preventDefault();
      if (!this.object?.scene || !(button instanceof HTMLElement)) {
        return;
      }
      const token = this.object;
      const addToCombat = !tokenIsInCombat(token);
      button.classList.toggle('active', addToCombat);
      const tokens = new Set(
        (readyCanvas()?.tokens.controlled ?? [])
          .concat(token ?? [])
          .filter((token) => {
            const inCombat = tokenIsInCombat(token);
            return inCombat !== addToCombat;
          }),
      );

      if (addToCombat) {
        updateCombatState({
          type: CombatActionType.AddParticipants,
          payload: [...tokens].flatMap((token) => {
            const { scene } = token;
            if (!scene) return [];
            return {
              name: token.name,
              hidden: !!token.document.hidden,
              entityIdentifiers: {
                type: TrackedCombatEntity.Token,
                tokenId: token.id,
                sceneId: scene.id,
              },
            };
          }),
        });
      } else {
        updateCombatState({
          type: CombatActionType.RemoveParticipantsByToken,
          payload: [...tokens].flatMap((token) => {
            const { scene } = token;
            if (!scene) return [];
            return {
              tokenId: token.id,
              sceneId: scene.id,
            };
          }),
        });
      }
    };

    TokenHUD.prototype._getStatusEffectChoices = function () {
      const choices = _getStatusEffectChoices.call(this) as Record<
        string,
        {
          cssClass: string;
          id: string;
          isActive: boolean;
          isOverlay: boolean;
          src: string;
          title: string;
          _id: string | undefined;
        }
      >;

      const token = this.object!;

      if (token.actor) {
        const actor = token.actor as ActorEP;
        for (const conditionType of enumValues(ConditionType)) {
          const isActive = actor.conditions.includes(conditionType);
          if (conditionType in choices && choices[conditionType]) {
            const choice = choices[conditionType]!;
            choice.isActive = isActive;
            if (isActive) {
              choice.cssClass += ' active';
            }
          }
        }
      }

      return choices;
    };
  });

  patch('CombatTracker rendering', () => {
    const { CombatTracker } = foundry.applications.sidebar.tabs;
    const { _replaceHTML } = CombatTracker.prototype;
    CombatTracker.prototype._renderHTML = () => { };
    CombatTracker.prototype._replaceHTML = function (
      ...args: Parameters<typeof _replaceHTML>
    ) {
      const element = args[1] as HTMLElement;
      const options = args[2] as { isFirstRender: boolean }
      if (options.isFirstRender) {
        render(
          html`<combat-view
        ></combat-view>`,
          element,
        );
      }
      // _replaceHTML.apply(this, args);
    };
    // Core's _onRender looks up its own tracker markup, which <combat-view>
    // replaces, and throws on turn changes. Skip its part-specific work.
    const { _onRender } = CombatTracker.prototype;
    CombatTracker.prototype._onRender = function (
      context: unknown,
      options: object,
    ) {
      return _onRender.call(this, context, { ...options, parts: [] });
    };
  });

  // V14 can move apps into separate browser windows. EP's Lit elements and
  // its menus, tooltips and windows are bound to the main document, so keep
  // the apps that host EP content in the main window.
  patch('Disable detaching apps with EP content', () => {
    const { tabs, apps } = foundry.applications.sidebar;
    for (const app of [tabs.CombatTracker, tabs.ChatLog, apps.ChatPopout]) {
      if (app) app.prototype._canDetach = () => false;
    }
  });

  patch('DragDrop#_handleDragStart', () => {
    const { _handleDragStart } = foundry.applications.ux.DragDrop.implementation.prototype;
    foundry.applications.ux.DragDrop.implementation.prototype._handleDragStart = function (ev: DragEvent) {
      _handleDragStart.call(this, ev);
      let data: unknown = null;
      try {
        const stringified = ev.dataTransfer?.getData('text/plain');
        data = typeof stringified === 'string' && JSON.parse(stringified);
      } catch (error) {
        console.log(error);
      }

      if (isKnownDrop(data)) {
        onlySetDragSource(ev, data);
      }
    };
  });

  patch('Directory create entry', () => {
    const itemCreate = ({ itemInit }: ItemDataEvent) => {
      ItemEP.create(itemInit.data, itemInit.options);
    };

    const closeCreator = () => closeWindow(ItemCreator);

    // V13+ calls _onCreateEntry(event, target) from the createEntry action;
    // target is the clicked button, inside the folder row when there is one.
    const folderOf = (target: HTMLElement) =>
      target.closest<HTMLElement>('[data-folder-id]')?.dataset['folderId'];

    foundry.applications.sidebar.tabs.ItemDirectory.prototype._onCreateEntry =
      async function (ev: Event, target: HTMLElement) {
        stopEvent(ev);
        openWindow({
          key: ItemCreator,
          content: html` <item-creator
            showFolders
            @close-creator=${closeCreator}
            @item-data=${itemCreate}
            folder=${ifDefined(folderOf(target))}
          ></item-creator>`,
          name: `${localize('item')} ${localize('creator')}`,
          adjacentEl: target,
        });
      };

    foundry.applications.sidebar.tabs.ActorDirectory.prototype._onCreateEntry =
      async function (ev: Event, target: HTMLElement) {
        stopEvent(ev);
        openWindow({
          key: ActorCreator,
          content: html`
            <actor-creator folder=${ifDefined(folderOf(target))}></actor-creator>
          `,
          name: `${localize('actor')} ${localize('creator')}`,
          adjacentEl: target,
        });
      };
  });
};
