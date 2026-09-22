import { html, render } from 'lit-html';
import { first, values } from 'remeda';
import type { PartialDeep } from 'type-fest';
import { createMessage, currentMessageVisibility } from './chat/create-message';
import { onChatMessageRender } from './chat/message-hooks';
import { combatSocketHandler, tokenIsInCombat } from './combat/combat-tracker';
import { CombatView } from './combat/components/combat-view/combat-view';
import { CustomRollApp } from './combat/components/custom-roll-app/custom-roll-app';
import { EPOverlay } from './components/ep-overlay/ep-overlay';
import { renderNumberField } from './components/field/fields';
import { renderAutoForm, renderSubmitForm } from './components/form/forms';
import type { Popover } from './components/popover/popover';
import { Placement } from './components/popover/popover-options';
import type { ToolTip } from './components/tooltip/tooltip';
import { SlWindow } from './components/window/window';
import { openWindow } from './components/window/window-controls';
import { ResizeOption } from './components/window/window-options';
import { enumValues } from './data-enums';
import { ActorEP } from './entities/actor/actor';
import { ActorEPSheet } from './entities/actor/actor-sheet';
import { formattedSleeveInfo, isSleeve } from './entities/actor/sleeves';
import { ChatMessageEP } from './entities/chat-message';
import { CompendiumSearch } from './entities/components/compendium-search/compendium-search';
import { ActorType } from './entities/entity-types';
import { findActor, findToken } from './entities/find-entities';
import { ItemEP } from './entities/item/item';
import { ItemEPSheet } from './entities/item/item-sheet';
import { migrateWorld } from './entities/migration';
import { foundry9to10Migration } from './entities/v9to10migration';
import type { ItemEntity } from './entities/models';
import { SceneEP } from './entities/scene';
import { UserEP } from './entities/user';
import { conditionIcons, ConditionType } from './features/conditions';
import { positionApp } from './foundry/foundry-apps';
import type { TokenData } from './foundry/foundry-cont';
import { registerEPSettings } from './foundry/game-settings';
import {
  applicationHook,
  mutateEntityHook,
  MutateEvent,
  mutatePlaceableHook,
} from './foundry/hook-setups';
import { localize } from './foundry/localization';
import { addEPSocketHandler, setupSystemSocket } from './foundry/socket';
import { EP } from './foundry/system';
import { openMenu } from './open-menu';
import { rollSuccessTest } from './success-test/success-test';
import { notEmpty } from './utility/helpers';
import { localImage } from './utility/images';
import { GMPanel } from './gm-panel/gm-panel';
import { readyCanvas } from './foundry/canvas';


export let gameSettings: ReturnType<typeof registerEPSettings>;
export let overlay: EPOverlay;
export let tooltip: ToolTip;
export let lastEventPosition: DragEvent | MouseEvent | null = null;

const setLastPosition = (ev: DragEvent | MouseEvent) =>
  (lastEventPosition = ev);
window.addEventListener('mousedown', setLastPosition, { capture: true });
window.addEventListener('mouseup', setLastPosition, { capture: true });
window.addEventListener('click', setLastPosition, { capture: true });
window.addEventListener('drop', setLastPosition, { capture: true });



Hooks.once('init', () => {
  gameSettings = registerEPSettings();

  gameSettings.combatState.subscribe(() => {
    const toggleCombatButton = document.querySelector("#token-hud button[data-action='combat']:not(:focus-within)");
    if (toggleCombatButton instanceof HTMLElement) {
      const token = (readyCanvas()?.tokens.hud.object) as Token | undefined;
      const isInCombat = token ? tokenIsInCombat(token) : false;
      toggleCombatButton.classList.toggle('active', isInCombat);
    }
  })


  //@ts-expect-error
  foundry.documents.BaseItem.DEFAULT_ICON = localImage(
    'icons/nested-eclipses.svg',
  );
  CONFIG.Actor.documentClass = ActorEP;
  foundry.documents.collections.Actors.registerSheet(EP.Name, ActorEPSheet, { makeDefault: true });

  CONFIG.Scene.documentClass = SceneEP;
  CONFIG.ChatMessage.documentClass = ChatMessageEP;
  CONFIG.ChatMessage.batchSize = 20;

  CONFIG.User.documentClass = UserEP;
  CONFIG.Item.documentClass = ItemEP;

  foundry.documents.collections.Items.registerSheet(EP.Name, ItemEPSheet, { makeDefault: true });
  CONFIG.Combat.initiative.decimals = 2;
  // V14 keys status effects by id and uses name/img. Keep core's defeated
  // status: the combat view's defeated toggle applies it as an overlay.
  const defeated = Object.values(
    CONFIG.statusEffects as Record<string, { id: string }>,
  ).find(({ id }) => id === CONFIG.specialStatusEffects.DEFEATED);
  CONFIG.statusEffects = Object.fromEntries([
    ...(defeated ? [[defeated.id, defeated]] : []),
    ...enumValues(ConditionType).map((condition) => [
      condition,
      {
        id: condition,
        name: `${EP.LocalizationNamespace}.${condition}`,
        img: conditionIcons[condition],
      },
    ]),
  ]);

  addEPSocketHandler('mutateCombat', combatSocketHandler);
});

