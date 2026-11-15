import "@testing-library/jest-dom/vitest";
// Initialises i18n exactly as the app does (Arabic default, <html lang dir> kept in sync).
import "../src/i18n";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import i18n, { DEFAULT_LANGUAGE } from "../src/i18n";

afterEach(async () => {
  cleanup();
  // Language is global state: every test starts again from the app default (Arabic).
  await i18n.changeLanguage(DEFAULT_LANGUAGE);
});
