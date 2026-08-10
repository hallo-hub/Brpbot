import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Collection,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  StringSelectMenuInteraction,
} from "discord.js";

/**
 * Erlaubte Berechtigungsstufen im Bot. Wird von einzelnen Commands und
 * Interaktions-Handlern genutzt, um festzulegen, wer sie ausführen darf.
 * Die eigentliche Zuordnung Rolle -> Stufe passiert über die Config
 * (siehe src/config/env.ts) bzw. später über das Berechtigungssystem
 * in src/utils/permissions.ts.
 */
export enum PermissionLevel {
  Everyone = 0,
  Team = 1,
  HighTeam = 2,
  Admin = 3,
}

type AnySlashCommandBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

/** Struktur, die jeder Slash-Command in src/commands exportieren muss. */
export interface Command {
  data: AnySlashCommandBuilder;
  /** Mindest-Berechtigungsstufe, die zur Ausführung nötig ist. */
  permissionLevel?: PermissionLevel;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * Handler für einen einzelnen Button. `customId` kann ein fester String
 * ODER ein Prefix sein (siehe `matches`), damit z.B. dynamische IDs wie
 * `immobilie_kaufen_23` von einem einzigen Handler bedient werden können.
 */
export interface ButtonHandler {
  customId: string;
  /** Wenn true, wird customId als Prefix behandelt (startsWith statt ===). */
  isPrefix?: boolean;
  permissionLevel?: PermissionLevel;
  execute: (interaction: ButtonInteraction) => Promise<void>;
}

export interface SelectMenuHandler {
  customId: string;
  isPrefix?: boolean;
  permissionLevel?: PermissionLevel;
  execute: (interaction: StringSelectMenuInteraction) => Promise<void>;
}

export interface ModalHandler {
  customId: string;
  isPrefix?: boolean;
  permissionLevel?: PermissionLevel;
  execute: (interaction: ModalSubmitInteraction) => Promise<void>;
}

/**
 * Ein "Modul" bündelt alles, was ein fachlicher Bereich (Immobilien,
 * Fraktionen, ...) an Commands/Handlern mitbringt. Der Grundkern selbst
 * registriert noch keine Module – das ist die Vorbereitung dafür.
 */
export interface BotModule {
  /** Eindeutiger, sprechender Name, z.B. "immobiliensystem". */
  name: string;
  commands?: Command[];
  buttonHandlers?: ButtonHandler[];
  selectMenuHandlers?: SelectMenuHandler[];
  modalHandlers?: ModalHandler[];
  /** Wird beim Bot-Start einmalig aufgerufen (z.B. für Caches, Scheduler). */
  onReady?: (client: BotClient) => Promise<void> | void;
}

/** Erweiterter discord.js Client mit unseren eigenen Collections. */
export class BotClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public buttonHandlers: Collection<string, ButtonHandler> = new Collection();
  public buttonPrefixHandlers: ButtonHandler[] = [];
  public selectMenuHandlers: Collection<string, SelectMenuHandler> = new Collection();
  public selectMenuPrefixHandlers: SelectMenuHandler[] = [];
  public modalHandlers: Collection<string, ModalHandler> = new Collection();
  public modalPrefixHandlers: ModalHandler[] = [];
  public modules: BotModule[] = [];
}
