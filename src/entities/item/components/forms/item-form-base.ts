import {
  DescriptionEditorHost,
  descriptionUpdateActions,
} from '@src/components/editor-wrapper/description-editor-host';
import { FormDrawer } from '@src/entities/components/form-layout/entity-form-drawer-mixin';
import { LitElement } from 'lit-element';
import type { ItemProxy } from '../../item';

export abstract class ItemFormBase extends DescriptionEditorHost(
  FormDrawer(LitElement),
) {
  declare abstract item: ItemProxy;

  get disabled() {
    return !this.item.editable;
  }

  protected get descriptionEditorState() {
    return {
      disabled: this.disabled,
      updateActions: descriptionUpdateActions(this.item.updater),
    };
  }
}
