import "leaflet/dist/leaflet.css";

import type { LatLng, Map as LeafletMap } from "leaflet";
import { Crosshair } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import type { ParcelLocation } from "../../state/session";
import { color } from "../../theme/tokens";
import styles from "./ParcelMap.module.css";

/** Default view: the Tadla plain around Béni Mellal (the project's target area). */
const DEFAULT_CENTER: ParcelLocation = { lat: 32.4, lon: -6.45 };
const DEFAULT_ZOOM = 10;
const PICKED_ZOOM = 13;

// OpenStreetMap standard tiles: free, no key. OSM's tile usage policy asks for the
// attribution below and the plain tile.openstreetmap.org host (no a/b/c subdomains).
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Leaflet can report longitudes beyond ±180 after panning around the globe: wrap them. */
const toLocation = (latlng: LatLng): ParcelLocation => {
  const wrapped = latlng.wrap();
  return { lat: wrapped.lat, lon: wrapped.lng };
};

function PickOnTap({ onPick }: { onPick: (location: ParcelLocation) => void }) {
  useMapEvents({ click: (event) => onPick(toLocation(event.latlng)) });
  return null;
}

export interface ParcelMapProps {
  /** The picked point, if any: drawn as the pin. */
  value: ParcelLocation | null;
  onPick: (location: ParcelLocation) => void;
}

/**
 * design.md §7.2: a real interactive map (Leaflet + OpenStreetMap tiles) the farmer taps to drop
 * a pin on their parcel. Tapping is a pointer gesture, so a real <button> (§9) offers the same
 * pick for keyboards and screen readers: pan the map (arrow keys), then pick its centre, shown
 * by a crosshair.
 *
 * The map stays left-to-right even in Arabic: it is a spatial surface (north up, east right),
 * not reading-direction content, like the PhotoFrame gradient that never flips (§9a).
 */
export function ParcelMap({ value, onPick }: ParcelMapProps) {
  const { t } = useTranslation();
  const [map, setMap] = useState<LeafletMap | null>(null);
  const start = value ?? DEFAULT_CENTER;

  return (
    <div className={styles.picker}>
      <div
        className={styles.frame}
        role="region"
        aria-label={t("home.mapLabel")}
        dir="ltr"
      >
        <MapContainer
          ref={setMap}
          center={[start.lat, start.lon]}
          zoom={value ? PICKED_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className={styles.map}
        >
          <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
          <PickOnTap onPick={onPick} />
          {value ? (
            <CircleMarker
              center={[value.lat, value.lon]}
              radius={10}
              pathOptions={{
                color: color.green900,
                fillColor: color.green900,
                fillOpacity: 0.35,
                weight: 2,
              }}
            />
          ) : null}
        </MapContainer>
        <span className={styles.crosshair} aria-hidden="true">
          <Icon icon={Crosshair} />
        </span>
      </div>
      <Button
        variant="outline"
        disabled={!map}
        onClick={() => {
          if (map) onPick(toLocation(map.getCenter()));
        }}
      >
        {t("home.pickCenter")}
      </Button>
    </div>
  );
}
