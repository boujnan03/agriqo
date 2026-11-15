import "@testing-library/jest-dom/vitest";
// Initialises i18n exactly as the app does (Arabic default, <html lang dir> kept in sync).
import "../src/i18n";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, vi } from "vitest";

import i18n, { DEFAULT_LANGUAGE } from "../src/i18n";
import { fakeBackend, fakeFetch } from "./fakeBackend";

beforeEach(() => {
  // Every test talks to the fake backend (real captured responses), never the network.
  fakeBackend.reset();
  vi.stubGlobal("fetch", fakeFetch);
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  // The water regime is remembered in localStorage: every test starts from the default.
  try {
    window.localStorage.clear();
  } catch {
    // no storage in this environment: nothing to reset
  }
  expect(
    fakeBackend.unexpected,
    "the app made a request that isn't an API route",
  ).toEqual([]);
  // Language is global state: every test starts again from the app default (Arabic).
  await i18n.changeLanguage(DEFAULT_LANGUAGE);
});
