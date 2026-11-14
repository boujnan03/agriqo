import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../../src/components/Button";
import { renderWithRouter } from "../utils";

describe("Button", () => {
  it("renders a real <button> for each variant and handles clicks", async () => {
    const onClick = vi.fn();
    render(
      <>
        <Button onClick={onClick}>Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
      </>,
    );
    const primary = screen.getByRole("button", { name: "Primary" });
    expect(primary).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Outline" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Secondary" }),
    ).toBeInTheDocument();
    await userEvent.click(primary);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("adds a decorative (aria-hidden) arrow when withArrow is set", () => {
    render(<Button withArrow>Next</Button>);
    const svg = screen
      .getByRole("button", { name: "Next" })
      .querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a link when given `to`", () => {
    renderWithRouter(<Button to="/overview">Go</Button>);
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute(
      "href",
      "/overview",
    );
  });
});
