import { useState } from "react";

import type { Lang } from "../../../i18n/config";
import { useInstitutionCopy } from "../../../i18n/institution";
import {
  InstitutionApiError,
  downloadInstitutionFile,
  type DownloadKind,
} from "../../../store/institution";
import { INSTITUTION_LOGIN_PATH } from "../../../utils/institution-session";
import { Button, Card, CardHead, CardTitle, DownloadIcon } from "./ui";

/**
 * The two file exports.
 *
 * Neither endpoint is deployed yet (see `INSTITUTION_ENDPOINTS`), so each button
 * resolves its own 404 into "not available yet" and says so under itself. State
 * is per-button rather than per-card: a failing report must not disable the
 * spreadsheet, and vice versa.
 */
export function DownloadCard({ lang }: { lang: Lang }) {
  const copy = useInstitutionCopy(lang);
  return (
    <Card>
      <CardHead>
        <CardTitle>{copy.downloadsTitle}</CardTitle>
      </CardHead>
      <DownloadButton
        kind="monthlyReport"
        label={copy.downloadMonthly}
        note={copy.downloadMonthlyNote}
        variant="color"
        lang={lang}
      />
      <DownloadButton
        kind="rawExport"
        label={copy.downloadRaw}
        note={copy.downloadRawNote}
        variant="void"
        lang={lang}
      />
    </Card>
  );
}

function DownloadButton({
  kind,
  label,
  note,
  variant,
  lang,
}: {
  kind: DownloadKind;
  label: string;
  note: string;
  variant: "color" | "void";
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const handleClick = async () => {
    setBusy(true);
    setMessage(undefined);
    try {
      await downloadInstitutionFile(kind);
    } catch (error) {
      if (error instanceof InstitutionApiError) {
        if (error.code === "unauthenticated") {
          window.location.assign(INSTITUTION_LOGIN_PATH);
          return;
        }
        setMessage(
          error.code === "unavailable"
            ? copy.downloadUnavailable
            : copy.downloadError,
        );
      } else {
        setMessage(copy.downloadError);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant={variant} block onClick={handleClick} disabled={busy}>
        <DownloadIcon />
        {busy ? copy.downloadPreparing : label}
      </Button>
      <span className="text-[11.5px] text-lightgray">{note}</span>
      {message && (
        <span role="alert" className="text-[11.5px] text-aqi-red-dark">
          {message}
        </span>
      )}
    </div>
  );
}
