import { render, screen } from "@testing-library/react";
import { Layers } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { DataCard } from "../../src/components/DataCard";
import i18n, { LANGUAGES } from "../../src/i18n";
import type { Block, OkBlock } from "../../src/types/diagnostic";
import { inLanguage } from "../utils";

/** A block shaped like the backend's: flat values, present only when ok. */
type Sample = Block<{ value: number | null }>;

const NO_DATA = "Pas de données de sol ici.";

const renderCard = (block: Sample, caveat?: string) => {
  const values = vi.fn((b: OkBlock<Sample>) => <p>{`Value ${b.value}`}</p>);
  const view = render(
    <DataCard
      title="Sample"
      icon={Layers}
      tone="soil"
      block={block}
      noDataText={NO_DATA}
      caveat={caveat}
    >
      {values}
    </DataCard>,
  );
  return { ...view, values };
};

describe("DataCard (design.md §6)", () => {
  inLanguage("fr");

  it("ok: shows the real values, the caveat and the source caption", () => {
    const { values } = renderCard(
      { status: "ok", source: "NASA POWER", value: 42 },
      "Estimation (~250 m)",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Sample" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Value 42")).toBeInTheDocument();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ok", value: 42 }),
    );
    expect(screen.getByText("Estimation (~250 m)")).toBeInTheDocument();
    expect(screen.getByText("Données : NASA POWER")).toBeInTheDocument();
    expect(screen.queryByText("Donnée indisponible")).not.toBeInTheDocument();
  });

  it("indisponible: 'Donnée indisponible', source still named, values and caveat never rendered", () => {
    const { container, values } = renderCard(
      { status: "indisponible", source: "OpenTopography", error: "timeout" },
      "caveat",
    );
    expect(screen.getByText("Donnée indisponible")).toBeInTheDocument();
    expect(screen.getByText("Données : OpenTopography")).toBeInTheDocument();
    expect(screen.queryByText("caveat")).not.toBeInTheDocument();
    expect(values).not.toHaveBeenCalled();
    expect(container.textContent).not.toMatch(/\d/); // no zero or other stand-in number
    expect(container.querySelector("section")).toHaveAttribute(
      "data-error",
      "timeout",
    );
  });

  it("pas de données: the card's specific reason (not the generic message, not the backend's French text)", () => {
    const { container, values } = renderCard({
      status: "pas_de_donnees",
      source: "ISRIC SoilGrids",
      message: "message du backend, en français",
    });
    expect(screen.getByText(NO_DATA)).toBeInTheDocument();
    expect(screen.queryByText(/message du backend/)).not.toBeInTheDocument();
    expect(screen.queryByText("Donnée indisponible")).not.toBeInTheDocument();
    expect(screen.getByText("Données : ISRIC SoilGrids")).toBeInTheDocument();
    expect(values).not.toHaveBeenCalled();
    expect(container.textContent).not.toMatch(/\d/);
  });

  it("exposes its status for styling/tests and can sit at heading level 3", () => {
    const { container } = render(
      <DataCard
        title="Sample"
        icon={Layers}
        tone="neutral"
        headingLevel={3}
        block={{ status: "indisponible", source: "X" } as Sample}
        noDataText="-"
      >
        {() => null}
      </DataCard>,
    );
    expect(container.querySelector("section")).toHaveAttribute(
      "data-status",
      "indisponible",
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Sample" }),
    ).toBeInTheDocument();
  });
});

describe.each(LANGUAGES)("DataCard in %s", (lng) => {
  inLanguage(lng);

  it("translates the caption and the fallback message", () => {
    renderCard({ status: "indisponible", source: "NASA POWER" });
    expect(
      screen.getByText(i18n.t("dataCard.unavailable")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t("dataCard.source", { source: "NASA POWER" })),
    ).toBeInTheDocument();
  });
});
