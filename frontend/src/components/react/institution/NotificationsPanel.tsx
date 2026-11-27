import { useCallback, useEffect, useState } from "react";

import type { InstitutionNotification } from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import { useInstitutionCopy } from "../../../i18n/institution";
import {
  InstitutionApiError,
  fetchInstitutionNotifications,
} from "../../../store/institution";
import {
  formatAqi,
  formatShortDate,
  formatTime,
} from "../../../utils/institution-format";
import { aqiBand } from "../../../utils/institution-readings";
import { INSTITUTION_LOGIN_PATH } from "../../../utils/institution-session";
import { PanelButton, PanelCard, PanelNotice, PanelTitle } from "./panel-ui";
import { Skeleton } from "./ui";

// Loaded in the browser rather than during SSR, like the action log: the feed
// is paginated and grows on its own, so it owns its state from the start.
type ListState =
  | { status: "loading" }
  | {
      status: "ready";
      items: InstitutionNotification[];
      hasMore: boolean;
      page: number;
    }
  | { status: "error" }
  | { status: "expired" }
  /** The endpoint is not deployed yet — `/institution/notifications/` answers 404. */
  | { status: "unavailable" };

const stateForError = (error: unknown): ListState => {
  if (error instanceof InstitutionApiError) {
    if (error.code === "unavailable") return { status: "unavailable" };
    if (error.code === "unauthenticated") return { status: "expired" };
  }
  return { status: "error" };
};

/**
 * What the platform sent *about* the sensor — the mirror of the action log.
 *
 * Read-only by nature: notifications are produced by the scheduled sender or by
 * an operator, so there is nothing for an institution to submit here. That is
 * the whole difference from `ActionLogPanel`, which is a form plus its history;
 * the two sections sit side by side and neither reads the other's data.
 *
 * Shows what was sent; the rule behind it sits beside it on the Alertas page,
 * read-only, since institutions have no write path for it yet (#339).
 *
 * Both kinds of notification share one list. `type` is what separates them —
 * an AQI alert carries a reading and a threshold, a general announcement
 * carries neither — so every AQI-specific field is rendered only when present
 * rather than assumed.
 */
export function NotificationsPanel({
  lang,
  stationId,
}: {
  lang: Lang;
  /**
   * The selected sensor, when the institution leases several. Undefined asks
   * for every sensor's notifications, which is the single-sensor answer too.
   * Changing it reloads from page one — paging on into a list built for
   * another sensor would interleave the two.
   */
  stationId?: number;
}) {
  const copy = useInstitutionCopy(lang);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setList({ status: "loading" });
    try {
      const page = await fetchInstitutionNotifications(1, undefined, stationId);
      setList({
        status: "ready",
        items: page.results,
        hasMore: Boolean(page.next),
        page: 1,
      });
    } catch (error) {
      setList(stateForError(error));
    }
  }, [stationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (list.status !== "ready" || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchInstitutionNotifications(
        list.page + 1,
        undefined,
        stationId,
      );
      setList({
        status: "ready",
        items: [...list.items, ...next.results],
        hasMore: Boolean(next.next),
        page: list.page + 1,
      });
    } catch (error) {
      setList(stateForError(error));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <PanelCard labelledBy="panel-notifications">
      <PanelTitle id="panel-notifications">
        {copy.notificationsTitle}
      </PanelTitle>

      {list.status === "loading" && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          <span className="sr-only">{copy.loading}</span>
        </div>
      )}

      {list.status === "error" && (
        <div role="alert" className="flex flex-col items-start gap-3">
          <PanelNotice title={copy.errorTitle} body={copy.errorBody} />
          <PanelButton variant="secondary" onClick={load}>
            {copy.retry}
          </PanelButton>
        </div>
      )}

      {list.status === "expired" && (
        <div className="flex flex-col items-start gap-3">
          <PanelNotice
            title={copy.sessionExpiredTitle}
            body={copy.sessionExpiredBody}
          />
          <PanelButton
            variant="secondary"
            onClick={() => window.location.assign(INSTITUTION_LOGIN_PATH)}
          >
            {copy.goToLogin}
          </PanelButton>
        </div>
      )}

      {list.status === "unavailable" && (
        <PanelNotice
          title={copy.notificationsUnavailableTitle}
          body={copy.notificationsUnavailableBody}
        />
      )}

      {list.status === "ready" &&
        (list.items.length === 0 ? (
          <PanelNotice
            title={copy.notificationsEmptyTitle}
            body={copy.notificationsEmptyBody}
          />
        ) : (
          /* Scrolls inside the card rather than growing it: a leased sensor
             accumulates notifications indefinitely. `max-h` rather than `h`,
             so a short feed still sizes to its content. */
          <div className="-mx-1 max-h-[36rem] overflow-y-auto overscroll-contain px-1">
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {list.items.map((item) => (
                <NotificationRow key={item.id} item={item} lang={lang} />
              ))}
            </ul>
            {list.hasMore && (
              <div className="pt-3">
                <PanelButton
                  variant="secondary"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore
                    ? copy.notificationsLoadingMore
                    : copy.notificationsLoadMore}
                </PanelButton>
              </div>
            )}
          </div>
        ))}
    </PanelCard>
  );
}

// --- Row --------------------------------------------------------------------

/** The rail colour of a notification: its AQI band, or blue for news. */
const RAIL = ["#6FCF6A", "#F3D34A", "#F59A3C", "#E5484D", "#9B4DB3", "#7A1F2B"];
const GENERAL_RAIL = "#7FB2E5";

function NotificationRow({
  item,
  lang,
}: {
  item: InstitutionNotification;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const band = aqiBand(item.aqi);
  // A colour rail instead of a coloured row: the band is the fastest way to
  // read severity down a long list, and tinting whole rows would make the body
  // harder to read. The type is also written out, so colour never carries the
  // meaning alone.
  const rail = band != null ? RAIL[band] : GENERAL_RAIL;

  const meta = [
    `${formatShortDate(item.sent_at)} · ${formatTime(item.sent_at)}`,
    item.type === "aqi"
      ? copy.notificationTypeAqi
      : copy.notificationTypeGeneral,
    item.aqi != null ? `AQI ${formatAqi(item.aqi)}` : null,
    item.alert_threshold != null
      ? `${copy.notificationThreshold} ${item.alert_threshold}`
      : null,
    item.station_name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className="flex flex-col gap-[3px] rounded-[4px_10px_10px_4px] border-l-[5px] bg-[#F9F6F4] px-3.5 py-3"
      style={{ borderLeftColor: rail }}
    >
      <p className="m-0 text-[15px] font-bold leading-snug">{item.title}</p>
      {item.body && (
        <p className="m-0 whitespace-pre-line text-[13px] leading-relaxed text-[#3E3A36]">
          {item.body}
        </p>
      )}
      <p className="m-0 text-[12px] text-[#5C5752]">{meta}</p>
    </li>
  );
}
