import type { InstitutionAlertConfig } from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import { format, useInstitutionCopy } from "../../../i18n/institution";
import { NotificationsPanel } from "./NotificationsPanel";
import { PanelCard, PanelTitle } from "./panel-ui";

/**
 * Alertas (#338): when the platform alerts, and what it has sent.
 *
 * Read-only. The rule is the institution's alert configuration as the
 * dashboard already returns it; creating or pausing rules from the panel is
 * #339, so there is no "+ Nueva regla" here, and who receives the alerts is
 * left out until there is data for it.
 */
export function AlertsPage({
  config,
  stationId,
  lang,
}: {
  config: InstitutionAlertConfig;
  stationId: number;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const groups = config.sensitive_groups.map((group) => group.label);

  return (
    <div className="flex flex-wrap items-start gap-5">
      <PanelCard
        className="flex-[1_1_340px] gap-3.5"
        labelledBy="panel-alert-rules"
      >
        <PanelTitle id="panel-alert-rules">{copy.alertsRulesTitle}</PanelTitle>
        <div className="flex items-center justify-between gap-3 rounded-[12px] border-2 border-[#1B1B1A] px-3.5 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-bold">{copy.alertsRuleAqi}</span>
            <span className="text-[12px] text-[#5C5752]">
              {config.alert_threshold != null
                ? format(copy.alertsRuleAqiSub, {
                    threshold: config.alert_threshold,
                  })
                : copy.alertsRuleNoThreshold}
            </span>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-extrabold ${
              config.is_enabled ? "bg-[#E3F8DF]" : "bg-[#EFEAE6]"
            }`}
          >
            {config.is_enabled ? copy.alertsRuleActive : copy.alertsRulePaused}
          </span>
        </div>
        {groups.length > 0 && (
          <div className="flex flex-col gap-1 rounded-[12px] bg-[#F6F2EF] px-3.5 py-3">
            <span className="text-[13px] font-bold">{copy.alertsGroups}</span>
            <span className="text-[13px] text-[#3E3A36]">
              {groups.join(" · ")}
            </span>
          </div>
        )}
        <p className="m-0 text-[13px] leading-[1.5] text-[#3E3A36]">
          {copy.alertsManagedByRespira}
        </p>
      </PanelCard>

      <div className="min-w-0 flex-[2_1_520px]">
        <NotificationsPanel lang={lang} stationId={stationId} />
      </div>
    </div>
  );
}
