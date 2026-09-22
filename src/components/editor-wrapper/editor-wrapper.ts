import type { CircularProgress } from '@material/mwc-circular-progress';
import type { UpdateActions } from '@src/entities/update-store';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import {
  customElement,
  LitElement,
  property,
  html,
  PropertyValues,
  query,
} from 'lit-element';
import type { EnrichedHTML } from '../enriched-html/enriched-html';
import styles from './editor-wrapper.scss';

type ProseMirrorEditor = {
  view: {
    focus(): void;
    state: { doc: { content: unknown } };
  };
  destroy(): void;
};

declare global {
  // Foundry's ProseMirror namespace (a non-deprecated global in V13/V14).
  const ProseMirror: {
    defaultSchema: unknown;
    dom: { serializeString(content: unknown): string };
    ProseMirrorMenu: { build(schema: unknown, options: object): unknown };
    ProseMirrorKeyMaps: { build(schema: unknown, options: object): unknown };
  };
}

enum EditorState {
  Viewing,
  Opening,
  Editing,
}

/**
 * Shows enriched rich text with a toggle to edit it in Foundry's ProseMirror
 * editor. The editor is mounted in this element's light DOM and slotted in:
 * Foundry's keybinding focus checks, editor menus and theme CSS only work on
 * light-DOM editors.
 */
@customElement('editor-wrapper')
export class EditorWrapper extends LitElement {
  static get is() {
    return 'editor-wrapper' as const;
  }

  static styles = [styles];

  @property({
    attribute: false,
    type: Object,
    hasChanged() {
      return true;
    },
  })
  updateActions!: Pick<UpdateActions<string>, 'commit' | 'originalValue'>;

  @property({ type: Boolean }) disabled = false;

  @property({ type: String }) heading = '';

  /**
   * The document the content belongs to, if it is a real one (flag-stored
   * sub-items are not). Enables relative links, secrets for owners and
   * image uploads.
   */
  @property({ attribute: false }) document?: ClientDocument | null;

  @query('.spinner', true) private spinner!: CircularProgress;

  @query('enriched-html') private contentArea?: EnrichedHTML;

  private state = EditorState.Viewing;

  private editor: ProseMirrorEditor | null = null;

  private editorContainer: HTMLElement | null = null;

  disconnectedCallback() {
    this.closeEditor({ save: true });
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues<this>) {
    if (changedProps.has('disabled') && this.disabled) {
      if (this.state === EditorState.Opening) this.state = EditorState.Viewing;
      this.closeEditor({ save: false });
    }
  }

  private get content() {
    return this.updateActions.originalValue();
  }

  private toggleEditor() {
    if (this.state === EditorState.Editing) this.closeEditor({ save: true });
    else this.openEditor();
  }

  private async openEditor() {
    if (this.state !== EditorState.Viewing || this.disabled) return;
    this.state = EditorState.Opening;
    this.spinner.closed = false;
    this.requestUpdate();

    const container = document.createElement('div');
    container.className = 'editor prosemirror themed theme-dark';
    container.slot = 'editor';
    const target = document.createElement('div');
    target.className = 'editor-content';
    container.append(target);
    this.append(container);

    try {
      const { defaultSchema, ProseMirrorMenu, ProseMirrorKeyMaps } =
        ProseMirror;
      const onSave = () => this.closeEditor({ save: true });
      const { document: doc } = this;
      this.editor = (await foundry.applications.ux.ProseMirrorEditor.create(
        target,
        this.content,
        {
          ...(doc
            ? {
                document: doc,
                fieldName: 'system.description',
                relativeLinks: true,
              }
            : {}),
          plugins: {
            menu: ProseMirrorMenu.build(defaultSchema, { onSave }),
            keyMaps: ProseMirrorKeyMaps.build(defaultSchema, { onSave }),
          },
        },
      )) as ProseMirrorEditor;
    } catch (error) {
      console.error(error);
      container.remove();
      this.state = EditorState.Viewing;
      this.spinner.closed = true;
      this.requestUpdate();
      notify(NotificationType.Error, localize('editorFailed'));
      return;
    }

    if (!this.isConnected || this.state !== EditorState.Opening) {
      // Closed or disabled while the editor was being created.
      this.editor?.destroy();
      this.editor = null;
      this.state = EditorState.Viewing;
      container.remove();
      return;
    }

    this.editorContainer = container;
    this.state = EditorState.Editing;
    this.spinner.closed = true;
    this.requestUpdate();
    this.editor.view.focus();
  }

  private closeEditor({ save }: { save: boolean }) {
    const { editor, editorContainer } = this;
    if (!editor) return;
    const content = ProseMirror.dom.serializeString(
      editor.view.state.doc.content,
    );
    this.editor = null;
    this.editorContainer = null;
    this.state = EditorState.Viewing;
    editor.destroy();
    editorContainer?.remove();
    if (save) this.save(content);
    this.requestUpdate();
  }

  private save(content: string) {
    if (content === this.content || this.disabled) return;
    try {
      this.contentArea?.animate(
        { opacity: [0, 1] },
        { duration: 200, easing: 'ease-in-out', fill: 'forwards' },
      );
      this.updateActions.commit(content);
    } catch (error) {
      console.log(error);
    }
  }

  render() {
    const editing = this.state !== EditorState.Viewing;
    return html`
      <header>
        ${this.heading || localize('description')}
        <mwc-icon-button-toggle
          class="toggle"
          slot="actions"
          ?on=${this.state === EditorState.Editing}
          onIcon="save"
          offIcon="wysiwyg"
          ?disabled=${this.disabled || this.state === EditorState.Opening}
          @click=${this.toggleEditor}
        ></mwc-icon-button-toggle>
      </header>

      <enriched-html
        ?hidden=${editing}
        .content=${this.content}
        .document=${this.document}
      ></enriched-html>
      <slot name="editor"></slot>

      <mwc-circular-progress
        closed
        indeterminate
        class="spinner"
      ></mwc-circular-progress>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-wrapper': EditorWrapper;
  }
}
