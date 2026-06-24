import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { JoinInput } from "../../actions/index";

type JoinEmailProps = JoinInput & {
  siteUrl: string;
};

const INTEREST_LABELS: Record<JoinInput["interestType"], string> = {
  institution: "Institución (Escuelas, Colegios, Universidades, Empresas)",
  home: "Hogar (Casa o vivienda particular)",
  community: "Espacio comunitario (Plazas, centros comunitarios)",
  ngo: "Otra organización u ONG",
  other: "Otro",
};

export function JoinEmail(props: JoinEmailProps) {
  const {
    name,
    email,
    phone,
    organization,
    city,
    department,
    interestType,
    siteUrl,
  } = props;
  const message = props.message?.trim();

  return (
    <Html>
      <Head />
      <Preview>Nueva solicitud para unirse a la red Respira</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${siteUrl}/favicon.png`}
            width="120"
            height="99"
            alt="Respira"
          />
          <Heading style={heading}>Únete a la red de sensores</Heading>
          <Text style={text}>
            Una persona completó el formulario de interés.
          </Text>
          <Hr style={hr} />
          <Section>
            <Field label="Nombre completo" value={name} />
            <Field label="Correo electrónico" value={email} />
            <Field label="Teléfono / WhatsApp" value={phone} />
            <Field
              label="Institución u organización"
              value={organization || "—"}
            />
            <Field label="Ciudad / Localidad" value={city} />
            <Field label="Departamento" value={department || "—"} />
            <Field
              label="Tipo de interés"
              value={INTEREST_LABELS[interestType]}
            />
            <Field
              label="Interés o motivación"
              value={message && message.length > 0 ? message : "—"}
            />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Text style={textBold}>{label}</Text>
      <Text style={text}>{value}</Text>
    </>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  padding: "10px 0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0f0f0",
  padding: "45px",
};

const heading = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#404040",
  margin: "16px 0 8px",
};

const hr = {
  borderColor: "#e6e6e6",
  margin: "16px 0",
};

const text = {
  fontSize: "16px",
  fontFamily:
    "'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif",
  fontWeight: "300",
  color: "#404040",
  lineHeight: "26px",
};

const textBold = {
  fontSize: "16px",
  fontFamily:
    "'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif",
  fontWeight: "600",
  color: "#404040",
  lineHeight: "26px",
  marginBottom: "0",
};

export default JoinEmail;
