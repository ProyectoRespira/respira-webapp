import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { Resend } from "resend";
import { Email } from "../components/react/ContactEmail";
import { JoinEmail } from "../components/react/JoinNetworkEmail";
import { INSTITUTION_TYPES } from "../data/leasing";
import { getRequiredRuntimeEnv, normalizeSiteUrl } from "../runtime-env";

const resend = new Resend(getRequiredRuntimeEnv("SMTP_KEY"));
const CONTACT_MAIL = getRequiredRuntimeEnv("CONTACT_MAIL");

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
  const smtpSender = getRequiredRuntimeEnv("SMTP_SENDER");
  const siteUrl = getSiteUrl();

  const { data, error } = await resend.emails.send({
    from: smtpSender,
    to: [CONTACT_MAIL],
    subject: `[Respira] ${values.motive}`,
    react: Email({ ...values, siteUrl }),
  });
  if (error) throw new Error(error.message);
  return data;
};

const joinInput = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  organization: z.string().trim().optional(),
  city: z.string().trim().min(1),
  department: z.string().trim().optional(),
  institutionType: z.enum(INSTITUTION_TYPES),
  // The two qualifying answers the commercial team needs to size a proposal.
  size: z.string().trim().min(1),
  approver: z.string().trim().optional(),
  message: z.string().trim().max(500).optional(),
  consent: z.literal("on"),
});

export type JoinInput = z.infer<typeof joinInput>;

const sendJoinMail = async (values: JoinInput) => {
  const siteUrl = getSiteUrl();
  const { data, error } = await resend.emails.send({
    from: getRequiredRuntimeEnv("SMTP_SENDER"),
    to: [CONTACT_MAIL],
    subject: `[Respira] Únete a la red — ${values.name}`,
    react: JoinEmail({ ...values, siteUrl }),
  });
  if (error) throw new Error(error.message);
  return data;
};

export const server = {
  sendMail: defineAction({
    accept: "form",
    input: formInput,
    handler: async (values: EmailInput) => sendMail(values),
  }),
  joinNetwork: defineAction({
    accept: "form",
    input: joinInput,
    handler: async (values) => sendJoinMail(values),
  }),
};
