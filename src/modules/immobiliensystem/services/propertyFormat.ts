import { Property, PropertyStatus } from "@prisma/client";

/** Formatiert einen Preis als deutschen Euro-Betrag, z.B. 40000 -> "40.000 €". */
export function formatEuro(amount: number): string {
  return `${amount.toLocaleString("de-DE")} €`;
}

/** Emoji für den jeweiligen Immobilienstatus. */
export function statusEmoji(status: PropertyStatus): string {
  switch (status) {
    case PropertyStatus.FREE:
      return "🟢";
    case PropertyStatus.RESERVED:
      return "🟡";
    case PropertyStatus.SOLD:
      return "🔴";
    default:
      return "⚪";
  }
}

/** Menschlich lesbarer Status-Text (für Embeds im Kauf-Channel). */
export function statusLabel(status: PropertyStatus): string {
  switch (status) {
    case PropertyStatus.FREE:
      return "Frei";
    case PropertyStatus.RESERVED:
      return "Reserviert";
    case PropertyStatus.SOLD:
      return "Verkauft";
    default:
      return "Unbekannt";
  }
}

/**
 * Baut die Anzeigezeile einer Immobilie für die öffentliche Liste, z.B.:
 * "23 - 30.000 € - 🔴 Knuspelig" oder "3 - 40.000 € - 🟢 Frei".
 */
export function formatPropertyLine(property: Property): string {
  const price = formatEuro(property.price);

  if (property.status === PropertyStatus.SOLD) {
    const label = property.ownerDisplayName ?? "Unbekannt";
    return `${property.number} - ${price} - ${statusEmoji(property.status)} ${label}`;
  }

  return `${property.number} - ${price} - ${statusEmoji(property.status)} ${statusLabel(property.status)}`;
}

/**
 * Sortiert Immobilien "natürlich" nach Nummer: numerische Teile werden
 * numerisch verglichen (1, 2, 3, 25 statt 1, 25, 3), Buchstaben-Suffixe
 * (z.B. "41A", "41B") danach alphabetisch.
 */
export function sortProperties(properties: Property[]): Property[] {
  return [...properties].sort((a, b) =>
    a.number.localeCompare(b.number, "de", { numeric: true, sensitivity: "base" })
  );
}
