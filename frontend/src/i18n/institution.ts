// Copy for the institutional dashboard (RES-328).
//
// Kept out of `i18n/ui.ts` on purpose: that dictionary is the public site's,
// and this one is large, feature-specific and edited far more often. Holding it
// apart keeps the two diffs from colliding.
//
// Trilingual like `ui.ts`: every key must exist in `es`, `en` and `pt`, and
// `useInstitutionCopy(lang)` falls back to Spanish for anything missing, so a
// half-finished translation never renders an empty string.
//
// Voice: the Spanish is Paraguayan voseo, second person, no jargon. Portuguese
// uses "você" and English plain second person — the same register, not a
// literal word-for-word carry-over.

import { DEFAULT_LANG, type Lang } from "./config";

const es = {
  // --- Shell ---------------------------------------------------------------
  panelName: "Panel institucional",
  logout: "Cerrar sesión",
  loggingOut: "Cerrando sesión…",
  logoutFailed: "No pudimos cerrar la sesión.",

  // --- Login ---------------------------------------------------------------
  loginTagline: "El aire de tu institución, medido todos los días.",
  loginBlurb:
    "Accedé al estado de tu sensor, las recomendaciones del día y tus reportes.",
  loginTitle: "Ingresá a tu panel",
  loginSubtitle: "Usá el correo con el que registramos tu institución.",
  loginEmail: "Correo institucional",
  loginPassword: "Contraseña",
  loginSubmit: "Ingresar",
  loginSubmitting: "Ingresando…",
  loginHelp: "¿Problemas para entrar? Escribinos a",
  // Sits above `loginHelp`: the guide answers most of what would otherwise
  // become an email to the team, so it is offered before the contact address.
  loginGuide: "¿Primera vez acá? Leé la",
  loginGuideLink: "guía del panel",

  loginErrorCredentials:
    "Correo o contraseña incorrectos. Verificá los datos e intentá de nuevo.",
  loginErrorNoInstitution:
    "Esta cuenta no tiene acceso a un panel institucional.",
  loginErrorThrottled:
    "Demasiados intentos. Esperá unos minutos antes de volver a probar.",
  loginErrorUnexpected:
    "No pudimos completar el ingreso. Intentá de nuevo en unos segundos.",

  // --- Password recovery ---------------------------------------------------
  // Two screens: asking for the email, and choosing the new password from the
  // emailed link. The first one never says whether the address is registered —
  // the backend answers the same way either way, and the copy has to match.
  forgotLink: "¿Olvidaste tu contraseña?",
  forgotTagline: "Recuperá el acceso a tu panel.",
  forgotBlurb:
    "Te mandamos un enlace por correo para que elijas una contraseña nueva.",
  forgotTitle: "Recuperar contraseña",
  forgotSubtitle:
    "Escribí el correo de tu cuenta y te enviamos un enlace para restablecerla.",
  forgotEmail: "Correo de la cuenta",
  forgotSubmit: "Enviar enlace",
  forgotSubmitting: "Enviando…",
  forgotSentTitle: "Revisá tu correo",
  forgotSentBody:
    "Si ese correo tiene una cuenta en Respira, en unos minutos vas a recibir un enlace para elegir una contraseña nueva. Mirá también la carpeta de spam.",
  forgotSentHint: "El enlace vence en 24 horas y se puede usar una sola vez.",
  forgotBackToLogin: "Volver al ingreso",
  forgotErrorThrottled:
    "Pediste el enlace demasiadas veces. Esperá un rato antes de volver a intentar.",
  forgotErrorUnexpected:
    "No pudimos enviar el correo. Intentá de nuevo en unos segundos.",

  resetTagline: "Elegí tu nueva contraseña.",
  resetBlurb: "Después de guardarla vas a poder ingresar con ella al panel.",
  resetTitle: "Nueva contraseña",
  resetSubtitle: "Elegí una contraseña nueva para tu cuenta.",
  resetPassword: "Nueva contraseña",
  resetPasswordConfirm: "Repetí la contraseña",
  resetRules:
    "Al menos 10 caracteres, con una letra, un número y un carácter especial.",
  resetSubmit: "Guardar contraseña",
  resetSubmitting: "Guardando…",
  resetMismatch: "Las dos contraseñas no coinciden.",
  // Keyed by the `new_password_codes` the backend returns alongside Django's
  // own (English) validator messages.
  resetRuleTooShort: "La contraseña es demasiado corta.",
  resetRuleTooCommon: "Esa contraseña es demasiado común. Elegí otra.",
  resetRuleAllNumbers: "La contraseña no puede ser solo números.",
  resetRuleTooSimilar:
    "La contraseña se parece demasiado a tu correo o a tu nombre.",
  resetRuleNotComplex:
    "Falta mezclar caracteres: necesitás una letra, un número y un carácter especial.",
  resetRuleGeneric: "Esa contraseña no cumple los requisitos.",
  resetDoneTitle: "Listo, ya tenés contraseña nueva",
  resetDoneBody: "Ingresá al panel con tu correo y la contraseña que elegiste.",
  resetGoToLogin: "Ir al ingreso",
  resetInvalidTitle: "Este enlace ya no sirve",
  resetInvalidBody:
    "Puede haber vencido o haberse usado. Pedí uno nuevo y volvé a intentar.",
  resetRequestAnother: "Pedir un enlace nuevo",
  resetErrorThrottled:
    "Demasiados intentos. Esperá un rato antes de volver a probar.",
  resetErrorUnexpected:
    "No pudimos guardar la contraseña. Intentá de nuevo en unos segundos.",

  // --- Page ----------------------------------------------------------------
  updatedAt: "Actualizado",

  // --- Sensor switch -------------------------------------------------------
  // Said while the panel loads another sensor picked in the sidebar.
  sensorPickerLoading: "Cambiando de sensor…",

  // --- Sensor --------------------------------------------------------------
  sensorOnline: "En línea",
  sensorOffline: "Fuera de línea",

  // --- Air quality ---------------------------------------------------------
  airQualityEmptyTitle: "Tu sensor aún no reportó mediciones",
  airQualityEmptyBody:
    "En cuanto envíe la primera lectura, vas a ver acá el AQI y la recomendación del día.",

  // --- Action log ----------------------------------------------------------
  actionsEmptyTitle: "Todavía no registraste ninguna acción",
  actionsEmptyBody:
    "Anotá lo que hace tu institución cuando el aire empeora: queda como historial de lo que fueron respondiendo.",
  actionsLoadMore: "Ver más acciones",
  actionsLoadingMore: "Cargando…",
  actionsRespondsToAlert: "En respuesta a la alerta del",
  actionsRespondsToAlertPlain: "En respuesta a una alerta",
  actionsUnavailableTitle: "El registro de acciones todavía no está disponible",
  actionsUnavailableBody:
    "Se habilita en cuanto se publique la próxima versión de la plataforma.",

  actionFormTitle: "Registrar una acción",
  // --- "What is this section for?" -----------------------------------------
  // The fields each explain themselves; what was missing is why the section
  // exists at all. The last line is the part that makes it worth the minute it
  // takes: what you write here comes back in the monthly PDF, under "Acciones
  // registradas".
  actionFormHelpToggle: "¿Para qué sirve esta sección?",
  actionFormHelp:
    "Es la bitácora de tu institución: qué hicieron cuando el aire empeoró. Por ejemplo suspender el recreo al aire libre, cerrar ventanas, mover una actividad a un espacio cerrado o avisar a las familias. Podés vincular cada acción a la alerta que la motivó, o registrarla por iniciativa propia. Todo lo que anotes aparece en el reporte mensual en PDF, en la sección «Acciones registradas», junto con las mediciones del mes.",
  actionFormSensor: "Sensor",
  actionFormAlertLabel: "Alerta a la que responde",
  actionFormAlertOptional: "Opcional",
  // Under the selector: says what the list holds, so the options read as alerts
  // the institution received rather than as a setting being chosen.
  actionFormAlertHelp:
    "Elegí la alerta de calidad del aire que motivó esta acción. Cada opción muestra la fecha, el AQI medido y el umbral que la disparó.",
  actionFormAlertNone: "Ninguna — por iniciativa propia",
  // One option: `24/08/2026 · 128 AQI · umbral 100`.
  actionFormAlertOption: "{date} · {aqi} AQI · umbral {threshold}",
  /** Same, for an older alert that never stored the threshold it fired on. */
  actionFormAlertOptionNoThreshold: "{date} · {aqi} AQI",
  actionFormNoteLabel: "¿Qué hicieron?",
  actionFormNoteHelp:
    "La fecha, la hora y el AQI del momento se guardan solos.",
  actionFormSubmit: "Guardar acción",
  actionFormSubmitting: "Guardando…",
  actionFormSaved: "Acción guardada.",
  actionFormNoteRequired: "Contá brevemente qué hicieron antes de guardar.",
  actionFormNoteTooLong: "La nota es demasiado larga. Resumila un poco.",
  actionFormError: "No pudimos guardar la acción. Intentá de nuevo.",
  actionFormNoStation:
    "Necesitás un sensor asignado para registrar acciones. Escribinos si creés que es un error.",

  // --- Sensor notifications ------------------------------------------------
  notificationsTitle: "Avisos enviados",
  notificationsEmptyTitle: "Todavía no hay notificaciones",
  notificationsEmptyBody:
    "Acá vas a ver los avisos que enviamos sobre tu sensor: las alertas por calidad del aire y los mensajes que te mandemos.",
  notificationsLoadMore: "Ver más notificaciones",
  notificationsLoadingMore: "Cargando…",
  notificationsUnavailableTitle:
    "Las notificaciones todavía no están disponibles",
  notificationsUnavailableBody:
    "Se habilitan en cuanto se publique la próxima versión de la plataforma.",
  // The two kinds of notification, as the badge on each row reads.
  notificationTypeAqi: "Calidad del aire",
  notificationTypeGeneral: "General",
  notificationThreshold: "Umbral",

  // --- Downloads -----------------------------------------------------------
  // Doubles as the month field's label and as the button when no month is
  // chosen yet, so it names the thing rather than the action.
  downloadMonthly: "Reporte mensual (PDF)",
  downloadMonthlyNote:
    "Informe procesado del mes: promedios, picos y recomendaciones, listo para compartir.",
  downloadRaw: "Historial crudo (CSV)",
  downloadRawNote:
    "Mediciones sin procesar del sensor, para analizar por tu cuenta en una planilla.",
  // Shown in place of the date pickers when the sensor has no raw history to
  // serve. Deliberately short: it names the sensor as the reason, which is
  // enough to stop anyone hunting for a setting that would enable it, and the
  // monthly report sitting enabled in the next column already shows that only
  // this half is affected — no need to say so in words.
  downloadRawUnsupported: "Esta descarga no está disponible para tu sensor.",
  downloadPreparing: "Generando…",
  downloadUnavailable: "Esta descarga todavía no está disponible.",
  downloadError: "No pudimos generar el archivo. Intentá de nuevo.",
  downloadPartial:
    "Descargamos el archivo, pero faltan algunos períodos que el sensor no pudo entregar.",

  // `{month}` is filled in by the card; see `formatMonthNote`.
  reportDownloadPdf: "Descargar PDF",
  reportDownloadCsv: "Descargar CSV",
  rangeFrom: "Desde",
  rangeTo: "Hasta",
  rangeDays: "Rango de {days} días.",
  // A one-day range is reachable (both dates on the same day), and "Rango de 1
  // días" is visibly wrong, so the singular is its own string rather than a
  // plural rule — two forms is all Spanish, English and Portuguese need here.
  rangeDaysOne: "Rango de 1 día.",
  rangeIncomplete: "Elegí una fecha de inicio y una de fin.",
  rangeInverted: "La fecha de inicio no puede ser posterior a la de fin.",
  rangeTooLong:
    "El rango no puede superar {max} días. Elegí un período más corto.",

  // --- "What's in this file?" ----------------------------------------------
  // The note under each heading says what the file is in one line; this is for
  // the reader who needs to decide between the two, or who has to know what the
  // columns mean before opening a spreadsheet. Collapsed by default so the card
  // stays scannable for the people who already know.
  downloadHelpToggle: "¿Qué incluye este archivo?",
  downloadMonthlyHelp:
    "Un PDF listo para leer o presentar, con cuatro secciones: el resumen del mes (AQI promedio, máximo y mínimo, y cuántas mediciones hubo), cuántos días cayó en cada categoría de calidad de aire, el detalle día por día, y las acciones que tu institución registró en el panel.",
  downloadRawHelp:
    "Una planilla con una fila por medición del sensor: fecha y hora, PM1, PM2.5 y PM10, CO2, temperatura, humedad y los índices TVOC y NOX. Varias columnas vienen en versión cruda y corregida. Son los datos sin procesar, sin AQI calculado, para analizar por tu cuenta. Las horas que el sensor estuvo sin conexión no aparecen.",
  // Labels the month selector itself (RES-435). The column heading names the
  // file; this names the choice being made inside it, which is what the reader
  // was left to infer.
  reportMonthLabel: "Mes a reportar",
  reportMonthsLoading: "Cargando meses disponibles…",
  reportNoMonths: "Todavía no hay meses con mediciones.",
  reportMonthsError:
    "No pudimos cargar los meses disponibles. Se descargará el último mes cerrado.",

  // --- Contact -------------------------------------------------------------
  contactTitle: "Tu contacto en Respira",
  contactEmail: "Correo",
  contactHint:
    "Escribinos si el sensor aparece fuera de línea más de 24 horas.",

  // --- Panel by pages (Dirección 4: #338, #329, #328) -----------------------
  // One block for the whole redesign, so it merges as one hunk. Keys ending in
  // a digit are a level: 0–5 for the six AQI bands, 0–3 for the four particle
  // levels (good, moderate, sensitive, unhealthy). `Industria` / `Colegio`
  // follow `institution_type`.
  navLabel: "Secciones",
  navSummary: "Resumen",
  navAnalysis: "Análisis",
  navLog: "Bitácora",
  navAlerts: "Alertas",
  navDownloads: "Descargas",
  navAlertsBadge: "{count} alertas en los últimos 7 días",
  sidebarInstitution: "Institución",
  sidebarSensors: "Sensores",
  userAccess: "Tu acceso",
  roleAdmin: "Administrador",
  roleMember: "Miembro · solo lectura",

  aqiLevel0: "Aire bueno",
  aqiLevel1: "Aire moderado",
  aqiLevel2: "Dañino para grupos sensibles",
  aqiLevel3: "Aire dañino",
  aqiLevel4: "Aire muy dañino",
  aqiLevel5: "Aire peligroso",
  aqiBand0: "Bueno",
  aqiBand1: "Moderado",
  aqiBand2: "Sensibles",
  aqiBand3: "Dañino",
  aqiBand4: "Muy dañino",
  aqiBand5: "Peligroso",
  aqiScaleLabel: "AQI {aqi}: {level}, en una escala de seis niveles.",
  heroIndustria0: "Sin medidas especiales hoy.",
  heroIndustria1: "Personal sensible: limitar esfuerzos largos al aire libre.",
  heroIndustria2:
    "Reducir tareas al aire libre y usar protección respiratoria.",
  heroIndustria3:
    "Suspender tareas al aire libre y usar protección respiratoria.",
  heroIndustria4:
    "Suspender el trabajo al aire libre y mantener al personal adentro.",
  heroIndustria5:
    "Mantener a todo el personal adentro, con puertas y ventanas cerradas.",
  heroColegio0: "Sin restricciones para actividades afuera.",
  heroColegio1:
    "Las personas sensibles deberían evitar esfuerzos largos afuera.",
  heroColegio2: "Pasar el recreo adentro y cerrar ventanas.",
  heroColegio3: "Suspender actividades al aire libre.",
  heroColegio4:
    "Suspender actividades al aire libre y mantener las aulas cerradas.",
  heroColegio5: "Mantener a todos adentro, con puertas y ventanas cerradas.",

  madesTitle: "Partículas frente al límite MADES",
  madesSource: "Res. 259/2015",
  madesAverage24h: "µg/m³ · promedio 24 h",
  madesWithin: "Dentro del límite",
  madesOver: "Sobre el límite",
  madesPending: "Límite a confirmar",
  madesNoData: "Sin datos",
  madesShare: "Usa el {pct} % del límite diario",
  madesSharePending: "El límite de 24 h todavía no está confirmado.",
  madesLimit24h: "Límite 24 h:",
  madesLimitAnnual: "Límite anual:",
  limitPending: "a confirmar",

  weekTitle: "La semana",
  weekSubtitle: "Promedio diario de PM2.5 y PM10",
  weekDaysOver: "{count} días sobre el límite MADES",
  weekDaysOverOne: "1 día sobre el límite MADES",
  weekLimitsPending: "límites MADES a confirmar",
  weekLegendPm25: "PM2.5 (color según nivel)",
  weekLegendPm10: "PM10",
  weekSeeAnalysis: "Ver análisis completo",
  weekDay: "{day}: PM2.5 {pm25}, PM10 {pm10} µg/m³",
  weekEmpty: "Todavía no hay mediciones de partículas esta semana.",
  noData: "sin datos",

  latestTitle: "Lo último",
  latestAlert: "Alerta · AQI {aqi}",
  latestAlertNone: "Sin alertas",
  latestAlertNoneBody: "No hubo alertas de calidad del aire.",
  latestAction: "Acción registrada",
  latestActionNone: "Sin acciones registradas",
  latestActionNoneBody: "Cuando registren una acción, aparece acá.",

  measureTabs: "Medida",
  measureNow: "{measure} ahora",
  measureTodo: "Qué hacer ahora",
  measureWhatToggle: "¿Qué es el {measure} y por qué importa?",
  pm25What:
    "Partículas finas, 30 veces más chicas que un cabello. Vienen del humo de quemas, del tráfico y del polvo.",
  pm25Why:
    "Entran hasta los pulmones y la sangre. Afectan más a niños, personas mayores y a quien tiene asma.",
  pm10What:
    "Partículas más grandes: polvo de calles sin asfaltar, obras, tierra y polen.",
  pm10Why: "Irritan ojos, nariz y garganta, y pueden empeorar alergias y asma.",
  particleSource:
    "Límites: MADES, Resolución 259/2015. Colores: escala AQI de la EPA.",
  particleLevel0: "Bueno",
  particleLevel1: "Moderado",
  particleLevel2: "Dañino para sensibles",
  particleLevel3: "Dañino",
  pm25Range0: "0 a 12 µg/m³",
  pm25Range1: "12 a 35",
  pm25Range2: "35 a 55",
  pm25Range3: "más de 55",
  pm10Range0: "0 a 54 µg/m³",
  pm10Range1: "55 a 154",
  pm10Range2: "155 a 254",
  pm10Range3: "más de 254",
  todoIndustriaPm250: "Condiciones normales para el trabajo al aire libre.",
  todoIndustriaPm251: "Personal sensible: limitar esfuerzos largos afuera.",
  todoIndustriaPm252:
    "Reducir tareas al aire libre y usar protección respiratoria.",
  todoIndustriaPm253:
    "Suspender tareas al aire libre y usar protección respiratoria.",
  todoIndustriaPm100: "Sin medidas especiales.",
  todoIndustriaPm101: "Humedecer caminos y zonas de carga para bajar el polvo.",
  todoIndustriaPm102:
    "Humedecer zonas de polvo y usar protección respiratoria.",
  todoIndustriaPm103: "Pausar tareas que levantan polvo.",
  todoColegioPm250:
    "Aire limpio: recreo y educación física afuera sin problema.",
  todoColegioPm251:
    "Las personas sensibles deberían evitar esfuerzos largos afuera.",
  todoColegioPm252: "Pasar el recreo adentro y cerrar ventanas.",
  todoColegioPm253: "Suspender actividades al aire libre.",
  todoColegioPm100: "Sin cuidados especiales.",
  todoColegioPm101: "Regar el patio si hay mucho polvo.",
  todoColegioPm102: "Evitar actividades con polvo y cerrar ventanas.",
  todoColegioPm103: "Mantener a todos adentro.",

  chartView: "Vista",
  chartViewTime: "En el tiempo",
  chartViewHour: "Por hora del día",
  chartPeriod: "Período",
  period24h: "Últimas 24 h",
  period7d: "7 días",
  period30d: "30 días",
  chartTitle24h: "{measure} · últimas 24 horas",
  chartTitle7d: "{measure} · últimos 7 días por hora",
  chartTitle30d: "{measure} · últimos 30 días",
  chartTitleHeat: "{measure} · por hora del día",
  chartLimit: "Límite MADES 24 h · {value}",
  chartLimitPending: "Límite MADES 24 h · a confirmar",
  chartAverage: "Promedio: {value}",
  chartDayAverage: "promedio del día",
  chartNoReading: "Sin datos",
  chartSummary:
    "{title}. Promedio {avg} µg/m³, máximo {max} µg/m³. Usá las flechas para recorrer las barras.",
  heatNote:
    "Últimos 7 días. Cada cuadro es una hora: sirve para ver en qué horarios suele empeorar.",
  heatSummary: "Mapa de calor de {measure} por día y hora, últimos 7 días.",
  scaleTitle: "Escala",
  insightMeanTitle: "Media y mediana · 7 días",
  insightMeanBody:
    "Media y mediana en µg/m³. La mediana no se deja llevar por picos aislados, como una quema puntual.",
  insightLimitTitle: "Frente al límite MADES",
  insightDaysOver: "{count} días sobre",
  insightDaysOverOne: "1 día sobre",
  insightLimitPending: "A confirmar",
  insightLimitBody: "Días con promedio de 24 h sobre {limit} µg/m³.",
  insightLimitBodyPending: "El límite de 24 h todavía no está confirmado.",
  insightAnnual: "Límite anual: {limit} µg/m³.",
  insightAnnualPending: "Límite anual a confirmar.",
  insightHoursTitle: "Horarios",
  insightBestHour: "Mejor horario: {hour}",
  insightWorstHour:
    "Peor horario: {hour}. Útil para planificar tareas al aire libre y ventilación (promedio por hora, últimos 7 días).",
  analysisUnavailableTitle: "El análisis todavía no está disponible",
  analysisUnavailableBody:
    "Aparece en cuanto la plataforma publique las mediciones por hora de tu sensor.",
  analysisEmptyTitle: "Sin mediciones en este período",
  analysisEmptyBody: "El sensor no envió datos de partículas en este período.",

  logIntro:
    "Anotá lo que hizo la institución cuando cambió el aire. Queda como historial para reportes y para aprender qué funciona.",
  logPlaceholderIndustria:
    "Ej.: Se entregaron barbijos al personal de patio y se pausó la carga a cielo abierto.",
  logPlaceholderColegio:
    "Ej.: Se suspendió el recreo al aire libre y se avisó a las familias.",
  logMemberNotice:
    "Tenés acceso de miembro: podés ver la bitácora; solo los administradores registran acciones.",
  logHistoryTitle: "Historial",
  logNoAqi: "AQI sin registrar",

  alertsRulesTitle: "Cuándo avisar",
  alertsRuleAqi: "Calidad del aire",
  alertsRuleAqiSub: "Cuando el AQI supere {threshold}",
  alertsRuleNoThreshold: "Sin umbral configurado",
  alertsRuleActive: "Activa",
  alertsRulePaused: "Pausada",
  alertsGroups: "Grupos sensibles",
  alertsManagedByRespira:
    "Las reglas las configura el equipo de Respira. Escribinos si querés cambiarlas.",

  // --- Shared states -------------------------------------------------------
  errorTitle: "No pudimos cargar estos datos",
  errorBody: "Revisá tu conexión y volvé a intentar. Si sigue igual, avisanos.",
  retry: "Reintentar",
  loading: "Cargando…",
  sessionExpiredTitle: "Tu sesión expiró",
  sessionExpiredBody: "Volvé a ingresar para seguir viendo tu panel.",
  goToLogin: "Ir al ingreso",
  noSensorTitle: "Tu institución todavía no tiene sensor asignado",
  noSensorBody:
    "Cuando el equipo esté instalado, este panel se activa solo. Escribinos si tenés dudas sobre la instalación.",
} as const;

