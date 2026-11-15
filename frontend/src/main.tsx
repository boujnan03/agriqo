import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
// §9a Arabic face, same weights as Inter; Arabic subset only (Latin stays on Inter).
import "@fontsource/noto-sans-arabic/arabic-400.css";
import "@fontsource/noto-sans-arabic/arabic-500.css";
import "@fontsource/noto-sans-arabic/arabic-600.css";
import "@fontsource/noto-sans-arabic/arabic-700.css";
import "./theme/tokens.css";
import "./theme/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
// Initialises i18n (Arabic default) and sets <html lang dir> before the first render.
import "./i18n";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element in index.html");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
