import * as React from "react";

import { useStore } from "@nanostores/react";
import { loadingRegion, region, selectedStationError, selectedStationId } from "../../store/map";
import { BarChart as Chart } from "./BarChartNivo";
import { Slider } from "./Slider";
import { AQICard } from "./AQICardReactive";
import { isBackendAvailable } from "../../store/store";
import { selectedStation } from "../../store/map";
import { AQI } from "../../data/cards";
import { getAQIIndex } from "../../utils";
import { toggleRecommendationsModal, toggleShareModal } from "../../store/modals";
import { BASE_URL } from "../../data/constants";

export const Card = (props: any) => {
  const backendAvailable = useStore(isBackendAvailable);
  const station = useStore(selectedStation);
  const stationId = useStore(selectedStationId)
  const data = useStore(region);
  const loadingMean = useStore(loadingRegion)
  const stationError = useStore(selectedStationError)

  const dataAvailable = React.useMemo(() => {
    if (stationId && station && !stationError) {
      return true
    }
    if (data && !loadingMean && !stationId) {
      return true
    }
    return false
  }, [station, stationId, data])

  const loading = React.useMemo(() => {
    if(stationError){
      return false
    }
    if (loadingMean) {
      return true
    }
    if (stationId && !station && !stationError) {
      return true
    }
    return false
  }, [station, stationId,  stationError, loadingMean])


  const handleSharing = async () => {
    if (navigator.share) {
      try {
        await navigator
          .share({ url: BASE_URL })
          .then(() =>
            console.log("Hooray! Your content was shared to tha world")
          );
      } catch (error) {
        console.log(`Oops! I couldn't share to the world because: ${error}`);
      }
    } else {
      toggleShareModal(true)
      // fallback code
      console.log(
        "Web share is currently not supported on this browser. Please provide a callback"
      );
    }
  };

  return (
    <div
      className={`bg-white w-full md:w-2/3  md:min-height:calc(100vh-4rem) rounded-xl z-20 md:ml-8 md:mt-8 drop-shadow-lg flex flex-col p-8 space-y-4 pointer-events-auto`}
      style={{
        minHeight: window.innerHeight * 0.8
      }}
    >
      {!backendAvailable && backendAvailable !== undefined && (
        <div className="w-full h-full content-center justify-center m-auto">
          <p className="font-bold text-lg text-center">
            ⚠️ Error conectándose al backend
          </p>
        </div>
      )}
      {loading && 
        <div role="status" className="w-full h-full content-center justify-center m-auto">
          <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray m-auto" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
          </svg>
          <span className="sr-only">Loading...</span>
        </div>
      }
      {!dataAvailable && !loading && (
        <div className="w-full h-full content-center justify-center m-auto">
          <p className="font-bold text-lg text-center">
            ⚠️ Error cargando los datos.
          </p>
        </div>
      )}
      {dataAvailable && !loading && (
        <>
          {props.header}
          <h6 className="text-lg font-bold w-auto text-center font-serif">
            {!station ? "Media General" : station.name}
          </h6>
          <div >
            <Slider value={station ? station.aqi : data.aqi} />
            <div className="mt-6">
              <AQICard
                card={AQI[getAQIIndex(station ? station.aqi : data?.aqi || 0)]}
              />
            </div>
          </div>
          {props.header_forecast_six}
          <div className="h-[100px] w-full">
            <Chart
              data={station ? station.forecast_6h : data.forecast_6h}
              client:only="react"
            />
          </div>
          {props.header_forecast_twelve}
          <div className="h-[100px] w-full pb-2">
            <Chart
              data={station ? station.forecast_12h : data.forecast_12h}
              client:only="react"
            />
          </div>
          <button
            className={
              "text-white font-serif font-bold py-3 px-6 rounded-md text-sm bg-green w-full "
            }
            onClick={() => toggleRecommendationsModal(true)}
            {...props}
          >
            <p className="font-serif uppercase">Recomendaciones por nivel</p>
          </button>
          <button className="share w-full text-center mt-4" id="share" onClick={() => handleSharing()}>
            <p className="text-green text-center font-bold"
            >Compartir</p>
          </button>
        </>
      )}
    </div>
  );
};
