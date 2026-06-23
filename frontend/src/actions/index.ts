import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { Resend } from "resend";
import { CONTACT_MAIL } from "../data/constants";
import { Email } from "../components/react/ContactEmail";
import { JoinEmail } from "../components/react/JoinNetworkEmail";
const resend = new Resend(import.meta.env.SMTP_KEY);

const formInput = z.object({
  email: z.string().email(),
  name: z.string(),
  lastname: z.string().optional(),
  motive: z.string(),
  message: z.string(),
});

export type EmailInput = z.infer<typeof formInput>;

const sendMail = async (values: EmailInput) => {
  const { data, error } = await resend.emails.send({
    from: import.meta.env.SMTP_SENDER,
    to: [CONTACT_MAIL],
    subject: `[Respira] ${values.motive}`,
    react: Email(values),
  });
  if (error) throw new Error(error.message);
  return data;
};

// Interest types offered on the "Únete a la red" form. Keys are stable and
// language-independent; the email template maps them to readable labels.
export const INTEREST_TYPES = [
  "institution",
  "home",
  "community",
  "ngo",
  "other",
] as const;

const joinInput = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  organization: z.string().trim().optional(),
  city: z.string().trim().min(1),
  department: z.string().trim().optional(),
  interestType: z.enum(INTEREST_TYPES),
  message: z.string().trim().max(500).optional(),
  consent: z.literal("on"),
});

export type JoinInput = z.infer<typeof joinInput>;

const sendJoinMail = async (values: JoinInput) => {
  const { data, error } = await resend.emails.send({
    from: import.meta.env.SMTP_SENDER,
    to: [CONTACT_MAIL],
    replyTo: values.email,
    subject: `[Respira] Únete a la red — ${values.name}`,
    react: JoinEmail(values),
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
  joinNetwork: defineAction({
    accept: "form",
    input: joinInput,
    handler: async (values) => sendJoinMail(values),
  }),
};
