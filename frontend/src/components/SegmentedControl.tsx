import { type KeyboardEvent, useRef } from "react";

import { useDirection } from "../i18n/useDirection";
import styles from "./SegmentedControl.module.css";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group (what is being chosen). */
  ariaLabel: string;
}

/**
 * design.md §6 Segmented control: mutually exclusive options as real <button>s with
 * role="radiogroup"/"radio". Green-tint group, selected option green-900 with white text,
 * badge-pill radius/padding rhythm.
 *
 * Keyboard follows the WAI-ARIA radio group pattern: one tab stop (the selected option),
 * arrow keys move and select. Arrows follow the visual order, so they swap in RTL (design.md
 * §9a): ArrowLeft goes to the next option in Arabic, the previous one in French/English.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const rtl = useDirection() === "rtl";
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const n = options.length;
    const i = (index + n) % n;
    onChange(options[i].value);
    buttons.current[i]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = options.findIndex((o) => o.value === value);
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    const target =
      event.key === forward || event.key === "ArrowDown"
        ? current + 1
        : event.key === backward || event.key === "ArrowUp"
          ? current - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? options.length - 1
              : null;
    if (target === null) return;
    event.preventDefault();
    select(target);
  };

  return (
    <div
      className={styles.group}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {options.map((option, i) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={[styles.option, checked ? styles.selected : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
