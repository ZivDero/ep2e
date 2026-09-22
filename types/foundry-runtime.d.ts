/**
 * Loose ambient declarations for Foundry client globals.
 *
 * The original author typechecked against a generated `foundry.d.ts` that was never
 * committed (see .gitignore). These declarations stand in for it so `npm run typecheck`
 * reports problems in our own code instead of hundreds of missing Foundry names.
 * Foundry base classes are typed as `any` constructors; the interfaces in
 * src/foundry/foundry-cont.d.ts still describe the members we rely on.
 */

type AnyConstructor = (new (...args: any[]) => any) & Record<string, any>;

declare global {
  const Actor: AnyConstructor;
  const Item: AnyConstructor;
  const User: AnyConstructor;
  const Scene: AnyConstructor;
  const ChatMessage: AnyConstructor;
  const Combat: AnyConstructor;
  const Folder: AnyConstructor;
  const Macro: AnyConstructor;
  const TokenDocument: AnyConstructor;
  const Roll: AnyConstructor;
  const Hooks: {
    on(hook: string, fn: (...args: any[]) => unknown): number;
    once(hook: string, fn: (...args: any[]) => unknown): number;
    off(hook: string, fn: number | ((...args: any[]) => unknown)): void;
    call(hook: string, ...args: unknown[]): boolean;
    callAll(hook: string, ...args: unknown[]): boolean;
  };
  const CONFIG: any;
  const fromUuid: (uuid: string, options?: object) => Promise<any>;
  const fromUuidSync: (uuid: string, options?: object) => any;

  /** foundry.dice.terms.DiceTerm (type only: the DiceTerm global was removed in V14). */
  interface FoundryDiceTermResult {
    result: number;
    active: boolean;
  }
  interface FoundryDiceTerm {
    number: number;
    faces: number;
    results: FoundryDiceTermResult[];
    roll(options?: {
      minimize?: boolean;
      maximize?: boolean;
    }): Promise<FoundryDiceTermResult>;
  }
  interface FoundryDiceTermConstructor {
    new (data: object): FoundryDiceTerm;
    DENOMINATION: string;
  }

  // Partially described in foundry-cont.d.ts; open them up for everything else.
  interface Token { [key: string]: any }
  interface TokenDocument { [key: string]: any }
  interface CompendiumCollection { [key: string]: any }
  interface Compendium { [key: string]: any }
  interface Folder { [key: string]: any }
  interface Localization { [key: string]: any }
  interface Roll { [key: string]: any }
  interface GridLayer { [key: string]: any }
  interface Canvas { [key: string]: any }
  interface Macro { [key: string]: any }
  interface ActiveEffect { [key: string]: any }
}

export {};
