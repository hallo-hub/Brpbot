import {
  BaseInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "./logger";
import { buildEmbed } from "./embeds";

type AnyRepliableInteraction =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction;

/**
 * Zentrale Stelle, um Fehler aus Command-/Button-/SelectMenu-/Modal-
 * Ausführungen zu behandeln: verständliche Nutzer-Fehlermeldung + sauberes
 * Server-Log. Verhindert, dass ein einzelner fehlerhafter Handler den
 * gesamten Bot (Event-Loop) zum Absturz bringt.
 */
export async function handleInteractionError(
  interaction: AnyRepliableInteraction,
  scope: string,
  error: unknown
): Promise<void> {
  logger.error(scope, `Unerwarteter Fehler bei Interaktion "${interaction.id}"`, error);

  const errorEmbed = buildEmbed.error(
    "❌ Es ist ein Fehler aufgetreten",
    "Bei der Ausführung ist ein unerwarteter Fehler passiert. Das Team wurde informiert. " +
      "Bitte versuche es später erneut."
  );

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  } catch (followUpError) {
    // Wenn selbst die Fehlermeldung nicht gesendet werden kann (z.B. Interaktion
    // bereits abgelaufen), nur noch loggen – mehr können wir nicht tun.
    logger.error(scope, "Konnte Fehlermeldung nicht an Nutzer senden", followUpError);
  }
}

/** Registriert globale Schutzmechanismen gegen Bot-Abstürze durch unbehandelte Fehler. */
export function registerGlobalErrorHandlers(): void {
  process.on("unhandledRejection", (reason) => {
    logger.error("Process", "Unhandled Promise Rejection", reason);
  });

  process.on("uncaughtException", (error) => {
    logger.error("Process", "Uncaught Exception", error);
  });
}

/** Kleiner Helfer, um in Interaction-Handlern nicht jedes Mal try/catch zu schreiben. */
export function wrapInteraction<T extends BaseInteraction>(
  scope: string,
  fn: (interaction: T) => Promise<void>
): (interaction: T) => Promise<void> {
  return async (interaction: T) => {
    try {
      await fn(interaction);
    } catch (error) {
      if (
        interaction.isChatInputCommand() ||
        interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isModalSubmit()
      ) {
        await handleInteractionError(interaction, scope, error);
      } else {
        logger.error(scope, "Unerwarteter Fehler (nicht antwortbare Interaktion)", error);
      }
    }
  };
}
