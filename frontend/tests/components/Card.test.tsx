import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "../../src/components/Card";

describe("Card", () => {
  it("renders its content in the standard and featured variants", () => {
    render(
      <>
        <Card bordered>Standard content</Card>
        <Card variant="featured">Featured content</Card>
      </>,
    );
    expect(screen.getByText("Standard content")).toBeInTheDocument();
    expect(screen.getByText("Featured content")).toBeInTheDocument();
  });
});
