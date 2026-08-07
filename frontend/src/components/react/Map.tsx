import * as React from "react";
import Map, {
  GeolocateControl,
  NavigationControl,
  Marker,
  Popup,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useStore } from "@nanostores/react";
import {
  stations,
  loadingStations,
  regionMeta,
  allRegions,
  regionForCoords,
  selectedRegionId,
  setSelectedRegion,
  setSelectedStation,
  type STATION,
} from "../../store/map";
import { initRegionDetection } from "../../store/geolocation";
import Pin from "./Pin";

import { getColorRange, isValidAqi, parseBbox } from "../../utils";
import { MapTooltip } from "./MapTooltip";
import { ErrorBoundary } from "./ErrorBoundary";
import { getPixelOffsets } from "../../utils/markerOffset";

import { MAP_FALLBACK } from "../../data/constants";
import { useClientTranslations } from "../../i18n/client";

function debounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn();
    }, ms);
  };
}

const MapComponent = () => {
  const t = useClientTranslations();
  const data = useStore(stations);
  const isLoading = useStore(loadingStations);
  const region = useStore(regionMeta);

  const mapRef = React.useRef<MapRef>(null);

  // Auto-select the user's nearest region from their location. Keeps watching
  // the permission, so granting access after load (without a reload) still
  // moves to their region. Falls back silently when unavailable or denied.
  React.useEffect(() => {
    return initRegionDetection();
  }, []);

  const bounds = React.useMemo(() => parseBbox(region?.bbox), [region?.bbox]);

  // The first fit (default region) is instant; later changes — e.g. the region
  // resolved from the user's location — glide so the camera doesn't snap.
  const hasFitInitial = React.useRef(false);
  // Set when the region changed because the user panned the map: the card data
  // updates but the camera stays where the user left it (no re-fit).
  const skipNextFit = React.useRef(false);

  React.useEffect(() => {
    if (!bounds || !mapRef.current) return;
    if (!hasFitInitial.current) {
      mapRef.current.fitBounds(bounds, { padding: 40, duration: 0 });
      hasFitInitial.current = true;
    } else if (skipNextFit.current) {
      skipNextFit.current = false;
    } else {
      mapRef.current.fitBounds(bounds, {
        padding: 40,
        duration: 1600,
        essential: true,
      });
    }
  }, [bounds]);

  // When the user pans/zooms, switch the region shown in the card to whichever
  // region's bbox contains the new map center.
  const regions = useStore(allRegions);

  const handleMoveEnd = React.useCallback(() => {
    if (!mapRef.current || !regions || regions.length === 0) return;
    const center = mapRef.current.getCenter();
    const match = regionForCoords(regions, center.lng, center.lat);
    if (match && match.id !== selectedRegionId.get()) {
      skipNextFit.current = true;
      setSelectedRegion(match.id);
    }
  }, [regions]);

  const [dimensions, setDimensions] = React.useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });

  React.useEffect(() => {
    const debouncedHandleResize = debounce(function handleResize() {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    }, 500);
    window.addEventListener("resize", debouncedHandleResize);

    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
    };
  }, []);

  const [popupInfo, setPopupInfo] = React.useState<STATION | undefined>(
    undefined,
  );

  // `data` only ever holds active, mappable stations (the store drops the rest),
  // so a region with none simply renders no markers.
  const pins = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    const offsets = getPixelOffsets(data);
    return data.map((station, index) => {
      const offset = offsets[index];
      return (
        <Marker
          key={`marker-${index}`}
          longitude={station.coordinates[1]}
          latitude={station.coordinates[0]}
          anchor="center"
          onClick={(e) => {
            // If we let the click event propagates to the map, it will immediately close the popup
            // with `closeOnClick: true`
            e.originalEvent.stopPropagation();
            setPopupInfo(station);
            setSelectedStation(station.id);
          }}
        >
          {/* Constant pixel offset keeps co-located sensors separated at any zoom */}
          <div style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
            <Pin
              fill={getColorRange(
                isValidAqi(station?.aqi_pm2_5) ? station.aqi_pm2_5 : 0,
              )}
              value={station?.aqi_pm2_5 ?? -1}
            />
          </div>
        </Marker>
      );
    });
  }, [data]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: dimensions.height * 0.75,
      }}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#fff",
            borderRadius: 999,
            padding: "10px 20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            fontSize: 14,
            fontWeight: 500,
            color: "#374151",
          }}
        >
          <svg
            style={{
              animation: "spin 0.8s linear infinite",
              width: 20,
              height: 20,
              color: "#16a34a",
              flexShrink: 0,
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.25"
            />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {t("map.loading")}
        </div>
      )}
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: MAP_FALLBACK.center.longitude,
          latitude: MAP_FALLBACK.center.latitude,
          zoom: MAP_FALLBACK.zoom,
        }}
        dragRotate={false}
        touchPitch={false}
        touchZoomRotate={true}
        minZoom={MAP_FALLBACK.minZoom}
        attributionControl={false}
        style={{ width: "100%", height: dimensions.height * 0.75 }}
        onClick={() => setSelectedStation(undefined)}
        onMoveEnd={handleMoveEnd}
        mapStyle="https://api.maptiler.com/maps/442672a8-7228-4ab4-9780-83a9932987b5/style.json?key=NKY3xmA1haxXwc5Jm48B"
      >
        {data && pins}
        {popupInfo && (
          <Popup
            anchor="bottom-left"
            offset={10}
            longitude={Number(popupInfo.coordinates[1])}
            latitude={Number(popupInfo.coordinates[0])}
            onClose={() => setPopupInfo(undefined)}
          >
            <div className="flex flex-col">
              <p className="font-bold text-[16px] text-white">
                {t("stats.station")} {popupInfo.id}
              </p>
              <p className="font-bold font-xs text-white">{popupInfo.name}</p>
              <a href={`/datos/${popupInfo.id}`}>
                <p className="text-green font-bold underline">
                  {t("map.viewStats")}
                </p>
              </a>
            </div>
          </Popup>
        )}
        <GeolocateControl position="bottom-right" showAccuracyCircle={false} />
        <NavigationControl position="bottom-right" />
        {/* The tooltip is data-driven and sits inside the map, so a throw here
            unmounts the map itself. Contain it: worst case the label is
            missing, the map stays pannable. */}
        <ErrorBoundary label="MapTooltip">
          <MapTooltip />
        </ErrorBoundary>
      </Map>
    </div>
  );
};

export default MapComponent;
