// install (please try to align the version of installed @nivo packages)
// yarn add @nivo/boxplot
import { useStore } from "@nanostores/react";
import { ResponsiveBoxPlot } from "@nivo/boxplot";
import { DateTime } from "luxon";
import { boxplotMonthData, boxplotWeekData, boxplotYearData, errorBoxplotMonth, errorBoxplotWeek, errorBoxplotYear, loadingBoxplotMonth, loadingBoxplotWeek, loadingBoxplotYear } from "../../../store/statistics";

const quantiles = [0, 0.25, 0.5, 0.75, 1];

const formatterWeek = (date: string) => { 
  const parsedDate = DateTime.fromFormat(date, "yyyy-MM-dd", { locale: "es" })
  return parsedDate.weekdayShort + "-" + parsedDate.day
}
const formatterMonth = (_:string, { index }: { index?: number }) => index !== undefined ? (index + 1) + "W" : ""
const formatterYear = (date: string) =>  { 
  const parsedDate = DateTime.fromFormat(date, "yyyy-MM-dd", { locale: "es" }) 
  return parsedDate.monthShort + "-" + parsedDate.toFormat("yy")
}

const processData = (data: any, formatter: (date: string, { index }: { index?: number }) => string) => {
  if (!data) { return }
  const size = data["x"].length;
  return data["x"].sort().map((_: any, index: number) => ({
    group: formatter(data["x"][index], { index }),
    subGroup: "",
    mean: data["median"][index],
    quantiles: quantiles,
    values: [
      data["lowerfence"][index],
      data["q1"][index],
      data["median"][index],
      data["q3"][index],
      data["upperfence"][index],
    ],
    n: size,
    extrema: [data["lowerfence"][index], data["upperfence"][index]],
  }));
};


export const BoxPlotChart = ({ period }: { period: "7d" | "30d" | "1y" }) => {
  let data;
  let loading;
  let error;
  if (period === "7d") {
    loading = useStore(loadingBoxplotWeek)
    error = useStore(errorBoxplotWeek)
    data = processData(useStore(boxplotWeekData), formatterWeek);
  }
  if (period === "30d") {
    loading = useStore(loadingBoxplotMonth)
    error = useStore(errorBoxplotMonth)
    data = processData(useStore(boxplotMonthData), formatterMonth);
  }
  if (period === "1y") {
    loading = useStore(loadingBoxplotYear)
    error = useStore(errorBoxplotYear)
    data = processData(useStore(boxplotYearData), formatterYear);
  }
  return (
    <>
      {loading && !data && !error &&  (
        <div className="grid min-h-[140px] h-full w-full place-items-center overflow-x-scroll rounded-lg p-6 lg:overflow-visible">
          <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
          </svg>
          <span className="sr-only">Cargando...</span>
        </div>
      )}
       {!loading && (!data || data.length === 0)  && (
        <div className="grid min-h-[140px] h-full w-full place-items-center overflow-x-scroll rounded-lg p-6 lg:overflow-visible">
          <p>Error cargando el gráfico</p>
        </div>
      )}
      {data && !loading && (
        <ResponsiveBoxPlot
          data={data}
          colors={["#EEC3A4"]}
          medianColor={"#8F4712"}
          whiskerColor={"#818181"}
          margin={{ top: 60, right: 30, bottom: 60, left: 30 }}
          subGroups={[]}
          padding={0.6}
          theme={{
            translation: {
              n: 'n',
              Summary: 'Resumen',
              mean: 'Media',
              min: 'min',
              max: 'max',
              Quantiles: 'Cuantiles'
            },
          }}
        />
      )}
    </>
  );
};
