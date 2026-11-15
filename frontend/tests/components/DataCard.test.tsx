import { render, screen } from "@testing-library/react";
import { Layers } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { DataCard } from "../../src/components/DataCard";
import i18n, { LANGUAGES } from "../../src/i18n";
import type { SourcedData } from "../../src/types/diagnostic";
import { inLanguage } from "../utils";

interface Sample {
  value: number;
}

const renderCard = (result: SourcedData<Sample>) => {
  const values = vi.fn((data: Sample) => <p>{`Value ${data.value}`}</p>);
  const view = render(
    <DataCard title="Sample" icon={Layers} tone="soil" result={result}>
      {values}
    </DataCard>,
  );
  return { ...view, values };
};

describe("DataCard (design.md §6)", () => {
  inLanguage("fr");

  it("ok: shows the real values and the source caption", () => {
    const { values } = renderCard({
      status: "ok",
      source: "NASA POWER",
      data: { value: 42 },
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "Sample" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Value 42")).toBeInTheDocument();
    expect(values).toHaveBeenCalledWith({ value: 42 });
    expect(screen.getByText("Données : NASA POWER")).toBeInTheDocument();
    expect(screen.queryByText("Donnée indisponible")).not.toBeInTheDocument();
  });

  it("indisponible: 'Donnée indisponible', source still named, values never rendered", () => {
    const { container, values } = renderCard({
      status: "indisponible",
      source: "OpenTopography",
    });
    expect(screen.getByText("Donnée indisponible")).toBeInTheDocument();
    expect(screen.getByText("Données : OpenTopography")).toBeInTheDocument();
    expect(values).not.toHaveBeenCalled();
    expect(container.textContent).not.toMatch(/\d/); // no zero or other stand-in number
  });

  it.each([
    [
      "outsideCoverage",
      "Pas de données pour ce point : il est hors de la zone couverte par cette source.",
    ],
    [
      "waterBody",
      "Pas de données pour ce point : il se trouve sur une étendue d'eau.",
    ],
  ] as const)(
    "pas de données (%s): the specific reason, not the generic message",
    (reason, message) => {
      const { container, values } = renderCard({
        status: "pas_de_donnees",
        source: "ISRIC SoilGrids",
        reason,
      });
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.queryByText("Donnée indisponible")).not.toBeInTheDocument();
      expect(screen.getByText("Données : ISRIC SoilGrids")).toBeInTheDocument();
      expect(values).not.toHaveBeenCalled();
      expect(container.textContent).not.toMatch(/\d/);
    },
  );

  it("exposes its status for styling/tests and can sit at heading level 3", () => {
    const { container } = render(
      <DataCard
        title="Sample"
        icon={Layers}
        tone="neutral"
        headingLevel={3}
        result={{ status: "indisponible", source: "X" }}
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

  it("translates the caption and the fallback messages", () => {
    renderCard({ status: "indisponible", source: "NASA POWER" });
    expect(
      screen.getByText(i18n.t("dataCard.unavailable")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t("dataCard.source", { source: "NASA POWER" })),
    ).toBeInTheDocument();
  });
});
