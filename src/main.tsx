import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("%c𝙱𝙹𝙴 ~ Tools v1.0.3", "color: #6366f1; font-weight: bold; font-size: 1.2rem;");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
