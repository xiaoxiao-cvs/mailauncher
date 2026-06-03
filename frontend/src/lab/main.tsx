import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LabApp } from "./LabApp";
import "./lab.css";
import "@/design/tokens.css";

const el = document.getElementById("lab-root");
if (!el) throw new Error("lab-root not found");
createRoot(el).render(
  <StrictMode>
    <LabApp />
  </StrictMode>,
);
