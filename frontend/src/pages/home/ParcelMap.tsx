import "leaflet/dist/leaflet.css";

import type { LatLng, Map as LeafletMap } from "leaflet";
import { Crosshair } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import {
  isClosable,
  type LatLon,
  type Parcel,
  parcelFromCorners,
} from "../../state/parcelGeometry";
import { color } from "../../theme/tokens";
import styles from "./ParcelMap.module.css";

/** Default view: the Tadla plain around Béni Mellal (the project's target area). */
const DEFAULT_CENTER: LatLon = { lat: 32.4, lon: -6.45 };
const DEFAULT_ZOOM = 10;
const PICKED_ZOOM = 15;

// OpenStreetMap standard tiles: free, no key. OSM's tile usage policy asks for the
// attribution below and the plain tile.openstreetmap.org host (no a/b/c subdomains).
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const LINE = { color: color.green900, weight: 2 };
const CORNER = { ...LINE, fillColor: color.white, fillOpacity: 1 };

/** Leaflet can report longitudes beyond ±180 after panning around the globe: wrap them. */
const toLatLon = (latlng: LatLng): LatLon => {
  const wrapped = latlng.wrap();
  return { lat: wrapped.lat, lon: wrapped.lng };
};
const pos = (c: LatLon): [number, number] => [c.lat, c.lon];

function AddCornerOnTap({ onTap }: { onTap: (corner: LatLon) => void }) {
  useMapEvents({ click: (event) => onTap(toLatLon(event.latlng)) });
  return null;
}

export interface ParcelMapProps {
  /** The parcel drawn so far and closed (null before / after clearing). */
  value: Parcel | null;
  /** A closed parcel (corners + centroid), or null when the farmer clears it. */
  onChange: (parcel: Parcel | null) => void;
}

/**
 * design.md §7.2: a real interactive map (Leaflet + OpenStreetMap tiles) on which the farmer
 * draws their parcel: each tap adds a corner, "Close the outline" makes it the parcel (its
 * centroid is computed then), "Undo" / "Clear" fix mistakes. Drawing is built on react-leaflet
 * primitives (not leaflet-draw, unmaintained since 2018, English-only, no RTL), so every
 * control is a real translated <button> (§9, §9a).
 *
 * Keyboard / screen-reader path (§9): pan the map with the arrow keys, then "Add a corner at
 * the centre of the map" (shown by the crosshair), repeat, close. A live status line says how
 * many corners are placed and what to do next.
 *
 * The map stays left-to-right even in Arabic: it is a spatial surface (north up, east right),
 * not reading-direction content, like the PhotoFrame gradient that never flips (§9a).
 */
export function ParcelMap({ value, onChange }: ParcelMapProps) {
  const { t } = useTranslation();
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [draft, setDraft] = useState<LatLon[]>([]);
  // A closed parcel is shown as-is until cleared: taps then don't move it by accident.
  const closed = value !== null;
  const start = value ?? DEFAULT_CENTER;

  const addCorner = (corner: LatLon) => {
    if (!closed) setDraft((d) => [...d, corner]);
  };
  const closeOutline = () => {
    if (isClosable(draft)) {
      onChange(parcelFromCorners(draft));
      setDraft([]);
    }
  };
  const clear = () => {
    setDraft([]);
    onChange(null);
  };

  const status = value
    ? t("home.draw.closed", { count: value.polygon.length })
    : draft.length === 0
      ? t("home.draw.start")
      : draft.length < 3
        ? t("home.draw.more", { count: draft.length })
        : isClosable(draft)
          ? t("home.draw.ready", { count: draft.length })
          : t("home.draw.flat");

  return (
    <div className={styles.picker}>
      <p className={styles.status} role="status">
        {status}
      </p>
      <div
        className={styles.frame}
        role="region"
        aria-label={t("home.mapLabel")}
        dir="ltr"
      >
        <MapContainer
          ref={setMap}
          center={pos(start)}
          zoom={value ? PICKED_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className={styles.map}
        >
          <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
          <AddCornerOnTap onTap={addCorner} />
          {value ? (
            <>
              <Polygon
                positions={value.polygon.map(pos)}
                pathOptions={{
                  ...LINE,
                  fillColor: color.green900,
                  fillOpacity: 0.2,
                }}
              />
              <CircleMarker
                center={pos(value)}
                radius={4}
                pathOptions={CORNER}
              />
            </>
          ) : (
            <>
              {draft.length >= 2 ? (
                <Polyline
                  positions={draft.map(pos)}
                  pathOptions={{ ...LINE, dashArray: "6 6" }}
                />
              ) : null}
              {draft.map((corner, i) => (
                <CircleMarker
                  key={i}
                  center={pos(corner)}
                  radius={6}
                  pathOptions={CORNER}
                />
              ))}
            </>
          )}
        </MapContainer>
        <span className={styles.crosshair} aria-hidden="true">
          <Icon icon={Crosshair} />
        </span>
      </div>
      <div className={styles.actions}>
        <Button
          variant="outline"
          disabled={!map || closed}
          onClick={() => {
            if (map) addCorner(toLatLon(map.getCenter()));
          }}
        >
          {t("home.draw.addCenter")}
        </Button>
        <Button
          variant="outline"
          disabled={draft.length === 0}
          onClick={() => setDraft((d) => d.slice(0, -1))}
        >
          {t("home.draw.undo")}
        </Button>
        <Button
          variant="outline"
          disabled={closed || !isClosable(draft)}
          onClick={closeOutline}
        >
          {t("home.draw.close")}
        </Button>
        <Button
          variant="outline"
          disabled={draft.length === 0 && !closed}
          onClick={clear}
        >
          {t("home.draw.clear")}
        </Button>
      </div>
    </div>
  );
}
