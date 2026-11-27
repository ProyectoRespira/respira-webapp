import { useId, useRef, useState, type KeyboardEvent } from "react";

import type {
  DashboardCurrent,
  InstitutionKind,
  ParticleLimits,
  ReadingsPeriod,
  SensorReading,
} from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import {
  format,
  useInstitutionCopy,
  type InstitutionCopyKey,
} from "../../../i18n/institution";
import {
  LEVEL_COLORS,
  LEVEL_TINTS,
  PARTICLES,
  PARTICLE_SCALES,
  bestAndWorstHour,
  dailyBuckets,
  formatDayLabel,
  formatDayMonth,
  formatHour,
  formatNumber,
  formatReadingDay,
  formatReadingMoment,
  heatRows,
  hourlyProfile,
  latestValue,
  mean,
  median,
  particleLevel,
  pyHour,
  type Particle,
} from "../../../utils/institution-readings";
import {
  ParticleBars,
  ParticleHeatMap,
  type ChartBar,
  type ChartTick,
} from "./ParticleChart";
import {
  Dot,
  Kicker,
  PanelCard,
  PanelNotice,
  PanelTitle,
  SegmentedControl,
} from "./panel-ui";
import { Skeleton } from "./ui";
import { useReadings, type ReadingsState } from "./useReadings";

type Copy = ReturnType<typeof useInstitutionCopy>;
type View = "time" | "hour";

const LABEL: Record<Particle, string> = { pm25: "PM2.5", pm10: "PM10" };
const UNIT = "µg/m³";

const key = (value: string) => value as InstitutionCopyKey;

/**
 * Análisis (#329): one particle at a time — how it is now and what to do
 * about it, one chart with two views, and three figures for the week.
 *
 * PM2.5 and PM10 only. The other measures in the design (CO2, VOC, NOx,
 * temperature, humidity) wait for their data (#330) and are not shown.
 *
 * Mean and median are computed here from the hourly series: up to 30 days of
 * hours is a few hundred numbers, which needs no precomputed table.
 */
