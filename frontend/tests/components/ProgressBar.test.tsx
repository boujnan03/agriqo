import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressBar } from "../../src/components/ProgressBar";

describe("ProgressBar", () => {
  it("always shows the number next to the bar (design.md §6)", () => {
    render(<ProgressBar label="Sample" value={60} />);
    const bar = screen.getByRole("progressbar", { name: "Sample" });
    expect(bar).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("uses custom value text and clamps out-of-range values", () => {
    render(
      <ProgressBar label="Sample" value={15} max={10} valueText="10 of 10" />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "10",
    );
    expect(screen.getByText("10 of 10")).toBeInTheDocument();
  });
});