Hooks.on('renderChatMessageHTML', onChatMessageRender);

Hooks.once('ready', async () => {
  setupSystemSocket();

  if (game.user.isGM) {
    const { current } = gameSettings.systemMigrationVersion;

    if (foundry.utils.isNewerVersion(game.system.version, current)) {
      // Scans every document, so only run it when the system version changes.
      await foundry9to10Migration();
      await migrateWorld();
      gameSettings.systemMigrationVersion.update(game.system.version);
    }
  }

  document.getElementById('board')?.addEventListener('mousedown', (ev) => {
    if (ev.button === 1) {
      ev.preventDefault();
      // Middle-click on the canvas lists the active scene control's tools.
      // Mirrors how core's SceneControls handles a tool click (V13+).
      const control = ui.controls.control as {
        name: string;
        title: string;
        tools: Record<
          string,
          {
            name: string;
            icon: string;
            title: string;
            order?: number;
            toggle?: boolean;
            button?: boolean;
            active?: boolean;
            onChange?: (event: Event, active: boolean) => void;
          }
        >;
      } | null;
      const tools = control
        ? values(control.tools).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [];
      if (control && notEmpty(tools)) {
        openMenu({
          header: { heading: game.i18n.localize(control.title) },
          content: tools.map((tool) => ({
            label: game.i18n.localize(tool.title),
            icon: html`<i class=${tool.icon}></i>`,
            activated:
              ui.controls.tool?.name === tool.name ||
              (!!tool.toggle && !!tool.active),
            callback: () => {
              if (tool.button) tool.onChange?.(ev, true);
              else if (tool.toggle) {
                ui.controls.activate({
                  event: ev,
                  toggles: { [tool.name]: !tool.active },
                });
              } else ui.controls.activate({ event: ev, tool: tool.name });
            },
          })),
          position: ev,
        });
      }
    }
  });

  addEPSocketHandler(
    'itemChange',
    ({ type, itemIds, ...source }, id, local) => {
      if (local || type !== 'update') return;

      for (const item of findActor(source)?.items.values() || []) {
        if (itemIds.includes(item.id)) item.invalidate();
      }
    },
  );

  setTimeout(() => {
    overlay = new EPOverlay();
    document.body.append(overlay);
    // SlWindow.container = overlay;
    const windowContainer = document.createElement('div');
    windowContainer.className = 'ep-window-container';
    windowContainer.addEventListener("dragstart", ev => {
      ev.stopPropagation()
    })
    SlWindow.container = windowContainer
    document.body.append(windowContainer);


    tooltip = document.createElement('sl-tooltip');
    // tooltip.slot = 'tooltip';
    overlay.append(tooltip);
    document.body.classList.add('ready');
    Hooks.call('ep-ready', true);


    const extraInfo = document.createElement('div');
    extraInfo.className = 'ep-extra-info';
    extraInfo.append(document.createElement('scene-view'));
    extraInfo.append(document.createElement('world-time-controls'));

    const extraChatControlsFrag = new DocumentFragment();

    render(
      html`
        <div class="ep-extra-chat-controls">
          <mwc-icon-button
          data-ep-tooltip=${`${localize('custom')} ${localize('roll')}`}
          @mouseover=${tooltip.fromData}
          @click=${(ev: Event & { currentTarget: HTMLElement }) =>
          openWindow({
            key: CustomRollApp,
            content: html`<custom-roll-app></custom-roll-app>`,
            name: `${localize('custom')} ${localize('roll')}`,
            adjacentEl: ev.currentTarget,
          })}
        >
          <img class="noborder" src="icons/svg/combat.svg" />
        </mwc-icon-button>
        <sl-popover
          placement=${Placement.Left}
          focusSelector="input"
          .renderOnDemand=${(popover: Popover) => {
          return html`<sl-popover-section>
              ${renderSubmitForm({
            noDebounce: true,
            submitButtonText: 'Roll Success Test',
            submitEmpty: true,
            props: { target: 50 },
            update: async (changed) => {
              const { target = 50 } = changed;
              createMessage({
                data: {
                  successTest: {
                    disableSuperiorEffects: true,
                    parts: [{ name: 'Base', value: target }],
                    states: [
                      {
                        ...(await rollSuccessTest({ target })),
                        action: 'initial',
                      },
                    ],
                  },
                },
                visibility: currentMessageVisibility(),
              });
              popover.open = false;
            },
            fields: ({ target }) =>
              renderNumberField(target, { min: 0, max: 99 }),
          })}
            </sl-popover-section>`;
        }}
        >
          <mwc-icon-button
            slot="base"
            data-ep-tooltip="Quick Success Test"
            @mouseover=${tooltip.fromData}
            @contextmenu=${() => {
          new Roll('1d100 - 1').toMessage();
        }}
          >
            <span style="font-size:var(--mdc-icon-size);font-weight:bold;">%</span>
          </mwc-icon-button>
        </sl-popover>
      </div>
      `,
      extraChatControlsFrag,
    );

    extraInfo.append(extraChatControlsFrag);

    const uiTop = document.getElementById('ui-top');
    uiTop?.insertBefore(extraInfo, uiTop.querySelector(':scope > #loading'));


    if (game.user.isGM) {
      const gmFrag = new DocumentFragment();
      render(html` <mwc-icon-button
      id="ep-gm-panel"
        data-ep-tooltip=${`GM Panel`}
        @mouseover=${tooltip.fromData}
        @click=${(ev: Event & { currentTarget: HTMLElement }) =>
          openWindow({
            key: GMPanel,
            content: html`<gm-panel></gm-panel>`,
            name: `GM Panel`,
            adjacentEl: ev.currentTarget,
          }, { resizable: ResizeOption.Both })}
      >
        <img  class="noborder" src="icons/svg/dice-target.svg" />
      </mwc-icon-button>`, gmFrag)
      extraInfo?.prepend(gmFrag);
    }

  }, 150);

  const compendiumSearchButton = () => {
    const frag = new DocumentFragment();
    render(
      html`
        <mwc-button
          class="ep-compendium-search"
          style="width: calc(100% - 0.5rem); margin: 0.25rem; line-height: 1;"
          label=${localize('search')}
          icon="search"
          raised
          @click=${() => {
          openWindow({
            key: CompendiumSearch,
            name: localize('search'),
            content: html` <compendium-search></compendium-search> `,
          });
        }}
        ></mwc-button>
      `,
      frag,
    );
    return frag;
  };

  // Right-clicking the combat sidebar tab opens the EP combat view window
  // instead of core's tab popout. Delegated, since the sidebar re-renders.
  document.addEventListener(
    'contextmenu',
    (ev) => {
      const target = ev.target instanceof Element ? ev.target : null;
      if (!target?.closest("#sidebar-tabs [data-tab='combat']")) return;
      ev.stopPropagation();
      ev.preventDefault();
      openWindow(
      {
        key: CombatView,
        content: html`<combat-view></combat-view>`,
        name: localize('combat'),
      },
      { resizable: ResizeOption.Both },
    );
    },
    { capture: true },
  );

  const addCompendiumSearchButton = (root: ParentNode | null | undefined) => {
    const footer = root?.querySelector('.directory-footer');
    if (footer && !footer.querySelector('.ep-compendium-search')) {
      footer.append(compendiumSearchButton());
    }
  };

  addCompendiumSearchButton(document.getElementById('compendium'));

  applicationHook({
    app: 'CompendiumDirectory',
    hook: 'on',
    event: 'render',
    callback: (_, el) => addCompendiumSearchButton(el),
  });


  mutatePlaceableHook({
    entity: foundry.canvas.placeables.Token,
    hook: 'on',
    event: MutateEvent.Update,
    callback: (tokenDoc, change) => {
      const changes = change as PartialDeep<TokenData>;
      if ('actorLink' in changes && changes.actorLink === false) {
        const actorId = tokenDoc.actorId;
        const actor = game.actors.get(actorId);
        if (actor?.sheet.isRendered) {
          actor.sheet.close();
          tokenDoc.actor?.sheet.render(true, { token: tokenDoc });
        }
      }
    },
  });

  mutatePlaceableHook({
    entity: foundry.canvas.placeables.Token,
    hook: 'on',
    event: MutateEvent.Delete,
    callback: (tokenDoc) => {
      if (tokenDoc.actorLink) {
        const actor = game.actors.get(tokenDoc.actorId);
        if (actor?.sheet.isRendered && actor.sheet._token?.id === tokenDoc.id) {
          actor.sheet.render(true);
        }
      }
    },
  });
});