export function AnalysisPage({
  stationId,
  current,
  limits,
  kind,
  lang,
}: {
  stationId: number;
  current: DashboardCurrent | undefined;
  limits: ParticleLimits | undefined;
  kind: InstitutionKind;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const [particle, setParticle] = useState<Particle>("pm25");
  const [view, setView] = useState<View>("time");
  const [period, setPeriod] = useState<ReadingsPeriod>("7d");
  const week = useReadings(stationId, "7d");
  const range = useReadings(stationId, period);
  const panelId = useId();

  if (week.status === "unavailable") {
    return (
      <PanelNotice
        title={copy.analysisUnavailableTitle}
        body={copy.analysisUnavailableBody}
      />
    );
  }
  if (week.status === "error") {
    return <PanelNotice title={copy.errorTitle} body={copy.errorBody} />;
  }

  const weekReadings = week.status === "ready" ? week.readings : [];
  // `current` is the authority on "now"; the newest hourly reading stands in
  // only on a backend that does not send it.
  const nowOf = (which: Particle) =>
    current ? (current[which] ?? null) : latestValue(weekReadings, which);
  const limit = limits ? (limits[particle]?.h24 ?? null) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <MeasureTabs
        particle={particle}
        onChange={setParticle}
        nowOf={nowOf}
        panelId={panelId}
        copy={copy}
        lang={lang}
      />

      <div
        id={panelId}
        role="tabpanel"
        aria-label={LABEL[particle]}
        className="flex flex-col gap-5"
      >
        {week.status === "loading" ? (
          <Skeleton className="h-[220px] w-full rounded-[18px]" />
        ) : (
          <NowAndTodo
            particle={particle}
            now={nowOf(particle)}
            kind={kind}
            copy={copy}
            lang={lang}
          />
        )}

        <PanelCard labelledBy={`${panelId}-chart`} className="gap-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PanelTitle id={`${panelId}-chart`}>
              {format(
                copy[
                  view === "hour"
                    ? "chartTitleHeat"
                    : period === "24h"
                      ? "chartTitle24h"
                      : period === "7d"
                        ? "chartTitle7d"
                        : "chartTitle30d"
                ],
                { measure: LABEL[particle] },
              )}
            </PanelTitle>
            <div className="flex flex-wrap gap-2.5">
              <SegmentedControl
                label={copy.chartView}
                value={view}
                onChange={setView}
                options={[
                  { id: "time", label: copy.chartViewTime },
                  { id: "hour", label: copy.chartViewHour },
                ]}
              />
              {view === "time" && (
                <SegmentedControl
                  label={copy.chartPeriod}
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { id: "24h", label: copy.period24h },
                    { id: "7d", label: copy.period7d },
                    { id: "30d", label: copy.period30d },
                  ]}
                />
              )}
            </div>
          </div>

          {view === "time" ? (
            <TimeChart
              particle={particle}
              period={period}
              state={range}
              limit={limit}
              copy={copy}
              lang={lang}
            />
          ) : week.status === "loading" ? (
            <Skeleton className="h-[300px] w-full" />
          ) : !hasValues(weekReadings, particle) ? (
            <PanelNotice
              title={copy.analysisEmptyTitle}
              body={copy.analysisEmptyBody}
            />
          ) : (
            <ParticleHeatMap
              particle={particle}
              label={LABEL[particle]}
              rows={heatRows(weekReadings, particle)}
              lang={lang}
            />
          )}

          <ScalePills particle={particle} now={nowOf(particle)} copy={copy} />
        </PanelCard>

        {week.status === "ready" && hasValues(weekReadings, particle) && (
          <Insights
            particle={particle}
            readings={weekReadings}
            limits={limits}
            copy={copy}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
}

const hasValues = (readings: SensorReading[], particle: Particle) =>
  readings.some((reading) => reading[particle] != null);

// --- Tabs -------------------------------------------------------------------

function MeasureTabs({
  particle,
  onChange,
  nowOf,
  panelId,
  copy,
  lang,
}: {
  particle: Particle;
  onChange: (particle: Particle) => void;
  nowOf: (particle: Particle) => number | null;
  panelId: string;
  copy: Copy;
  lang: Lang;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move between tabs and select, as the tabs pattern expects.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = PARTICLES.indexOf(particle);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % PARTICLES.length
        : event.key === "ArrowLeft"
          ? (index - 1 + PARTICLES.length) % PARTICLES.length
          : null;
    if (next == null) return;
    event.preventDefault();
    onChange(PARTICLES[next]);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={copy.measureTabs}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-1.5 rounded-[14px] border-2 border-[#1B1B1A] bg-white p-1.5"
    >
      {PARTICLES.map((which, index) => {
        const selected = which === particle;
        const now = nowOf(which);
        return (
          <button
            key={which}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(which)}
            className={`flex min-h-[52px] flex-[1_1_110px] items-center justify-center gap-2 rounded-[10px] px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B1A] ${
              selected ? "bg-[#1B1B1A] text-white" : "text-[#1B1B1A]"
            }`}
          >
            {now != null && (
              <Dot
                color={LEVEL_COLORS[particleLevel(which, now)]}
                border={selected ? "#FFFFFF" : "#1B1B1A"}
              />
            )}
            <span className="text-[14px] font-extrabold">{LABEL[which]}</span>
            {now != null && (
              <span className="text-[13px] font-medium opacity-80">
                {formatNumber(now, PARTICLE_SCALES[which].decimals, lang)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// --- Now / what to do -------------------------------------------------------

function NowAndTodo({
  particle,
  now,
  kind,
  copy,
  lang,
}: {
  particle: Particle;
  now: number | null;
  kind: InstitutionKind;
  copy: Copy;
  lang: Lang;
}) {
  const level = now != null ? particleLevel(particle, now) : null;
  const who = kind === "colegio" ? "Colegio" : "Industria";
  const measure = LABEL[particle];
  const prefix = particle === "pm25" ? "pm25" : "pm10";
  const todoParticle = particle === "pm25" ? "Pm25" : "Pm10";

  return (
    <section className="flex flex-wrap items-stretch gap-5">
      <div
        className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5 rounded-[18px] border-2 border-[#1B1B1A] p-6"
        style={{
          backgroundColor: level != null ? LEVEL_TINTS[level] : "#F6F2EF",
        }}
      >
        <Kicker className="tracking-[1px] text-[#1B1B1A]">
          {format(copy.measureNow, { measure })}
        </Kicker>
        <p className="m-0 flex items-baseline gap-2">
          <span className="font-serif text-[54px] font-black leading-none">
            {now != null
              ? formatNumber(now, PARTICLE_SCALES[particle].decimals, lang)
              : "—"}
          </span>
          <span className="text-[16px] font-bold">{UNIT}</span>
        </p>
        {level != null && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border-2 border-[#1B1B1A] bg-white px-3 py-[5px] text-[13px] font-extrabold">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: LEVEL_COLORS[level] }}
            />
            {copy[key(`particleLevel${level}`)]}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-[2_1_460px] flex-col justify-center gap-3 rounded-[18px] bg-white p-6">
        <Kicker className="tracking-[1px]">{copy.measureTodo}</Kicker>
        <p className="m-0 font-serif text-[20px] font-bold leading-[1.35] md:text-[22px]">
          {level != null
            ? copy[key(`todo${who}${todoParticle}${level}`)]
            : copy.analysisEmptyBody}
        </p>
        <details className="mt-1 border-t border-[#EEE8E3] pt-2.5">
          <summary className="cursor-pointer rounded text-[14px] font-bold text-[#245C2A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#245C2A]">
            {format(copy.measureWhatToggle, { measure })}
          </summary>
          <div className="flex flex-col gap-2 pt-2.5 text-[14px] leading-[1.55] text-[#3E3A36]">
            <p className="m-0">{copy[key(`${prefix}What`)]}</p>
            <p className="m-0">{copy[key(`${prefix}Why`)]}</p>
            <p className="m-0 text-[12px] text-[#5C5752]">
              {copy.particleSource}
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}

// --- Bars over time ---------------------------------------------------------

function TimeChart({
  particle,
  period,
  state,
  limit,
  copy,
  lang,
}: {
  particle: Particle;
  period: ReadingsPeriod;
  state: ReadingsState;
  limit: number | null | undefined;
  copy: Copy;
  lang: Lang;
}) {
  if (state.status === "loading")
    return <Skeleton className="h-[306px] w-full" />;
  if (state.status !== "ready") {
    return <PanelNotice title={copy.errorTitle} body={copy.errorBody} />;
  }
  if (!hasValues(state.readings, particle)) {
    return (
      <PanelNotice
        title={copy.analysisEmptyTitle}
        body={copy.analysisEmptyBody}
      />
    );
  }

  let bars: ChartBar[];
  let ticks: ChartTick[];
  if (period === "30d") {
    // Thirty days of hours would be 720 hairlines: the long view is one bar
    // per day, the day's average.
    const days = dailyBuckets(state.readings, particle, 30);
    bars = days.map((day) => ({
      ts: day.ts,
      value: day.average,
      when: `${formatReadingDay(day.ts, lang)} · ${copy.chartDayAverage}`,
    }));
    ticks = [...new Set([0, 7, 14, 21, bars.length - 1])]
      .filter((index) => index >= 0 && index < bars.length)
      .map((index) => ({ index, label: formatDayMonth(bars[index].ts) }));
  } else {
    bars = state.readings.map((reading) => ({
      ts: reading.ts,
      value: reading[particle],
      when: formatReadingMoment(reading.ts, lang),
    }));
    ticks =
      period === "24h"
        ? bars.flatMap((bar, index) =>
            index % 6 === 0 || index === bars.length - 1
              ? [{ index, label: formatHour(pyHour(bar.ts)) }]
              : [],
          )
        : // One label per day, at its noon.
          bars.flatMap((bar, index) =>
            pyHour(bar.ts) === 12
              ? [{ index, label: formatDayLabel(bar.ts, lang) }]
              : [],
          );
  }

  return (
    <ParticleBars
      particle={particle}
      label={LABEL[particle]}
      title={LABEL[particle]}
      bars={bars}
      ticks={ticks}
      limit={limit}
      lang={lang}
    />
  );
}

// --- Scale ------------------------------------------------------------------

function ScalePills({
  particle,
  now,
  copy,
}: {
  particle: Particle;
  now: number | null;
  copy: Copy;
}) {
  const current = now != null ? particleLevel(particle, now) : null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Kicker className="mr-1 tracking-[0.6px]">{copy.scaleTitle}</Kicker>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {LEVEL_COLORS.map((color, level) => {
          const active = level === current;
          return (
            <li
              key={color}
              aria-current={active ? "true" : undefined}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${
                active
                  ? "border-2 border-[#1B1B1A]"
                  : "border border-[#E6DFD9] bg-white"
              }`}
              style={
                active ? { backgroundColor: LEVEL_TINTS[level] } : undefined
              }
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-[3px] border border-[#1B1B1A]"
                style={{ backgroundColor: color }}
              />
              <b>{copy[key(`particleLevel${level}`)]}</b>
              <span className="text-[#4A4541]">
                {copy[key(`${particle}Range${level}`)]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// --- Figures ----------------------------------------------------------------

function Insights({
  particle,
  readings,
  limits,
  copy,
  lang,
}: {
  particle: Particle;
  readings: SensorReading[];
  limits: ParticleLimits | undefined;
  copy: Copy;
  lang: Lang;
}) {
  const values = readings.map((reading) => reading[particle]);
  const average = mean(values);
  const middle = median(values);
  const hours = bestAndWorstHour(hourlyProfile(readings, particle));
  const limit = limits?.[particle];
  const h24 = limit?.h24 ?? null;
  const daysOver =
    h24 != null
      ? dailyBuckets(readings, particle).filter(
          (day) => day.average != null && day.average > h24,
        ).length
      : null;

  const cards: { kicker: string; big: string; text: string }[] = [
    {
      kicker: copy.insightMeanTitle,
      big: `${average != null ? formatNumber(average, 1, lang) : "—"} / ${
        middle != null ? formatNumber(middle, 1, lang) : "—"
      }`,
      text: copy.insightMeanBody,
    },
  ];

  if (limits) {
    cards.push({
      kicker: copy.insightLimitTitle,
      big:
        daysOver == null
          ? copy.insightLimitPending
          : daysOver === 1
            ? copy.insightDaysOverOne
            : format(copy.insightDaysOver, { count: daysOver }),
      text: [
        h24 != null
          ? format(copy.insightLimitBody, { limit: formatNumber(h24, 0, lang) })
          : copy.insightLimitBodyPending,
        limit?.annual != null
          ? format(copy.insightAnnual, {
              limit: formatNumber(limit.annual, 0, lang),
            })
          : copy.insightAnnualPending,
      ].join(" "),
    });
  }

  if (hours) {
    cards.push({
      kicker: copy.insightHoursTitle,
      big: format(copy.insightBestHour, { hour: formatHour(hours.best) }),
      text: format(copy.insightWorstHour, { hour: formatHour(hours.worst) }),
    });
  }

  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-5">
      {cards.map((card) => (
        <div
          key={card.kicker}
          className="flex flex-col gap-1.5 rounded-[18px] bg-white px-[22px] py-5"
        >
          <Kicker>{card.kicker}</Kicker>
          <p className="m-0 font-serif text-[24px] font-black md:text-[26px]">
            {card.big}
          </p>
          <p className="m-0 text-[13px] leading-[1.45] text-[#3E3A36]">
            {card.text}
          </p>
        </div>
      ))}
    </section>
  );
}
