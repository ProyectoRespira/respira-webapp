import * as React from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useStore } from "@nanostores/react";
import Pin from "./Pin";

import {
  getColorRange,
  isValidAqi,
  parseBbox,
  expandBounds,
} from "../../utils";
import { statisticsSelectedStation } from "../../store/statistics";
import { regionMeta } from "../../store/map";
import { MAP_FALLBACK } from "../../data/constants";

const PlaceHolderMap = () => {
  const data = useStore(statisticsSelectedStation);
  const region = useStore(regionMeta);

  const bounds = parseBbox(region?.bbox);
  const maxBounds = bounds ? expandBounds(bounds, 4) : MAP_FALLBACK.maxBounds;

  const [dimensions] = React.useState({
    height: 300,
    width: "100%",
  });

  return (
    <>
      {data ? (
        <Map
          initialViewState={{
            longitude: data?.coordinates[1] || MAP_FALLBACK.center.longitude,
            latitude: data?.coordinates[0] || MAP_FALLBACK.center.latitude,
            zoom: 15,
          }}
          dragRotate={false}
          touchPitch={false}
          touchZoomRotate={true}
          minZoom={MAP_FALLBACK.minZoom}
          attributionControl={false}
          style={{ ...dimensions }}
          interactive={false}
          maxBounds={maxBounds}
          mapStyle="https://api.maptiler.com/maps/442672a8-7228-4ab4-9780-83a9932987b5/style.json?key=NKY3xmA1haxXwc5Jm48B"
        >
          <Marker
            key={`marker-${data.id}`}
            longitude={data.coordinates[1]}
            latitude={data.coordinates[0]}
            anchor="center"
          >
            <Pin
              fill={getColorRange(
                isValidAqi(data.aqi_pm2_5) ? data.aqi_pm2_5 : 0,
              )}
              value={data.aqi_pm2_5}
            />
          </Marker>
        </Map>
      ) : (
        <svg
          className="animate-spin h-20 w-20 mr-3 ..."
          viewBox="0 0 24 24"
        ></svg>
      )}
    </>
  );
};

export default PlaceHolderMap;