export type InstitutionCopyKey = keyof typeof es;

// `en` and `pt` are typed against `es`, so a key added there and forgotten here
// is a build error rather than a string that silently falls back at runtime.
type Translation = Record<InstitutionCopyKey, string>;

const en: Translation = {
  // --- Shell ---------------------------------------------------------------
  panelName: "Institutional panel",
  logout: "Log out",
  loggingOut: "Logging out…",
  logoutFailed: "We couldn't log you out.",

  // --- Login ---------------------------------------------------------------
  loginTagline: "Your institution's air, measured every day.",
  loginBlurb:
    "Check your sensor's status, today's recommendations and your reports.",
  loginTitle: "Sign in to your panel",
  loginSubtitle: "Use the email address we registered your institution with.",
  loginEmail: "Institutional email",
  loginPassword: "Password",
  loginSubmit: "Sign in",
  loginSubmitting: "Signing in…",
  loginHelp: "Trouble signing in? Write to us at",
  loginGuide: "First time here? Read the",
  loginGuideLink: "panel guide",

  loginErrorCredentials:
    "Incorrect email or password. Check your details and try again.",
  loginErrorNoInstitution:
    "This account doesn't have access to an institutional panel.",
  loginErrorThrottled:
    "Too many attempts. Wait a few minutes before trying again.",
  loginErrorUnexpected:
    "We couldn't complete the sign-in. Try again in a few seconds.",

  // --- Password recovery ---------------------------------------------------
  forgotLink: "Forgot your password?",
  forgotTagline: "Get back into your panel.",
  forgotBlurb: "We'll email you a link to choose a new password.",
  forgotTitle: "Reset password",
  forgotSubtitle:
    "Enter your account's email and we'll send you a link to reset it.",
  forgotEmail: "Account email",
  forgotSubmit: "Send link",
  forgotSubmitting: "Sending…",
  forgotSentTitle: "Check your email",
  forgotSentBody:
    "If that address has a Respira account, you'll get a link to choose a new password within a few minutes. Check your spam folder too.",
  forgotSentHint: "The link expires in 24 hours and can only be used once.",
  forgotBackToLogin: "Back to sign in",
  forgotErrorThrottled:
    "You've requested the link too many times. Wait a while before trying again.",
  forgotErrorUnexpected:
    "We couldn't send the email. Try again in a few seconds.",

  resetTagline: "Choose your new password.",
  resetBlurb: "Once you save it, you can use it to sign in to the panel.",
  resetTitle: "New password",
  resetSubtitle: "Choose a new password for your account.",
  resetPassword: "New password",
  resetPasswordConfirm: "Repeat the password",
  resetRules:
    "At least 10 characters, with a letter, a number and a special character.",
  resetSubmit: "Save password",
  resetSubmitting: "Saving…",
  resetMismatch: "The two passwords don't match.",
  resetRuleTooShort: "The password is too short.",
  resetRuleTooCommon: "That password is too common. Choose another one.",
  resetRuleAllNumbers: "The password can't be only numbers.",
  resetRuleTooSimilar:
    "The password is too similar to your email or your name.",
  resetRuleNotComplex:
    "Mix in more characters: you need a letter, a number and a special character.",
  resetRuleGeneric: "That password doesn't meet the requirements.",
  resetDoneTitle: "Done, your password is set",
  resetDoneBody: "Sign in to the panel with your email and your new password.",
  resetGoToLogin: "Go to sign in",
  resetInvalidTitle: "This link no longer works",
  resetInvalidBody:
    "It may have expired or already been used. Request a new one and try again.",
  resetRequestAnother: "Request a new link",
  resetErrorThrottled: "Too many attempts. Wait a while before trying again.",
  resetErrorUnexpected:
    "We couldn't save the password. Try again in a few seconds.",

  // --- Page ----------------------------------------------------------------
  updatedAt: "Updated",

  // --- Sensor switch -------------------------------------------------------
  sensorPickerLoading: "Switching sensor…",

  // --- Sensor --------------------------------------------------------------
  sensorOnline: "Online",
  sensorOffline: "Offline",

  // --- Air quality ---------------------------------------------------------
  airQualityEmptyTitle: "Your sensor hasn't reported any readings yet",
  airQualityEmptyBody:
    "As soon as it sends its first reading, you'll see the AQI and today's recommendation here.",

  // --- Action log ----------------------------------------------------------
  actionsEmptyTitle: "You haven't logged any actions yet",
  actionsEmptyBody:
    "Note down what your institution does when the air gets worse: it becomes a record of how you responded.",
  actionsLoadMore: "See more actions",
  actionsLoadingMore: "Loading…",
  actionsRespondsToAlert: "In response to the alert of",
  actionsRespondsToAlertPlain: "In response to an alert",
  actionsUnavailableTitle: "The action log isn't available yet",
  actionsUnavailableBody:
    "It will be enabled as soon as the next version of the platform ships.",

  actionFormTitle: "Log an action",
  actionFormHelpToggle: "What is this section for?",
  actionFormHelp:
    "It's your institution's logbook: what you did when air quality got worse. For example cancelling outdoor break, closing windows, moving an activity indoors or letting families know. You can link each action to the alert that prompted it, or log one you took on your own initiative. Everything you record appears in the monthly PDF report, under \"Acciones registradas\", alongside the month's measurements.",
  actionFormSensor: "Sensor",
  actionFormAlertLabel: "Alert this responds to",
  actionFormAlertOptional: "Optional",
  actionFormAlertHelp:
    "Choose the air-quality alert that prompted this action. Each option shows the date, the AQI measured and the threshold that triggered it.",
  actionFormAlertNone: "None — own initiative",
  actionFormAlertOption: "{date} · {aqi} AQI · threshold {threshold}",
  actionFormAlertOptionNoThreshold: "{date} · {aqi} AQI",
  actionFormNoteLabel: "What did you do?",
  actionFormNoteHelp:
    "The date, the time and the AQI at that moment are saved automatically.",
  actionFormSubmit: "Save action",
  actionFormSubmitting: "Saving…",
  actionFormSaved: "Action saved.",
  actionFormNoteRequired: "Briefly describe what you did before saving.",
  actionFormNoteTooLong: "The note is too long. Shorten it a little.",
  actionFormError: "We couldn't save the action. Try again.",
  actionFormNoStation:
    "You need an assigned sensor to log actions. Write to us if you think this is a mistake.",

  // --- Sensor notifications ------------------------------------------------
  notificationsTitle: "Alerts sent",
  notificationsEmptyTitle: "No notifications yet",
  notificationsEmptyBody:
    "This is where you'll see the alerts we send about your sensor: air quality warnings and any messages we send you.",
  notificationsLoadMore: "See more notifications",
  notificationsLoadingMore: "Loading…",
  notificationsUnavailableTitle: "Notifications aren't available yet",
  notificationsUnavailableBody:
    "They're enabled as soon as the next version of the platform ships.",
  notificationTypeAqi: "Air quality",
  notificationTypeGeneral: "General",
  notificationThreshold: "Threshold",

  // --- Downloads -----------------------------------------------------------
  downloadMonthly: "Monthly report (PDF)",
  downloadMonthlyNote:
    "A processed report for the month: averages, peaks and recommendations, ready to share.",
  downloadRaw: "Raw history (CSV)",
  downloadRawNote:
    "Unprocessed sensor readings, to analyse yourself in a spreadsheet.",
  downloadRawUnsupported: "This download isn't available for your sensor.",
  downloadPreparing: "Generating…",
  downloadUnavailable: "This download isn't available yet.",
  downloadError: "We couldn't generate the file. Try again.",
  downloadPartial:
    "The file downloaded, but some periods are missing because the sensor could not provide them.",

  reportDownloadPdf: "Download PDF",
  reportDownloadCsv: "Download CSV",
  rangeFrom: "From",
  rangeTo: "To",
  rangeDays: "{days}-day range.",
  rangeDaysOne: "1-day range.",
  rangeIncomplete: "Pick a start date and an end date.",
  rangeInverted: "The start date cannot be after the end date.",
  rangeTooLong: "The range cannot exceed {max} days. Choose a shorter period.",
  downloadHelpToggle: "What's in this file?",
  downloadMonthlyHelp:
    "A PDF ready to read or present, with four sections: the month's summary (average, highest and lowest AQI, and how many measurements there were), how many days fell into each air-quality category, a day-by-day breakdown, and the actions your institution logged in the panel.",
  downloadRawHelp:
    "A spreadsheet with one row per sensor reading: date and time, PM1, PM2.5 and PM10, CO2, temperature, humidity, and the TVOC and NOX indices. Several columns come in both raw and corrected versions. This is unprocessed data, with no AQI calculated, for you to analyse yourself. Hours when the sensor was offline are not included.",
  reportMonthLabel: "Month to report on",
  reportMonthsLoading: "Loading available months…",
  reportNoMonths: "No months with measurements yet.",
  reportMonthsError:
    "We couldn't load the available months. The last complete month will be downloaded.",

  // --- Contact -------------------------------------------------------------
  contactTitle: "Your contact at Respira",
  contactEmail: "Email",
  contactHint:
    "Write to us if the sensor shows as offline for more than 24 hours.",

  // --- Panel by pages (Dirección 4: #338, #329, #328) -----------------------
  navLabel: "Sections",
  navSummary: "Summary",
  navAnalysis: "Analysis",
  navLog: "Logbook",
  navAlerts: "Alerts",
  navDownloads: "Downloads",
  navAlertsBadge: "{count} alerts in the last 7 days",
  sidebarInstitution: "Institution",
  sidebarSensors: "Sensors",
  userAccess: "Your access",
  roleAdmin: "Administrator",
  roleMember: "Member · read-only",

  aqiLevel0: "Good air",
  aqiLevel1: "Moderate air",
  aqiLevel2: "Unhealthy for sensitive groups",
  aqiLevel3: "Unhealthy air",
  aqiLevel4: "Very unhealthy air",
  aqiLevel5: "Hazardous air",
  aqiBand0: "Good",
  aqiBand1: "Moderate",
  aqiBand2: "Sensitive",
  aqiBand3: "Unhealthy",
  aqiBand4: "Very unhealthy",
  aqiBand5: "Hazardous",
  aqiScaleLabel: "AQI {aqi}: {level}, on a six-level scale.",
  heroIndustria0: "No special measures today.",
  heroIndustria1: "Sensitive staff: limit long outdoor exertion.",
  heroIndustria2: "Cut back outdoor tasks and use respiratory protection.",
  heroIndustria3: "Stop outdoor tasks and use respiratory protection.",
  heroIndustria4: "Stop outdoor work and keep staff indoors.",
  heroIndustria5: "Keep all staff indoors, with doors and windows closed.",
  heroColegio0: "No restrictions on outdoor activities.",
  heroColegio1: "Sensitive people should avoid long exertion outdoors.",
  heroColegio2: "Hold recess indoors and close the windows.",
  heroColegio3: "Cancel outdoor activities.",
  heroColegio4: "Cancel outdoor activities and keep classrooms closed.",
  heroColegio5: "Keep everyone indoors, with doors and windows closed.",

  madesTitle: "Particles against the MADES limit",
  madesSource: "Res. 259/2015",
  madesAverage24h: "µg/m³ · 24 h average",
  madesWithin: "Within the limit",
  madesOver: "Over the limit",
  madesPending: "Limit to be confirmed",
  madesNoData: "No data",
  madesShare: "Uses {pct} % of the daily limit",
  madesSharePending: "The 24 h limit is not confirmed yet.",
  madesLimit24h: "24 h limit:",
  madesLimitAnnual: "Annual limit:",
  limitPending: "to be confirmed",

  weekTitle: "The week",
  weekSubtitle: "Daily average of PM2.5 and PM10",
  weekDaysOver: "{count} days over the MADES limit",
  weekDaysOverOne: "1 day over the MADES limit",
  weekLimitsPending: "MADES limits to be confirmed",
  weekLegendPm25: "PM2.5 (colour by level)",
  weekLegendPm10: "PM10",
  weekSeeAnalysis: "See full analysis",
  weekDay: "{day}: PM2.5 {pm25}, PM10 {pm10} µg/m³",
  weekEmpty: "No particle readings this week yet.",
  noData: "no data",

  latestTitle: "Latest",
  latestAlert: "Alert · AQI {aqi}",
  latestAlertNone: "No alerts",
  latestAlertNoneBody: "There have been no air quality alerts.",
  latestAction: "Logged action",
  latestActionNone: "No logged actions",
  latestActionNoneBody: "Once you log an action, it shows up here.",

  measureTabs: "Measure",
  measureNow: "{measure} now",
  measureTodo: "What to do now",
  measureWhatToggle: "What is {measure} and why does it matter?",
  pm25What:
    "Fine particles, 30 times smaller than a hair. They come from burning, traffic and dust.",
  pm25Why:
    "They reach deep into the lungs and the bloodstream. Children, older people and anyone with asthma are hit hardest.",
  pm10What:
    "Larger particles: dust from unpaved roads, building work, soil and pollen.",
  pm10Why:
    "They irritate the eyes, nose and throat, and can make allergies and asthma worse.",
  particleSource:
    "Limits: MADES, Resolution 259/2015. Colours: the EPA AQI scale.",
  particleLevel0: "Good",
  particleLevel1: "Moderate",
  particleLevel2: "Unhealthy for sensitive groups",
  particleLevel3: "Unhealthy",
  pm25Range0: "0 to 12 µg/m³",
  pm25Range1: "12 to 35",
  pm25Range2: "35 to 55",
  pm25Range3: "over 55",
  pm10Range0: "0 to 54 µg/m³",
  pm10Range1: "55 to 154",
  pm10Range2: "155 to 254",
  pm10Range3: "over 254",
  todoIndustriaPm250: "Normal conditions for outdoor work.",
  todoIndustriaPm251: "Sensitive staff: limit long exertion outdoors.",
  todoIndustriaPm252: "Cut back outdoor tasks and use respiratory protection.",
  todoIndustriaPm253: "Stop outdoor tasks and use respiratory protection.",
  todoIndustriaPm100: "No special measures.",
  todoIndustriaPm101: "Wet down roads and loading areas to keep the dust down.",
  todoIndustriaPm102: "Wet down dusty areas and use respiratory protection.",
  todoIndustriaPm103: "Pause tasks that raise dust.",
  todoColegioPm250: "Clean air: recess and PE outdoors without a problem.",
  todoColegioPm251: "Sensitive people should avoid long exertion outdoors.",
  todoColegioPm252: "Hold recess indoors and close the windows.",
  todoColegioPm253: "Cancel outdoor activities.",
  todoColegioPm100: "No special care needed.",
  todoColegioPm101: "Water the playground if it is very dusty.",
  todoColegioPm102: "Avoid dusty activities and close the windows.",
  todoColegioPm103: "Keep everyone indoors.",

  chartView: "View",
  chartViewTime: "Over time",
  chartViewHour: "By hour of day",
  chartPeriod: "Period",
  period24h: "Last 24 h",
  period7d: "7 days",
  period30d: "30 days",
  chartTitle24h: "{measure} · last 24 hours",
  chartTitle7d: "{measure} · last 7 days by hour",
  chartTitle30d: "{measure} · last 30 days",
  chartTitleHeat: "{measure} · by hour of day",
  chartLimit: "MADES 24 h limit · {value}",
  chartLimitPending: "MADES 24 h limit · to be confirmed",
  chartAverage: "Average: {value}",
  chartDayAverage: "daily average",
  chartNoReading: "No data",
  chartSummary:
    "{title}. Average {avg} µg/m³, highest {max} µg/m³. Use the arrow keys to move through the bars.",
  heatNote:
    "Last 7 days. Each square is one hour: it shows at what times of day the air tends to get worse.",
  heatSummary: "Heat map of {measure} by day and hour, last 7 days.",
  scaleTitle: "Scale",
  insightMeanTitle: "Mean and median · 7 days",
  insightMeanBody:
    "Mean and median in µg/m³. The median is not pulled up by isolated peaks, such as a one-off fire.",
  insightLimitTitle: "Against the MADES limit",
  insightDaysOver: "{count} days over",
  insightDaysOverOne: "1 day over",
  insightLimitPending: "To be confirmed",
  insightLimitBody: "Days with a 24 h average over {limit} µg/m³.",
  insightLimitBodyPending: "The 24 h limit is not confirmed yet.",
  insightAnnual: "Annual limit: {limit} µg/m³.",
  insightAnnualPending: "Annual limit to be confirmed.",
  insightHoursTitle: "Times of day",
  insightBestHour: "Best time: {hour}",
  insightWorstHour:
    "Worst time: {hour}. Useful for planning outdoor tasks and ventilation (hourly average, last 7 days).",
  analysisUnavailableTitle: "The analysis isn't available yet",
  analysisUnavailableBody:
    "It appears as soon as the platform publishes your sensor's hourly readings.",
  analysisEmptyTitle: "No readings in this period",
  analysisEmptyBody: "The sensor sent no particle data in this period.",

  logIntro:
    "Note down what your institution did when the air changed. It becomes a record for reports and for learning what works.",
  logPlaceholderIndustria:
    "E.g.: Masks were handed out to yard staff and open-air loading was paused.",
  logPlaceholderColegio:
    "E.g.: Outdoor recess was cancelled and families were notified.",
  logMemberNotice:
    "You have member access: you can read the logbook; only administrators log actions.",
  logHistoryTitle: "History",
  logNoAqi: "AQI not recorded",

  alertsRulesTitle: "When to alert",
  alertsRuleAqi: "Air quality",
  alertsRuleAqiSub: "When the AQI goes above {threshold}",
  alertsRuleNoThreshold: "No threshold set",
  alertsRuleActive: "Active",
  alertsRulePaused: "Paused",
  alertsGroups: "Sensitive groups",
  alertsManagedByRespira:
    "The Respira team sets up the rules. Write to us if you want to change them.",

  // --- Shared states -------------------------------------------------------
  errorTitle: "We couldn't load this data",
  errorBody:
    "Check your connection and try again. If it keeps happening, let us know.",
  retry: "Try again",
  loading: "Loading…",
  sessionExpiredTitle: "Your session expired",
  sessionExpiredBody: "Sign in again to keep viewing your panel.",
  goToLogin: "Go to sign in",
  noSensorTitle: "Your institution doesn't have a sensor assigned yet",
  noSensorBody:
    "Once the equipment is installed, this panel activates on its own. Write to us if you have questions about the installation.",
};

