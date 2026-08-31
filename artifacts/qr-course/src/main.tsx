import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element is missing.");
}

// The HTML shell is useful to crawlers and to users while JavaScript loads.
// Remove it only when the interactive React application is ready to mount.
rootElement.querySelector("[data-seo-fallback]")?.remove();
createRoot(rootElement).render(<App />);
