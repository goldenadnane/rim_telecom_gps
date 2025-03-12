import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../MapComponent.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type Coordinate = {
  lat: number;
  lng: number;
  speed: number;
  timestamp: string;
  temp: number;
  fuel: number;
  ignition: boolean;
  rpm: number;
  odo: number;
  heading: number;
  SatInView: number;
  signal: string;
  state: string;
};

const configureLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

configureLeafletIcons();

const MapComponent = () => {
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([
    35.62224, 10.73766,
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [traveledPath, setTraveledPath] = useState<[number, number][]>([]);
  const [movingMarkerPosition, setMovingMarkerPosition] = useState<
    [number, number]
  >([35.62224, 10.73766]);
  const [startData, setStartData] = useState<Coordinate | null>(null);
  const [endData, setEndData] = useState<Coordinate | null>(null);
  const [currentData, setCurrentData] = useState<Coordinate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const mapRef = useRef<L.Map>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const traveledPathRef = useRef<[number, number][]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("http://localhost:3000/api/coordinates");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data: Coordinate[] = await response.json();

        const validData = data.filter(
          (item) =>
            !isNaN(item.lat) &&
            !isNaN(item.lng) &&
            typeof item.timestamp === "string"
        );

        setCoordinates(validData);
      } catch (error) {
        console.error("Error fetching coordinates:", error);
        alert("Failed to fetch data. Please check your network connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);
  }, []);

  const findClosestData = (lat: number, lng: number): Coordinate | null => {
    let closestData: Coordinate | null = null;
    let minDistance = Infinity;

    coordinates.forEach((coord) => {
      const distance = Math.sqrt(
        Math.pow(coord.lat - lat, 2) + Math.pow(coord.lng - lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestData = coord;
      }
    });

    return closestData;
  };

  const handleStart = () => {
    if (!startPoint || !endPoint) {
      alert("Veuillez définir un point de départ et d'arrivée.");
      return;
    }

    const startData = findClosestData(startPoint[0], startPoint[1]);
    const endData = findClosestData(endPoint[0], endPoint[1]);

    setStartData(startData);
    setEndData(endData);
    setCurrentData(startData); // Initialiser les données du popup avec les données de départ

    const path = interpolatePoints(startPoint, endPoint);
    traveledPathRef.current = path;
    setTraveledPath(path);
    setCurrentPosition(startPoint);

    if (mapRef.current) {
      if (polylineRef.current) {
        polylineRef.current.remove();
      }
      polylineRef.current = L.polyline(path, { color: "red", weight: 4 }).addTo(
        mapRef.current
      );
      const bounds = L.latLngBounds(path);
      mapRef.current.fitBounds(bounds);
    }

    toggleAnimation();
  };

  const interpolatePoints = (
    start: [number, number],
    end: [number, number],
    numPoints = 100
  ) => {
    const points: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const lat = start[0] + (end[0] - start[0]) * fraction;
      const lng = start[1] + (end[1] - start[1]) * fraction;
      points.push([lat, lng]);
    }
    return points;
  };

  const animate = (timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;

    const totalPoints = traveledPathRef.current.length;
    const duration = 15000;
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);

    setProgress(progress * 100);

    const virtualIndex = progress * (totalPoints - 1);
    const index = Math.floor(virtualIndex);
    const fraction = virtualIndex - index;

    if (index < totalPoints - 1) {
      const start = traveledPathRef.current[index];
      const end = traveledPathRef.current[index + 1];

      const lat = start[0] + (end[0] - start[0]) * fraction;
      const lng = start[1] + (end[1] - start[1]) * fraction;

      setCurrentPosition([lat, lng]);
      setMovingMarkerPosition([lat, lng]);

      const closestData = findClosestData(lat, lng);
      setCurrentData(closestData || startData); // Utiliser les données de départ si aucune donnée n'est trouvée
    }

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsPlaying(false);
      setCurrentData(endData); // Afficher les données d'arrivée à la fin
    }
  };

  const toggleAnimation = () => {
    if (!isPlaying) {
      startTimeRef.current = undefined;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const resetAnimation = () => {
    setIsPlaying(false);
    setProgress(0);
    setTraveledPath([]);
    traveledPathRef.current = [];
    setCurrentPosition(startPoint || [35.62224, 10.73766]);
    setCurrentData(startData); // Réinitialiser les données du popup avec les données de départ

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
  };

  return (
    <div className="map-container">
      {isLoading && <div className="loading-indicator">Loading...</div>}
      <MapContainer
        center={currentPosition}
        zoom={13}
        scrollWheelZoom={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Afficher tous les points avec des marqueurs et des popups */}
        {coordinates.map((coord, index) => (
          <Marker key={index} position={[coord.lat, coord.lng]}>
            <Popup className="custom-popup">
              <div className="popup-content">
                <div className="popup-left">
                  <h3>Informations du point</h3>
                  <p>Latitude: {coord.lat.toFixed(6)}</p>
                  <p>Longitude: {coord.lng.toFixed(6)}</p>
                </div>
                <div className="popup-right">
                  <p>
                    <strong>Speed:</strong> {coord.speed}
                  </p>
                  <p>
                    <strong>Fuel:</strong> {coord.fuel}
                  </p>
                  <p>
                    <strong>Ignition:</strong> {coord.ignition ? "On" : "Off"}
                  </p>
                  <p>
                    <strong>RPM:</strong> {coord.rpm}
                  </p>
                  <p>
                    <strong>Odo:</strong> {coord.odo} km
                  </p>
                  <p>
                    <strong>Heading:</strong> {coord.heading} °
                  </p>
                  <p>
                    <strong>Satellites:</strong> {coord.SatInView}
                  </p>
                  <p>
                    <strong>Signal:</strong> {coord.signal}
                  </p>
                  <p>
                    <strong>Temp:</strong> {coord.temp}
                  </p>
                  <p>
                    <strong>State:</strong> {coord.state}
                  </p>
                  <p>
                    <strong>Timestamp:</strong> {coord.timestamp}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Marqueur en mouvement */}
        <Marker position={movingMarkerPosition}>
          <Popup className="custom-popup">
            <div className="popup-content">
              <div className="popup-left">
                <h3>Position actuelle</h3>
                <p>Latitude: {movingMarkerPosition[0].toFixed(6)}</p>
                <p>Longitude: {movingMarkerPosition[1].toFixed(6)}</p>
              </div>
              <div className="popup-right">
                <p>
                  <strong>Speed:</strong> {currentData?.speed}
                </p>
                <p>
                  <strong>Fuel:</strong> {currentData?.fuel}
                </p>
                <p>
                  <strong>Ignition:</strong>{" "}
                  {currentData?.ignition ? "On" : "Off"}
                </p>
                <p>
                  <strong>RPM:</strong> {currentData?.rpm}
                </p>
                <p>
                  <strong>Odo:</strong> {currentData?.odo} km
                </p>
                <p>
                  <strong>Heading:</strong> {currentData?.heading} °
                </p>
                <p>
                  <strong>Satellites:</strong> {currentData?.SatInView}
                </p>
                <p>
                  <strong>Signal:</strong> {currentData?.signal}
                </p>
                <p>
                  <strong>Temp:</strong> {currentData?.temp}
                </p>
                <p>
                  <strong>State:</strong> {currentData?.state}
                </p>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Contrôles pour définir les points de départ et d'arrivée */}
        <div className="controls">
          <div>
            <h4>Départ</h4>
            <input
              type="number"
              placeholder="Latitude"
              onChange={(e) =>
                setStartPoint([
                  parseFloat(e.target.value),
                  startPoint ? startPoint[1] : 0,
                ])
              }
            />
            <input
              type="number"
              placeholder="Longitude"
              onChange={(e) =>
                setStartPoint([
                  startPoint ? startPoint[0] : 0,
                  parseFloat(e.target.value),
                ])
              }
            />
          </div>
          <div>
            <h4>Arrivée</h4>
            <input
              type="number"
              placeholder="Latitude"
              onChange={(e) =>
                setEndPoint([
                  parseFloat(e.target.value),
                  endPoint ? endPoint[1] : 0,
                ])
              }
            />
            <input
              type="number"
              placeholder="Longitude"
              onChange={(e) =>
                setEndPoint([
                  endPoint ? endPoint[0] : 0,
                  parseFloat(e.target.value),
                ])
              }
            />
          </div>
          <button onClick={handleStart} className="start-button">
            Démarrer
          </button>
          <button onClick={resetAnimation} className="reset-button">
            Réinitialiser
          </button>
        </div>
      </MapContainer>
    </div>
  );
};

export default MapComponent;
