import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "../../src/components/Badge";

describe("Badge", () => {
  it("renders its short text", () => {
    render(<Badge>Sample</Badge>);
    expect(screen.getByText("Sample")).toBeInTheDocument();
  });
});
