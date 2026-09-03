// Copy for the User Guides (`pages/guias/`).
//
// Its own dictionary rather than more keys in `ui.ts`: these are three long
// documents, and their prose would swamp the public site's chrome strings in
// every diff. Same contract as the others — `es` is the source of truth, `en`
// and `pt` are typed against it, and `useGuideCopy(lang)` falls back to Spanish
// per key so a partial translation degrades instead of rendering blank.
//
// Keys are grouped by guide (`index*`, `inst*`, `admin*`) and named after the
// section they belong to, so a key read in a page says where it belongs.
//
// Voice: Spanish is Paraguayan voseo; Portuguese uses "você"; English is plain
// second person. The guides address the reader directly in all three.

import { DEFAULT_LANG, type Lang } from "./config";

const es = {
  // --- Hub (`index.astro`) -------------------------------------------------
  indexEyebrow: "Guías de uso",
  indexTitle: "Cómo usar Proyecto Respira",
  indexDek:
    "Dos guías, según quién seas: la institución que consulta su panel, o el equipo que da de alta instituciones desde el backoffice.",
  indexRead: "Leer la guía",
  // Chrome of the guide layout itself: the back link and the table of contents.
  layoutBack: "Guías de uso",
  layoutToc: "En esta guía",
  indexDirect: "¿Ya sabés lo que buscás? Entrá directo al",
  indexDirectLink: "panel de tu institución",

  indexInstAudience: "Para instituciones",
  indexInstTitle: "Cómo entrar y moverte por el panel de tu institución",
  indexInstSummary:
    "La pantalla de ingreso, qué hacer si perdiste la contraseña, y un recorrido por cada sección del panel: calidad del aire, sensor, historial, acciones, alertas y descargas.",
  indexInstTopic1: "Entrar al panel",
  indexInstTopic2: "Recuperar la contraseña",
  indexInstTopic3: "Recorrido del panel",
  indexInstTopic4: "Preguntas frecuentes",

  indexAdminAudience: "Para administradores",
  indexAdminTitle: "Alta de una institución, de cero a panel activo",
  indexAdminSummary:
    "El paso a paso en el backoffice: crear la institución, asociarle un usuario y una estación, configurar alertas y verificar que su panel responde.",
  indexAdminTopic1: "Entrar al admin",
  indexAdminTopic2: "Crear y vincular",
  indexAdminTopic3: "Verificar el panel",
  indexAdminTopic4: "Errores comunes",

  // --- Institutions guide (`instituciones.astro`) --------------------------
  instEyebrow: "Guía de uso · Instituciones",
  instTitle: "Cómo entrar y moverte por el panel de tu institución",
  instDek:
    "Esta guía explica, en términos simples, qué ves cuando entrás al panel de tu institución en Respira: la pantalla de ingreso, qué hacer si algo falla, y un recorrido por cada sección del panel una vez adentro. No hace falta ningún conocimiento técnico para seguirla.",
  instMeta: "Para instituciones con sensor Respira",

  instNavEntrar: "Entrar al panel",
  instNavErrores: "Si algo no funciona",
  instNavClave: "Olvidé mi contraseña",
  instNavRecorrido: "Recorrido del panel",
  instNavSalir: "Cerrar sesión",
  instNavFaq: "Preguntas frecuentes",

  // Sign-in screen
  instEntrarTitle: "La pantalla de ingreso",
  // `{link}` is the linked name of the institutional access entry.
  instEntrarLede1: "El panel se abre desde",
  instEntrarLede2:
    ", el enlace que está en el menú del sitio. Es una pantalla dividida en dos: a la izquierda la presentación de Respira, a la derecha el formulario para entrar.",
  instMockEmailSample: "contacto@tuinstitucion.edu.py",
  instMockCaption:
    "Recreación simplificada de la pantalla real, para orientarte — no es una captura literal.",
  instEntrarBody1: "El formulario pide solo dos datos:",
  instEntrarBodyEmail: "correo institucional",
  instEntrarBodyAnd: "y",
  instEntrarBodyPassword: "contraseña",
  instEntrarBody2:
    '. No hay casillas extra ni forma de "quedar conectado". Debajo del botón vas a encontrar el enlace',
  instEntrarBody3: "y el correo de contacto del equipo.",
  instEntrarCalloutLabel: "Un detalle útil",
  instEntrarCalloutBody:
    'Si ya tenés la sesión abierta y volvés a esta dirección, el sistema te manda directo a tu panel — no vas a ver el formulario de nuevo. Es a propósito, para que el botón "atrás" del navegador no te devuelva a una pantalla de ingreso vacía.',

  // Error messages
  instErroresTitle: "Los mensajes que podés ver al intentar entrar",
  instErroresLede:
    "El sistema distingue cuatro situaciones y muestra un aviso en rojo, arriba del formulario, sin recargar la página:",
  instErroresCredsTitle: "Correo o contraseña equivocados",
  instErroresCredsBody:
    '"Correo o contraseña incorrectos. Verificá los datos e intentá de nuevo." — nunca aclara cuál de los dos campos falló, por seguridad.',
  instErroresNoInstTitle: "La cuenta existe, pero no es de una institución",
  instErroresNoInstBody:
    '"Esta cuenta no tiene acceso a un panel institucional." — pasa si probás con un correo que no fue dado de alta como institución.',
  instErroresThrottledTitle: "Demasiados intentos seguidos",
  instErroresThrottledBody:
    '"Demasiados intentos. Esperá unos minutos antes de volver a probar." — es una protección automática contra intentos repetidos; se destraba sola pasado un rato.',
  instErroresServerTitle: "Algo falló del lado del servidor",
  instErroresServerBody:
    '"No pudimos completar el ingreso. Intentá de nuevo en unos segundos." — conviene reintentar antes de asumir que es un problema de credenciales.',

  // Password recovery
  instClaveTitle: "Si olvidaste tu contraseña",
  instClaveLede:
    "Podés recuperarla vos misma o vos mismo, sin escribirle a nadie. El recorrido completo son cinco pasos:",
  instClaveStep1a: "En la pantalla de ingreso, tocá",
  instClaveStep2a:
    "Escribí el correo de tu cuenta — el mismo con el que entrás al panel — y tocá",
  instClaveStep2b: "Enviar enlace",
  instClaveStep3:
    'Vas a ver el mensaje "Revisá tu correo". Si esa dirección tiene una cuenta en Respira, en unos minutos te llega un correo con el enlace. Si no aparece, mirá la carpeta de spam.',
  instClaveStep4:
    "Abrí el enlace del correo. Se abre una pantalla para escribir la contraseña nueva dos veces.",
  instClaveStep5:
    "Guardá y volvé al ingreso: desde ese momento entrás con la contraseña nueva, y la anterior deja de funcionar.",
  instClaveCalloutLabel: "Sobre el enlace del correo",
  instClaveCalloutBody:
    "El enlace vence a las 24 horas y se puede usar una sola vez. Si venció, si ya lo usaste, o si volviste a entrar con tu contraseña vieja en el medio, la pantalla te va a avisar que el enlace ya no sirve y te ofrece pedir uno nuevo. Pedir uno nuevo también invalida el anterior.",
  instClaveRules:
    "La contraseña nueva tiene que tener al menos 10 caracteres e incluir una letra, un número y un carácter especial. Si la que elegiste no cumple algo, la pantalla te dice qué falta y podés volver a intentar con el mismo enlace.",
  instClavePrivacyLabel: "Por qué el mensaje no confirma tu correo",
  instClavePrivacyBody:
    'La pantalla dice "si ese correo tiene una cuenta" en lugar de confirmarlo. Es a propósito: así, alguien que no es de tu institución no puede usar este formulario para averiguar qué direcciones están registradas en Respira.',

  // Panel walkthrough
  instRecorridoTitle: "Recorrido por el panel, sección por sección",
  instRecorridoLede:
    'Al entrar correctamente llegás a tu panel, bajo el título "Estado de tu sensor". Arriba de todo hay una barra oscura con el nombre de tu institución y el botón para cerrar sesión; debajo, todo lo que sigue.',
  instScreenshotAlt:
    "Panel institucional de Respira: barra superior con el nombre de la institución y el botón de cerrar sesión; tarjeta de calidad del aire con AQI 55 «Moderado» y recomendaciones del día; tarjeta del sensor en línea con ubicación, última medición y contrato; gráfico del historial de tres meses con la línea del umbral de alerta; lista de acciones registradas junto al formulario para cargar una nueva; tarjeta de alertas con el umbral y los grupos sensibles; botones de descarga; y el bloque de contacto.",
  instScreenshotCaption:
    "El panel real, con los datos de una institución de ejemplo — los números, las fechas y los textos que veas dependen de tu sensor.",

  instAirTitle: "Calidad del aire de hoy",
  instAirBody:
    'Muestra un número grande (el índice de calidad del aire, o AQI) con un emoji y una categoría en palabras simples — "Bueno", "Moderado", etc. — más un mensaje y una lista de recomendaciones para ese día. Si tu sensor todavía no envió ninguna medición, en su lugar vas a leer "Tu sensor aún no reportó mediciones".',
  instSensorTitle: "Tu sensor",
  instSensorBody:
    'Una tarjeta con el estado del equipo: "En línea" o "Fuera de línea", su ubicación (ciudad y coordenadas), cuándo llegó su última medición, y hasta cuándo está vigente el contrato de tu institución. Si el sensor está fuera de línea, aclara: "El sensor no envía datos nuevos. Ya estamos revisando el equipo." — para que no te alarmes innecesariamente.',
  instHistoryTitle: "Historial de los últimos 3 meses",
  instHistoryBody:
    'Un gráfico con el promedio diario de calidad del aire y una línea que marca el "umbral de alerta". Necesita al menos dos días de mediciones para aparecer; antes de eso, se lee "Todavía no hay historial".',
  instActionsTitle: "Acciones registradas",
  instActionsBody:
    'Es el historial de lo que tu institución fue haciendo frente al aire (por ejemplo, suspender el recreo o avisar a las familias). Cada entrada tiene fecha, hora, una nota, y si respondió a una alerta puntual. Hay un botón "Ver más acciones" para cargar más, y al costado un pequeño formulario para cargar una nueva: elegís opcionalmente si responde a una alerta, escribís qué hicieron, y guardás — la fecha y la hora se completan solas.',
  instAlertsTitle: "Alertas",
  instAlertsBody:
    'Muestra si las alertas están activas o no, a partir de qué nivel de contaminación se dispara una ("X AQI o más") y qué grupos sensibles están configurados (por ejemplo, personas con asma). Es solo para consulta: no hay botones para cambiar esta configuración desde el panel. Si querés modificarla, el enlace "Solicitar cambios" arma un correo ya redactado hacia el equipo de Respira.',
  instDownloadsTitle: "Descargas",
  instDownloadsBody:
    'Dos botones: "Reporte mensual (PDF)" e "Historial crudo (Excel)".',
  instDownloadsCalloutLabel: "Estado actual",
  instDownloadsCalloutBody:
    'Estas dos descargas todavía no están disponibles del lado del servidor. Hoy, al presionarlas, vas a ver "Esta descarga todavía no está disponible."',
  instContactTitle: "Tu contacto en Respira",
  instContactBody:
    'Al final del panel, un bloque con el correo de contacto y un recordatorio: "Escribinos si el sensor aparece fuera de línea más de 24 horas."',

  // Logout
  instSalirTitle: "Cerrar sesión",
  instSalirBody:
    'El botón "Cerrar sesión" está siempre arriba a la derecha, en cualquier pantalla del panel. Un clic y volvés al ingreso. Si por algún motivo no se puede cerrar la sesión, el botón cambia a "Reintentar" y se ve el aviso "No pudimos cerrar la sesión."',

  // FAQ
  instFaqTitle: "Preguntas frecuentes",
  instFaqQ1: "¿Cómo recupero mi contraseña si la olvido?",
  instFaqA1a: "Desde",
  instFaqA1b: ", en la pantalla de ingreso. El paso a paso está en",
  instFaqA1Link: "Si olvidaste tu contraseña",
  instFaqA1c: ". No hace falta que escribas al equipo.",
  instFaqQ2: "¿Puedo cambiar el umbral de mis alertas por mi cuenta?",
  instFaqA2:
    'No desde el panel. Podés pedirlo por correo con el botón "Solicitar cambios" — el cambio real lo hace el equipo de Respira.',
  instFaqQ3: "¿Qué veo si mi institución todavía no tiene un sensor asignado?",
  instFaqA3:
    'El panel igual se abre, pero en el lugar de los datos dice "Tu institución todavía no tiene sensor asignado" y explica que el panel se activa solo apenas se instale el equipo.',
  instFaqQ4: "¿Y si la sesión se vence mientras estoy mirando el panel?",
  instFaqA4:
    'Aparece "Tu sesión expiró — Volvé a ingresar para seguir viendo tu panel" con un botón "Ir al ingreso".',
  instFaqQ5: "¿Dónde está la guía para administradores?",
  instFaqA5a: "En",
  instFaqA5Link: "Guía para administradores",
  instFaqA5b:
    ". Es para el equipo que da de alta instituciones desde el backoffice, no para las instituciones.",

  // --- Administrators guide (`administradores.astro`) ----------------------
  adminEyebrow: "Guía de uso · Administradores",
  adminTitle: "Alta de una institución, de cero a panel activo",
  adminDek:
    "Cómo crear una institución en el backoffice de Respira, asociarle un usuario y una estación, y confirmar que su panel funciona.",
  adminMeta1: "Para el equipo interno de Respira",
  adminMeta2: "Requiere una cuenta con permisos en el backoffice",

  adminNavAdmin: "Entrar al admin",
  adminNavInstitucion: "Crear la institución",
  adminNavUsuario: "Asociar un usuario",
  adminNavAlertas: "Configurar alertas",
  adminNavEstacion: "Asociar una estación",
  adminNavVerificar: "Verificar el panel",
  adminNavClave: "Recuperar tu contraseña",
  adminNavErrores: "Si algo no sale bien",

  // Signing in to the admin
  adminAdminTitle: "Entrar al admin",
  adminAdminLede1: "El",
  adminAdminLedeAdmin: "admin",
  adminAdminLede2:
    "es la interfaz de trabajo interna de Respira: una serie de formularios web donde el equipo crea y edita los datos del sistema — instituciones, usuarios, estaciones. Es distinto del",
  adminAdminLedePanel: "panel institucional",
  adminAdminLede3: ", que es lo que ve el cliente final y se explica en la",
  adminAdminLedeLink: "guía para instituciones",
  adminAdminLede4:
    ". Pensá el admin como la trastienda, y el panel como la vitrina.",
  adminAdminStep1: "Abrí el admin en tu navegador:",
  adminAdminStep2a: "Vas a ver una pantalla con dos campos:",
  adminAdminStep2Email: "email",
  adminAdminStep2And: "y",
  adminAdminStep2Password: "contraseña",
  adminAdminStep2b:
    ". Escribí las credenciales de tu cuenta y presioná el botón de login.",
  adminAdminStep3a:
    "Si todo salió bien, entrás a la pantalla principal: una lista de secciones agrupadas en",
  adminAdminStep3b: "y",
  adminAdminStep3c: ". Esa es tu base de operaciones para todo lo que sigue.",
  adminHomeAlt:
    "Pantalla principal del admin de Respira. A la izquierda, la lista de secciones agrupadas en Accounts (Roles, Users) y Api (Action logs, Institution alerts, Institution contracts, Institutions, Sensitive groups, Stations, entre otras), cada una con un enlace «Add». Arriba a la derecha, los enlaces para ver el sitio, cambiar la contraseña y cerrar sesión.",
  adminHomeCaption1:
    "La pantalla principal del admin. Las secciones que vas a usar en esta guía están todas bajo",
  adminHomeCaption2: ".",
  adminNoAccount: "¿No tenés cuenta todavía? Hay dos caminos:",
  adminSuperuser1: "Un",
  adminSuperuserWord: "superusuario",
  adminSuperuser2: "siempre puede entrar y ve todo. Se crea corriendo",
  adminSuperuser3: ", o de forma reproducible con",
  adminSuperuser4: "(usa las variables de entorno",
  adminSuperuser5: ").",
  adminRole1: "Una cuenta con rol",
  adminRoleOr: "o",
  adminRole2:
    "alcanza para lo de esta guía — pero solo funciona si alguien ya corrió",
  adminRole3: "después de asignarle ese rol.",
  adminAdminCalloutLabel: "Lo que más se traba",
  adminAdminCallout1: "Cambiar el campo",
  adminAdminCallout2: "de un usuario en",
  adminAdminCallout3:
    "no le da permisos por sí solo — es solo una etiqueta. Los permisos reales viven en grupos que",
  adminAdminCallout4:
    'sincroniza. Si entraste al admin pero no ves el botón "Add" en Institutions, ese es el primer sospechoso.',

  // Creating the institution
  adminInstTitle: "Crear la institución",
  adminInstLede:
    "Es el registro raíz: todo lo demás — el usuario que entra al panel, la estación, las alertas — cuelga de esta institución.",
  adminInstAlt:
    "Formulario «Add institution» del admin, completo. Arriba, los campos Legal name, Display name e Institution type; después los bloques Contact (nombre, correo y teléfono), Location (dirección y ciudad) y Notes. Más abajo, la sección «Dashboard users» con un selector de usuario y el enlace «Add another Dashboard user», y la sección «Institution alert config» con la casilla «Is enabled», el campo «Alert threshold» y el selector de doble lista de grupos sensibles. Al pie, los botones Save.",
  adminInstCaption:
    "Un solo formulario cubre tres cosas: los datos de la institución, el usuario que va a entrar al panel y la configuración de alertas.",
  adminRequired: "Requerido.",
  adminFieldLegalName: "Razón social de la institución.",
  adminFieldDisplayName: "Nombre corto para mostrar. Opcional.",
  adminFieldType: "Tipo de institución. Opcional.",
  adminFieldContact: "Datos del contacto. Opcionales.",
  adminFieldLocation: "Ubicación. Opcionales.",
  adminFieldNotes: "Notas internas. Opcional.",
  adminInstAfter1: "Guardá el formulario con solo",
  adminInstAfter2:
    "y ya existe la institución — el resto se puede completar después. No hace falta salir de esta pantalla para los dos pasos siguientes: son secciones de este",
  adminInstAfterSame: "mismo formulario",

  // Linking a user
  adminUserTitle: "Asociar un usuario — esto es lo que da acceso al panel",
  adminUserLede:
    "Sin este paso la institución existe pero nadie puede entrar a su panel.",
  adminUserStep1a:
    "En la misma página de la institución, bajá hasta la sección",
  adminUserStep2a: "Usá el buscador para elegir un",
  adminUserStep2b: "que ya exista. Si todavía no existe, crealo antes en",
  adminUserStep2c: "y volvé.",
  adminUserStep3:
    "Guardá el formulario de Institution — el vínculo se crea junto con el resto de los datos.",
  adminUserCalloutLabel: "Cómo funciona el acceso",
  adminUserCallout1: "Ese usuario",
  adminUserCalloutBold: "no necesita ser staff ni tener rol de admin",
  adminUserCallout2:
    ". El único requisito para entrar al panel institucional es tener este vínculo. Es una relación uno a uno: un usuario pertenece como máximo a una institución a la vez.",
  adminUserCalloutSave: "Guardá su correo",
  adminUserCallout3: "— lo vas a usar para la comprobación final.",

  // Alerts
  adminAlertsTitle: "Configurar alertas — opcional",
  adminAlertsLede:
    "Solo si la institución va a usar el sistema de alertas por grupos sensibles.",
  adminAlertsBody1: "Misma página, sección",
  adminAlertsBody2:
    ". Activá la casilla, poné el umbral de AQI a partir del cual se dispara una alerta, y elegí los grupos sensibles en el selector de doble lista. Se puede omitir por completo sin bloquear los pasos siguientes.",

  // Station
  adminStationTitle: "Asociar una estación",
  adminStationLede:
    "Esta es la parte que conecta con el pipeline de datos — pero desde el admin es un formulario más.",
  adminContractAlt:
    "Formulario «Add institution contract» del admin, con los campos Institution y Station como buscadores, el desplegable Contract status con las opciones draft, active, expired y cancelled, las fechas Start date y End date, el campo Monthly fee y el campo Signed contract url.",
  adminContractCaption:
    "El contrato es lo que liga la institución con su sensor: sin él, el panel abre pero no tiene datos que mostrar.",
  adminFieldInstitution: "Se elige con el buscador.",
  adminFieldStation: "Se busca por nombre o por",
  adminFieldContractStatus: "draft / active / expired / cancelled.",
  adminFieldOptional: "Opcionales.",
  adminStationCalloutLabel: "Una restricción que conviene saber de antemano",
  adminStationCallout1: "Institución y estación son",
  adminStationCalloutBold: "uno a uno en ambos sentidos",
  adminStationCallout2:
    ": una institución solo puede tener un contrato, y una estación solo puede estar ligada a una institución. Si necesitás reasignar una estación, primero hay que borrar o expirar el contrato anterior.",
  adminStationCode1: "El campo",
  adminStationCode2:
    "de la estación es de solo lectura acá — lo genera el pipeline de datos, no se edita desde este formulario.",

  // Verification
  adminVerifyTitle: "Verificar que el panel funciona",
  adminVerifyLede:
    "Ya tenés la institución, su usuario y su estación. La comprobación es entrar como si fueras esa institución y ver que carga sus propios datos.",
  adminVerifyStep1a: "Abrí",
  adminVerifyStep1b: "desde el menú del sitio, o directamente",
  adminVerifyStep2a: "Ingresá con el",
  adminVerifyStep2Bold: "correo y la contraseña del usuario que asociaste",
  adminVerifyStep2b:
    "— no con tu cuenta de admin. Una cuenta de backoffice sin ese vínculo no entra acá, aunque sus credenciales sean correctas.",
  adminVerifyStep3:
    "Deberías caer en el panel y ver el nombre de la institución en la barra superior, con el sensor, el AQI del día y el historial cargados. Eso confirma que los cinco pasos anteriores quedaron bien.",
  adminVerifyAfter1:
    "Si querés saber qué va a ver exactamente la institución cuando entre, el recorrido completo del panel está en la",
  adminVerifyAfter2: ".",

  // Password recovery
  adminClaveTitle: "Recuperar tu contraseña de administrador",
  adminClaveLede:
    "Si perdiste el acceso al admin, no hace falta que otra persona te lo restablezca.",
  adminClaveStep1a: "En",
  adminClaveStep1b: ", tocá",
  adminClaveStep1Bold: '"Forgotten your password or username?"',
  adminClaveStep1c: ", debajo del formulario.",
  adminClaveStep2: "Escribí el correo de tu cuenta y enviá.",
  adminClaveStep3:
    "Vas a recibir un correo con un enlace. Abrilo y elegí la contraseña nueva, dos veces.",
  adminClaveStep4a: "Volvé a",
  adminClaveStep4b: "y entrá con la nueva.",
  adminClaveCalloutLabel: "Lo que conviene saber",
  adminClaveCallout1:
    "El enlace vence a las 24 horas y se puede usar una sola vez; volver a entrar con la contraseña vieja también lo invalida. El formulario no dice si el correo existe o no — es para que nadie pueda usarlo para averiguar qué cuentas hay.",
  adminClaveCallout2a: "Las pantallas de recuperación viven bajo",
  adminClaveCallout2b:
    ", así que están detrás de la misma lista de IPs permitidas que el resto del backoffice: si el admin no te abre desde donde estás, el enlace del correo tampoco va a abrir.",
  adminClaveAfter1:
    "Las instituciones tienen su propio flujo, desde la pantalla de ingreso del panel — está explicado en la",
  adminClaveAfter2: ".",

  // Troubleshooting
  adminErroresTitle: "Si algo no sale bien",
  adminError1Label: "El usuario no entra, aunque la contraseña sea correcta",
  adminError1a:
    "Le falta el vínculo con la institución, o quedó asociado a otra. Volvé al paso",
  adminError1Link: "Asociar un usuario",
  adminError1b:
    'y revisá la sección "Dashboard users". Ojo también con usar por error una cuenta de backoffice: tener permisos en',
  adminError1c: "no da acceso al panel institucional.",
  adminError2Label: "El panel abre pero dice que no hay sensor asignado",
  adminError2a: "La institución no tiene contrato. Volvé al paso",
  adminError2Link: "Asociar una estación",
  adminError3Label: "La cuenta quedó bloqueada tras varios intentos",
  adminError3:
    "El ingreso al panel comparte la protección del admin: 5 intentos fallidos bloquean la cuenta por 1 hora. Si vas a probar credenciales inválidas a propósito, no repitas más de 4 veces seguidas con el mismo usuario.",
  adminError4Label: "El panel abre pero el historial está vacío",
  adminError4:
    "La estación existe y el contrato también, pero el sensor todavía no reportó mediciones — o reportó menos de dos días. El gráfico aparece solo cuando hay al menos dos días de datos.",
} as const;

