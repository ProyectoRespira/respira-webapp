import { useStore } from "@nanostores/react";

import { loadingStations, stations, type STATION } from "../../../store/map";

type StationListProps = {
  baseRoute: string;
};

const StationListSkeleton = () => (
  <div className="animate-pulse flex flex-col space-y-4">
    <div className="h-10 w-full bg-basedark rounded"></div>
    <div className="h-10 w-full bg-basedark rounded"></div>
    <div className="h-10 w-full bg-basedark rounded"></div>
  </div>
);

const StationListItem = ({
  station,
  baseRoute,
}: {
  station: STATION;
  baseRoute: string;
}) => (
  <li className="py-2">
    <a href={`${baseRoute}/${station.id}`}>
      <p className="font-serif font-bold text-[1rem] text-black">
        Estación {station.id}
      </p>
      <p className="font-sans text-[0.75rem] text-black">{station.name}</p>
    </a>
  </li>
);

const StationList = ({ baseRoute }: StationListProps) => {
  const data = useStore(stations);
  const loading = useStore(loadingStations);

  if (loading) {
    return <StationListSkeleton />;
  }

  if (!data) {
    return null;
  }

  return (
    <>
      {data.map((station: STATION) => (
        <StationListItem
          key={station.id}
          station={station}
          baseRoute={baseRoute}
        />
      ))}
    </>
  );
};

export { StationList };
