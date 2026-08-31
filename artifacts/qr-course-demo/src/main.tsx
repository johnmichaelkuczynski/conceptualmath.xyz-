import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element is missing.");
}

// Keep the descriptive HTML response visible to non-JavaScript clients, then
// hand the same mount point to the animated player when React loads.
rootElement.querySelector("[data-seo-fallback]")?.remove();
createRoot(rootElement).render(<App />);
