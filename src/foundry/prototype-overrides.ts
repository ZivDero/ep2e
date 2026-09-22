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
import type { SceneEP } from '@src/entities/scene';
import type { UserEP } from '@src/entities/user';
import { ConditionType, iconToCondition } from '@src/features/conditions';
import { openMenu } from '@src/open-menu';
import { findMatchingElement } from '@src/utility/dom';
import { notEmpty, searchRegExp } from '@src/utility/helpers';
import { html, render } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined';
import { compact, first, mapToObj, noop, pipe } from 'remeda';
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
  patch('UserConfig#getData', () => {
    const { getData } = foundry.applications.sheets.UserConfig.prototype;
    foundry.applications.sheets.UserConfig.prototype.getData = function () {
      const original = getData.call(this, {}) as {
        user: User;
        actors: ActorEP[];
        options: unknown;
      };
      return {
        ...original,
        actors: original.actors.filter(
          (actor) => actor.proxy.type === ActorType.Character,
        ),
      };
    };
  });

  patch('Game#_onPreventDragstart', () => {
    const { _onPreventDragstart } = foundry.Game.prototype;
    foundry.Game.prototype._onPreventDragstart = function (ev: DragEvent) {
      return pipe(ev.composedPath(), first(), (target) => {
        return target instanceof Element &&
          target.getAttribute('draggable') === 'true'
          ? undefined
          : _onPreventDragstart.call(this, ev);
      });
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

      // Categorize effects
      const activeEffects = this.actor?.temporaryEffects || [];
      let hasOverlay = false;

      // Draw effects
      const promises = [];
      for (const effect of activeEffects) {
        if (!effect.img) continue;
        if (effect.getFlag('core', 'overlay') && !hasOverlay) {
          promises.push(this._drawOverlay(effect.img, effect.tint));
          hasOverlay = true;
        } else promises.push(this._drawEffect(effect.img, effect.tint));
      }

      const effects = activeTokenStatusEffects(this);
      for (const iconPath of effects) {
        promises.push(this._drawEffect(iconPath, null));
      }
      await Promise.allSettled(promises);

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

    // @ts-expect-error
    const { getData: getTokenData, _getStatusEffectChoices, _prepareContext } = TokenHUD.prototype;

    // @ts-expect-error
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

    // @ts-expect-error
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

  patch('JournalSheet.defaultOptions', () => {
    const { defaultOptions: journalSheetOptions } = foundry.appv1.sheets.JournalSheet;
    Object.defineProperty(foundry.appv1.sheets.JournalSheet, 'defaultOptions', {
      enumerable: true,
      get() {
        return { ...(journalSheetOptions as {}), width: 620 };
      },
    });
  });

  patch('CombatTracker rendering', () => {
    const { _replaceHTML } = foundry.applications.sidebar.tabs.CombatTracker.prototype;
    //@ts-expect-error
    foundry.applications.sidebar.tabs.CombatTracker.prototype._renderHTML = () => { };
    foundry.applications.sidebar.tabs.CombatTracker.prototype._replaceHTML = function (
      ...args: Parameters<typeof _replaceHTML>
    ) {
      const element = args[1] as HTMLElement;
      // @ts-expect-error
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
  });

  patch('ChatMessage speaker', () => {
    ChatMessage._getSpeakerFromUser = function ({
      scene,
      user,
      alias,
    }: {
      scene: SceneEP | null;
      user: UserEP;
      alias?: string;
    }) {
      return {
        scene: scene?.id ?? readyCanvas()?.scene?.id,
        actor: null,
        token: null,
        alias: alias || user.name,
      };
    };

    ChatMessage._getSpeakerFromActor = function ({
      scene,
      actor,
      alias,
    }: {
      scene: SceneEP | null;
      actor: ActorEP;
      alias?: string;
    }) {
      return {
        scene: scene?.id ?? readyCanvas()?.scene?.id,
        actor: actor.id,
        token: null,
        alias: alias || actor.name,
      };
    };
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

    foundry.applications.sidebar.tabs.ItemDirectory.prototype._onCreateEntry = async function (ev: Event) {
      stopEvent(ev);

      if (ev.currentTarget instanceof HTMLElement) {
        openWindow({
          key: ItemCreator,
          content: html` <item-creator
            showFolders
            @close-creator=${closeCreator}
            @item-data=${itemCreate}
            folder=${ifDefined(ev.currentTarget.dataset['folder'])}
          ></item-creator>`,
          name: `${localize('item')} ${localize('creator')}`,
          adjacentEl: ev.currentTarget,
        });
      }
    };

    foundry.applications.sidebar.tabs.ActorDirectory.prototype._onCreateEntry = async function (ev: Event) {
      stopEvent(ev);

      if (ev.currentTarget instanceof HTMLElement) {
        openWindow({
          key: ActorCreator,
          content: html`
            <actor-creator
              folder=${ifDefined(ev.currentTarget.dataset['folder'])}
            ></actor-creator>
          `,
          name: `${localize('actor')} ${localize('creator')}`,
          adjacentEl: ev.currentTarget,
        });
      }
    };
  });
};
