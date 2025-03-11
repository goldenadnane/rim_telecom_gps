import "leaflet/dist/leaflet.css";
import React from "react";
import ReactDOM from "react-dom/client"; // Importer à partir de 'react-dom/client'
import App from "./App";
import "./main.css";
import { IonApp, IonContent } from "@ionic/react";

// Utiliser createRoot au lieu de render
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <IonApp>
      <IonContent>
        <App />
      </IonContent>
    </IonApp>
  </React.StrictMode>
);
