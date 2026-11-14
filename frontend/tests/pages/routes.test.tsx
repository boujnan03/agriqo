import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderRoute } from "../utils";

/**
 * Every product screen now has its own page test (Cover, Farm, Overview, Recommendations,
 * CropDetail, NotFound). Only the non-product build smoke page is checked here.
 */
describe("router", () => {
  it("serves the build smoke page", () => {
    renderRoute("/__smoke");
    expect(
      screen.getByRole("heading", { level: 1, name: "Build smoke test" }),
    ).toBeInTheDocument();
  });
});
