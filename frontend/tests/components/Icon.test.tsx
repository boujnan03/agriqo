import { render, screen } from "@testing-library/react";
import { Map as MapIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Icon } from "../../src/components/Icon";
import { icon } from "../../src/theme/tokens";

describe("Icon", () => {
  it("is decorative (aria-hidden) by default and uses the token size/stroke", () => {
    const { container } = render(<Icon icon={MapIcon} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", String(icon.sizeInline));
    expect(svg).toHaveAttribute("stroke-width", String(icon.strokeWidth));
  });

  it("gets an accessible name when labelled", () => {
    render(<Icon icon={MapIcon} size="data" label="Sample icon" />);
    expect(screen.getByRole("img", { name: "Sample icon" })).toHaveAttribute(
      "width",
      String(icon.sizeData),
    );
  });
});