const pt: Translation = {
  // --- Shell ---------------------------------------------------------------
  panelName: "Painel institucional",
  logout: "Sair",
  loggingOut: "Saindo…",
  logoutFailed: "Não conseguimos encerrar a sessão.",

  // --- Login ---------------------------------------------------------------
  loginTagline: "O ar da sua instituição, medido todos os dias.",
  loginBlurb:
    "Acesse o estado do seu sensor, as recomendações do dia e seus relatórios.",
  loginTitle: "Entre no seu painel",
  loginSubtitle: "Use o e-mail com o qual registramos sua instituição.",
  loginEmail: "E-mail institucional",
  loginPassword: "Senha",
  loginSubmit: "Entrar",
  loginSubmitting: "Entrando…",
  loginHelp: "Problemas para entrar? Escreva para",
  loginGuide: "Primeira vez aqui? Leia o",
  loginGuideLink: "guia do painel",

  loginErrorCredentials:
    "E-mail ou senha incorretos. Confira os dados e tente de novo.",
  loginErrorNoInstitution:
    "Esta conta não tem acesso a um painel institucional.",
  loginErrorThrottled:
    "Tentativas demais. Espere alguns minutos antes de tentar de novo.",
  loginErrorUnexpected:
    "Não conseguimos concluir a entrada. Tente de novo em alguns segundos.",

  // --- Password recovery ---------------------------------------------------
  forgotLink: "Esqueceu sua senha?",
  forgotTagline: "Recupere o acesso ao seu painel.",
  forgotBlurb: "Enviamos um link por e-mail para você escolher uma senha nova.",
  forgotTitle: "Recuperar senha",
  forgotSubtitle:
    "Escreva o e-mail da sua conta e enviamos um link para redefini-la.",
  forgotEmail: "E-mail da conta",
  forgotSubmit: "Enviar link",
  forgotSubmitting: "Enviando…",
  forgotSentTitle: "Confira seu e-mail",
  forgotSentBody:
    "Se esse e-mail tiver uma conta na Respira, em alguns minutos você vai receber um link para escolher uma senha nova. Veja também a pasta de spam.",
  forgotSentHint: "O link vence em 24 horas e pode ser usado uma única vez.",
  forgotBackToLogin: "Voltar para a entrada",
  forgotErrorThrottled:
    "Você pediu o link vezes demais. Espere um pouco antes de tentar de novo.",
  forgotErrorUnexpected:
    "Não conseguimos enviar o e-mail. Tente de novo em alguns segundos.",

  resetTagline: "Escolha sua nova senha.",
  resetBlurb: "Depois de salvá-la, você poderá entrar no painel com ela.",
  resetTitle: "Nova senha",
  resetSubtitle: "Escolha uma senha nova para sua conta.",
  resetPassword: "Nova senha",
  resetPasswordConfirm: "Repita a senha",
  resetRules:
    "Pelo menos 10 caracteres, com uma letra, um número e um caractere especial.",
  resetSubmit: "Salvar senha",
  resetSubmitting: "Salvando…",
  resetMismatch: "As duas senhas não coincidem.",
  resetRuleTooShort: "A senha é curta demais.",
  resetRuleTooCommon: "Essa senha é comum demais. Escolha outra.",
  resetRuleAllNumbers: "A senha não pode ser só números.",
  resetRuleTooSimilar: "A senha é parecida demais com seu e-mail ou seu nome.",
  resetRuleNotComplex:
    "Falta misturar caracteres: você precisa de uma letra, um número e um caractere especial.",
  resetRuleGeneric: "Essa senha não cumpre os requisitos.",
  resetDoneTitle: "Pronto, sua senha nova está salva",
  resetDoneBody: "Entre no painel com seu e-mail e a senha que você escolheu.",
  resetGoToLogin: "Ir para a entrada",
  resetInvalidTitle: "Este link não vale mais",
  resetInvalidBody:
    "Pode ter vencido ou já ter sido usado. Peça um novo e tente de novo.",
  resetRequestAnother: "Pedir um link novo",
  resetErrorThrottled:
    "Tentativas demais. Espere um pouco antes de tentar de novo.",
  resetErrorUnexpected:
    "Não conseguimos salvar a senha. Tente de novo em alguns segundos.",

  // --- Page ----------------------------------------------------------------
  updatedAt: "Atualizado",

  // --- Sensor switch -------------------------------------------------------
  sensorPickerLoading: "Trocando de sensor…",

  // --- Sensor --------------------------------------------------------------
  sensorOnline: "On-line",
  sensorOffline: "Fora do ar",

  // --- Air quality ---------------------------------------------------------
  airQualityEmptyTitle: "Seu sensor ainda não reportou medições",
  airQualityEmptyBody:
    "Assim que enviar a primeira leitura, você vai ver aqui o AQI e a recomendação do dia.",

  // --- Action log ----------------------------------------------------------
  actionsEmptyTitle: "Você ainda não registrou nenhuma ação",
  actionsEmptyBody:
    "Anote o que sua instituição faz quando o ar piora: fica como histórico do que vocês foram respondendo.",
  actionsLoadMore: "Ver mais ações",
  actionsLoadingMore: "Carregando…",
  actionsRespondsToAlert: "Em resposta ao alerta de",
  actionsRespondsToAlertPlain: "Em resposta a um alerta",
  actionsUnavailableTitle: "O registro de ações ainda não está disponível",
  actionsUnavailableBody:
    "Será habilitado assim que a próxima versão da plataforma for publicada.",

  actionFormTitle: "Registrar uma ação",
  actionFormHelpToggle: "Para que serve esta seção?",
  actionFormHelp:
    "É o registro da sua instituição: o que fizeram quando a qualidade do ar piorou. Por exemplo suspender o recreio ao ar livre, fechar janelas, mover uma atividade para um espaço fechado ou avisar as famílias. Você pode vincular cada ação ao alerta que a motivou, ou registrá-la por iniciativa própria. Tudo o que você anotar aparece no relatório mensal em PDF, na seção «Acciones registradas», junto com as medições do mês.",
  actionFormSensor: "Sensor",
  actionFormAlertLabel: "Alerta a que responde",
  actionFormAlertOptional: "Opcional",
  actionFormAlertHelp:
    "Escolha o alerta de qualidade do ar que motivou esta ação. Cada opção mostra a data, o AQI medido e o limite que o disparou.",
  actionFormAlertNone: "Nenhum — por iniciativa própria",
  actionFormAlertOption: "{date} · {aqi} AQI · limite {threshold}",
  actionFormAlertOptionNoThreshold: "{date} · {aqi} AQI",
  actionFormNoteLabel: "O que vocês fizeram?",
  actionFormNoteHelp: "A data, a hora e o AQI do momento são salvos sozinhos.",
  actionFormSubmit: "Salvar ação",
  actionFormSubmitting: "Salvando…",
  actionFormSaved: "Ação salva.",
  actionFormNoteRequired:
    "Conte brevemente o que vocês fizeram antes de salvar.",
  actionFormNoteTooLong: "A nota está longa demais. Resuma um pouco.",
  actionFormError: "Não conseguimos salvar a ação. Tente de novo.",
  actionFormNoStation:
    "Você precisa de um sensor atribuído para registrar ações. Escreva para nós se achar que é um erro.",

  // --- Sensor notifications ------------------------------------------------
  notificationsTitle: "Avisos enviados",
  notificationsEmptyTitle: "Ainda não há notificações",
  notificationsEmptyBody:
    "Aqui você verá os avisos que enviamos sobre o seu sensor: os alertas de qualidade do ar e as mensagens que mandarmos.",
  notificationsLoadMore: "Ver mais notificações",
  notificationsLoadingMore: "Carregando…",
  notificationsUnavailableTitle: "As notificações ainda não estão disponíveis",
  notificationsUnavailableBody:
    "Elas são habilitadas assim que a próxima versão da plataforma for publicada.",
  notificationTypeAqi: "Qualidade do ar",
  notificationTypeGeneral: "Geral",
  notificationThreshold: "Limite",

  // --- Downloads -----------------------------------------------------------
  downloadMonthly: "Relatório mensal (PDF)",
  downloadMonthlyNote:
    "Relatório processado do mês: médias, picos e recomendações, pronto para compartilhar.",
  downloadRaw: "Histórico bruto (CSV)",
  downloadRawNote:
    "Medições sem processar do sensor, para analisar por conta própria em uma planilha.",
  downloadRawUnsupported:
    "Este download não está disponível para o seu sensor.",
  downloadPreparing: "Gerando…",
  downloadUnavailable: "Este download ainda não está disponível.",
  downloadError: "Não conseguimos gerar o arquivo. Tente de novo.",
  downloadPartial:
    "Baixamos o arquivo, mas faltam alguns períodos que o sensor não conseguiu entregar.",

  reportDownloadPdf: "Baixar PDF",
  reportDownloadCsv: "Baixar CSV",
  rangeFrom: "De",
  rangeTo: "Até",
  rangeDays: "Intervalo de {days} dias.",
  rangeDaysOne: "Intervalo de 1 dia.",
  rangeIncomplete: "Escolha uma data inicial e uma data final.",
  rangeInverted: "A data inicial não pode ser posterior à final.",
  rangeTooLong:
    "O intervalo não pode exceder {max} dias. Escolha um período menor.",
  downloadHelpToggle: "O que este arquivo inclui?",
  downloadMonthlyHelp:
    "Um PDF pronto para ler ou apresentar, com quatro seções: o resumo do mês (AQI médio, máximo e mínimo, e quantas medições houve), quantos dias ficaram em cada categoria de qualidade do ar, o detalhe dia a dia, e as ações que sua instituição registrou no painel.",
  downloadRawHelp:
    "Uma planilha com uma linha por medição do sensor: data e hora, PM1, PM2.5 e PM10, CO2, temperatura, umidade e os índices TVOC e NOX. Várias colunas vêm em versão bruta e corrigida. São dados sem processar, sem AQI calculado, para analisar por conta própria. As horas em que o sensor esteve off-line não aparecem.",
  reportMonthLabel: "Mês a reportar",
  reportMonthsLoading: "Carregando meses disponíveis…",
  reportNoMonths: "Ainda não há meses com medições.",
  reportMonthsError:
    "Não conseguimos carregar os meses disponíveis. Será baixado o último mês fechado.",

  // --- Contact -------------------------------------------------------------
  contactTitle: "Seu contato na Respira",
  contactEmail: "E-mail",
  contactHint:
    "Escreva para nós se o sensor aparecer fora do ar por mais de 24 horas.",

  // --- Panel by pages (Dirección 4: #338, #329, #328) -----------------------
  navLabel: "Seções",
  navSummary: "Resumo",
  navAnalysis: "Análise",
  navLog: "Registro",
  navAlerts: "Alertas",
  navDownloads: "Downloads",
  navAlertsBadge: "{count} alertas nos últimos 7 dias",
  sidebarInstitution: "Instituição",
  sidebarSensors: "Sensores",
  userAccess: "Seu acesso",
  roleAdmin: "Administrador",
  roleMember: "Membro · somente leitura",

  aqiLevel0: "Ar bom",
  aqiLevel1: "Ar moderado",
  aqiLevel2: "Prejudicial para grupos sensíveis",
  aqiLevel3: "Ar prejudicial",
  aqiLevel4: "Ar muito prejudicial",
  aqiLevel5: "Ar perigoso",
  aqiBand0: "Bom",
  aqiBand1: "Moderado",
  aqiBand2: "Sensíveis",
  aqiBand3: "Prejudicial",
  aqiBand4: "Muito prejudicial",
  aqiBand5: "Perigoso",
  aqiScaleLabel: "AQI {aqi}: {level}, numa escala de seis níveis.",
  heroIndustria0: "Sem medidas especiais hoje.",
  heroIndustria1: "Pessoal sensível: limitar esforços longos ao ar livre.",
  heroIndustria2: "Reduzir tarefas ao ar livre e usar proteção respiratória.",
  heroIndustria3: "Suspender tarefas ao ar livre e usar proteção respiratória.",
  heroIndustria4: "Suspender o trabalho ao ar livre e manter o pessoal dentro.",
  heroIndustria5:
    "Manter todo o pessoal dentro, com portas e janelas fechadas.",
  heroColegio0: "Sem restrições para atividades ao ar livre.",
  heroColegio1:
    "Pessoas sensíveis deveriam evitar esforços longos ao ar livre.",
  heroColegio2: "Fazer o recreio dentro e fechar as janelas.",
  heroColegio3: "Suspender atividades ao ar livre.",
  heroColegio4: "Suspender atividades ao ar livre e manter as salas fechadas.",
  heroColegio5: "Manter todos dentro, com portas e janelas fechadas.",

  madesTitle: "Partículas frente ao limite MADES",
  madesSource: "Res. 259/2015",
  madesAverage24h: "µg/m³ · média 24 h",
  madesWithin: "Dentro do limite",
  madesOver: "Acima do limite",
  madesPending: "Limite a confirmar",
  madesNoData: "Sem dados",
  madesShare: "Usa {pct} % do limite diário",
  madesSharePending: "O limite de 24 h ainda não está confirmado.",
  madesLimit24h: "Limite 24 h:",
  madesLimitAnnual: "Limite anual:",
  limitPending: "a confirmar",

  weekTitle: "A semana",
  weekSubtitle: "Média diária de PM2.5 e PM10",
  weekDaysOver: "{count} dias acima do limite MADES",
  weekDaysOverOne: "1 dia acima do limite MADES",
  weekLimitsPending: "limites MADES a confirmar",
  weekLegendPm25: "PM2.5 (cor conforme o nível)",
  weekLegendPm10: "PM10",
  weekSeeAnalysis: "Ver análise completa",
  weekDay: "{day}: PM2.5 {pm25}, PM10 {pm10} µg/m³",
  weekEmpty: "Ainda não há medições de partículas nesta semana.",
  noData: "sem dados",

  latestTitle: "O mais recente",
  latestAlert: "Alerta · AQI {aqi}",
  latestAlertNone: "Sem alertas",
  latestAlertNoneBody: "Não houve alertas de qualidade do ar.",
  latestAction: "Ação registrada",
  latestActionNone: "Sem ações registradas",
  latestActionNoneBody: "Quando registrarem uma ação, ela aparece aqui.",

  measureTabs: "Medida",
  measureNow: "{measure} agora",
  measureTodo: "O que fazer agora",
  measureWhatToggle: "O que é o {measure} e por que importa?",
  pm25What:
    "Partículas finas, 30 vezes menores que um fio de cabelo. Vêm da fumaça de queimadas, do trânsito e da poeira.",
  pm25Why:
    "Chegam até os pulmões e o sangue. Afetam mais crianças, idosos e quem tem asma.",
  pm10What:
    "Partículas maiores: poeira de ruas sem asfalto, obras, terra e pólen.",
  pm10Why: "Irritam olhos, nariz e garganta, e podem piorar alergias e asma.",
  particleSource:
    "Limites: MADES, Resolução 259/2015. Cores: escala AQI da EPA.",
  particleLevel0: "Bom",
  particleLevel1: "Moderado",
  particleLevel2: "Prejudicial para sensíveis",
  particleLevel3: "Prejudicial",
  pm25Range0: "0 a 12 µg/m³",
  pm25Range1: "12 a 35",
  pm25Range2: "35 a 55",
  pm25Range3: "mais de 55",
  pm10Range0: "0 a 54 µg/m³",
  pm10Range1: "55 a 154",
  pm10Range2: "155 a 254",
  pm10Range3: "mais de 254",
  todoIndustriaPm250: "Condições normais para o trabalho ao ar livre.",
  todoIndustriaPm251: "Pessoal sensível: limitar esforços longos ao ar livre.",
  todoIndustriaPm252:
    "Reduzir tarefas ao ar livre e usar proteção respiratória.",
  todoIndustriaPm253:
    "Suspender tarefas ao ar livre e usar proteção respiratória.",
  todoIndustriaPm100: "Sem medidas especiais.",
  todoIndustriaPm101:
    "Umedecer caminhos e áreas de carga para baixar a poeira.",
  todoIndustriaPm102: "Umedecer áreas com poeira e usar proteção respiratória.",
  todoIndustriaPm103: "Pausar tarefas que levantam poeira.",
  todoColegioPm250:
    "Ar limpo: recreio e educação física ao ar livre sem problema.",
  todoColegioPm251:
    "Pessoas sensíveis deveriam evitar esforços longos ao ar livre.",
  todoColegioPm252: "Fazer o recreio dentro e fechar as janelas.",
  todoColegioPm253: "Suspender atividades ao ar livre.",
  todoColegioPm100: "Sem cuidados especiais.",
  todoColegioPm101: "Molhar o pátio se houver muita poeira.",
  todoColegioPm102: "Evitar atividades com poeira e fechar as janelas.",
  todoColegioPm103: "Manter todos dentro.",

  chartView: "Visualização",
  chartViewTime: "Ao longo do tempo",
  chartViewHour: "Por hora do dia",
  chartPeriod: "Período",
  period24h: "Últimas 24 h",
  period7d: "7 dias",
  period30d: "30 dias",
  chartTitle24h: "{measure} · últimas 24 horas",
  chartTitle7d: "{measure} · últimos 7 dias por hora",
  chartTitle30d: "{measure} · últimos 30 dias",
  chartTitleHeat: "{measure} · por hora do dia",
  chartLimit: "Limite MADES 24 h · {value}",
  chartLimitPending: "Limite MADES 24 h · a confirmar",
  chartAverage: "Média: {value}",
  chartDayAverage: "média do dia",
  chartNoReading: "Sem dados",
  chartSummary:
    "{title}. Média {avg} µg/m³, máximo {max} µg/m³. Use as setas para percorrer as barras.",
  heatNote:
    "Últimos 7 dias. Cada quadro é uma hora: serve para ver em que horários o ar costuma piorar.",
  heatSummary: "Mapa de calor de {measure} por dia e hora, últimos 7 dias.",
  scaleTitle: "Escala",
  insightMeanTitle: "Média e mediana · 7 dias",
  insightMeanBody:
    "Média e mediana em µg/m³. A mediana não se deixa levar por picos isolados, como uma queimada pontual.",
  insightLimitTitle: "Frente ao limite MADES",
  insightDaysOver: "{count} dias acima",
  insightDaysOverOne: "1 dia acima",
  insightLimitPending: "A confirmar",
  insightLimitBody: "Dias com média de 24 h acima de {limit} µg/m³.",
  insightLimitBodyPending: "O limite de 24 h ainda não está confirmado.",
  insightAnnual: "Limite anual: {limit} µg/m³.",
  insightAnnualPending: "Limite anual a confirmar.",
  insightHoursTitle: "Horários",
  insightBestHour: "Melhor horário: {hour}",
  insightWorstHour:
    "Pior horário: {hour}. Útil para planejar tarefas ao ar livre e ventilação (média por hora, últimos 7 dias).",
  analysisUnavailableTitle: "A análise ainda não está disponível",
  analysisUnavailableBody:
    "Aparece assim que a plataforma publicar as medições por hora do seu sensor.",
  analysisEmptyTitle: "Sem medições neste período",
  analysisEmptyBody: "O sensor não enviou dados de partículas neste período.",

  logIntro:
    "Anote o que a instituição fez quando o ar mudou. Fica como histórico para relatórios e para aprender o que funciona.",
  logPlaceholderIndustria:
    "Ex.: Foram entregues máscaras ao pessoal do pátio e a carga a céu aberto foi pausada.",
  logPlaceholderColegio:
    "Ex.: O recreio ao ar livre foi suspenso e as famílias foram avisadas.",
  logMemberNotice:
    "Você tem acesso de membro: pode ver o registro; só os administradores registram ações.",
  logHistoryTitle: "Histórico",
  logNoAqi: "AQI não registrado",

  alertsRulesTitle: "Quando avisar",
  alertsRuleAqi: "Qualidade do ar",
  alertsRuleAqiSub: "Quando o AQI passar de {threshold}",
  alertsRuleNoThreshold: "Sem limite configurado",
  alertsRuleActive: "Ativa",
  alertsRulePaused: "Pausada",
  alertsGroups: "Grupos sensíveis",
  alertsManagedByRespira:
    "As regras são configuradas pela equipe da Respira. Escreva para nós se quiser mudá-las.",

  // --- Shared states -------------------------------------------------------
  errorTitle: "Não conseguimos carregar estes dados",
  errorBody:
    "Confira sua conexão e tente de novo. Se continuar igual, avise a gente.",
  retry: "Tentar de novo",
  loading: "Carregando…",
  sessionExpiredTitle: "Sua sessão expirou",
  sessionExpiredBody: "Entre de novo para continuar vendo seu painel.",
  goToLogin: "Ir para a entrada",
  noSensorTitle: "Sua instituição ainda não tem sensor atribuído",
  noSensorBody:
    "Quando o equipamento estiver instalado, este painel se ativa sozinho. Escreva para nós se tiver dúvidas sobre a instalação.",
};

export const institution = { es, en, pt } as const;

/**
 * Returns the institutional copy for `lang`, falling back to Spanish for any
 * key a translation is missing — the same contract as `useTranslations` for the
 * public dictionary, so a partial translation degrades instead of breaking.
 *
 * Returns an object rather than a `t(key)` function because these components
 * read many keys each and `copy.x` keeps their JSX unchanged.
 */
export function useInstitutionCopy(lang: Lang): Translation {
  const dictionary = institution[lang];
  if (!dictionary || dictionary === institution[DEFAULT_LANG]) {
    return institution[DEFAULT_LANG];
  }
  return { ...institution[DEFAULT_LANG], ...dictionary };
}

/** Fills `{name}` placeholders, for the few strings that carry values. */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