let lastClicked: HTMLElement | null = null;

window.addEventListener(
  'click',
  (ev) => {
    const { target } = ev;
    const origTarget = first(ev.composedPath()) || target;
    lastClicked = origTarget instanceof HTMLElement ? origTarget : null;
    return (
      target instanceof HTMLLIElement &&
      target.matches(`.document.actor, .document.item`) &&
      target.querySelector<HTMLElement>('.entry-name')?.click()
    );
  },
  { capture: true },
);

// Open dialogs and folder/file pickers next to the element that was clicked.
for (const app of ['DialogV2', 'FolderConfig', 'FilePicker']) {
  applicationHook({
    app,
    hook: 'on',
    event: 'render',
    callback: (dialog, _element, _context, options) => {
      if (!options?.isFirstRender) return;
      const closestItem = lastClicked?.closest<HTMLElement>('.document');
      const relative = closestItem || lastClicked;
      if (relative?.isConnected) positionApp(dialog, relative);
    },
  });
}

window.addEventListener(
  'keydown',
  ({ key, target }) =>
    key === 'Enter' &&
    target instanceof HTMLLIElement &&
    target.matches('.document.actor, .document.item') &&
    target.click(),
);

const isItem = (entity: ItemEP | ActorEP): entity is ItemEP => {
  return (entity as ActorEP).itemOperations === undefined;
};

