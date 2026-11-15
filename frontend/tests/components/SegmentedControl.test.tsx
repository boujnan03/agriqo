import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { SegmentedControl } from "../../src/components/SegmentedControl";
import i18n from "../../src/i18n";

// No page uses the segmented control since the Map page was retired (design.md §7 "Retired"),
// so its behaviour is tested here directly with neutral sample options.
const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
] as const;
type Value = (typeof OPTIONS)[number]["value"];

function Sample() {
  const [value, setValue] = useState<Value>("a");
  return (
    <SegmentedControl
      ariaLabel="Sample choice"
      options={OPTIONS}
      value={value}
      onChange={setValue}
    />
  );
}

describe("SegmentedControl (design.md §6)", () => {
  it("is a radio group with one option selected; clicking selects another", async () => {
    const user = userEvent.setup();
    render(<Sample />);
    const group = screen.getByRole("radiogroup", { name: "Sample choice" });
    expect(
      within(group)
        .getAllByRole("radio")
        .map((r) => r.textContent),
    ).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(screen.getByRole("radio", { name: "Alpha" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Beta" }));
    expect(screen.getByRole("radio", { name: "Beta" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Alpha" })).not.toBeChecked();
  });

  it("keeps one tab stop: only the selected option is focusable by Tab", () => {
    render(<Sample />);
    const tabbable = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBeChecked();
  });
});

describe("SegmentedControl arrow keys in RTL (design.md §9a)", () => {
  /** Focus the selected option, press `key`, return the newly selected option's label. */
  const press = async (key: string) => {
    const user = userEvent.setup();
    render(<Sample />);
    screen.getByRole("radio", { checked: true }).focus();
    await user.keyboard(`{${key}}`);
    const now = screen.getByRole("radio", { checked: true });
    expect(now).toHaveFocus();
    return now.textContent;
  };

  it("Arabic: the row runs right-to-left, so ArrowLeft moves to the next option", async () => {
    await i18n.changeLanguage("ar");
    expect(await press("ArrowLeft")).toBe("Beta");
  });

  it("Arabic: ArrowRight moves back (wrapping to the last option)", async () => {
    await i18n.changeLanguage("ar");
    expect(await press("ArrowRight")).toBe("Gamma");
  });

  it("French: ArrowRight moves to the next option", async () => {
    await i18n.changeLanguage("fr");
    expect(await press("ArrowRight")).toBe("Beta");
  });

  it("French: ArrowLeft wraps to the last option", async () => {
    await i18n.changeLanguage("fr");
    expect(await press("ArrowLeft")).toBe("Gamma");
  });
});
