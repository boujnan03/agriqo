import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bell } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Header } from "../../src/components/Header";
import { renderWithRouter } from "../utils";

describe("Header", () => {
  it("root variant: title as h1, no back link, optional labelled icon button", async () => {
    const onClick = vi.fn();
    render(
      <Header
        title="Sample title"
        action={{ icon: Bell, ariaLabel: "Sample action", onClick }}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Sample title" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Sample action" }),
    );
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("drill-in variant: back link with an accessible name", () => {
    renderWithRouter(
      <Header
        variant="drill-in"
        title="Sample detail"
        backTo="/back"
        backLabel="Go back"
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Sample detail" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute(
      "href",
      "/back",
    );
  });
});
