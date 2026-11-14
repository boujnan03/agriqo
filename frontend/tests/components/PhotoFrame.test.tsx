import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PhotoFrame } from "../../src/components/PhotoFrame";

describe("PhotoFrame", () => {
  it("shows the design.md §8 placeholder (icon + label naming what's missing)", () => {
    render(<PhotoFrame slot="detail" placeholderLabel="Photo: sample" />);
    expect(
      screen.getByRole("img", { name: "Photo: sample" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Photo: sample")).toBeVisible();
  });

  it("renders the real image when a src is given", () => {
    render(
      <PhotoFrame slot="thumbnail" src="/sample.jpg" alt="Sample photo" />,
    );
    expect(screen.getByRole("img", { name: "Sample photo" })).toHaveAttribute(
      "src",
      "/sample.jpg",
    );
  });
});
