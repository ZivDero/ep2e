import type { LitElement, PropertyValues } from 'lit-element';
import { html } from 'lit-html';
import type { Class } from 'type-fest';
import type { UpdateStore } from '@src/entities/update-store';
import type { EditorWrapper } from './editor-wrapper';

export type DescriptionEditorState = Pick<
  EditorWrapper,
  'disabled' | 'updateActions' | 'document'
>;

/** The stored document behind a proxy, if it has one (flag-stored ones don't). */
export const documentFromUuid = (uuid: string | null | undefined) =>
  uuid ? (fromUuidSync(uuid) as ClientDocument | null) : null;

/** The description field every item/actor/ego updater shares. */
export const descriptionUpdateActions = (updater: unknown) =>
  (updater as UpdateStore<{ system: { description: string } }>).path(
    'system',
    'description',
  );

/**
 * Keeps an entity form's description editor in the form's light DOM and projects
 * it into the layout through a slot. The ProseMirror editor needs a light-DOM
 * host: Foundry's editor styles and key handling don't reach into shadow roots.
 */
export const DescriptionEditorHost = <T extends Class<LitElement>>(Base: T) => {
  abstract class DescriptionHost extends Base {
    protected abstract get descriptionEditorState(): DescriptionEditorState;

    private descriptionEditor?: EditorWrapper;

    update(changedProps: PropertyValues) {
      this.descriptionEditor ??= this.createDescriptionEditor();
      Object.assign(this.descriptionEditor, this.descriptionEditorState);
      super.update(changedProps);
    }

    protected renderDescriptionSlot() {
      return html`<slot name="description" slot="description"></slot>`;
    }

    private createDescriptionEditor() {
      const editor = document.createElement('editor-wrapper');
      editor.slot = 'description';
      this.append(editor);
      return editor;
    }
  }
  return DescriptionHost;
};
