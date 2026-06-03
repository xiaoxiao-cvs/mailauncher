import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HomePreview } from "./HomePreview";
import "@/design/tokens.css";
import "./lab.css";

const el = document.getElementById("home-root");
if (!el) throw new Error("home-root not found");
createRoot(el).render(
  <StrictMode>
    <HomePreview />
  </StrictMode>,
);
