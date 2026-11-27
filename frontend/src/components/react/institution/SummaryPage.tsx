import { useEffect, useState } from "react";

import type {
  ActionLog,
  DashboardAirQuality,
  InstitutionAlert,
  InstitutionKind,
  ParticleLimits,
  SensorReading,
} from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import {
  format,
  useInstitutionCopy,
  type InstitutionCopyKey,
} from "../../../i18n/institution";
import { fetchActionLogs } from "../../../store/institution";
import {
  AQI_SCALE,
  LEVEL_COLORS,
  PARTICLES,
  PARTICLE_SCALES,
  aqiBand,
  aqiInk,
  aqiPinPosition,
  dailyBuckets,
  formatDayLabel,
  formatNumber,
  formatStamp,
  lastDay,
  mean,
  particleLevel,
  type Particle,
} from "../../../utils/institution-readings";
import type { PanelPage } from "./panel-pages";
import { PanelCard, PanelNotice, PanelTitle } from "./panel-ui";
import { Skeleton } from "./ui";
import { useReadings } from "./useReadings";

type Copy = ReturnType<typeof useInstitutionCopy>;

const PARTICLE_LABEL: Record<Particle, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
};

const BAND_LABELS = [0, 1, 2, 3, 4, 5].map(
  (band) => `aqiBand${band}` as InstitutionCopyKey,
);

/**
 * Resumen (#338, #329): the reading of the day and how particles compare with
 * the MADES limits, the week at a glance, and the latest alert and action.
 *
 * Every particle block reads the same week of hourly readings. While that
 * endpoint is not deployed they hide, and the AQI block takes the full width,
 * which is the panel the institution had before.
 */