export type GuideCopyKey = keyof typeof es;

// Typed against `es`, so a key added there and forgotten in a translation is a
// build error rather than a silent runtime fallback.
type Translation = Record<GuideCopyKey, string>;

const en: Translation = {
  // --- Hub -----------------------------------------------------------------
  indexEyebrow: "User guides",
  indexTitle: "How to use Proyecto Respira",
  indexDek:
    "Two guides, depending on who you are: the institution checking its panel, or the team registering institutions from the backoffice.",
  indexRead: "Read the guide",
  layoutBack: "User guides",
  layoutToc: "In this guide",
  indexDirect: "Already know what you're looking for? Go straight to your",
  indexDirectLink: "institution's panel",

  indexInstAudience: "For institutions",
  indexInstTitle: "How to sign in and find your way around your panel",
  indexInstSummary:
    "The sign-in screen, what to do if you've lost your password, and a walkthrough of every section of the panel: air quality, sensor, history, actions, alerts and downloads.",
  indexInstTopic1: "Signing in",
  indexInstTopic2: "Recovering your password",
  indexInstTopic3: "Panel walkthrough",
  indexInstTopic4: "Frequently asked questions",

  indexAdminAudience: "For administrators",
  indexAdminTitle: "Registering an institution, from zero to an active panel",
  indexAdminSummary:
    "The step by step in the backoffice: create the institution, link a user and a station to it, configure alerts and check that its panel responds.",
  indexAdminTopic1: "Signing in to the admin",
  indexAdminTopic2: "Create and link",
  indexAdminTopic3: "Check the panel",
  indexAdminTopic4: "Common errors",

  // --- Institutions guide --------------------------------------------------
  instEyebrow: "User guide · Institutions",
  instTitle: "How to sign in and find your way around your panel",
  instDek:
    "This guide explains, in simple terms, what you see when you sign in to your institution's panel on Respira: the sign-in screen, what to do if something fails, and a walkthrough of every section of the panel once you're inside. No technical knowledge is needed to follow it.",
  instMeta: "For institutions with a Respira sensor",

  instNavEntrar: "Signing in",
  instNavErrores: "If something doesn't work",
  instNavClave: "I forgot my password",
  instNavRecorrido: "Panel walkthrough",
  instNavSalir: "Logging out",
  instNavFaq: "Frequently asked questions",

  instEntrarTitle: "The sign-in screen",
  instEntrarLede1: "The panel opens from",
  instEntrarLede2:
    ", the link in the site's menu. It's a screen split in two: Respira's introduction on the left, the form to sign in on the right.",
  instMockEmailSample: "contact@yourinstitution.edu.py",
  instMockCaption:
    "A simplified recreation of the real screen, to orient you — not a literal capture.",
  instEntrarBody1: "The form asks for only two things:",
  instEntrarBodyEmail: "institutional email",
  instEntrarBodyAnd: "and",
  instEntrarBodyPassword: "password",
  instEntrarBody2:
    '. There are no extra checkboxes and no way to "stay signed in". Below the button you\'ll find the link',
  instEntrarBody3: "and the team's contact address.",
  instEntrarCalloutLabel: "A useful detail",
  instEntrarCalloutBody:
    "If you already have a session open and come back to this address, the system sends you straight to your panel — you won't see the form again. That's on purpose, so the browser's \"back\" button doesn't return you to an empty sign-in screen.",

  instErroresTitle: "The messages you might see when signing in",
  instErroresLede:
    "The system distinguishes four situations and shows a notice in red, above the form, without reloading the page:",
  instErroresCredsTitle: "Wrong email or password",
  instErroresCredsBody:
    '"Incorrect email or password. Check your details and try again." — it never says which of the two fields was wrong, for security.',
  instErroresNoInstTitle: "The account exists, but isn't an institution's",
  instErroresNoInstBody:
    "\"This account doesn't have access to an institutional panel.\" — this happens if you try an address that wasn't registered as an institution.",
  instErroresThrottledTitle: "Too many attempts in a row",
  instErroresThrottledBody:
    '"Too many attempts. Wait a few minutes before trying again." — this is automatic protection against repeated attempts; it clears on its own after a while.',
  instErroresServerTitle: "Something failed on the server side",
  instErroresServerBody:
    "\"We couldn't complete the sign-in. Try again in a few seconds.\" — worth retrying before assuming it's a credentials problem.",

  instClaveTitle: "If you forgot your password",
  instClaveLede:
    "You can recover it yourself, without writing to anyone. The whole path is five steps:",
  instClaveStep1a: "On the sign-in screen, tap",
  instClaveStep2a:
    "Enter your account's email — the same one you sign in with — and tap",
  instClaveStep2b: "Send link",
  instClaveStep3:
    "You will see the message \"Check your email\". If that address has a Respira account, you'll get an email with the link within a few minutes. If it doesn't show up, check your spam folder.",
  instClaveStep4:
    "Open the link in the email. A screen opens for you to type the new password twice.",
  instClaveStep5:
    "Save it and go back to sign in: from then on you sign in with the new password, and the old one stops working.",
  instClaveCalloutLabel: "About the link in the email",
  instClaveCalloutBody:
    "The link expires after 24 hours and can only be used once. If it expired, if you already used it, or if you signed in with your old password in the meantime, the screen will tell you the link no longer works and offer to send a new one. Requesting a new one also invalidates the previous one.",
  instClaveRules:
    "The new password must be at least 10 characters and include a letter, a number and a special character. If the one you chose falls short, the screen tells you what's missing and you can try again with the same link.",
  instClavePrivacyLabel: "Why the message doesn't confirm your address",
  instClavePrivacyBody:
    'The screen says "if that address has an account" rather than confirming it. That\'s on purpose: it stops someone outside your institution using this form to find out which addresses are registered with Respira.',

  instRecorridoTitle: "A walkthrough of the panel, section by section",
  instRecorridoLede:
    "Once you sign in successfully you land on your panel, under the heading \"Your sensor's status\". At the very top there's a dark bar with your institution's name and the log-out button; everything else follows below.",
  instScreenshotAlt:
    "Respira's institutional panel: top bar with the institution's name and the log-out button; air quality card with AQI 55 «Moderate» and the day's recommendations; card for the online sensor with location, last reading and contract; three-month history chart with the alert threshold line; list of logged actions beside the form for adding a new one; alerts card with the threshold and sensitive groups; download buttons; and the contact block.",
  instScreenshotCaption:
    "The real panel, with data from a sample institution — the numbers, dates and text you see depend on your sensor.",

  instAirTitle: "Today's air quality",
  instAirBody:
    'Shows a large number (the air quality index, or AQI) with an emoji and a category in plain words — "Good", "Moderate", etc. — plus a message and a list of recommendations for that day. If your sensor hasn\'t sent any readings yet, you\'ll read "Your sensor hasn\'t reported any readings yet" instead.',
  instSensorTitle: "Your sensor",
  instSensorBody:
    'A card with the equipment\'s status: "Online" or "Offline", its location (city and coordinates), when its last reading arrived, and how long your institution\'s contract runs. If the sensor is offline, it adds: "The sensor isn\'t sending new data. We\'re already looking into it." — so you don\'t worry unnecessarily.',
  instHistoryTitle: "History of the last 3 months",
  instHistoryBody:
    'A chart with the daily average air quality and a line marking the "alert threshold". It needs at least two days of readings to appear; before that, it reads "No history yet".',
  instActionsTitle: "Logged actions",
  instActionsBody:
    'This is the record of what your institution has been doing about the air (for example, cancelling recess or notifying families). Each entry has a date, a time, a note, and whether it responded to a specific alert. There\'s a "See more actions" button to load more, and beside it a small form to add a new one: you optionally choose whether it responds to an alert, write what you did, and save — the date and time fill in on their own.',
  instAlertsTitle: "Alerts",
  instAlertsBody:
    'Shows whether alerts are on, the pollution level at which one fires ("X AQI or above") and which sensitive groups are configured (people with asthma, for example). It\'s read-only: there are no buttons to change this configuration from the panel. If you want to change it, the "Request changes" link drafts an email to the Respira team.',
  instDownloadsTitle: "Downloads",
  instDownloadsBody:
    'Two buttons: "Monthly report (PDF)" and "Raw history (Excel)".',
  instDownloadsCalloutLabel: "Current status",
  instDownloadsCalloutBody:
    "These two downloads aren't available on the server side yet. Today, pressing them shows \"This download isn't available yet.\"",
  instContactTitle: "Your contact at Respira",
  instContactBody:
    'At the end of the panel, a block with the contact address and a reminder: "Write to us if the sensor shows as offline for more than 24 hours."',

  instSalirTitle: "Logging out",
  instSalirBody:
    'The "Log out" button is always at the top right, on every screen of the panel. One click and you\'re back at sign-in. If for some reason the session can\'t be ended, the button changes to "Try again" and the notice "We couldn\'t log you out." appears.',

  instFaqTitle: "Frequently asked questions",
  instFaqQ1: "How do I recover my password if I forget it?",
  instFaqA1a: "From",
  instFaqA1b: ", on the sign-in screen. The step by step is in",
  instFaqA1Link: "If you forgot your password",
  instFaqA1c: ". There's no need to write to the team.",
  instFaqQ2: "Can I change my alert threshold myself?",
  instFaqA2:
    'Not from the panel. You can request it by email with the "Request changes" button — the actual change is made by the Respira team.',
  instFaqQ3: "What do I see if my institution doesn't have a sensor yet?",
  instFaqA3:
    'The panel still opens, but where the data would be it says "Your institution doesn\'t have a sensor assigned yet" and explains that the panel activates on its own as soon as the equipment is installed.',
  instFaqQ4: "What if my session expires while I'm looking at the panel?",
  instFaqA4:
    '"Your session expired — Sign in again to keep viewing your panel" appears, with a "Go to sign in" button.',
  instFaqQ5: "Where is the guide for administrators?",
  instFaqA5a: "In",
  instFaqA5Link: "Guide for administrators",
  instFaqA5b:
    ". It's for the team that registers institutions from the backoffice, not for institutions.",

  // --- Administrators guide ------------------------------------------------
  adminEyebrow: "User guide · Administrators",
  adminTitle: "Registering an institution, from zero to an active panel",
  adminDek:
    "How to create an institution in Respira's backoffice, link a user and a station to it, and confirm that its panel works.",
  adminMeta1: "For Respira's internal team",
  adminMeta2: "Requires an account with backoffice permissions",

  adminNavAdmin: "Signing in to the admin",
  adminNavInstitucion: "Creating the institution",
  adminNavUsuario: "Linking a user",
  adminNavAlertas: "Configuring alerts",
  adminNavEstacion: "Linking a station",
  adminNavVerificar: "Checking the panel",
  adminNavClave: "Recovering your password",
  adminNavErrores: "If something goes wrong",

  adminAdminTitle: "Signing in to the admin",
  adminAdminLede1: "The",
  adminAdminLedeAdmin: "admin",
  adminAdminLede2:
    "is Respira's internal working interface: a set of web forms where the team creates and edits the system's data — institutions, users, stations. It is different from the",
  adminAdminLedePanel: "institutional panel",
  adminAdminLede3:
    ", which is what the end client sees and is explained in the",
  adminAdminLedeLink: "guide for institutions",
  adminAdminLede4:
    ". Think of the admin as the back room, and the panel as the shop window.",
  adminAdminStep1: "Open the admin in your browser:",
  adminAdminStep2a: "You'll see a screen with two fields:",
  adminAdminStep2Email: "email",
  adminAdminStep2And: "and",
  adminAdminStep2Password: "password",
  adminAdminStep2b:
    ". Enter your account's credentials and press the login button.",
  adminAdminStep3a:
    "If everything went well, you land on the main screen: a list of sections grouped under",
  adminAdminStep3b: "and",
  adminAdminStep3c:
    ". That's your base of operations for everything that follows.",
  adminHomeAlt:
    "Respira's admin main screen. On the left, the list of sections grouped under Accounts (Roles, Users) and Api (Action logs, Institution alerts, Institution contracts, Institutions, Sensitive groups, Stations, among others), each with an «Add» link. Top right, the links to view the site, change the password and log out.",
  adminHomeCaption1:
    "The admin's main screen. The sections you'll use in this guide are all under",
  adminHomeCaption2: ".",
  adminNoAccount: "Don't have an account yet? There are two routes:",
  adminSuperuser1: "A",
  adminSuperuserWord: "superuser",
  adminSuperuser2:
    "can always sign in and sees everything. Create one by running",
  adminSuperuser3: ", or reproducibly with",
  adminSuperuser4: "(it uses the environment variables",
  adminSuperuser5: ").",
  adminRole1: "An account with the",
  adminRoleOr: "or",
  adminRole2:
    "role is enough for this guide — but it only works if someone has already run",
  adminRole3: "after assigning that role.",
  adminAdminCalloutLabel: "What trips people up most",
  adminAdminCallout1: "Changing a user's",
  adminAdminCallout2: "field in",
  adminAdminCallout3:
    "does not grant permissions on its own — it's only a label. The real permissions live in groups that",
  adminAdminCallout4:
    "synchronises. If you got into the admin but don't see the \"Add\" button on Institutions, that's the first suspect.",

  adminInstTitle: "Creating the institution",
  adminInstLede:
    "It's the root record: everything else — the user who signs in to the panel, the station, the alerts — hangs off this institution.",
  adminInstAlt:
    "The admin's «Add institution» form, filled in. At the top, the Legal name, Display name and Institution type fields; then the Contact (name, email and phone), Location (address and city) and Notes blocks. Further down, the «Dashboard users» section with a user picker and the «Add another Dashboard user» link, and the «Institution alert config» section with the «Is enabled» checkbox, the «Alert threshold» field and the dual-list picker for sensitive groups. At the foot, the Save buttons.",
  adminInstCaption:
    "A single form covers three things: the institution's details, the user who will sign in to the panel and the alert configuration.",
  adminRequired: "Required.",
  adminFieldLegalName: "The institution's registered name.",
  adminFieldDisplayName: "Short name for display. Optional.",
  adminFieldType: "Institution type. Optional.",
  adminFieldContact: "Contact details. Optional.",
  adminFieldLocation: "Location. Optional.",
  adminFieldNotes: "Internal notes. Optional.",
  adminInstAfter1: "Save the form with just",
  adminInstAfter2:
    "and the institution exists — the rest can be filled in later. You don't need to leave this screen for the next two steps: they are sections of this",
  adminInstAfterSame: "same form",

  adminUserTitle: "Linking a user — this is what grants panel access",
  adminUserLede:
    "Without this step the institution exists but nobody can sign in to its panel.",
  adminUserStep1a: "On the same institution page, scroll down to the",
  adminUserStep2a: "Use the search box to pick a",
  adminUserStep2b:
    "that already exists. If it doesn't exist yet, create it first in",
  adminUserStep2c: "and come back.",
  adminUserStep3:
    "Save the Institution form — the link is created along with the rest of the data.",
  adminUserCalloutLabel: "How access works",
  adminUserCallout1: "That user",
  adminUserCalloutBold: "does not need to be staff or have an admin role",
  adminUserCallout2:
    ". The only requirement for signing in to the institutional panel is having this link. It's a one-to-one relationship: a user belongs to at most one institution at a time.",
  adminUserCalloutSave: "Save their email",
  adminUserCallout3: "— you'll use it for the final check.",

  adminAlertsTitle: "Configuring alerts — optional",
  adminAlertsLede:
    "Only if the institution is going to use the sensitive-group alert system.",
  adminAlertsBody1: "Same page, the",
  adminAlertsBody2:
    "section. Tick the checkbox, set the AQI threshold at which an alert fires, and pick the sensitive groups in the dual-list selector. It can be skipped entirely without blocking the following steps.",

  adminStationTitle: "Linking a station",
  adminStationLede:
    "This is the part that connects to the data pipeline — but from the admin it's just another form.",
  adminContractAlt:
    "The admin's «Add institution contract» form, with the Institution and Station fields as search boxes, the Contract status dropdown with the draft, active, expired and cancelled options, the Start date and End date fields, the Monthly fee field and the Signed contract url field.",
  adminContractCaption:
    "The contract is what ties the institution to its sensor: without it, the panel opens but has no data to show.",
  adminFieldInstitution: "Picked with the search box.",
  adminFieldStation: "Searched by name or by",
  adminFieldContractStatus: "draft / active / expired / cancelled.",
  adminFieldOptional: "Optional.",
  adminStationCalloutLabel: "A constraint worth knowing in advance",
  adminStationCallout1: "Institution and station are",
  adminStationCalloutBold: "one-to-one in both directions",
  adminStationCallout2:
    ": an institution can only have one contract, and a station can only be tied to one institution. If you need to reassign a station, the previous contract has to be deleted or expired first.",
  adminStationCode1: "The station's",
  adminStationCode2:
    "field is read-only here — the data pipeline generates it, it isn't edited from this form.",

  adminVerifyTitle: "Checking that the panel works",
  adminVerifyLede:
    "You now have the institution, its user and its station. The check is to sign in as though you were that institution and see that it loads its own data.",
  adminVerifyStep1a: "Open",
  adminVerifyStep1b: "from the site's menu, or go straight to",
  adminVerifyStep2a: "Sign in with the",
  adminVerifyStep2Bold: "email and password of the user you linked",
  adminVerifyStep2b:
    "— not with your admin account. A backoffice account without that link doesn't get in here, even with correct credentials.",
  adminVerifyStep3:
    "You should land on the panel and see the institution's name in the top bar, with the sensor, the day's AQI and the history loaded. That confirms the five previous steps were done right.",
  adminVerifyAfter1:
    "If you want to know exactly what the institution will see when they sign in, the full walkthrough of the panel is in the",
  adminVerifyAfter2: ".",

  adminClaveTitle: "Recovering your administrator password",
  adminClaveLede:
    "If you've lost access to the admin, you don't need someone else to reset it for you.",
  adminClaveStep1a: "At",
  adminClaveStep1b: ", tap",
  adminClaveStep1Bold: '"Forgotten your password or username?"',
  adminClaveStep1c: ", below the form.",
  adminClaveStep2: "Enter your account's email and send.",
  adminClaveStep3:
    "You'll get an email with a link. Open it and choose the new password, twice.",
  adminClaveStep4a: "Go back to",
  adminClaveStep4b: "and sign in with the new one.",
  adminClaveCalloutLabel: "Worth knowing",
  adminClaveCallout1:
    "The link expires after 24 hours and can only be used once; signing in again with the old password also invalidates it. The form doesn't say whether the address exists — so nobody can use it to find out which accounts there are.",
  adminClaveCallout2a: "The recovery screens live under",
  adminClaveCallout2b:
    ", so they sit behind the same allowed-IP list as the rest of the backoffice: if the admin doesn't open from where you are, the link in the email won't open either.",
  adminClaveAfter1:
    "Institutions have their own flow, from the panel's sign-in screen — it's explained in the",
  adminClaveAfter2: ".",

  adminErroresTitle: "If something goes wrong",
  adminError1Label: "The user can't sign in, even with the right password",
  adminError1a:
    "They're missing the link to the institution, or ended up linked to another one. Go back to the",
  adminError1Link: "Linking a user",
  adminError1b:
    'step and check the "Dashboard users" section. Watch out too for mistakenly using a backoffice account: having permissions in',
  adminError1c: "does not grant access to the institutional panel.",
  adminError2Label: "The panel opens but says there's no sensor assigned",
  adminError2a: "The institution has no contract. Go back to the",
  adminError2Link: "Linking a station",
  adminError3Label: "The account got locked after several attempts",
  adminError3:
    "Panel sign-in shares the admin's protection: 5 failed attempts lock the account for 1 hour. If you're going to try invalid credentials on purpose, don't repeat more than 4 times in a row with the same user.",
  adminError4Label: "The panel opens but the history is empty",
  adminError4:
    "The station exists and so does the contract, but the sensor hasn't reported readings yet — or has reported fewer than two days. The chart only appears once there are at least two days of data.",
};

