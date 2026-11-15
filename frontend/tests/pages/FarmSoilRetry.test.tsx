import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import type { DiagnosticResponse } from "../../src/types/diagnostic";
import {
  deferred,
  fakeBackend,
  fixtures,
  json,
  unreachable,
} from "../fakeBackend";
import { inLanguage, picked, renderRoute, TADLA_REQUEST } from "../utils";

const real = fixtures.diagnosticTadla;

/** The real response, with SoilGrids timed out and the backend still fetching it. */
const soilTimedOut: DiagnosticResponse = {
  ...real,
  soil: {
    status: "indisponible",
    source: "ISRIC SoilGrids",
    error: "timeout",
    retry_pending: true,
  },
};

const card = async (name: string) =>
  (await screen.findByRole("heading", { level: 2, name })).closest(
    "section",
  ) as HTMLElement;

describe("Soil Data card: retry after the backend's background fetch (Farm)", () => {
  inLanguage("fr");

  it("indisponible: says the server is still trying and offers 'Réessayer' (Soil only)", async () => {
    fakeBackend.respond("diagnostic", json(soilTimedOut));
    renderRoute("/farm", picked);
    const soil = await card("Sol");
    expect(soil).toHaveAttribute("data-status", "indisponible");
    expect(within(soil).getByText("Donnée indisponible")).toBeInTheDocument();
    expect(
      within(soil).getByText(/Le serveur continue d'essayer/),
    ).toBeInTheDocument();
    expect(
      within(soil).getByRole("button", { name: "Réessayer" }),
    ).toBeEnabled();
    // Relief is indisponible too (missing_api_key) but has no retry: nothing would change.
    expect(within(await card("Relief")).queryByRole("button")).toBeNull();
    // ok cards never get one.
    expect(within(await card("Climat")).queryByRole("button")).toBeNull();
  });

  it("retry = the SAME request; while in flight nothing is invented; then ONLY the soil card updates", async () => {
    const user = userEvent.setup();
    fakeBackend.respond("diagnostic", json(soilTimedOut));
    renderRoute("/farm", picked);
    const soil = await card("Sol");

    const later = deferred();
    fakeBackend.respond("diagnostic", later.responder);
    await user.click(within(soil).getByRole("button", { name: "Réessayer" }));

    // In flight: busy button, still "indisponible", still no number.
    const busy = within(soil).getByRole("button", {
      name: "Nouvelle tentative…",
    });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(within(soil).getByText("Donnée indisponible")).toBeInTheDocument();
    expect(soil.textContent).not.toMatch(/\d/);

    // Same endpoint, same body (centroid + polygon) as the first request.
    expect(fakeBackend.calls).toEqual([TADLA_REQUEST, TADLA_REQUEST]);

    // The background fetch has finished: soil is now real. The other blocks of this answer
    // differ on purpose, to prove the retry only replaces the soil card.
    const changedClimate = { ...real.climate, temp_mean_c: 99 };
    later.answer({ ...real, climate: changedClimate });

    expect(
      await within(soil).findByText("Franco-argileuse"),
    ).toBeInTheDocument();
    expect(soil).toHaveAttribute("data-status", "ok");
    expect(within(soil).queryByRole("button")).toBeNull();
    const climate = await card("Climat");
    expect(climate).toHaveTextContent("17,9");
    expect(climate).not.toHaveTextContent("99");
  });

  it("still indisponible after the retry: stays indisponible (no value), retry offered again", async () => {
    const user = userEvent.setup();
    fakeBackend.respond("diagnostic", json(soilTimedOut));
    renderRoute("/farm", picked);
    const soil = await card("Sol");
    await user.click(within(soil).getByRole("button", { name: "Réessayer" }));
    expect(
      await within(soil).findByRole("button", { name: "Réessayer" }),
    ).toBeEnabled();
    expect(soil).toHaveAttribute("data-status", "indisponible");
    expect(soil.textContent).not.toMatch(/\d/);
    expect(fakeBackend.calls).toHaveLength(2);
  });

  it("retry request fails (backend unreachable): said on the card, the page keeps its data", async () => {
    const user = userEvent.setup();
    fakeBackend.respond("diagnostic", json(soilTimedOut));
    renderRoute("/farm", picked);
    const soil = await card("Sol");
    fakeBackend.respond("diagnostic", unreachable);
    await user.click(within(soil).getByRole("button", { name: "Réessayer" }));

    expect(
      await within(soil).findByText(
        "La nouvelle tentative n'a pas pu joindre le serveur.",
      ),
    ).toBeInTheDocument();
    // Not a page-level error: the other cards are still there with their values.
    expect(await card("Climat")).toHaveTextContent("17,9");
    expect(
      screen.queryByRole("heading", { name: "Serveur injoignable" }),
    ).toBeNull();
    expect(
      within(soil).getByRole("button", { name: "Réessayer" }),
    ).toBeEnabled();
  });

  it("the retried soil also reaches Home and Insights (one shared answer)", async () => {
    const user = userEvent.setup();
    fakeBackend.respond("diagnostic", json(soilTimedOut));
    renderRoute("/farm", picked);
    const soil = await card("Sol");
    fakeBackend.respond("diagnostic", json(real));
    await user.click(within(soil).getByRole("button", { name: "Réessayer" }));
    await within(soil).findByText("Franco-argileuse");

    await user.click(screen.getByRole("link", { name: "Accueil" }));
    const summary = await card("Parcelle sélectionnée");
    expect(
      await within(summary).findByText("Franco-argileuse"),
    ).toBeInTheDocument();
    expect(fakeBackend.calls).toHaveLength(2); // no extra request for Home
  });
});

describe.each(LANGUAGES)("Soil retry in %s", (lng) => {
  inLanguage(lng);

  it("the retry button and notes are translated", async () => {
    fakeBackend.respond("diagnostic", json(soilTimedOut));
    renderRoute("/farm", picked);
    const soil = await card(i18n.t("farm.soil"));
    expect(
      within(soil).getByRole("button", { name: i18n.t("request.retry") }),
    ).toBeInTheDocument();
    expect(
      within(soil).getByText(i18n.t("dataCard.retryPending")),
    ).toBeInTheDocument();
    expect(soil.textContent).not.toMatch(/\bdataCard\.|\{\{/);
  });
});
