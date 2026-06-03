import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DashboardPreview } from "./DashboardPreview";
import "./lab.css";
import "@/design/tokens.css";

const el = document.getElementById("dash-root");
if (!el) throw new Error("dash-root not found");
createRoot(el).render(
  <StrictMode>
    <DashboardPreview />
  </StrictMode>,
);
