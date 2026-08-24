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

const INSTITUTION_LABELS: Record<JoinInput["institutionType"], string> = {
  school: "Colegio",
  university: "Universidad",
  company: "Empresa",
  municipality: "Municipio",
  home: "Hogar",
  community: "Espacio comunitario",
};

export function JoinEmail(props: JoinEmailProps) {
  const {
    name,
    email,
    phone,
    organization,
    city,
    department,
    institutionType,
    size,
    siteUrl,
  } = props;
  const message = props.message?.trim();
  const approver = props.approver?.trim();

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
              label="Tipo de institución"
              value={INSTITUTION_LABELS[institutionType]}
            />
            <Field label="Tamaño aproximado" value={size} />
            <Field
              label="Quién aprueba el presupuesto"
              value={approver && approver.length > 0 ? approver : "—"}
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
