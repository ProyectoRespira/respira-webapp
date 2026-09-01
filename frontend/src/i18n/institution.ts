// Copy for the institutional dashboard (RES-328).
//
// Kept out of `i18n/ui.ts` on purpose. That dictionary is the public site's,
// and every key there must exist in `es`, `en` and `pt`; the institutional
// panel serves Paraguayan client institutions and ships in Spanish only for
// now. Holding its copy in a separate, single-language module means adding the
// other two languages later is a mechanical change here, and keeps a large,
// frequently-edited shared file out of this feature's diff.
//
// Same voice as the rest of the site: voseo, second person, no jargon.

export const institutionCopy = {
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
  pageTitle: "Estado de tu sensor",
  updatedAt: "Actualizado",

  // --- Sensor --------------------------------------------------------------
  sensorTitle: "Tu sensor",
  sensorOnline: "En línea",
  sensorOffline: "Fuera de línea",
  sensorLocation: "Ubicación",
  sensorCity: "Ciudad",
  sensorCoordinates: "Coordenadas",
  sensorLastReading: "Última medición",
  sensorContract: "Contrato",
  sensorNoReading: "Sin mediciones",
  sensorOfflineHint:
    "El sensor no envía datos nuevos. Ya estamos revisando el equipo.",
  contractActiveUntil: "Activo hasta",
  contractNoEnd: "Activo, sin fecha de término",

  // --- Air quality ---------------------------------------------------------
  airQualityTitle: "Calidad del aire",
  aqiUnit: "AQI PM2.5",
  recommendationsTitle: "Recomendaciones para hoy",
  airQualityEmptyTitle: "Tu sensor aún no reportó mediciones",
  airQualityEmptyBody:
    "En cuanto envíe la primera lectura, vas a ver acá el AQI y la recomendación del día.",

  // --- History -------------------------------------------------------------
  historyTitle: "Historial de calidad del aire · últimos 3 meses",
  historySubtitle: "Promedio diario",
  historyEmptyTitle: "Todavía no hay historial",
  historyEmptyBody:
    "El gráfico se arma con los promedios diarios de tu sensor. Aparece en cuanto haya al menos dos días de mediciones.",
  historyLegendSeries: "AQI diario",
  historyLegendThreshold: "Umbral de alerta",

  // --- Alerts --------------------------------------------------------------
  alertsTitle: "Alertas",
  alertsOn: "Activas",
  alertsOff: "Desactivadas",
  alertsThresholdSuffix: "AQI o más",
  alertsThresholdHelp: "Te avisamos cuando el sensor supere este valor.",
  alertsNoThreshold: "Sin umbral configurado.",
  alertsDisabledBody:
    "Tu institución no tiene alertas activas. Escribinos si querés activarlas.",
  alertsGroupsTitle: "Grupos sensibles",
  alertsNoGroups: "Todavía no hay grupos sensibles configurados.",
  alertsRequestChanges: "Solicitar cambios",

  // --- Action log ----------------------------------------------------------
  actionsTitle: "Acciones registradas",
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
  actionFormSensor: "Sensor",
  actionFormAlertLabel: "¿Responde a una alerta?",
  actionFormAlertOptional: "Opcional",
  actionFormAlertNone: "Ninguna — por iniciativa propia",
  actionFormNoteLabel: "¿Qué hicieron?",
  actionFormNotePlaceholder:
    "Ej.: Se suspendió el recreo al aire libre y se avisó a las familias.",
  actionFormNoteHelp: "La fecha y la hora se guardan solas al registrar.",
  actionFormSubmit: "Guardar acción",
  actionFormSubmitting: "Guardando…",
  actionFormSaved: "Acción guardada.",
  actionFormNoteRequired: "Contá brevemente qué hicieron antes de guardar.",
  actionFormNoteTooLong: "La nota es demasiado larga. Resumila un poco.",
  actionFormError: "No pudimos guardar la acción. Intentá de nuevo.",
  actionFormNoStation:
    "Necesitás un sensor asignado para registrar acciones. Escribinos si creés que es un error.",

  // --- Downloads -----------------------------------------------------------
  downloadsTitle: "Descargas",
  downloadMonthly: "Reporte mensual (PDF)",
  downloadMonthlyNote: "Resumen del último mes cerrado.",
  downloadRaw: "Historial crudo (Excel)",
  downloadRawNote: "Todas las mediciones desde el inicio del contrato.",
  downloadPreparing: "Generando…",
  downloadUnavailable: "Esta descarga todavía no está disponible.",
  downloadError: "No pudimos generar el archivo. Intentá de nuevo.",

  // --- Contact -------------------------------------------------------------
  contactTitle: "Tu contacto en Respira",
  contactEmail: "Correo",
  contactHint:
    "Escribinos si el sensor aparece fuera de línea más de 24 horas.",

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

export type InstitutionCopyKey = keyof typeof institutionCopy;
