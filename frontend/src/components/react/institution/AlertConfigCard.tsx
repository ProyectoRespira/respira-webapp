import type { InstitutionAlertConfig } from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import { useInstitutionCopy } from "../../../i18n/institution";
import { Card, CardHead, CardTitle, Pill } from "./ui";

/**
 * The institution's alert configuration — read-only by design.
 *
 * The API exposes no write path for `InstitutionAlertConfig`, and the ticket
 * asks for this to be *visualised*, so changes go through the team rather than
 * a form that would have nothing to submit to.
 *
 * An institution that never opted into alerts has no configuration row at all;
 * the backend answers with a controlled default (disabled, no threshold, no
 * groups) instead of omitting the section, so this renders that case as a
 * legitimate state rather than as missing data.
 */
export function AlertConfigCard({
  alertConfig,
  contactMail,
  lang,
}: {
  alertConfig: InstitutionAlertConfig;
  contactMail: string;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const { is_enabled: enabled, alert_threshold: threshold } = alertConfig;
  const groups = alertConfig.sensitive_groups;

  return (
    <Card>
      <CardHead>
        <CardTitle>{copy.alertsTitle}</CardTitle>
        <span className="ml-auto">
          <Pill tone={enabled ? "on" : "neutral"} dot={enabled}>
            {enabled ? copy.alertsOn : copy.alertsOff}
          </Pill>
        </span>
      </CardHead>

      {enabled ? (
        <div>
          {threshold == null ? (
            <p className="m-0 text-[13px] text-gray">
              {copy.alertsNoThreshold}
            </p>
          ) : (
            <>
              <p className="m-0 flex items-baseline gap-2 font-serif text-3xl font-bold tabular-nums">
                {threshold}
                <span className="font-sans text-xs font-normal text-gray">
                  {copy.alertsThresholdSuffix}
                </span>
              </p>
              <p className="m-0 mt-1 text-xs text-lightgray">
                {copy.alertsThresholdHelp}
              </p>
            </>
          )}
        </div>
      ) : (
        <p className="m-0 text-[13px] text-gray">{copy.alertsDisabledBody}</p>
      )}

      <div className="flex flex-col gap-2">
        <CardTitle>{copy.alertsGroupsTitle}</CardTitle>
        {groups.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {groups.map((group) => (
              <li
                key={group.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-bg-gray bg-base px-3 py-1 text-[12.5px]"
              >
                {group.emoji && (
                  <span className="font-emoji" aria-hidden="true">
                    {group.emoji}
                  </span>
                )}
                {group.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-xs text-lightgray">{copy.alertsNoGroups}</p>
        )}
      </div>

      {contactMail && (
        <a
          className="text-xs font-bold text-green_dark hover:underline"
          href={`mailto:${contactMail}?subject=${encodeURIComponent(
            copy.alertsRequestSubject,
          )}`}
        >
          {copy.alertsRequestChanges}
        </a>
      )}
    </Card>
  );
}
