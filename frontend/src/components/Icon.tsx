import type { LucideIcon } from "lucide-react";

import { icon as iconTokens } from "../theme/tokens.ts";

export type IconSize = "inline" | "data";

export interface IconProps {
  /** A lucide-react stroke icon (design.md §5: stroke icons, rounded caps/joins). */
  icon: LucideIcon;
  /** "inline" = inside buttons/tab bar, "data" = inside data-row circles (design.md §5 sizes). */
  size?: IconSize;
  /** Accessible name. Omit for decorative icons, which are then hidden from assistive tech (§5). */
  label?: string;
  className?: string;
}

/** Every icon in the app goes through this wrapper so size and stroke always follow design.md §5. */
export function Icon({
  icon: Glyph,
  size = "inline",
  label,
  className,
}: IconProps) {
  const px = size === "inline" ? iconTokens.sizeInline : iconTokens.sizeData;
  return (
    <Glyph
      size={px}
      strokeWidth={iconTokens.strokeWidth}
      className={className}
      focusable="false"
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    />
  );
}
