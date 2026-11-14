import styles from "./placeholder.module.css";

export interface PlaceholderNoticeProps {
  /** design.md §7 template name, e.g. "Dashboard". */
  template: string;
}

/**
 * TEMPORARY scaffold marker: delete it from a page when that page's real content is built.
 * Delete this folder once no page uses it.
 */
export function PlaceholderNotice({ template }: PlaceholderNoticeProps) {
  return (
    <p className={styles.notice}>
      Placeholder: “{template}” template (design.md §7). Real content comes in a
      later task.
    </p>
  );
}
