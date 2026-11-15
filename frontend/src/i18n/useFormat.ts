import { useTranslation } from "react-i18next";

import { formatNumber } from "./format";

/**
 * Number formatting in the active language (Western digits, §9a), plus `maybe` for values a
 * backend block may send as `null`: those show the explicit "not available" text, never a 0
 * or a blank standing in for the missing number (design.md §6).
 */
export function useFormat() {
  const { t, i18n } = useTranslation();
  const num = (value: number, maxDecimals = 1) =>
    formatNumber(value, i18n.language, maxDecimals);
  const maybe = (
    value: number | null,
    render: (formatted: string) => string = (s) => s,
    maxDecimals = 1,
  ): string =>
    value === null
      ? t("dataCard.valueMissing")
      : render(num(value, maxDecimals));
  return { num, maybe };
}