applicationHook({
  app: 'Compendium',
  hook: 'on',
  event: 'render',
  callback: async (compendium, el) => {
    if (compendium.collection.documentName === 'Item') {
      await compendium.collection.getDocuments();
      for (const listItem of (el?.querySelectorAll('li.directory-item.item') ??
        []) as Iterable<HTMLLIElement>) {
        if (listItem.offsetParent) {
          const doc: ItemEP = await compendium.collection.getDocument(
            listItem.getAttribute('data-entry-id'),
          );


          listItem
            .querySelector('.entry-name')
            ?.setAttribute('data-type', doc.proxy.fullType);
        }
      }
    } else if (compendium.collection.documentName === 'Actor') {
      await compendium.collection.getDocuments();
      for (const listItem of (el?.querySelectorAll('li.directory-item.actor') ??
        []) as Iterable<HTMLLIElement>) {
        if (listItem.offsetParent) {
          const doc: ActorEP = await compendium.collection.getDocument(
            listItem.getAttribute('data-entry-id'),
          );

          const type = localize(doc.type);
          listItem
            .querySelector('.entry-name')
            ?.setAttribute(
              'data-type',
              isSleeve(doc.proxy)
                ? formattedSleeveInfo(doc.proxy).concat(type).join(' - ')
                : type,
            );
        }
      }
    }
  },
});

if (true) {
  for (const app of ['ActorDirectory', 'ItemDirectory']) {
    applicationHook({
      app,
      hook: 'on',
      event: 'render',
      callback: (_, list) => {
        return list?.querySelectorAll<HTMLLIElement>('.document').forEach((listItem) => {
          const { entryId } = listItem.dataset;
          const doc = entryId &&
            game[app === 'ActorDirectory' ? 'actors' : 'items'].get(entryId);
          if (!doc)
            return;

          if (isItem(doc)) {
            applyFullItemInfo(doc, listItem);
          } else {
            applyFullActorItemInfo(doc, listItem);
          }
        });
      },
    });
  }
}

function applyFullActorItemInfo(actor: ActorEP, listItem: HTMLElement) {
  const nameElement =
    listItem.querySelector<HTMLHeadingElement>('.entry-name');
  if (!nameElement) {
    return;
  }
  if (actor.type !== ActorType.Character && isSleeve(actor.proxy)) {
    nameElement.dataset['type'] = formattedSleeveInfo(actor.proxy)
      .concat(localize(actor.type))
      .join(' - ');
  } else {
    nameElement.dataset['type'] = localize(actor.type);
  }
  listItem.title = `${actor.name}
        ${nameElement.dataset['type']}`;
}

function applyFullItemInfo(item: ItemEP, listItem: HTMLElement) {
  const nameElement =
    listItem.querySelector<HTMLHeadingElement>('.entry-name');
  if (!nameElement) {
    return;
  }
  nameElement.textContent = item.proxy.fullName;
  nameElement.dataset['type'] = item.proxy.fullType;
  listItem.title = `${item.name}
        ${nameElement.dataset['type']}`;
}

mutateEntityHook({
  entity: ItemEP,
  hook: 'on',
  event: MutateEvent.Update,
  callback: (item) => {
    if (!item.actor && !item.compendium) {
      const sidebarListItem = document.querySelector(
        `.sidebar-tab.directory .directory-item.item[data-entry-id="${item.id}"]`,
      );
      if (sidebarListItem instanceof HTMLElement) {
        applyFullItemInfo(item, sidebarListItem);
      }
    }
  },
});
