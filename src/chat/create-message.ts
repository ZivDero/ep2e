import { ActorEP, ActorProxy } from '@src/entities/actor/actor';
import type { ChatMessageEP } from '@src/entities/chat-message';
import { EP } from '@src/foundry/system';
import type { RequireAtLeastOne } from 'type-fest';
import type { MessageData } from './message-data';

export enum MessageVisibility {
  Public = 'public',
  WhisperGM = 'whisperGM',
  Self = 'self',
  Blind = 'blind',
}

/**
 * Map a core message mode to EP visibility. Accepts V14 message modes
 * (public, gm, blind, self, ic) and the legacy roll modes (publicroll,
 * gmroll, blindroll, selfroll). In-character and unknown modes are public.
 */
export const rollModeToVisibility = (mode: string) => {
  switch (mode) {
    case 'blind':
    case 'blindroll':
      return MessageVisibility.Blind;

    case 'gm':
    case 'gmroll':
      return MessageVisibility.WhisperGM;

    case 'self':
    case 'selfroll':
      return MessageVisibility.Self;

    default:
      return MessageVisibility.Public;
  }
};

/** The visibility of the user's currently selected chat message mode. */
export const currentMessageVisibility = () =>
  rollModeToVisibility(
    game.settings.settings.has('core.messageMode')
      ? game.settings.get('core', 'messageMode')
      : game.settings.get('core', 'rollMode'),
  );

export type MessageInit = Partial<{
  data: MessageData;
  content: string;
  visibility: MessageVisibility;
  roll: Roll;
  flavor: string;
  alias: string;
  entity: Token | ActorEP | ActorProxy | null | TokenDocument;
  whisper: string[];
}>;

export const messageContentPlaceholder = '_';

const splitEntity = (entity: MessageInit['entity']) => {
  return {
    actor: entity instanceof ActorEP ? entity : entity?.actor,
    token:
      entity instanceof foundry.canvas.placeables.Token
        ? entity.document
        : entity instanceof TokenDocument
        ? entity
        : null,
  };
};

export const createMessage = async ({
  content = messageContentPlaceholder,
  visibility = MessageVisibility.Public,
  data,
  roll,
  flavor,
  alias,
  entity,
  whisper,
}: RequireAtLeastOne<
  MessageInit,
  'content' | 'data' | 'roll'
>): Promise<ChatMessageEP> => {
  const { actor, token } = splitEntity(entity);
  const chatMessageData: Partial<ChatMessageData> = {
    content: roll?.total ?? content,
    flavor,
    rolls: roll ? [JSON.stringify(roll)] : [],
    flags: { [EP.Name]: data, core: { canPopout: true } },
    speaker:
      entity === null
        ? { alias }
        : ChatMessage.getSpeaker({
            alias: alias || entity?.name,
            scene: token?.parent,
            actor,
            token,
          }),
    blind: visibility === MessageVisibility.Blind,
    whisper:
      whisper ||
      (visibility === MessageVisibility.Self
        ? [game.user.id]
        : visibility !== MessageVisibility.Public
        ? ChatMessage.getWhisperRecipients('GM').map((i: User) => i.id)
        : undefined),
  };
  const { user } = game

  if ('dice3d' in game) {
    const successTestRoll =
      chatMessageData.flags?.ep2e?.successTest?.states[0]?.roll;
    if (successTestRoll != null) {
      const [tens, ones] =
        successTestRoll < 10
          ? `${0}${successTestRoll}`
          : String(successTestRoll);
      // @ts-ignore
      await game.dice3d.show({
        throws: [
          {
            dice: [
              {
                resultLabel: Number(`${tens}0`),
                d100Result: successTestRoll,
                result: Number(tens),
                type: 'd100',
                vectors: [],
                options: {},
              },
              {
                resultLabel: Number(ones),
                d100Result: successTestRoll,
                result: Number(ones),
                type: 'd10',
                vectors: [],
                options: {},
              },
            ],
          },
        ],
      }, 
      user, false, chatMessageData.whisper, chatMessageData.blind
     );
    }
  }

  return ChatMessage.create(chatMessageData, {}) as Promise<ChatMessageEP>;
};
