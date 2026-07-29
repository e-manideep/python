import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ViewpointProvider } from "./state/viewpoint";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ViewpointProvider>
        <App />
      </ViewpointProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
