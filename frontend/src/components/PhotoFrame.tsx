import { Image as ImageIcon } from "lucide-react";

import type { PhotoSlot } from "../theme/tokens.ts";
import { Icon } from "./Icon";
import styles from "./PhotoFrame.module.css";

interface CommonProps {
  /**
   * Which slot this frame fills (cover · farm · thumbnail · detail); fixes the aspect ratio
   * reserved by design.md §8 (values in theme/tokens.ts `aspectRatio`).
   */
  slot: PhotoSlot;
  className?: string;
}

interface WithPhoto extends CommonProps {
  src: string;
  alt: string;
  placeholderLabel?: undefined;
}

interface WithoutPhoto extends CommonProps {
  src?: undefined;
  /**
   * design.md §8 placeholder: a one-line label naming exactly what is missing,
   * e.g. "Photo: champ de blé". Also used as the accessible name.
   */
  placeholderLabel: string;
  alt?: undefined;
}

export type PhotoFrameProps = WithPhoto | WithoutPhoto;

/**
 * design.md §6 Photo frame (rounded, object-fit: cover) with the §8 placeholder convention:
 * until a real photo exists, a --green-tint box at the slot's real ratio with a small icon
 * + label. Real photos later drop into the same slot with no layout change.
 * Not implemented yet: §6 bottom gradient for text-bearing photos (no values in design.md).
 */
export function PhotoFrame(props: PhotoFrameProps) {
  const classes = [styles.frame, styles[props.slot], props.className ?? ""]
    .filter(Boolean)
    .join(" ");

  if (props.src !== undefined) {
    return (
      <div className={classes}>
        <img className={styles.image} src={props.src} alt={props.alt} />
      </div>
    );
  }
  return (
    <div
      className={`${classes} ${styles.placeholder}`}
      role="img"
      aria-label={props.placeholderLabel}
    >
      <Icon icon={ImageIcon} />
      <span className={styles.placeholderLabel} aria-hidden="true">
        {props.placeholderLabel}
      </span>
    </div>
  );
}