const pt: Translation = {
  // --- Hub -----------------------------------------------------------------
  indexEyebrow: "Guias de uso",
  indexTitle: "Como usar o Proyecto Respira",
  indexDek:
    "Dois guias, conforme quem você é: a instituição que consulta seu painel, ou a equipe que cadastra instituições pelo backoffice.",
  indexRead: "Ler o guia",
  layoutBack: "Guias de uso",
  layoutToc: "Neste guia",
  indexDirect: "Já sabe o que procura? Vá direto ao",
  indexDirectLink: "painel da sua instituição",

  indexInstAudience: "Para instituições",
  indexInstTitle: "Como entrar e navegar pelo painel da sua instituição",
  indexInstSummary:
    "A tela de entrada, o que fazer se você perdeu a senha, e um passeio por cada seção do painel: qualidade do ar, sensor, histórico, ações, alertas e downloads.",
  indexInstTopic1: "Entrar no painel",
  indexInstTopic2: "Recuperar a senha",
  indexInstTopic3: "Passeio pelo painel",
  indexInstTopic4: "Perguntas frequentes",

  indexAdminAudience: "Para administradores",
  indexAdminTitle: "Cadastro de uma instituição, do zero ao painel ativo",
  indexAdminSummary:
    "O passo a passo no backoffice: criar a instituição, associar um usuário e uma estação, configurar alertas e verificar se o painel dela responde.",
  indexAdminTopic1: "Entrar no admin",
  indexAdminTopic2: "Criar e vincular",
  indexAdminTopic3: "Verificar o painel",
  indexAdminTopic4: "Erros comuns",

  // --- Institutions guide --------------------------------------------------
  instEyebrow: "Guia de uso · Instituições",
  instTitle: "Como entrar e navegar pelo painel da sua instituição",
  instDek:
    "Este guia explica, em termos simples, o que você vê quando entra no painel da sua instituição na Respira: a tela de entrada, o que fazer se algo falhar, e um passeio por cada seção do painel depois de entrar. Não é preciso nenhum conhecimento técnico para segui-lo.",
  instMeta: "Para instituições com sensor Respira",

  instNavEntrar: "Entrar no painel",
  instNavErrores: "Se algo não funcionar",
  instNavClave: "Esqueci minha senha",
  instNavRecorrido: "Passeio pelo painel",
  instNavSalir: "Sair",
  instNavFaq: "Perguntas frequentes",

  instEntrarTitle: "A tela de entrada",
  instEntrarLede1: "O painel se abre a partir de",
  instEntrarLede2:
    ", o link que está no menu do site. É uma tela dividida em duas: à esquerda a apresentação da Respira, à direita o formulário para entrar.",
  instMockEmailSample: "contato@suainstituicao.edu.br",
  instMockCaption:
    "Recriação simplificada da tela real, para orientar você — não é uma captura literal.",
  instEntrarBody1: "O formulário pede apenas dois dados:",
  instEntrarBodyEmail: "e-mail institucional",
  instEntrarBodyAnd: "e",
  instEntrarBodyPassword: "senha",
  instEntrarBody2:
    '. Não há caixas extras nem forma de "continuar conectado". Abaixo do botão você vai encontrar o link',
  instEntrarBody3: "e o e-mail de contato da equipe.",
  instEntrarCalloutLabel: "Um detalhe útil",
  instEntrarCalloutBody:
    'Se você já tem a sessão aberta e volta a este endereço, o sistema leva você direto ao seu painel — o formulário não aparece de novo. É de propósito, para que o botão "voltar" do navegador não devolva você a uma tela de entrada vazia.',

  instErroresTitle: "As mensagens que você pode ver ao tentar entrar",
  instErroresLede:
    "O sistema distingue quatro situações e mostra um aviso em vermelho, acima do formulário, sem recarregar a página:",
  instErroresCredsTitle: "E-mail ou senha errados",
  instErroresCredsBody:
    '"E-mail ou senha incorretos. Confira os dados e tente de novo." — nunca diz qual dos dois campos falhou, por segurança.',
  instErroresNoInstTitle: "A conta existe, mas não é de uma instituição",
  instErroresNoInstBody:
    '"Esta conta não tem acesso a um painel institucional." — acontece se você tentar com um e-mail que não foi cadastrado como instituição.',
  instErroresThrottledTitle: "Tentativas demais seguidas",
  instErroresThrottledBody:
    '"Tentativas demais. Espere alguns minutos antes de tentar de novo." — é uma proteção automática contra tentativas repetidas; se libera sozinha depois de um tempo.',
  instErroresServerTitle: "Algo falhou do lado do servidor",
  instErroresServerBody:
    '"Não conseguimos concluir a entrada. Tente de novo em alguns segundos." — vale tentar de novo antes de supor que é problema de credenciais.',

  instClaveTitle: "Se você esqueceu sua senha",
  instClaveLede:
    "Você mesma ou você mesmo pode recuperá-la, sem escrever para ninguém. O caminho completo são cinco passos:",
  instClaveStep1a: "Na tela de entrada, toque em",
  instClaveStep2a:
    "Escreva o e-mail da sua conta — o mesmo com que você entra no painel — e toque em",
  instClaveStep2b: "Enviar link",
  instClaveStep3:
    'Você vai ver a mensagem "Confira seu e-mail". Se esse endereço tiver uma conta na Respira, em alguns minutos chega um e-mail com o link. Se não aparecer, veja a pasta de spam.',
  instClaveStep4:
    "Abra o link do e-mail. Abre uma tela para escrever a senha nova duas vezes.",
  instClaveStep5:
    "Salve e volte para a entrada: a partir daí você entra com a senha nova, e a anterior deixa de funcionar.",
  instClaveCalloutLabel: "Sobre o link do e-mail",
  instClaveCalloutBody:
    "O link vence em 24 horas e pode ser usado uma única vez. Se venceu, se você já usou, ou se entrou com sua senha antiga nesse meio-tempo, a tela vai avisar que o link não vale mais e oferece pedir um novo. Pedir um novo também invalida o anterior.",
  instClaveRules:
    "A senha nova precisa ter pelo menos 10 caracteres e incluir uma letra, um número e um caractere especial. Se a que você escolheu não cumprir algo, a tela diz o que falta e você pode tentar de novo com o mesmo link.",
  instClavePrivacyLabel: "Por que a mensagem não confirma seu e-mail",
  instClavePrivacyBody:
    'A tela diz "se esse e-mail tiver uma conta" em vez de confirmar. É de propósito: assim, alguém de fora da sua instituição não pode usar este formulário para descobrir quais endereços estão registrados na Respira.',

  instRecorridoTitle: "Passeio pelo painel, seção por seção",
  instRecorridoLede:
    'Ao entrar corretamente você chega ao seu painel, sob o título "Estado do seu sensor". No topo há uma barra escura com o nome da sua instituição e o botão para sair; abaixo, todo o resto.',
  instScreenshotAlt:
    "Painel institucional da Respira: barra superior com o nome da instituição e o botão de sair; cartão de qualidade do ar com AQI 55 «Moderado» e recomendações do dia; cartão do sensor on-line com localização, última medição e contrato; gráfico do histórico de três meses com a linha do limite de alerta; lista de ações registradas ao lado do formulário para cadastrar uma nova; cartão de alertas com o limite e os grupos sensíveis; botões de download; e o bloco de contato.",
  instScreenshotCaption:
    "O painel real, com os dados de uma instituição de exemplo — os números, as datas e os textos que você vê dependem do seu sensor.",

  instAirTitle: "Qualidade do ar de hoje",
  instAirBody:
    'Mostra um número grande (o índice de qualidade do ar, ou AQI) com um emoji e uma categoria em palavras simples — "Bom", "Moderado", etc. — mais uma mensagem e uma lista de recomendações para aquele dia. Se seu sensor ainda não enviou nenhuma medição, no lugar você vai ler "Seu sensor ainda não reportou medições".',
  instSensorTitle: "Seu sensor",
  instSensorBody:
    'Um cartão com o estado do equipamento: "On-line" ou "Fora do ar", sua localização (cidade e coordenadas), quando chegou a última medição, e até quando o contrato da sua instituição está vigente. Se o sensor estiver fora do ar, esclarece: "O sensor não está enviando dados novos. Já estamos verificando o equipamento." — para você não se alarmar sem necessidade.',
  instHistoryTitle: "Histórico dos últimos 3 meses",
  instHistoryBody:
    'Um gráfico com a média diária de qualidade do ar e uma linha que marca o "limite de alerta". Precisa de pelo menos dois dias de medições para aparecer; antes disso, lê-se "Ainda não há histórico".',
  instActionsTitle: "Ações registradas",
  instActionsBody:
    'É o histórico do que sua instituição foi fazendo diante do ar (por exemplo, suspender o recreio ou avisar as famílias). Cada entrada tem data, hora, uma nota, e se respondeu a um alerta específico. Há um botão "Ver mais ações" para carregar mais, e ao lado um pequeno formulário para cadastrar uma nova: você escolhe opcionalmente se responde a um alerta, escreve o que fizeram, e salva — a data e a hora se preenchem sozinhas.',
  instAlertsTitle: "Alertas",
  instAlertsBody:
    'Mostra se os alertas estão ativos ou não, a partir de que nível de poluição um deles dispara ("X AQI ou mais") e quais grupos sensíveis estão configurados (por exemplo, pessoas com asma). É só para consulta: não há botões para mudar esta configuração pelo painel. Se quiser modificá-la, o link "Solicitar mudanças" monta um e-mail já redigido para a equipe da Respira.',
  instDownloadsTitle: "Downloads",
  instDownloadsBody:
    'Dois botões: "Relatório mensal (PDF)" e "Histórico bruto (Excel)".',
  instDownloadsCalloutLabel: "Estado atual",
  instDownloadsCalloutBody:
    'Estes dois downloads ainda não estão disponíveis do lado do servidor. Hoje, ao pressioná-los, você vai ver "Este download ainda não está disponível."',
  instContactTitle: "Seu contato na Respira",
  instContactBody:
    'No fim do painel, um bloco com o e-mail de contato e um lembrete: "Escreva para nós se o sensor aparecer fora do ar por mais de 24 horas."',

  instSalirTitle: "Sair",
  instSalirBody:
    'O botão "Sair" fica sempre no alto à direita, em qualquer tela do painel. Um clique e você volta para a entrada. Se por algum motivo não for possível encerrar a sessão, o botão muda para "Tentar de novo" e aparece o aviso "Não conseguimos encerrar a sessão."',

  instFaqTitle: "Perguntas frequentes",
  instFaqQ1: "Como recupero minha senha se eu esquecer?",
  instFaqA1a: "Em",
  instFaqA1b: ", na tela de entrada. O passo a passo está em",
  instFaqA1Link: "Se você esqueceu sua senha",
  instFaqA1c: ". Não é preciso escrever para a equipe.",
  instFaqQ2: "Posso mudar o limite dos meus alertas por conta própria?",
  instFaqA2:
    'Não pelo painel. Você pode pedir por e-mail com o botão "Solicitar mudanças" — a mudança em si é feita pela equipe da Respira.',
  instFaqQ3: "O que eu vejo se minha instituição ainda não tem sensor?",
  instFaqA3:
    'O painel abre do mesmo jeito, mas no lugar dos dados diz "Sua instituição ainda não tem sensor atribuído" e explica que o painel se ativa sozinho assim que o equipamento for instalado.',
  instFaqQ4: "E se a sessão vencer enquanto eu estiver olhando o painel?",
  instFaqA4:
    'Aparece "Sua sessão expirou — Entre de novo para continuar vendo seu painel" com um botão "Ir para a entrada".',
  instFaqQ5: "Onde está o guia para administradores?",
  instFaqA5a: "Em",
  instFaqA5Link: "Guia para administradores",
  instFaqA5b:
    ". É para a equipe que cadastra instituições pelo backoffice, não para as instituições.",

  // --- Administrators guide ------------------------------------------------
  adminEyebrow: "Guia de uso · Administradores",
  adminTitle: "Cadastro de uma instituição, do zero ao painel ativo",
  adminDek:
    "Como criar uma instituição no backoffice da Respira, associar um usuário e uma estação, e confirmar que o painel dela funciona.",
  adminMeta1: "Para a equipe interna da Respira",
  adminMeta2: "Requer uma conta com permissões no backoffice",

  adminNavAdmin: "Entrar no admin",
  adminNavInstitucion: "Criar a instituição",
  adminNavUsuario: "Associar um usuário",
  adminNavAlertas: "Configurar alertas",
  adminNavEstacion: "Associar uma estação",
  adminNavVerificar: "Verificar o painel",
  adminNavClave: "Recuperar sua senha",
  adminNavErrores: "Se algo não der certo",

  adminAdminTitle: "Entrar no admin",
  adminAdminLede1: "O",
  adminAdminLedeAdmin: "admin",
  adminAdminLede2:
    "é a interface de trabalho interna da Respira: uma série de formulários web onde a equipe cria e edita os dados do sistema — instituições, usuários, estações. É diferente do",
  adminAdminLedePanel: "painel institucional",
  adminAdminLede3: ", que é o que o cliente final vê e está explicado no",
  adminAdminLedeLink: "guia para instituições",
  adminAdminLede4:
    ". Pense no admin como os bastidores, e no painel como a vitrine.",
  adminAdminStep1: "Abra o admin no seu navegador:",
  adminAdminStep2a: "Você vai ver uma tela com dois campos:",
  adminAdminStep2Email: "e-mail",
  adminAdminStep2And: "e",
  adminAdminStep2Password: "senha",
  adminAdminStep2b:
    ". Escreva as credenciais da sua conta e pressione o botão de login.",
  adminAdminStep3a:
    "Se tudo deu certo, você entra na tela principal: uma lista de seções agrupadas em",
  adminAdminStep3b: "e",
  adminAdminStep3c:
    ". Essa é sua base de operações para tudo o que vem a seguir.",
  adminHomeAlt:
    "Tela principal do admin da Respira. À esquerda, a lista de seções agrupadas em Accounts (Roles, Users) e Api (Action logs, Institution alerts, Institution contracts, Institutions, Sensitive groups, Stations, entre outras), cada uma com um link «Add». No alto à direita, os links para ver o site, mudar a senha e sair.",
  adminHomeCaption1:
    "A tela principal do admin. As seções que você vai usar neste guia estão todas em",
  adminHomeCaption2: ".",
  adminNoAccount: "Ainda não tem conta? Há dois caminhos:",
  adminSuperuser1: "Um",
  adminSuperuserWord: "superusuário",
  adminSuperuser2: "sempre pode entrar e vê tudo. Cria-se rodando",
  adminSuperuser3: ", ou de forma reproduzível com",
  adminSuperuser4: "(usa as variáveis de ambiente",
  adminSuperuser5: ").",
  adminRole1: "Uma conta com papel",
  adminRoleOr: "ou",
  adminRole2:
    "basta para o que este guia cobre — mas só funciona se alguém já rodou",
  adminRole3: "depois de atribuir esse papel.",
  adminAdminCalloutLabel: "O que mais trava",
  adminAdminCallout1: "Mudar o campo",
  adminAdminCallout2: "de um usuário em",
  adminAdminCallout3:
    "não dá permissões por si só — é apenas um rótulo. As permissões reais vivem em grupos que o",
  adminAdminCallout4:
    'sincroniza. Se você entrou no admin mas não vê o botão "Add" em Institutions, esse é o primeiro suspeito.',

  adminInstTitle: "Criar a instituição",
  adminInstLede:
    "É o registro raiz: todo o resto — o usuário que entra no painel, a estação, os alertas — depende desta instituição.",
  adminInstAlt:
    "Formulário «Add institution» do admin, preenchido. No alto, os campos Legal name, Display name e Institution type; depois os blocos Contact (nome, e-mail e telefone), Location (endereço e cidade) e Notes. Mais abaixo, a seção «Dashboard users» com um seletor de usuário e o link «Add another Dashboard user», e a seção «Institution alert config» com a caixa «Is enabled», o campo «Alert threshold» e o seletor de lista dupla de grupos sensíveis. No pé, os botões Save.",
  adminInstCaption:
    "Um único formulário cobre três coisas: os dados da instituição, o usuário que vai entrar no painel e a configuração de alertas.",
  adminRequired: "Obrigatório.",
  adminFieldLegalName: "Razão social da instituição.",
  adminFieldDisplayName: "Nome curto para exibir. Opcional.",
  adminFieldType: "Tipo de instituição. Opcional.",
  adminFieldContact: "Dados do contato. Opcionais.",
  adminFieldLocation: "Localização. Opcionais.",
  adminFieldNotes: "Notas internas. Opcional.",
  adminInstAfter1: "Salve o formulário só com",
  adminInstAfter2:
    "e a instituição já existe — o resto pode ser preenchido depois. Não é preciso sair desta tela para os dois passos seguintes: são seções deste",
  adminInstAfterSame: "mesmo formulário",

  adminUserTitle: "Associar um usuário — é isto que dá acesso ao painel",
  adminUserLede:
    "Sem este passo a instituição existe mas ninguém consegue entrar no painel dela.",
  adminUserStep1a: "Na mesma página da instituição, desça até a seção",
  adminUserStep2a: "Use o buscador para escolher um",
  adminUserStep2b: "que já exista. Se ainda não existir, crie antes em",
  adminUserStep2c: "e volte.",
  adminUserStep3:
    "Salve o formulário de Institution — o vínculo é criado junto com o resto dos dados.",
  adminUserCalloutLabel: "Como funciona o acesso",
  adminUserCallout1: "Esse usuário",
  adminUserCalloutBold: "não precisa ser staff nem ter papel de admin",
  adminUserCallout2:
    ". O único requisito para entrar no painel institucional é ter este vínculo. É uma relação um para um: um usuário pertence no máximo a uma instituição por vez.",
  adminUserCalloutSave: "Guarde o e-mail dele",
  adminUserCallout3: "— você vai usar na verificação final.",

  adminAlertsTitle: "Configurar alertas — opcional",
  adminAlertsLede:
    "Só se a instituição for usar o sistema de alertas por grupos sensíveis.",
  adminAlertsBody1: "Mesma página, seção",
  adminAlertsBody2:
    ". Ative a caixa, defina o limite de AQI a partir do qual um alerta dispara, e escolha os grupos sensíveis no seletor de lista dupla. Pode ser omitido por completo sem bloquear os passos seguintes.",

  adminStationTitle: "Associar uma estação",
  adminStationLede:
    "Esta é a parte que conecta com o pipeline de dados — mas pelo admin é só mais um formulário.",
  adminContractAlt:
    "Formulário «Add institution contract» do admin, com os campos Institution e Station como buscadores, o menu Contract status com as opções draft, active, expired e cancelled, as datas Start date e End date, o campo Monthly fee e o campo Signed contract url.",
  adminContractCaption:
    "O contrato é o que liga a instituição ao sensor dela: sem ele, o painel abre mas não tem dados para mostrar.",
  adminFieldInstitution: "Escolhe-se com o buscador.",
  adminFieldStation: "Busca-se por nome ou por",
  adminFieldContractStatus: "draft / active / expired / cancelled.",
  adminFieldOptional: "Opcionais.",
  adminStationCalloutLabel: "Uma restrição que convém saber de antemão",
  adminStationCallout1: "Instituição e estação são",
  adminStationCalloutBold: "um para um nos dois sentidos",
  adminStationCallout2:
    ": uma instituição só pode ter um contrato, e uma estação só pode estar ligada a uma instituição. Se precisar reatribuir uma estação, primeiro é preciso apagar ou expirar o contrato anterior.",
  adminStationCode1: "O campo",
  adminStationCode2:
    "da estação é somente leitura aqui — quem o gera é o pipeline de dados, não se edita por este formulário.",

  adminVerifyTitle: "Verificar que o painel funciona",
  adminVerifyLede:
    "Você já tem a instituição, o usuário dela e a estação. A verificação é entrar como se fosse essa instituição e ver que carrega os próprios dados.",
  adminVerifyStep1a: "Abra",
  adminVerifyStep1b: "pelo menu do site, ou diretamente",
  adminVerifyStep2a: "Entre com o",
  adminVerifyStep2Bold: "e-mail e a senha do usuário que você associou",
  adminVerifyStep2b:
    "— não com sua conta de admin. Uma conta de backoffice sem esse vínculo não entra aqui, mesmo com credenciais corretas.",
  adminVerifyStep3:
    "Você deve cair no painel e ver o nome da instituição na barra superior, com o sensor, o AQI do dia e o histórico carregados. Isso confirma que os cinco passos anteriores ficaram certos.",
  adminVerifyAfter1:
    "Se quiser saber o que exatamente a instituição vai ver ao entrar, o passeio completo pelo painel está no",
  adminVerifyAfter2: ".",

  adminClaveTitle: "Recuperar sua senha de administrador",
  adminClaveLede:
    "Se você perdeu o acesso ao admin, não é preciso que outra pessoa o redefina.",
  adminClaveStep1a: "Em",
  adminClaveStep1b: ", toque em",
  adminClaveStep1Bold: '"Forgotten your password or username?"',
  adminClaveStep1c: ", abaixo do formulário.",
  adminClaveStep2: "Escreva o e-mail da sua conta e envie.",
  adminClaveStep3:
    "Você vai receber um e-mail com um link. Abra e escolha a senha nova, duas vezes.",
  adminClaveStep4a: "Volte a",
  adminClaveStep4b: "e entre com a nova.",
  adminClaveCalloutLabel: "O que convém saber",
  adminClaveCallout1:
    "O link vence em 24 horas e pode ser usado uma única vez; voltar a entrar com a senha antiga também o invalida. O formulário não diz se o e-mail existe ou não — é para que ninguém possa usá-lo para descobrir quais contas existem.",
  adminClaveCallout2a: "As telas de recuperação ficam em",
  adminClaveCallout2b:
    ", então estão atrás da mesma lista de IPs permitidos que o resto do backoffice: se o admin não abre de onde você está, o link do e-mail também não vai abrir.",
  adminClaveAfter1:
    "As instituições têm o fluxo próprio delas, pela tela de entrada do painel — está explicado no",
  adminClaveAfter2: ".",

  adminErroresTitle: "Se algo não der certo",
  adminError1Label: "O usuário não entra, mesmo com a senha correta",
  adminError1a:
    "Falta o vínculo com a instituição, ou ficou associado a outra. Volte ao passo",
  adminError1Link: "Associar um usuário",
  adminError1b:
    'e revise a seção "Dashboard users". Cuidado também com usar por engano uma conta de backoffice: ter permissões em',
  adminError1c: "não dá acesso ao painel institucional.",
  adminError2Label: "O painel abre mas diz que não há sensor atribuído",
  adminError2a: "A instituição não tem contrato. Volte ao passo",
  adminError2Link: "Associar uma estação",
  adminError3Label: "A conta ficou bloqueada após várias tentativas",
  adminError3:
    "A entrada no painel compartilha a proteção do admin: 5 tentativas falhas bloqueiam a conta por 1 hora. Se for testar credenciais inválidas de propósito, não repita mais de 4 vezes seguidas com o mesmo usuário.",
  adminError4Label: "O painel abre mas o histórico está vazio",
  adminError4:
    "A estação existe e o contrato também, mas o sensor ainda não reportou medições — ou reportou menos de dois dias. O gráfico aparece só quando há pelo menos dois dias de dados.",
};

export const guides = { es, en, pt } as const;

/** Guide copy for `lang`, falling back to Spanish per missing key. */
export function useGuideCopy(lang: Lang): Translation {
  const dictionary = guides[lang];
  if (!dictionary || dictionary === guides[DEFAULT_LANG]) {
    return guides[DEFAULT_LANG];
  }
  return { ...guides[DEFAULT_LANG], ...dictionary };
}
