import { useTranslation } from "react-i18next";

import { formatSeason } from "../../i18n/format";
import { useFormat } from "../../i18n/useFormat";
import type { AdviceId, AdviceItem } from "../../types/seasons";

/** Advice shown as cards / crop paragraphs. `field_shift` is Insights' message, not a card. */
export type ShownAdviceId = Exclude<AdviceId, "field_shift">;
export type ShownAdvice = AdviceItem & { id: ShownAdviceId };

export const isShownAdvice = (a: AdviceItem): a is ShownAdvice =>
  a.id !== "field_shift";

/**
 * The words of one advice item (docs/seasons_rules.md): its text in the variant the backend
 * chose (`pluvial` / `irrigue`) and its reason. EVERY number in the reason is a placeholder
 * filled from the item's `evidence` — nothing is computed or hard-coded here, only formatted
 * (Western digits, seasons as "2024–2025").
 */
export function useAdviceText() {
  const { t } = useTranslation();
  const { num } = useFormat();

  const text = (a: ShownAdvice): string =>
    t(`advice.text.${a.id}.${a.variant}`);

  const reason = (a: ShownAdvice): string => {
    const e = a.evidence;
    const int = (k: string) => num(e[k], 0);
    const dec = (k: string) => num(e[k]);
    switch (a.id) {
      case "drought_tolerant":
        return t("advice.reason.drought_tolerant", {
          n: int("count"),
          total: int("total"),
          from: formatSeason(e.from),
          to: formatSeason(e.to),
        });
      case "dry_autumn":
        return t("advice.reason.dry_autumn", {
          below: int("below"),
          total: int("total"),
          meanMm: dec("meanMm"),
          normalMm: dec("normalMm"),
          pct: int("pct"),
        });
      case "hot_spring":
        return t("advice.reason.hot_spring", {
          above: int("above"),
          total: int("total"),
          meanDays: dec("meanDays"),
          normalDays: dec("normalDays"),
        });
      case "dry_spring":
        return t("advice.reason.dry_spring", {
          below: int("below"),
          total: int("total"),
          pct: int("pct"),
        });
      case "last_season_dry":
        return t("advice.reason.last_season_dry", {
          season: formatSeason(e.season),
          rainMm: dec("rainMm"),
          normalMm: dec("normalMm"),
          pct: int("pct"),
        });
      case "wet_frequent":
        return t("advice.reason.wet_frequent", {
          n: int("count"),
          total: int("total"),
        });
    }
  };

  /** "Pourquoi : <reason>" */
  const why = (a: ShownAdvice): string =>
    t("advice.why", { reason: reason(a) });

  return { text, reason, why };
}
