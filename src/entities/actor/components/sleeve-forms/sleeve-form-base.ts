import type { ActorProxy, MaybeToken } from '@src/entities/actor/actor';
import type { ItemProxy } from '@src/entities/item/item';
import { setDragDrop, DropType } from '@src/foundry/drag-and-drop';
import { LitElement, property } from 'lit-element';
import {
  DescriptionEditorHost,
  descriptionUpdateActions,
} from '@src/components/editor-wrapper/description-editor-host';
import { FormDrawer } from '../../../components/form-layout/entity-form-drawer-mixin';

export abstract class SleeveFormBase extends DescriptionEditorHost(
  FormDrawer(LitElement),
) {
  declare abstract sleeve: ActorProxy;

  protected get descriptionEditorState() {
    return {
      disabled: this.sleeve.disabled,
      updateActions: descriptionUpdateActions(this.sleeve.updater),
    };
  }

  protected itemDragStart = (ev: DragEvent, item: ItemProxy) => {
    setDragDrop(
      ev,
      item.uuid
        ? {
            type: DropType.Item,
            uuid: item.uuid,
          }
        : {
            type: DropType.Item,
            data: item.data,
          },
    );
  };
}