export function SummaryPage({
  stationId,
  airQuality,
  limits,
  kind,
  alerts,
  onNavigate,
  lang,
}: {
  stationId: number;
  airQuality: DashboardAirQuality | null;
  /** Absent on a backend without #333: the MADES comparison hides. */
  limits: ParticleLimits | undefined;
  kind: InstitutionKind;
  /** Newest first. */
  alerts: AlertsFeed;
  onNavigate: (page: PanelPage) => void;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const week = useReadings(stationId, "7d");
  const particlesHidden =
    week.status === "unavailable" || week.status === "error";

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label={copy.navSummary}
        className="flex flex-wrap overflow-hidden rounded-[22px] border-2 border-[#1B1B1A] bg-white"
      >
        <AqiHero airQuality={airQuality} kind={kind} copy={copy} />
        {limits && !particlesHidden && (
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 p-5 md:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <PanelTitle>{copy.madesTitle}</PanelTitle>
              <span className="text-[12px] text-[#5C5752]">
                {copy.madesSource}
              </span>
            </div>
            {week.status === "loading" ? (
              <>
                <Skeleton className="h-[104px] w-full" />
                <Skeleton className="h-[104px] w-full" />
              </>
            ) : (
              PARTICLES.map((particle) => (
                <MadesRow
                  key={particle}
                  particle={particle}
                  readings={week.status === "ready" ? week.readings : []}
                  limits={limits}
                  copy={copy}
                  lang={lang}
                />
              ))
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-5">
        {!particlesHidden && (
          <WeekCard
            readings={week.status === "ready" ? week.readings : null}
            limits={limits}
            onNavigate={onNavigate}
            copy={copy}
            lang={lang}
          />
        )}
        <LatestCard
          stationId={stationId}
          alerts={alerts}
          onNavigate={onNavigate}
          copy={copy}
        />
      </div>
    </div>
  );
}

// --- AQI hero ---------------------------------------------------------------

function AqiHero({
  airQuality,
  kind,
  copy,
}: {
  airQuality: DashboardAirQuality | null;
  kind: InstitutionKind;
  copy: Copy;
}) {
  const band = aqiBand(airQuality?.aqi);

  if (!airQuality || band == null) {
    return (
      <div className="flex min-w-0 flex-[1_1_380px] flex-col justify-center gap-2 bg-[#F6F2EF] p-7">
        <p className="m-0 font-serif text-[24px] font-black">
          {copy.airQualityEmptyTitle}
        </p>
        <p className="m-0 text-[14px] text-[#3E3A36]">
          {copy.airQualityEmptyBody}
        </p>
      </div>
    );
  }

  const aqi = Math.round(airQuality.aqi);
  const level = copy[`aqiLevel${band}` as InstitutionCopyKey];
  const phrase =
    copy[
      `hero${kind === "colegio" ? "Colegio" : "Industria"}${band}` as InstitutionCopyKey
    ];
  const ink = aqiInk(band);

  return (
    <div
      className="flex min-w-0 flex-[1_1_380px] flex-col justify-center gap-7 p-6 md:px-7 md:py-8"
      style={{ backgroundColor: AQI_SCALE[band], color: ink }}
    >
      <div className="flex items-center gap-[18px]">
        <span className="flex h-[104px] w-[104px] shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-[#1B1B1A] bg-white text-[#1B1B1A]">
          <span className="font-serif text-[38px] font-black leading-none">
            {aqi}
          </span>
          <span className="text-[11px] font-extrabold">AQI</span>
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="m-0 font-serif text-[28px] font-black leading-[1.1] md:text-[34px]">
            {level}
          </p>
          <p className="m-0 text-[16px] font-semibold">{phrase}</p>
        </div>
      </div>

      <div
        role="img"
        aria-label={format(copy.aqiScaleLabel, { aqi, level })}
        className="relative pt-1.5"
      >
        <div className="grid h-[14px] grid-cols-6 overflow-hidden rounded-[10px] border-2 border-[#1B1B1A]">
          {["#6FCF6A", ...AQI_SCALE.slice(1)].map((color) => (
            <span key={color} style={{ backgroundColor: color }} />
          ))}
        </div>
        <span
          className="absolute top-0 -ml-[3px] h-[26px] w-1.5 rounded-[3px] border-2 border-white bg-[#1B1B1A]"
          style={{ left: `${aqiPinPosition(airQuality.aqi)}%` }}
        />
        <div
          aria-hidden="true"
          className="grid grid-cols-6 pt-1 text-[11px] font-bold"
        >
          {BAND_LABELS.map((key, index) => (
            <span
              key={key}
              className={`${index === 5 ? "text-right" : index === 0 ? "" : "text-center"} ${
                index > 0 && index < 5 ? "invisible sm:visible" : ""
              }`}
            >
              {copy[key]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- MADES ------------------------------------------------------------------

function MadesRow({
  particle,
  readings,
  limits,
  copy,
  lang,
}: {
  particle: Particle;
  readings: SensorReading[];
  limits: ParticleLimits;
  copy: Copy;
  lang: Lang;
}) {
  const limit = limits[particle] ?? { h24: null, annual: null };
  const average = mean(lastDay(readings).map((reading) => reading[particle]));
  const h24 = limit.h24;
  const scaleMax =
    h24 != null ? h24 * 1.25 : PARTICLE_SCALES[particle].minChartMax;
  const fill = average != null ? Math.min(100, (average / scaleMax) * 100) : 0;

  const status =
    average == null
      ? { label: copy.madesNoData, bg: "#EFEAE6" }
      : h24 == null
        ? { label: copy.madesPending, bg: "#EFEAE6" }
        : average <= h24
          ? { label: copy.madesWithin, bg: "#E3F8DF" }
          : { label: copy.madesOver, bg: "#FBDADB" };

  const unit = " µg/m³";

  return (
    <div className="flex flex-col gap-2.5 rounded-[16px] bg-[#F7F4F1] px-[18px] py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 flex flex-wrap items-baseline gap-x-2">
          <span className="text-[15px] font-extrabold">
            {PARTICLE_LABEL[particle]}
          </span>
          <span className="font-serif text-[26px] font-black">
            {average != null ? formatNumber(average, 1, lang) : "—"}
          </span>
          <span className="text-[12px] font-semibold text-[#4A4541]">
            {copy.madesAverage24h}
          </span>
        </p>
        <span
          className="inline-flex items-center rounded-full border-2 border-[#1B1B1A] px-3 py-1 text-[12px] font-extrabold"
          style={{ backgroundColor: status.bg }}
        >
          {status.label}
        </span>
      </div>
      <div aria-hidden="true" className="relative h-3 rounded-md bg-[#E6DFD9]">
        <span
          className="absolute inset-y-0 left-0 rounded-md"
          style={{
            width: `${fill}%`,
            backgroundColor:
              average != null
                ? LEVEL_COLORS[particleLevel(particle, average)]
                : "transparent",
          }}
        />
        {h24 != null && (
          <span
            className="absolute -top-[5px] -ml-px h-[22px] w-[3px] bg-[#1B1B1A]"
            style={{ left: `${(h24 / scaleMax) * 100}%` }}
          />
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[12px] text-[#3E3A36]">
        <span>
          {h24 == null
            ? copy.madesSharePending
            : average != null
              ? format(copy.madesShare, {
                  pct: Math.round((average / h24) * 100),
                })
              : ""}
        </span>
        <span>
          {copy.madesLimit24h}{" "}
          <b>
            {h24 != null
              ? formatNumber(h24, 0, lang) + unit
              : copy.limitPending}
          </b>
        </span>
        <span>
          {copy.madesLimitAnnual}{" "}
          <b>
            {limit.annual != null
              ? formatNumber(limit.annual, 0, lang) + unit
              : copy.limitPending}
          </b>
        </span>
      </div>
    </div>
  );
}

// --- The week ---------------------------------------------------------------

const WEEK_BAR_HEIGHT = 130;

function WeekCard({
  readings,
  limits,
  onNavigate,
  copy,
  lang,
}: {
  /** Null while loading. */
  readings: SensorReading[] | null;
  limits: ParticleLimits | undefined;
  onNavigate: (page: PanelPage) => void;
  copy: Copy;
  lang: Lang;
}) {
  const days25 = readings ? dailyBuckets(readings, "pm25") : [];
  const days10 = readings ? dailyBuckets(readings, "pm10") : [];
  const days = days25.map((day, index) => ({
    ts: day.ts,
    pm25: day.average,
    pm10: days10[index]?.average ?? null,
  }));
  const hasData = days.some((day) => day.pm25 != null || day.pm10 != null);
  const peak = Math.max(
    1,
    ...days.flatMap((day) => [day.pm25 ?? 0, day.pm10 ?? 0]),
  );

  // Days on which either particle's daily average passed its 24 h limit.
  const h25 = limits?.pm25?.h24 ?? null;
  const h10 = limits?.pm10?.h24 ?? null;
  const daysOver = days.filter(
    (day) =>
      (h25 != null && day.pm25 != null && day.pm25 > h25) ||
      (h10 != null && day.pm10 != null && day.pm10 > h10),
  ).length;
  const overText = !limits
    ? null
    : h25 == null && h10 == null
      ? copy.weekLimitsPending
      : daysOver === 1
        ? copy.weekDaysOverOne
        : format(copy.weekDaysOver, { count: daysOver });

  const height = (value: number | null) =>
    value == null ? 0 : Math.max(8, (value / peak) * WEEK_BAR_HEIGHT);

  return (
    <PanelCard className="flex-[2_1_520px]" labelledBy="panel-week-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <PanelTitle id="panel-week-title">{copy.weekTitle}</PanelTitle>
        <span className="text-[13px] text-[#4A4541]">
          {copy.weekSubtitle}
          {overText && (
            <>
              {" · "}
              <b>{overText}</b>
            </>
          )}
        </span>
      </div>

      {readings == null ? (
        <Skeleton className="h-[170px] w-full" />
      ) : !hasData ? (
        <PanelNotice title={copy.weekEmpty} />
      ) : (
        <>
          <ul className="sr-only">
            {days.map((day) => (
              <li key={day.ts}>
                {format(copy.weekDay, {
                  day: formatDayLabel(day.ts, lang),
                  pm25:
                    day.pm25 != null
                      ? formatNumber(day.pm25, 1, lang)
                      : copy.noData,
                  pm10:
                    day.pm10 != null
                      ? formatNumber(day.pm10, 0, lang)
                      : copy.noData,
                })}
              </li>
            ))}
          </ul>
          <div
            aria-hidden="true"
            className="grid h-[170px] items-end gap-1.5 sm:gap-2.5"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            {days.map((day) => (
              <div
                key={day.ts}
                className="flex h-full flex-col items-center justify-end gap-1.5"
              >
                <div
                  className="flex items-end gap-1"
                  style={{ height: WEEK_BAR_HEIGHT }}
                >
                  <span
                    className="w-3 rounded-t box-border border-2 border-b-0 border-[#1B1B1A] sm:w-4"
                    style={{
                      height: height(day.pm25),
                      backgroundColor:
                        day.pm25 != null
                          ? LEVEL_COLORS[particleLevel("pm25", day.pm25)]
                          : "transparent",
                      borderWidth: day.pm25 == null ? 0 : undefined,
                    }}
                  />
                  <span
                    className="w-3 rounded-t box-border border-2 border-b-0 border-[#1B1B1A] bg-white sm:w-4"
                    style={{
                      height: height(day.pm10),
                      borderWidth: day.pm10 == null ? 0 : undefined,
                    }}
                  />
                </div>
                <span className="whitespace-nowrap text-[11px] font-bold sm:text-[12px]">
                  {formatDayLabel(day.ts, lang)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-semibold text-[#4A4541]">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-[3px] border-2 border-[#1B1B1A] bg-[#6FCF6A]"
          />
          {copy.weekLegendPm25}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-[3px] border-2 border-[#1B1B1A] bg-white"
          />
          {copy.weekLegendPm10}
        </span>
        <button
          type="button"
          onClick={() => onNavigate("analisis")}
          className="ml-auto min-h-[36px] rounded px-1 text-[13px] font-extrabold text-[#245C2A] hover:text-[#163A1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#245C2A]"
        >
          {copy.weekSeeAnalysis} <span aria-hidden="true">→</span>
        </button>
      </div>
    </PanelCard>
  );
}

// --- Latest -----------------------------------------------------------------

/** The alerts feed as the shell holds it. */
export type AlertsFeed = InstitutionAlert[] | "loading" | "unavailable";

function LatestCard({
  stationId,
  alerts,
  onNavigate,
  copy,
}: {
  stationId: number;
  alerts: AlertsFeed;
  onNavigate: (page: PanelPage) => void;
  copy: Copy;
}) {
  // `undefined` while loading; `null` when the log is not reachable, which
  // drops the entry rather than showing an empty state that would be false.
  const [action, setAction] = useState<ActionLog | null | undefined>();
  const [actionsReachable, setActionsReachable] = useState(true);

  useEffect(() => {
    let active = true;
    setAction(undefined);
    fetchActionLogs(1, undefined, stationId)
      .then((page) => {
        if (active) setAction(page.results[0] ?? null);
      })
      .catch(() => {
        if (active) setActionsReachable(false);
      });
    return () => {
      active = false;
    };
  }, [stationId]);

  // Neither feed reachable: no card, rather than a heading over nothing.
  if (alerts === "unavailable" && !actionsReachable) return null;

  const alert = Array.isArray(alerts) ? alerts[0] : undefined;
  const alertBand = alert ? aqiBand(alert.aqi_value) : null;

  return (
    <PanelCard className="flex-[1_1_320px]" labelledBy="panel-latest-title">
      <PanelTitle id="panel-latest-title">{copy.latestTitle}</PanelTitle>

      {alerts === "loading" && <Skeleton className="h-[76px] w-full" />}
      {Array.isArray(alerts) && (
        <LatestItem
          onClick={() => onNavigate("alertas")}
          tint={alertBand != null ? ALERT_TINTS[alertBand] : "#F7F4F1"}
          icon="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
          title={
            alert
              ? format(copy.latestAlert, { aqi: Math.round(alert.aqi_value) })
              : copy.latestAlertNone
          }
          body={
            alert
              ? alertBand != null
                ? copy[`aqiLevel${alertBand}` as InstitutionCopyKey]
                : ""
              : copy.latestAlertNoneBody
          }
          meta={alert ? formatStamp(alert.triggered_at) : undefined}
        />
      )}

      {actionsReachable &&
        (action === undefined ? (
          <Skeleton className="h-[76px] w-full" />
        ) : (
          <LatestItem
            onClick={() => onNavigate("bitacora")}
            tint="#F7F4F1"
            icon="M6 3h9l4 4v14H6zM9 12h7M9 16h7"
            title={action ? copy.latestAction : copy.latestActionNone}
            body={action ? action.note : copy.latestActionNoneBody}
            meta={action ? formatStamp(action.timestamp) : undefined}
          />
        ))}
    </PanelCard>
  );
}

/** The alert entry's wash, by AQI band. */
const ALERT_TINTS = [
  "#E3F8DF",
  "#FCF3CC",
  "#FDE6D1",
  "#FBDADB",
  "#EFE1F4",
  "#F2DEE1",
];

function LatestItem({
  onClick,
  tint,
  icon,
  title,
  body,
  meta,
}: {
  onClick: () => void;
  tint: string;
  icon: string;
  title: string;
  body: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-[12px] p-3 text-left text-[#1B1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B1A]"
      style={{ backgroundColor: tint }}
    >
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-2 border-[#1B1B1A] bg-white">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={icon} />
        </svg>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14px] font-extrabold">{title}</span>
        {body && <span className="line-clamp-3 text-[13px]">{body}</span>}
        {meta && <span className="text-[12px] text-[#4A4541]">{meta}</span>}
      </span>
    </button>
  );
}
