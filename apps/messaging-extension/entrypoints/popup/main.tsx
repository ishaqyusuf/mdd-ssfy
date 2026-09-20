import React from "react";
import { createRoot } from "react-dom/client";
import { ConnectionShell } from "../../src/connection-shell";
import "../../src/styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConnectionShell compact />
  </React.StrictMode>,
);
