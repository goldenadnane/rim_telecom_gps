import { IonApp, IonContent } from "@ionic/react";
import MapComponent from "./components/MapComponent";

const App: React.FC = () => (
  <IonApp>
    <IonContent
      scrollY={false}
      fullscreen
      style={{
        "--background": "transparent",
        height: "100vh",
        width: "100vw",
      }}
    >
      <MapComponent />
    </IonContent>
  </IonApp>
);

export default App;
