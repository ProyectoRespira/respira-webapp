import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { Resend } from "resend";
import { CONTACT_MAIL } from "../data/constants";
import { Email } from "../components/react/ContactEmail";
import { getRequiredRuntimeEnv, normalizeSiteUrl } from "../runtime-env";

const resend = new Resend(getRequiredRuntimeEnv("SMTP_KEY"));

const getSiteUrl = (): string => {
  const siteUrl = normalizeSiteUrl(getRequiredRuntimeEnv("SITE_URL"));

  if (!siteUrl) {
    throw new Error("Missing runtime SITE_URL in frontend container.");
  }

  return siteUrl;
};

const formInput = z.object({
  email: z.string().email(),
  name: z.string(),
  lastname: z.string().optional(),
  motive: z.string(),
  message: z.string(),
});

export type EmailInput = z.infer<typeof formInput>;

const sendMail = async (values: EmailInput) => {
  const siteUrl = getSiteUrl();
  const smtpSender = getRequiredRuntimeEnv("SMTP_SENDER");

  return resend.emails.send({
    from: smtpSender,
    to: [CONTACT_MAIL],
    subject: `[${siteUrl}] ${values.motive} `,
    react: Email({ ...values, siteUrl }),
  });
  if (error) throw new Error(error.message);
  return data;
};
export const server = {
  sendMail: defineAction({
    accept: "form",
    input: formInput,
    handler: async (values) => sendMail(values),
  }),
};
