import type {
  DashboardAvailableSensor,
  InstitutionRole,
} from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import { format, useInstitutionCopy } from "../../../i18n/institution";
import {
  aqiBand,
  aqiInk,
  AQI_SCALE,
} from "../../../utils/institution-readings";
import { LogoutButton } from "./LogoutButton";
import { PAGE_TITLE, type PanelPage } from "./panel-pages";

const NAV_ICON: Record<PanelPage, string> = {
  resumen: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  analisis: "M3 17l6-6 4 4 8-8",
  bitacora: "M6 3h9l4 4v14H6zM9 12h7M9 16h7",
  alertas: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9",
  descargas: "M12 3v12M7 10l5 5 5-5M4 21h16",
};

/**
 * The panel's left column: brand, institution, page menu, sensors and the
 * signed-in access (#338).
 *
 * No institution selector: a user belongs to exactly one institution
 * (`InstitutionUser.user` is one-to-one), so the name is shown, not chosen.
 *
 * Below `lg` the column becomes a band across the top: the menu wraps into
 * rows (every page stays in view, none hidden past the edge), and the sensor
 * list scrolls sideways inside its own box, so the page content starts within
 * the first screen instead of under a tall menu.
 */
export function PanelSidebar({
  institutionName,
  pages,
  page,
  onNavigate,
  alertsBadge,
  sensors,
  selectedSensor,
  onSelectSensor,
  switching,
  role,
  userLabel,
  lang,
}: {
  institutionName: string;
  /** Empty while the panel has nothing to show (an error, no sensor yet). */
  pages: PanelPage[];
  page: PanelPage;
  onNavigate: (page: PanelPage) => void;
  /** Alerts in the last 7 days; 0 hides the badge. */
  alertsBadge: number;
  sensors: DashboardAvailableSensor[];
  selectedSensor: number | null;
  onSelectSensor: (id: number) => void;
  switching: boolean;
  role: InstitutionRole;
  /** Name or email of who is signed in; `null` keeps the card to the role. */
  userLabel: string | null;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);

  return (
    <aside className="flex min-w-0 flex-col gap-4 border-b-2 border-[#1B1B1A] bg-white px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-[264px] lg:shrink-0 lg:gap-6 lg:overflow-y-auto lg:border-b-0 lg:border-r-2 lg:py-[22px]">
      <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-stretch lg:gap-6">
        <a
          href="/institucion/dashboard"
          className="flex items-center gap-2.5 rounded px-1.5 text-[#1B1B1A] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1B1B1A]"
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 8h11a3 3 0 1 0-3-3" />
            <path d="M3 12h15a3 3 0 1 1-3 3" />
            <path d="M3 16h7" />
          </svg>
          <span className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.4px]">
              Proyecto
            </span>
            <span className="font-serif text-[19px] font-black leading-none">
              respira
            </span>
          </span>
        </a>

        <div className="flex min-w-0 flex-col items-end gap-1 px-1.5 lg:items-start">
          <span className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#5C5752]">
            {copy.sidebarInstitution}
          </span>
          {/* The column aligns its items to one side instead of stretching
              them, so a `nowrap` span would take its full text width and the
              ellipsis would never show; `max-w-full` caps it at the column,
              and the `title` shows the name whole. */}
          <span
            className="max-w-full truncate text-[14px] font-bold"
            title={institutionName}
          >
            {institutionName}
          </span>
        </div>
      </div>

      {pages.length > 0 && (
        <nav aria-label={copy.navLabel}>
          <ul className="m-0 flex list-none flex-wrap gap-1 p-0 lg:flex-col lg:flex-nowrap lg:gap-0.5">
            {pages.map((id) => {
              const current = id === page;
              const badge = id === "alertas" && alertsBadge > 0;
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={current ? "page" : undefined}
                    onClick={() => onNavigate(id)}
                    className={`flex min-h-[44px] w-full items-center gap-2 whitespace-nowrap rounded-[10px] border-2 px-2.5 lg:gap-3 lg:px-3 text-left text-[14px] text-[#1B1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1B1B1A] ${
                      current
                        ? "border-[#1B1B1A] bg-[#F1ECE9] font-extrabold"
                        : "border-transparent font-medium hover:bg-[#F6F2EF]"
                    }`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={NAV_ICON[id]} />
                    </svg>
                    <span className="flex-1">{copy[PAGE_TITLE[id]]}</span>
                    {badge && (
                      <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-[#1B1B1A] bg-[#F59A3C] px-1.5 text-[11px] font-extrabold">
                        <span aria-hidden="true">{alertsBadge}</span>
                        <span className="sr-only">
                          {format(copy.navAlertsBadge, { count: alertsBadge })}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {sensors.length > 0 && (
        <div className="flex flex-col gap-2">
          <span
            id="panel-sensors-label"
            className="px-1.5 text-[11px] font-bold uppercase tracking-[0.8px] text-[#5C5752]"
          >
            {copy.sidebarSensors}
          </span>
          {/* Each sensor is a button that switches the whole panel to it;
              `aria-pressed` says which one is on show. With one sensor it is
              still listed — the AQI circle is worth having in view — but there
              is nothing to switch to. */}
          <ul
            aria-labelledby="panel-sensors-label"
            className="-mx-1 m-0 flex list-none gap-2 overflow-x-auto p-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:p-0"
          >
            {sensors.map((sensor) => {
              const selected = sensor.id === selectedSensor;
              const hasAqi = sensor.aqi !== undefined;
              const band = aqiBand(sensor.aqi);
              return (
                <li key={sensor.id} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    disabled={switching || sensors.length < 2}
                    onClick={() => !selected && onSelectSensor(sensor.id)}
                    className={`flex min-h-[48px] w-full items-center justify-between gap-3 rounded-[10px] border-2 bg-white px-2.5 text-left text-[13px] font-semibold text-[#1B1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1B1B1A] disabled:cursor-default ${
                      selected
                        ? "border-[#1B1B1A]"
                        : "border-transparent hover:bg-[#F6F2EF]"
                    }`}
                  >
                    <span className="whitespace-nowrap">{sensor.name}</span>
                    {hasAqi && (
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#1B1B1A] text-[12px] font-extrabold"
                        style={{
                          backgroundColor:
                            band != null ? AQI_SCALE[band] : "#EFEAE6",
                          color: aqiInk(band),
                        }}
                      >
                        <span className="sr-only">AQI </span>
                        {sensor.aqi != null ? Math.round(sensor.aqi) : "—"}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#F6F2EF] p-3 lg:mt-auto lg:flex-col lg:items-start lg:gap-0.5">
        {/* `min-w-0` lets the text column give way to the logout button in
            the mobile row, and `lg:w-full` keeps it inside the 264px column,
            so a long name or email ends in an ellipsis instead of pushing the
            card wider; the `title` shows it whole. */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:w-full lg:flex-none">
          <span className="text-[12px] font-bold text-[#5C5752]">
            {copy.userAccess}
          </span>
          {userLabel && (
            <span className="truncate text-[13px] font-bold" title={userLabel}>
              {userLabel}
            </span>
          )}
          <span
            className={
              userLabel
                ? "text-[12px] font-semibold text-[#5C5752]"
                : "text-[13px] font-bold"
            }
          >
            {role === "member" ? copy.roleMember : copy.roleAdmin}
          </span>
        </div>
        <LogoutButton lang={lang} />
      </div>
    </aside>
  );
}
