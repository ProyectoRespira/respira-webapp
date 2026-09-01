import type { Lang } from "./config";
import type { AQILevelId } from "../data/cards";

// Translation dictionaries.
// `es` is the source of truth: its shape defines `UI`, and `en`/`pt` must match it.
// Keys are grouped by section (nav, footer, home, about, ...).

const es = {
  // Navigation / menu (keyed by the menu item `id`)
  "nav.alerts": "Recibir alertas",
  "nav.contact": "Contacto",
  "nav.us": "Sobre nosotros",
  "nav.research": "Recursos",
  "nav.data": "Datos",
  "nav.join": "Únete a la red",
  "nav.map": "Mapa",
  // Entry point to the private institutional area. Kept in the public
  // dictionary because the link itself lives in the public chrome — the panel
  // behind it is Spanish-only (see `i18n/institution.ts`).
  "nav.institution": "Acceso institucional",

  "nav.language": "Idioma",

  // Footer
  "footer.collaboration": "Una colaboración de",
  "footer.writeUs": "Escribinos a",
  "footer.followUs": "Seguinos en",
  "footer.joinSlack": "Unite a nuestra comunidad de Slack",
  "footer.resources": "Recursos",
  "footer.resources.map": "Mapa",
  "footer.resources.research": "Investigaciones y recursos",
  "footer.resources.github": "Github",
  "footer.project": "El proyecto",
  "footer.project.about": "Sobre el proyecto",
  "footer.project.contact": "Contacto",
  "footer.institutions": "Para instituciones",
  "footer.institutions.login": "Acceso institucional",
  "footer.institutions.guideInstitution": "Guía para instituciones",
  "footer.institutions.guideAdmin": "Guía para administradores",

  // Home
  "home.intro.particles":
    "La contaminación por partículas puede ocasionar problemas de salud graves, como ataques de asma, ataques cardíacos, derrames cerebrales y una muerte temprana.",
  "home.intro.anytime":
    "La contaminación por partículas puede ser un problema en cualquier momento del año.",
  "home.intro.forecast":
    "¡Puede reducir la exposición a la contaminación y aún hacer ejercicio! Utilice los pronósticos diarios del Índice de Calidad del Aire (AQI) de esta web para planear sus actividades al aire libre.",
  "home.aqi.title": "Índice de calidad del aire (AQI)",
  "home.aqi.source": "Via fuente",
  "home.recommendations": "Recomendaciones por nivel",

  // Home — "Sumate a la red" CTA section
  "home.cta.title": "Sumate a la red de sensores Respira",
  "home.cta.subtitle":
    "Ayudanos a monitorear la calidad del aire en más comunidades, escuelas, instituciones y hogares.",
  "home.cta.point1": "Contribuí con datos abiertos y de calidad.",
  "home.cta.point2": "Impulsá decisiones para un aire más limpio y saludable.",
  "home.cta.point3": "Tu sensor puede hacer la diferencia en tu comunidad.",
  "home.cta.button": "Quiero tener un sensor",
  "home.cta.learnMore": "Conocé más sobre la red Respira",
  "home.cta.note.title":
    "Instituciones, organizaciones o personas: solicitá instalar un sensor",
  "home.cta.note.subtitle":
    "Completá el formulario y nuestro equipo te contactará.",

  // Join the network (unete)
  "join.breadcrumb.home": "Inicio",
  "join.breadcrumb.current": "Únete a la red",
  // Service model. This copy is approved commercial content: it must match the
  // "Borrador de contenido — /unete" document word for word. Do not reword it
  // when translating either; `en` and `pt` are direct translations of `es`.
  "join.how.title": "¿Cómo funciona Respira?",
  "join.how.p1":
    "Instalamos el sensor, vos accedés al servicio. Respira brinda un servicio de monitoreo y pronóstico de calidad del aire mediante una plataforma que integra sensores, datos ambientales e inteligencia artificial.",
  "join.how.p2":
    "El sensor se instala en comodato: forma parte del servicio y sigue siendo de Respira durante todo el contrato. Tu institución invierte en una suscripción mensual que incluye el sensor instalado, el mantenimiento, el acceso a la plataforma (web y app), los pronósticos, las alertas y el soporte técnico.",
  "join.how.imageAlt": "Sensor de calidad del aire de Proyecto Respira",

  "join.price.title": "¿Cuánto cuesta?",
  "join.price.intro":
    "No hay un precio único: el sensor recomendado y el costo del servicio dependen de tu institución y del lugar donde lo vas a instalar. Por eso el proceso es así:",
  "join.price.step1.title": "Contanos sobre tu institución.",
  "join.price.step1.desc":
    "Completá el formulario con el tipo de institución (colegio, universidad, empresa, municipio, hogar, espacio comunitario), su tamaño aproximado y quién aprueba el presupuesto.",
  "join.price.step2.title": "Evaluamos tu caso.",
  "join.price.step2.desc":
    "Analizamos la ubicación, la cantidad de personas alrededor, el acceso a conectividad y para qué vas a usar la información — esos factores determinan el sensor más adecuado y el área de cobertura real.",
  "join.price.step3.title": "Te recomendamos el sensor ideal.",
  "join.price.step3.desc":
    "Por ejemplo: sensores con conexión Wi-Fi para espacios urbanos, o sensores con panel solar y autocalibración para zonas remotas sin conectividad.",
  "join.price.step4.title": "Te enviamos una propuesta comercial.",
  "join.price.step4.desc":
    "Con el costo mensual del servicio según tu instalación específica.",
  "join.price.step5.title": "Instalamos y arrancamos.",
  "join.price.step5.desc":
    "La instalación está a cargo de un proveedor externo y, una vez lista, tu institución ya puede ver su información en la plataforma.",

  "join.includes.title": "Qué incluye el servicio mensual",
  "join.includes.sensor":
    "Sensor instalado y en funcionamiento (provisto por Respira, sin costo de compra).",
  "join.includes.monitoring":
    "Monitoreo de calidad del aire en tiempo real (material particulado PM2.5 y PM10).",
  "join.includes.forecast":
    "Pronóstico de calidad del aire a 6–12 horas mediante inteligencia artificial.",
  "join.includes.platform": "Plataforma web y aplicación móvil.",
  "join.includes.alerts":
    "Alertas y notificaciones cuando el aire empeora en tu zona.",
  "join.includes.dashboard":
    "Dashboard con recomendaciones accionables, no solo números.",
  "join.includes.report":
    "Reporte mensual descargable, listo para compartir con familias, el consejo directivo o el equipo.",
  "join.includes.support": "Mantenimiento y soporte técnico del sensor.",
  "join.includes.standards":
    "Los sensores siguen los estándares de la EPA y la OMS, con respaldo del MADES. Miden material particulado; la medición de gases requiere un sensor de mayor gama y se evalúa caso por caso.",

  "join.segments.title": "Beneficios según tu tipo de institución",
  "join.segments.education.title": "Escuelas y universidades",
  "join.segments.education.desc":
    "Entornos de aprendizaje más seguros, información para decidir sobre actividades al aire libre, y un reporte mensual que podés compartir con familias y autoridades.",
  "join.segments.business.title": "Empresas e industrias",
  "join.segments.business.desc":
    "Monitoreo continuo y datos confiables para fortalecer el cumplimiento ambiental y la estrategia de sostenibilidad.",
  "join.segments.production.title":
    "Sector productivo (ganadería, construcción, agroindustria)",
  "join.segments.production.desc":
    "Información para tomar decisiones operativas — por ejemplo, ante humo de incendios forestales o quema de residuos cerca de tu producción.",
  "join.segments.public.title": "Municipios e instituciones públicas",
  "join.segments.public.desc":
    "Datos abiertos y en tiempo real para fortalecer políticas públicas y la gestión ambiental del territorio.",
  "join.segments.families.title": "Familias y comunidad",
  "join.segments.families.desc":
    "Información confiable para proteger la salud de quienes tienen afecciones respiratorias, asma o alergias.",

  "join.next.title": "¿Qué pasa después?",
  "join.next.desc":
    "Nuestro equipo evaluará tu solicitud y te contactará para conversar sobre los próximos pasos.",
  "join.form.title": "Formulario de interés",
  "join.form.subtitle":
    "Completá tus datos y contanos cómo te gustaría participar.",
  "join.form.name": "Nombre completo",
  "join.form.namePlaceholder": "Ej: María Pérez",
  "join.form.email": "Correo electrónico",
  "join.form.emailPlaceholder": "Ej: ejemplo@correo.com",
  "join.form.phone": "Teléfono / WhatsApp",
  "join.form.phonePlaceholder": "Ej: +595 98 123 4567",
  "join.form.organization": "Institución u organización (si aplica)",
  "join.form.organizationPlaceholder": "Ej: Colegio San José",
  "join.form.city": "Ciudad / Localidad",
  "join.form.cityPlaceholder": "Ej: Asunción",
  "join.form.department": "Departamento",
  "join.form.departmentPlaceholder": "Seleccioná...",
  "join.form.size": "Tamaño aproximado",
  "join.form.sizePlaceholder": "Ej: 450 personas",
  "join.form.approver": "Quién aprueba el presupuesto",
  "join.form.approverPlaceholder": "Ej: Dirección administrativa",
  // The six types the price section promises the form will ask for.
  "join.form.institutionType": "Tipo de institución",
  "join.form.institutionType.school": "Colegio",
  "join.form.institutionType.university": "Universidad",
  "join.form.institutionType.company": "Empresa",
  "join.form.institutionType.municipality": "Municipio",
  "join.form.institutionType.home": "Hogar",
  "join.form.institutionType.community": "Espacio comunitario",
  "join.form.message": "Contanos más sobre tu interés o motivación",
  "join.form.messagePlaceholder":
    "Ej: Queremos monitorear la calidad del aire en nuestra escuela para un proyecto ambiental...",
  "join.form.consent":
    "Acepto que Respira use mis datos para contactarme sobre la red de sensores.",
  "join.form.submit": "Enviar formulario",
  "join.form.privacy":
    "Tus datos están protegidos. No compartimos tu información con terceros.",
  "join.form.success":
    "¡Gracias! Recibimos tu solicitud. Nuestro equipo te contactará pronto.",
  "join.form.error":
    "Hubo un error enviando el formulario. Intentá nuevamente.",

  // About (nosotros)
  "about.title": "Sobre Proyecto Respira",
  "about.p1":
    "Ofrecemos al público pronósticos sobre la Calidad del Aire en Asunción y su área metropolitana mediante el uso de mapas interactivos en nuestra página web, y alertas diarias en nuestros canales de Telegram y X (Twitter).",
  "about.p2":
    "Además de proporcionar predicciones actualizadas sobre la calidad del aire, proveemos estadísticas, noticias locales sobre incendios y datos abiertos sobre la calidad del aire en la ciudad desde el año 2019, provenientes de la Red de Monitoreo de Calidad del Aire de la Facultad de Ingeniería de la Universidad Nacional de Asunción.",
  "about.p3":
    "Nuestras tecnologías open-source brindan a los ciudadanos información clave para tomar decisiones informadas sobre su salud y el medio ambiente, al tiempo que fomentan la colaboración comunitaria para mejorar continuamente su funcionalidad y utilidad.",
  "about.protectLink": "¿Cómo puedo protegerme de la contaminación?",
  "about.forecasts.title": "¿Para qué sirven los pronósticos?",
  "about.forecasts.p1":
    "Muchos de nosotros miramos a diario el pronóstico del tiempo para tomar decisiones sobre nuestro día a día. Por ejemplo, si el pronóstico marca lluvia, salimos de casa con un paraguas, o si el día estará muy caluroso, evitamos exponernos al sol en horas del mediodía.",
  "about.forecasts.p2":
    "De la misma forma, el pronóstico de la Calidad del Aire sirve para que las personas puedan tomar acción acerca de cómo proteger su salud durante eventos de alta contaminación, ya sea evitando actividades físicas extenuantes, prestando atención a síntomas de fatiga o cerrando ventanas y puertas de nuestros hogares para evitar que el aire contaminado ingrese.",
  "about.why.title": "¿Por qué es necesario este proyecto?",
  "about.why.p1":
    "En Asunción, cada año se reportan más días donde frentes de humo provenientes de incendios forestales y quemas agrarias ingresan a la ciudad, elevando los niveles de contaminación en el aire que respiramos. Los incendios forestales no son la única fuente de contaminación del aire que afecta a la ciudad. Prácticas endémicas como la quema de basura y el amplio uso de vehículos con combustibles Diésel de baja calidad afectan la calidad de nuestro aire, y por ende la calidad de vida de la población paraguaya.",
  "about.why.p2":
    "Ante esta realidad, los ciudadanos nos encontramos desprotegidos de los efectos nocivos de la contaminación del aire. La contaminación del aire causa una serie de problemas de salud, tales como:",
  "about.why.health.earlyDeath": "Muerte temprana",
  "about.why.health.cough": "Tos",
  "about.why.health.lung": "Afectación de la función pulmonar",
  "about.why.health.asthma": "Ataques de asma",
  "about.why.health.heart": "Cardiopatías",
  "about.why.health.stroke": "Derrames cerebrales",
  "about.why.p3":
    "Este proyecto busca brindar a los ciudadanos herramientas para tomar acción y protegerse ante los efectos nocivos de la contaminación del aire. Además, queremos visibilizar esta problemática y encender el debate ciudadano acerca de cómo nuestras autoridades pueden promover iniciativas que combatan la contaminación del aire en Paraguay y aseguren el bienestar de todos los paraguayos.",
  "about.openSource.line1": "Nuestro proyecto es Open Source!",
  "about.openSource.line2": "Accede a nuestro repositorio en GitHub",
  "about.openSource.cta": "Ir al repositorio",
  "about.collaborators": "Colaboradores",
  "about.organizations": "Organizaciones",

  // Contact (contacto)
  "contact.title": "Contactános",
  "contact.subtitle":
    "Estamos felices de que nos quieras enviar un saludo una consulta por datos o algún mail en particular.",
  "contact.name": "Nombre",
  "contact.namePlaceholder": "Nombre",
  "contact.lastname": "Apellido",
  "contact.lastnamePlaceholder": "Apellido",
  "contact.email": "Correo",
  "contact.emailPlaceholder": "Correo",
  "contact.motive": "Motivo",
  "contact.motive.data": "Solicitar datos de la red",
  "contact.motive.research": "Colaboración en investigación",
  "contact.motive.internship": "Información sobre pasantías (FIUNA)",
  "contact.motive.highAqi": "Qué hacer en caso de AQI muy altos",
  "contact.motive.health": "Pedido sobre información de Salud",
  "contact.message": "Mensaje",
  "contact.messagePlaceholder": "Escribe tu mensaje...",
  "contact.maxChars": "*Máximo número de carácteres es 800",
  "contact.submit": "Enviar",
  "contact.errorAlert": "Hubo un error enviando el mail",
  "contact.successAlert": "Mensaje enviado!",

  // Resources (recursos)
  "resources.dataSourceLabel": "¿De dónde son nuestros datos?",
  "resources.dataSourceTitle":
    "Red de Monitoreo de la Calidad del Aire - FIUNA",
  "resources.dataSource.p1":
    "La Red de Monitoreo de la Calidad del Aire de la Facultad de Ingeniería de la Universidad Nacional de Asunción (FIUNA) es un proyecto financiado por la CONACYT que comprende la instalación y mantenimiento de una red de sensores de calidad del aire en el área metropolitana de Asunción. Sus diez estaciones de monitoreo recolectan desde el año 2019 mediciones de Material Particulado (MP) y parámetros climáticos como temperatura, humedad y presión atmosférica.",
  "resources.dataSource.p2":
    "Los datos recolectados por esta red alimentan los datos de monitoreo y pronóstico de calidad del aire de Proyecto Respira, y han sido utilizados para realizar investigaciones de alto impacto sobre el problema de la calidad del aire en nuestra región.",
  "resources.research.title": "Investigaciones realizadas",
  "resources.external.title": "Recursos Externos",
  "resources.external.epa":
    "Guía de la calidad del aire. Agencia de Protección Ambiental de Estados Unidos",
  "resources.external.pho": "(OPS) Organización Panamericana de la Salud",
  "resources.external.who": "(OMS) Organización Mundial de la Salud",
  "resources.external.aireLibre": "Aire Libre",

  // FAQ (recursos). The questions themselves live in `data/faq.ts`.
  "faq.badge": "Sensor Leasing",
  "faq.heroImageAlt":
    "Sensor de calidad del aire de Proyecto Respira, con su panel solar y el logo respira",
  "faq.title": "Preguntas Frecuentes",
  "faq.subtitle":
    "Respondemos las dudas más comunes sobre el alquiler de sensores de calidad del aire: costos, instalación, mantenimiento y cómo tu institución puede empezar a monitorear hoy.",
  "faq.nav.label": "Categorías de preguntas frecuentes",
  "faq.search.label": "Buscar en preguntas frecuentes",
  "faq.search.placeholder": "Buscar en preguntas frecuentes...",
  // {q} is replaced with the text the visitor typed.
  "faq.search.empty": 'No encontramos preguntas que coincidan con "{q}".',
  // {n} is replaced with the number of matches.
  "faq.search.results.one": "1 pregunta encontrada",
  "faq.search.results.many": "{n} preguntas encontradas",
  "faq.edu.title": "Aprendé lo esencial",
  "faq.edu.subtitle":
    "Contenido educativo sobre calidad del aire, pensado para escuelas y familias.",
  "faq.cta.title": "¿Todavía tenés preguntas?",
  "faq.cta.subtitle":
    "Nuestro equipo puede ayudarte a evaluar si Sensor Leasing es la opción correcta para tu institución.",
  "faq.cta.primary": "Solicitar información",
  "faq.cta.secondary": "Agendar demo",
  // Alerts (alertas)
  "alerts.goToMap": "Ir al mapa",

  // Statistics (datos)
  "stats.title": "Estadísticas",
  "stats.historic.title": "Mediciones históricas de calidad de aire (AQI)",
  "stats.historic.subtitle":
    "Mediciones de calidad de aire grabadas por los sensores y predicciones de las próximas 6 y 12 horas.",
  "stats.boxplot.title": "Histórico: Índice de calidad del aire",
  "stats.boxplot.subtitle": "Historial de mediciones de los sensores.",
  "stats.boxplot.lastWeek": "Última semana",
  "stats.boxplot.lastMonth": "Último mes",
  "stats.boxplot.lastYear": "Último año",

  // Statistics — React islands (datos page)
  "stats.station": "Estación",
  "stats.characteristics": "Características",
  "stats.locality": "Localidad",
  "stats.region": "Región",
  "stats.status": "Estado",
  "stats.active": "Activo",
  "stats.lastAqi": "Última medición AQI",
  "stats.chart.realMeasurement": "Medición real",
  "stats.chart.forecast6h": "Predicción 6 horas",
  "stats.chart.forecast12h": "Predicción 12 horas",
  "stats.loading": "Cargando...",
  "stats.chartError": "Error cargando el gráfico",
  "stats.boxplot.summary": "Resumen",
  "stats.boxplot.mean": "Media",
  "stats.boxplot.quantiles": "Cuantiles",

  // Map / Card / Modals (React islands)
  "common.recommendations": "Recomendaciones",
  "card.howIsAir": "¿Cómo está el aire ahora?",
  "card.forecast": "Pronóstico",
  "card.next6h": "Próximas 6 hs",
  "card.next12h": "Próximas 12 hs",
  "card.backendError": "No pudimos conectarnos con el servicio",
  "card.generalMean": "Media General",
  "card.share": "Compartir",
  "card.noDataTitle": "Sin datos disponibles",
  "card.noActiveStations":
    "No hay sensores activos en esta zona por el momento. Podés navegar el mapa y elegir otra región.",
  "card.noAqi": "Sin medición de calidad del aire disponible.",
  "chart.noForecast": "Sin pronóstico disponible",
  "map.loading": "Cargando mapa…",
  "map.mean": "Media",
  "map.viewStats": "Ver estadísticas",
  "recommendations.sensitiveQuestion": "¿Quiénes son las personas sensibles?",
  "recommendations.selectLevel": "Seleccionar nivel",
  "recommendations.group.older": "Adultos mayores",
  "recommendations.group.heartCondition": "Personas con enfermedades cardíacas",
  "recommendations.group.kids": "Niños y niñas",
  "recommendations.group.lungDisease": "Personas con enfermedades pulmonares",
  "recommendations.group.babies": "Bebés y embarazadas",
  "recommendations.group.diabetes": "Personas con diabetes",
  "share.title": "Compartí el link",
  "share.linkLabel": "Link de la página",

  // Social alert cards (Telegram / X)
  "telegram.title": "Alertas vía Telegram",
  "telegram.description":
    "Recibí alertas automáticas en tu Telegram ingresando a nuestro grupo de Alertas.",
  "twitter.title": "Alertas vía X (Twitter)",
  "twitter.descBefore": "Encontranos como",
  "twitter.descAfter": "en X para seguir nuestras mediciones",
  "twitter.cta": "Ir a X",

  // AQI levels (cards) — keyed by AQI card id
  "aqi.good.title": "Bueno",
  "aqi.good.description":
    "¡Es un día excelente para realizar actividades al aire libre!",
  "aqi.moderate.title": "Moderado",
  "aqi.moderate.description":
    "Las personas sensibles pueden presentar síntomas como tos o dificultad para respirar y deben seguir las precauciones habituales pero es un buen día para realizar actividades al aire libre.",
  "aqi.unhealthySensitive.title": "Insalubre para grupos sensibles",
  "aqi.unhealthySensitive.description":
    "Las personas sensibles pueden presentar síntomas y deben seguir las precauciones habituales para manejar.",
  "aqi.unhealthy.title": "Insalubre",
  "aqi.unhealthy.description":
    "Todos debemos limitar actividades al aire libre. Las personas sensibles deben evitar las actividades al aire libre y reprogramar cualquier evento al aire libre.",
  "aqi.veryUnhealthy.title": "Muy Insalubre",
  "aqi.veryUnhealthy.description":
    "Traslade a un lugar cerrado las actividades innecesarias. Todos debemos evitar actividades al aire libre extenuantes y prolongadas. Reprograme actividades al aire libre.",
  "aqi.hazardous.title": "Peligroso",
  "aqi.hazardous.description":
    "Todos debemos evitar las actividades al aire libre innecesarias por completo. Permanezca adentro y mantenga un nivel de actividad bajo.",

  // Common
  "common.backToTop": "Volver arriba",

  // App download banner
  "app.download.appStoreLabel": "Descargá en la",
  "app.download.playStoreLabel": "Disponible en",
  "app.download.title": "Descargá la app de Proyecto Respira",
  "app.download.description":
    "Consultá la calidad del aire desde tu celular y agregá el widget para ver el AQI al instante desde tu pantalla principal, sin abrir la app.",
} as const;

export type UIKey = keyof typeof es;
type Dictionary = Record<UIKey, string>;

const en: Dictionary = {
  "nav.alerts": "Get alerts",
  "nav.contact": "Contact",
  "nav.us": "About us",
  "nav.research": "Resources",
  "nav.data": "Data",
  "nav.join": "Join the network",
  "nav.map": "Map",
  "nav.institution": "Institutional access",

  "nav.language": "Language",

  "footer.collaboration": "A collaboration by",
  "footer.writeUs": "Write to us at",
  "footer.followUs": "Follow us on",
  "footer.joinSlack": "Join our Slack community",
  "footer.resources": "Resources",
  "footer.resources.map": "Map",
  "footer.resources.research": "Research and resources",
  "footer.resources.github": "Github",
  "footer.project": "The project",
  "footer.project.about": "About the project",
  "footer.project.contact": "Contact",
  "footer.institutions": "For institutions",
  "footer.institutions.login": "Institutional access",
  "footer.institutions.guideInstitution": "Guide for institutions",
  "footer.institutions.guideAdmin": "Guide for administrators",

  "home.intro.particles":
    "Particle pollution can cause serious health problems, such as asthma attacks, heart attacks, strokes and early death.",
  "home.intro.anytime":
    "Particle pollution can be a problem at any time of year.",
  "home.intro.forecast":
    "You can reduce your exposure to pollution and still exercise! Use the daily Air Quality Index (AQI) forecasts on this website to plan your outdoor activities.",
  "home.aqi.title": "Air Quality Index (AQI)",
  "home.aqi.source": "Via source",
  "home.recommendations": "Recommendations by level",

  "home.cta.title": "Join the Respira sensor network",
  "home.cta.subtitle":
    "Help us monitor air quality in more communities, schools, institutions and homes.",
  "home.cta.point1": "Contribute open, high-quality data.",
  "home.cta.point2": "Drive decisions for cleaner, healthier air.",
  "home.cta.point3": "Your sensor can make a difference in your community.",
  "home.cta.button": "I want a sensor",
  "home.cta.learnMore": "Learn more about the Respira network",
  "home.cta.note.title":
    "Institutions, organizations or individuals: request a sensor installation",
  "home.cta.note.subtitle": "Fill out the form and our team will contact you.",

  "join.breadcrumb.home": "Home",
  "join.breadcrumb.current": "Join the network",
  "join.how.title": "How does Respira work?",
  "join.how.p1":
    "We install the sensor, you get the service. Respira provides an air quality monitoring and forecasting service through a platform that brings together sensors, environmental data and artificial intelligence.",
  "join.how.p2":
    "The sensor is installed on loan: it is part of the service and remains Respira's property for the whole contract. Your institution invests in a monthly subscription that includes the installed sensor, maintenance, access to the platform (web and app), forecasts, alerts and technical support.",
  "join.how.imageAlt": "Proyecto Respira air quality sensor",

  "join.price.title": "How much does it cost?",
  "join.price.intro":
    "There is no single price: the recommended sensor and the cost of the service depend on your institution and on where you are going to install it. That is why the process works like this:",
  "join.price.step1.title": "Tell us about your institution.",
  "join.price.step1.desc":
    "Fill out the form with the type of institution (school, university, company, municipality, home, community space), its approximate size and who approves the budget.",
  "join.price.step2.title": "We assess your case.",
  "join.price.step2.desc":
    "We look at the location, how many people are around, connectivity access and what you are going to use the information for — those factors determine the most suitable sensor and the real coverage area.",
  "join.price.step3.title": "We recommend the right sensor.",
  "join.price.step3.desc":
    "For example: Wi-Fi sensors for urban spaces, or sensors with a solar panel and self-calibration for remote areas without connectivity.",
  "join.price.step4.title": "We send you a commercial proposal.",
  "join.price.step4.desc":
    "With the monthly cost of the service for your specific installation.",
  "join.price.step5.title": "We install and get started.",
  "join.price.step5.desc":
    "Installation is handled by an external provider and, once it is done, your institution can already see its information on the platform.",

  "join.includes.title": "What the monthly service includes",
  "join.includes.sensor":
    "Sensor installed and running (provided by Respira, with no purchase cost).",
  "join.includes.monitoring":
    "Real-time air quality monitoring (particulate matter PM2.5 and PM10).",
  "join.includes.forecast":
    "Air quality forecast 6–12 hours ahead using artificial intelligence.",
  "join.includes.platform": "Web platform and mobile app.",
  "join.includes.alerts":
    "Alerts and notifications when the air gets worse in your area.",
  "join.includes.dashboard":
    "Dashboard with actionable recommendations, not just numbers.",
  "join.includes.report":
    "Downloadable monthly report, ready to share with families, the board or your team.",
  "join.includes.support": "Maintenance and technical support for the sensor.",
  "join.includes.standards":
    "The sensors follow EPA and WHO standards, with the backing of MADES. They measure particulate matter; measuring gases requires a higher-end sensor and is assessed case by case.",

  "join.segments.title": "Benefits by type of institution",
  "join.segments.education.title": "Schools and universities",
  "join.segments.education.desc":
    "Safer learning environments, information to decide about outdoor activities, and a monthly report you can share with families and authorities.",
  "join.segments.business.title": "Companies and industry",
  "join.segments.business.desc":
    "Continuous monitoring and reliable data to strengthen environmental compliance and your sustainability strategy.",
  "join.segments.production.title":
    "Productive sector (livestock, construction, agribusiness)",
  "join.segments.production.desc":
    "Information for operational decisions — for example, when there is smoke from wildfires or waste burning near your production.",
  "join.segments.public.title": "Municipalities and public institutions",
  "join.segments.public.desc":
    "Open, real-time data to strengthen public policy and environmental management of the territory.",
  "join.segments.families.title": "Families and community",
  "join.segments.families.desc":
    "Reliable information to protect the health of people with respiratory conditions, asthma or allergies.",

  "join.next.title": "What happens next?",
  "join.next.desc":
    "Our team will review your request and contact you to discuss the next steps.",
  "join.form.title": "Interest form",
  "join.form.subtitle":
    "Fill in your details and tell us how you would like to participate.",
  "join.form.name": "Full name",
  "join.form.namePlaceholder": "E.g. María Pérez",
  "join.form.email": "Email address",
  "join.form.emailPlaceholder": "E.g. example@email.com",
  "join.form.phone": "Phone / WhatsApp",
  "join.form.phonePlaceholder": "E.g. +595 98 123 4567",
  "join.form.organization": "Institution or organization (if applicable)",
  "join.form.organizationPlaceholder": "E.g. San José School",
  "join.form.city": "City / Town",
  "join.form.cityPlaceholder": "E.g. Asunción",
  "join.form.department": "Department",
  "join.form.departmentPlaceholder": "Select...",
  "join.form.size": "Approximate size",
  "join.form.sizePlaceholder": "E.g. 450 people",
  "join.form.approver": "Who approves the budget",
  "join.form.approverPlaceholder": "E.g. Administrative management",
  "join.form.institutionType": "Type of institution",
  "join.form.institutionType.school": "School",
  "join.form.institutionType.university": "University",
  "join.form.institutionType.company": "Company",
  "join.form.institutionType.municipality": "Municipality",
  "join.form.institutionType.home": "Home",
  "join.form.institutionType.community": "Community space",
  "join.form.message": "Tell us more about your interest or motivation",
  "join.form.messagePlaceholder":
    "E.g. We want to monitor air quality at our school for an environmental project...",
  "join.form.consent":
    "I agree that Respira may use my data to contact me about the sensor network.",
  "join.form.submit": "Submit form",
  "join.form.privacy":
    "Your data is protected. We do not share your information with third parties.",
  "join.form.success":
    "Thank you! We received your request. Our team will contact you soon.",
  "join.form.error":
    "There was an error submitting the form. Please try again.",

  "about.title": "About Proyecto Respira",
  "about.p1":
    "We provide the public with Air Quality forecasts for Asunción and its metropolitan area through interactive maps on our website, and daily alerts on our Telegram and X (Twitter) channels.",
  "about.p2":
    "In addition to providing up-to-date air quality predictions, we offer statistics, local fire news and open air quality data for the city since 2019, sourced from the Air Quality Monitoring Network of the Faculty of Engineering of the National University of Asunción.",
  "about.p3":
    "Our open-source technologies give citizens key information to make informed decisions about their health and the environment, while fostering community collaboration to continuously improve their functionality and usefulness.",
  "about.protectLink": "How can I protect myself from pollution?",
  "about.forecasts.title": "What are forecasts for?",
  "about.forecasts.p1":
    "Many of us check the weather forecast daily to make decisions about our day. For example, if rain is forecast, we leave home with an umbrella, or if it will be very hot, we avoid sun exposure around midday.",
  "about.forecasts.p2":
    "In the same way, the Air Quality forecast helps people take action to protect their health during high-pollution events, whether by avoiding strenuous physical activity, paying attention to fatigue symptoms, or closing the windows and doors of our homes to keep polluted air out.",
  "about.why.title": "Why is this project needed?",
  "about.why.p1":
    "In Asunción, every year more days are reported in which smoke fronts from forest fires and agricultural burning enter the city, raising pollution levels in the air we breathe. Forest fires are not the only source of air pollution affecting the city. Endemic practices such as garbage burning and the widespread use of vehicles with low-quality diesel fuel affect the quality of our air, and therefore the quality of life of the Paraguayan population.",
  "about.why.p2":
    "Faced with this reality, citizens are left unprotected from the harmful effects of air pollution. Air pollution causes a range of health problems, such as:",
  "about.why.health.earlyDeath": "Early death",
  "about.why.health.cough": "Cough",
  "about.why.health.lung": "Impaired lung function",
  "about.why.health.asthma": "Asthma attacks",
  "about.why.health.heart": "Heart disease",
  "about.why.health.stroke": "Strokes",
  "about.why.p3":
    "This project seeks to give citizens tools to take action and protect themselves from the harmful effects of air pollution. We also want to raise awareness of this issue and spark public debate about how our authorities can promote initiatives that combat air pollution in Paraguay and ensure the well-being of all Paraguayans.",
  "about.openSource.line1": "Our project is Open Source!",
  "about.openSource.line2": "Access our repository on GitHub",
  "about.openSource.cta": "Go to the repository",
  "about.collaborators": "Collaborators",
  "about.organizations": "Organizations",

  "contact.title": "Contact us",
  "contact.subtitle":
    "We are happy that you want to send us a greeting, a data inquiry or any particular message.",
  "contact.name": "First name",
  "contact.namePlaceholder": "First name",
  "contact.lastname": "Last name",
  "contact.lastnamePlaceholder": "Last name",
  "contact.email": "Email",
  "contact.emailPlaceholder": "Email",
  "contact.motive": "Reason",
  "contact.motive.data": "Request network data",
  "contact.motive.research": "Research collaboration",
  "contact.motive.internship": "Internship information (FIUNA)",
  "contact.motive.highAqi": "What to do in case of very high AQI",
  "contact.motive.health": "Request for health information",
  "contact.message": "Message",
  "contact.messagePlaceholder": "Write your message...",
  "contact.maxChars": "*Maximum number of characters is 800",
  "contact.submit": "Send",
  "contact.errorAlert": "There was an error sending the email",
  "contact.successAlert": "Message sent!",

  "resources.dataSourceLabel": "Where does our data come from?",
  "resources.dataSourceTitle": "Air Quality Monitoring Network - FIUNA",
  "resources.dataSource.p1":
    "The Air Quality Monitoring Network of the Faculty of Engineering of the National University of Asunción (FIUNA) is a CONACYT-funded project comprising the installation and maintenance of a network of air quality sensors in the metropolitan area of Asunción. Its ten monitoring stations have collected Particulate Matter (PM) measurements and climate parameters such as temperature, humidity and atmospheric pressure since 2019.",
  "resources.dataSource.p2":
    "The data collected by this network feeds the air quality monitoring and forecasting data of Proyecto Respira, and has been used to carry out high-impact research on the air quality problem in our region.",
  "resources.research.title": "Published research",
  "resources.external.title": "External Resources",
  "resources.external.epa":
    "Air quality guide. United States Environmental Protection Agency",
  "resources.external.pho": "(PAHO) Pan American Health Organization",
  "resources.external.who": "(WHO) World Health Organization",
  "resources.external.aireLibre": "Aire Libre",

  "faq.badge": "Sensor Leasing",
  "faq.heroImageAlt":
    "Proyecto Respira air quality sensor, showing its solar panel and the respira logo",
  "faq.title": "Frequently Asked Questions",
  "faq.subtitle":
    "We answer the most common questions about leasing air quality sensors: costs, installation, maintenance and how your institution can start monitoring today.",
  "faq.nav.label": "Frequently asked question categories",
  "faq.search.label": "Search the frequently asked questions",
  "faq.search.placeholder": "Search the frequently asked questions...",
  "faq.search.empty": 'We could not find any questions matching "{q}".',
  "faq.search.results.one": "1 question found",
  "faq.search.results.many": "{n} questions found",
  "faq.edu.title": "Learn the essentials",
  "faq.edu.subtitle":
    "Educational content about air quality, made for schools and families.",
  "faq.cta.title": "Still have questions?",
  "faq.cta.subtitle":
    "Our team can help you assess whether Sensor Leasing is the right fit for your institution.",
  "faq.cta.primary": "Request information",
  "faq.cta.secondary": "Schedule a demo",
  "alerts.goToMap": "Go to the map",

  "stats.title": "Statistics",
  "stats.historic.title": "Historical air quality measurements (AQI)",
  "stats.historic.subtitle":
    "Air quality measurements recorded by the sensors and predictions for the next 6 and 12 hours.",
  "stats.boxplot.title": "Historical: Air Quality Index",
  "stats.boxplot.subtitle": "History of sensor measurements.",
  "stats.boxplot.lastWeek": "Last week",
  "stats.boxplot.lastMonth": "Last month",
  "stats.boxplot.lastYear": "Last year",

  "stats.station": "Station",
  "stats.characteristics": "Characteristics",
  "stats.locality": "Locality",
  "stats.region": "Region",
  "stats.status": "Status",
  "stats.active": "Active",
  "stats.lastAqi": "Last AQI measurement",
  "stats.chart.realMeasurement": "Actual measurement",
  "stats.chart.forecast6h": "6-hour forecast",
  "stats.chart.forecast12h": "12-hour forecast",
  "stats.loading": "Loading...",
  "stats.chartError": "Error loading the chart",
  "stats.boxplot.summary": "Summary",
  "stats.boxplot.mean": "Mean",
  "stats.boxplot.quantiles": "Quantiles",

  "common.recommendations": "Recommendations",
  "card.howIsAir": "How is the air right now?",
  "card.forecast": "Forecast",
  "card.next6h": "Next 6 hrs",
  "card.next12h": "Next 12 hrs",
  "card.backendError": "We couldn't reach the service",
  "card.generalMean": "Overall average",
  "card.share": "Share",
  "card.noDataTitle": "No data available",
  "card.noActiveStations":
    "There are no active sensors in this area right now. You can keep browsing the map and pick another region.",
  "card.noAqi": "No air quality reading available.",
  "chart.noForecast": "No forecast available",
  "map.loading": "Loading map…",
  "map.mean": "Average",
  "map.viewStats": "View statistics",
  "recommendations.sensitiveQuestion": "Who are the sensitive groups?",
  "recommendations.selectLevel": "Select level",
  "recommendations.group.older": "Older adults",
  "recommendations.group.heartCondition": "People with heart disease",
  "recommendations.group.kids": "Children",
  "recommendations.group.lungDisease": "People with lung disease",
  "recommendations.group.babies": "Infants and pregnant people",
  "recommendations.group.diabetes": "People with diabetes",
  "share.title": "Share the link",
  "share.linkLabel": "Page link",

  "telegram.title": "Telegram alerts",
  "telegram.description":
    "Get automatic alerts on your Telegram by joining our Alerts group.",
  "twitter.title": "Alerts via X (Twitter)",
  "twitter.descBefore": "Find us as",
  "twitter.descAfter": "on X to follow our measurements",
  "twitter.cta": "Go to X",

  "aqi.good.title": "Good",
  "aqi.good.description": "It's an excellent day for outdoor activities!",
  "aqi.moderate.title": "Moderate",
  "aqi.moderate.description":
    "Sensitive people may experience symptoms such as coughing or difficulty breathing and should follow their usual precautions, but it is a good day for outdoor activities.",
  "aqi.unhealthySensitive.title": "Unhealthy for sensitive groups",
  "aqi.unhealthySensitive.description":
    "Sensitive people may experience symptoms and should follow the usual precautions to cope.",
  "aqi.unhealthy.title": "Unhealthy",
  "aqi.unhealthy.description":
    "Everyone should limit outdoor activities. Sensitive people should avoid outdoor activities and reschedule any outdoor events.",
  "aqi.veryUnhealthy.title": "Very Unhealthy",
  "aqi.veryUnhealthy.description":
    "Move unnecessary activities indoors. Everyone should avoid strenuous and prolonged outdoor activities. Reschedule outdoor activities.",
  "aqi.hazardous.title": "Hazardous",
  "aqi.hazardous.description":
    "Everyone should completely avoid unnecessary outdoor activities. Stay indoors and keep activity levels low.",

  "common.backToTop": "Back to top",

  "app.download.appStoreLabel": "Download on the",
  "app.download.playStoreLabel": "Available on",
  "app.download.title": "Download the Proyecto Respira app",
  "app.download.description":
    "Check air quality from your phone and add the widget to see the AQI instantly from your home screen, without opening the app.",
};

const pt: Dictionary = {
  "nav.alerts": "Receber alertas",
  "nav.contact": "Contato",
  "nav.us": "Sobre nós",
  "nav.research": "Recursos",
  "nav.data": "Dados",
  "nav.join": "Junte-se à rede",
  "nav.map": "Mapa",
  "nav.institution": "Acesso institucional",

  "nav.language": "Idioma",

  "footer.collaboration": "Uma colaboração de",
  "footer.writeUs": "Escreva para nós em",
  "footer.followUs": "Siga-nos em",
  "footer.joinSlack": "Junte-se à nossa comunidade no Slack",
  "footer.resources": "Recursos",
  "footer.resources.map": "Mapa",
  "footer.resources.research": "Pesquisas e recursos",
  "footer.resources.github": "Github",
  "footer.project": "O projeto",
  "footer.project.about": "Sobre o projeto",
  "footer.project.contact": "Contato",
  "footer.institutions": "Para instituições",
  "footer.institutions.login": "Acesso institucional",
  "footer.institutions.guideInstitution": "Guia para instituições",
  "footer.institutions.guideAdmin": "Guia para administradores",

  "home.intro.particles":
    "A poluição por partículas pode causar problemas graves de saúde, como crises de asma, ataques cardíacos, derrames e morte precoce.",
  "home.intro.anytime":
    "A poluição por partículas pode ser um problema em qualquer época do ano.",
  "home.intro.forecast":
    "Você pode reduzir a exposição à poluição e ainda se exercitar! Use as previsões diárias do Índice de Qualidade do Ar (AQI) deste site para planejar suas atividades ao ar livre.",
  "home.aqi.title": "Índice de Qualidade do Ar (AQI)",
  "home.aqi.source": "Ver fonte",
  "home.recommendations": "Recomendações por nível",

  "home.cta.title": "Junte-se à rede de sensores Respira",
  "home.cta.subtitle":
    "Ajude-nos a monitorar a qualidade do ar em mais comunidades, escolas, instituições e residências.",
  "home.cta.point1": "Contribua com dados abertos e de qualidade.",
  "home.cta.point2": "Impulsione decisões para um ar mais limpo e saudável.",
  "home.cta.point3": "Seu sensor pode fazer a diferença na sua comunidade.",
  "home.cta.button": "Quero ter um sensor",
  "home.cta.learnMore": "Saiba mais sobre a rede Respira",
  "home.cta.note.title":
    "Instituições, organizações ou pessoas: solicite a instalação de um sensor",
  "home.cta.note.subtitle":
    "Preencha o formulário e nossa equipe entrará em contato.",

  "join.breadcrumb.home": "Início",
  "join.breadcrumb.current": "Junte-se à rede",
  "join.how.title": "Como funciona a Respira?",
  "join.how.p1":
    "Instalamos o sensor, você acessa o serviço. A Respira oferece um serviço de monitoramento e previsão da qualidade do ar por meio de uma plataforma que integra sensores, dados ambientais e inteligência artificial.",
  "join.how.p2":
    "O sensor é instalado em comodato: faz parte do serviço e continua sendo da Respira durante todo o contrato. Sua instituição investe em uma assinatura mensal que inclui o sensor instalado, a manutenção, o acesso à plataforma (web e app), as previsões, os alertas e o suporte técnico.",
  "join.how.imageAlt": "Sensor de qualidade do ar do Proyecto Respira",

  "join.price.title": "Quanto custa?",
  "join.price.intro":
    "Não há um preço único: o sensor recomendado e o custo do serviço dependem da sua instituição e do local onde você vai instalá-lo. Por isso o processo é assim:",
  "join.price.step1.title": "Conte-nos sobre sua instituição.",
  "join.price.step1.desc":
    "Preencha o formulário com o tipo de instituição (colégio, universidade, empresa, município, residência, espaço comunitário), seu tamanho aproximado e quem aprova o orçamento.",
  "join.price.step2.title": "Avaliamos seu caso.",
  "join.price.step2.desc":
    "Analisamos a localização, a quantidade de pessoas ao redor, o acesso à conectividade e para que você vai usar a informação — esses fatores determinam o sensor mais adequado e a área de cobertura real.",
  "join.price.step3.title": "Recomendamos o sensor ideal.",
  "join.price.step3.desc":
    "Por exemplo: sensores com conexão Wi-Fi para espaços urbanos, ou sensores com painel solar e autocalibração para zonas remotas sem conectividade.",
  "join.price.step4.title": "Enviamos uma proposta comercial.",
  "join.price.step4.desc":
    "Com o custo mensal do serviço conforme a sua instalação específica.",
  "join.price.step5.title": "Instalamos e começamos.",
  "join.price.step5.desc":
    "A instalação fica a cargo de um fornecedor externo e, uma vez pronta, sua instituição já pode ver suas informações na plataforma.",

  "join.includes.title": "O que inclui o serviço mensal",
  "join.includes.sensor":
    "Sensor instalado e em funcionamento (fornecido pela Respira, sem custo de compra).",
  "join.includes.monitoring":
    "Monitoramento da qualidade do ar em tempo real (material particulado PM2.5 e PM10).",
  "join.includes.forecast":
    "Previsão da qualidade do ar de 6–12 horas por meio de inteligência artificial.",
  "join.includes.platform": "Plataforma web e aplicativo móvel.",
  "join.includes.alerts":
    "Alertas e notificações quando o ar piora na sua região.",
  "join.includes.dashboard":
    "Dashboard com recomendações acionáveis, não apenas números.",
  "join.includes.report":
    "Relatório mensal para download, pronto para compartilhar com famílias, o conselho diretor ou a equipe.",
  "join.includes.support": "Manutenção e suporte técnico do sensor.",
  "join.includes.standards":
    "Os sensores seguem os padrões da EPA e da OMS, com respaldo do MADES. Medem material particulado; a medição de gases requer um sensor de gama superior e é avaliada caso a caso.",

  "join.segments.title": "Benefícios conforme o seu tipo de instituição",
  "join.segments.education.title": "Escolas e universidades",
  "join.segments.education.desc":
    "Ambientes de aprendizagem mais seguros, informação para decidir sobre atividades ao ar livre e um relatório mensal que você pode compartilhar com famílias e autoridades.",
  "join.segments.business.title": "Empresas e indústrias",
  "join.segments.business.desc":
    "Monitoramento contínuo e dados confiáveis para fortalecer a conformidade ambiental e a estratégia de sustentabilidade.",
  "join.segments.production.title":
    "Setor produtivo (pecuária, construção, agroindústria)",
  "join.segments.production.desc":
    "Informação para tomar decisões operacionais — por exemplo, diante de fumaça de incêndios florestais ou queima de resíduos perto da sua produção.",
  "join.segments.public.title": "Municípios e instituições públicas",
  "join.segments.public.desc":
    "Dados abertos e em tempo real para fortalecer políticas públicas e a gestão ambiental do território.",
  "join.segments.families.title": "Famílias e comunidade",
  "join.segments.families.desc":
    "Informação confiável para proteger a saúde de quem tem afecções respiratórias, asma ou alergias.",

  "join.next.title": "O que acontece depois?",
  "join.next.desc":
    "Nossa equipe avaliará sua solicitação e entrará em contato para conversar sobre os próximos passos.",
  "join.form.title": "Formulário de interesse",
  "join.form.subtitle":
    "Preencha seus dados e conte-nos como gostaria de participar.",
  "join.form.name": "Nome completo",
  "join.form.namePlaceholder": "Ex: María Pérez",
  "join.form.email": "E-mail",
  "join.form.emailPlaceholder": "Ex: exemplo@email.com",
  "join.form.phone": "Telefone / WhatsApp",
  "join.form.phonePlaceholder": "Ex: +595 98 123 4567",
  "join.form.organization": "Instituição ou organização (se aplicável)",
  "join.form.organizationPlaceholder": "Ex: Colégio San José",
  "join.form.city": "Cidade / Localidade",
  "join.form.cityPlaceholder": "Ex: Assunção",
  "join.form.department": "Departamento",
  "join.form.departmentPlaceholder": "Selecione...",
  "join.form.size": "Tamanho aproximado",
  "join.form.sizePlaceholder": "Ex: 450 pessoas",
  "join.form.approver": "Quem aprova o orçamento",
  "join.form.approverPlaceholder": "Ex: Direção administrativa",
  "join.form.institutionType": "Tipo de instituição",
  "join.form.institutionType.school": "Colégio",
  "join.form.institutionType.university": "Universidade",
  "join.form.institutionType.company": "Empresa",
  "join.form.institutionType.municipality": "Município",
  "join.form.institutionType.home": "Residência",
  "join.form.institutionType.community": "Espaço comunitário",
  "join.form.message": "Conte-nos mais sobre seu interesse ou motivação",
  "join.form.messagePlaceholder":
    "Ex: Queremos monitorar a qualidade do ar na nossa escola para um projeto ambiental...",
  "join.form.consent":
    "Concordo que a Respira use meus dados para entrar em contato sobre a rede de sensores.",
  "join.form.submit": "Enviar formulário",
  "join.form.privacy":
    "Seus dados estão protegidos. Não compartilhamos suas informações com terceiros.",
  "join.form.success":
    "Obrigado! Recebemos sua solicitação. Nossa equipe entrará em contato em breve.",
  "join.form.error": "Houve um erro ao enviar o formulário. Tente novamente.",

  "about.title": "Sobre o Proyecto Respira",
  "about.p1":
    "Oferecemos ao público previsões sobre a Qualidade do Ar em Assunção e sua área metropolitana por meio de mapas interativos em nosso site, e alertas diários em nossos canais do Telegram e X (Twitter).",
  "about.p2":
    "Além de fornecer previsões atualizadas sobre a qualidade do ar, oferecemos estatísticas, notícias locais sobre incêndios e dados abertos sobre a qualidade do ar na cidade desde 2019, provenientes da Rede de Monitoramento da Qualidade do Ar da Faculdade de Engenharia da Universidade Nacional de Assunção.",
  "about.p3":
    "Nossas tecnologias open-source fornecem aos cidadãos informações essenciais para tomar decisões conscientes sobre sua saúde e o meio ambiente, ao mesmo tempo em que incentivam a colaboração comunitária para melhorar continuamente sua funcionalidade e utilidade.",
  "about.protectLink": "Como posso me proteger da poluição?",
  "about.forecasts.title": "Para que servem as previsões?",
  "about.forecasts.p1":
    "Muitos de nós olhamos diariamente a previsão do tempo para tomar decisões sobre o nosso dia a dia. Por exemplo, se a previsão indica chuva, saímos de casa com um guarda-chuva, ou se o dia estará muito quente, evitamos a exposição ao sol ao meio-dia.",
  "about.forecasts.p2":
    "Da mesma forma, a previsão da Qualidade do Ar serve para que as pessoas possam agir para proteger sua saúde durante eventos de alta poluição, seja evitando atividades físicas extenuantes, prestando atenção aos sintomas de fadiga ou fechando janelas e portas de nossas casas para evitar a entrada de ar poluído.",
  "about.why.title": "Por que este projeto é necessário?",
  "about.why.p1":
    "Em Assunção, a cada ano são registrados mais dias em que frentes de fumaça provenientes de incêndios florestais e queimadas agrícolas entram na cidade, elevando os níveis de poluição no ar que respiramos. Os incêndios florestais não são a única fonte de poluição do ar que afeta a cidade. Práticas endêmicas como a queima de lixo e o amplo uso de veículos com combustível diesel de baixa qualidade afetam a qualidade do nosso ar e, portanto, a qualidade de vida da população paraguaia.",
  "about.why.p2":
    "Diante dessa realidade, os cidadãos ficam desprotegidos dos efeitos nocivos da poluição do ar. A poluição do ar causa uma série de problemas de saúde, tais como:",
  "about.why.health.earlyDeath": "Morte precoce",
  "about.why.health.cough": "Tosse",
  "about.why.health.lung": "Comprometimento da função pulmonar",
  "about.why.health.asthma": "Crises de asma",
  "about.why.health.heart": "Doenças cardíacas",
  "about.why.health.stroke": "Derrames",
  "about.why.p3":
    "Este projeto busca oferecer aos cidadãos ferramentas para agir e se proteger dos efeitos nocivos da poluição do ar. Além disso, queremos dar visibilidade a essa problemática e fomentar o debate público sobre como nossas autoridades podem promover iniciativas que combatam a poluição do ar no Paraguai e garantam o bem-estar de todos os paraguaios.",
  "about.openSource.line1": "Nosso projeto é Open Source!",
  "about.openSource.line2": "Acesse nosso repositório no GitHub",
  "about.openSource.cta": "Ir para o repositório",
  "about.collaborators": "Colaboradores",
  "about.organizations": "Organizações",

  "contact.title": "Fale conosco",
  "contact.subtitle":
    "Ficamos felizes que você queira nos enviar um alô, uma consulta sobre dados ou alguma mensagem em particular.",
  "contact.name": "Nome",
  "contact.namePlaceholder": "Nome",
  "contact.lastname": "Sobrenome",
  "contact.lastnamePlaceholder": "Sobrenome",
  "contact.email": "E-mail",
  "contact.emailPlaceholder": "E-mail",
  "contact.motive": "Motivo",
  "contact.motive.data": "Solicitar dados da rede",
  "contact.motive.research": "Colaboração em pesquisa",
  "contact.motive.internship": "Informações sobre estágios (FIUNA)",
  "contact.motive.highAqi": "O que fazer em caso de AQI muito alto",
  "contact.motive.health": "Pedido de informações de saúde",
  "contact.message": "Mensagem",
  "contact.messagePlaceholder": "Escreva sua mensagem...",
  "contact.maxChars": "*O número máximo de caracteres é 800",
  "contact.submit": "Enviar",
  "contact.errorAlert": "Houve um erro ao enviar o e-mail",
  "contact.successAlert": "Mensagem enviada!",

  "resources.dataSourceLabel": "De onde vêm os nossos dados?",
  "resources.dataSourceTitle":
    "Rede de Monitoramento da Qualidade do Ar - FIUNA",
  "resources.dataSource.p1":
    "A Rede de Monitoramento da Qualidade do Ar da Faculdade de Engenharia da Universidade Nacional de Assunção (FIUNA) é um projeto financiado pela CONACYT que abrange a instalação e manutenção de uma rede de sensores de qualidade do ar na área metropolitana de Assunção. Suas dez estações de monitoramento coletam, desde 2019, medições de Material Particulado (MP) e parâmetros climáticos como temperatura, umidade e pressão atmosférica.",
  "resources.dataSource.p2":
    "Os dados coletados por esta rede alimentam os dados de monitoramento e previsão da qualidade do ar do Proyecto Respira, e foram utilizados para realizar pesquisas de alto impacto sobre o problema da qualidade do ar em nossa região.",
  "resources.research.title": "Pesquisas realizadas",
  "resources.external.title": "Recursos Externos",
  "resources.external.epa":
    "Guia da qualidade do ar. Agência de Proteção Ambiental dos Estados Unidos",
  "resources.external.pho": "(OPAS) Organização Pan-Americana da Saúde",
  "resources.external.who": "(OMS) Organização Mundial da Saúde",
  "resources.external.aireLibre": "Aire Libre",

  "faq.badge": "Sensor Leasing",
  "faq.heroImageAlt":
    "Sensor de qualidade do ar do Proyecto Respira, com seu painel solar e o logo respira",
  "faq.title": "Perguntas Frequentes",
  "faq.subtitle":
    "Respondemos às dúvidas mais comuns sobre o aluguel de sensores de qualidade do ar: custos, instalação, manutenção e como a sua instituição pode começar a monitorar hoje.",
  "faq.nav.label": "Categorias de perguntas frequentes",
  "faq.search.label": "Buscar nas perguntas frequentes",
  "faq.search.placeholder": "Buscar nas perguntas frequentes...",
  "faq.search.empty": 'Não encontramos perguntas que correspondam a "{q}".',
  "faq.search.results.one": "1 pergunta encontrada",
  "faq.search.results.many": "{n} perguntas encontradas",
  "faq.edu.title": "Aprenda o essencial",
  "faq.edu.subtitle":
    "Conteúdo educativo sobre qualidade do ar, pensado para escolas e famílias.",
  "faq.cta.title": "Ainda tem perguntas?",
  "faq.cta.subtitle":
    "Nossa equipe pode ajudar você a avaliar se o Sensor Leasing é a opção certa para a sua instituição.",
  "faq.cta.primary": "Solicitar informações",
  "faq.cta.secondary": "Agendar demonstração",
  "alerts.goToMap": "Ir para o mapa",

  "stats.title": "Estatísticas",
  "stats.historic.title": "Medições históricas de qualidade do ar (AQI)",
  "stats.historic.subtitle":
    "Medições de qualidade do ar registradas pelos sensores e previsões para as próximas 6 e 12 horas.",
  "stats.boxplot.title": "Histórico: Índice de Qualidade do Ar",
  "stats.boxplot.subtitle": "Histórico das medições dos sensores.",
  "stats.boxplot.lastWeek": "Última semana",
  "stats.boxplot.lastMonth": "Último mês",
  "stats.boxplot.lastYear": "Último ano",

  "stats.station": "Estação",
  "stats.characteristics": "Características",
  "stats.locality": "Localidade",
  "stats.region": "Região",
  "stats.status": "Estado",
  "stats.active": "Ativo",
  "stats.lastAqi": "Última medição AQI",
  "stats.chart.realMeasurement": "Medição real",
  "stats.chart.forecast6h": "Previsão de 6 horas",
  "stats.chart.forecast12h": "Previsão de 12 horas",
  "stats.loading": "Carregando...",
  "stats.chartError": "Erro ao carregar o gráfico",
  "stats.boxplot.summary": "Resumo",
  "stats.boxplot.mean": "Média",
  "stats.boxplot.quantiles": "Quantis",

  "common.recommendations": "Recomendações",
  "card.howIsAir": "Como está o ar agora?",
  "card.forecast": "Previsão",
  "card.next6h": "Próximas 6 h",
  "card.next12h": "Próximas 12 h",
  "card.backendError": "Não conseguimos conectar com o serviço",
  "card.generalMean": "Média geral",
  "card.share": "Compartilhar",
  "card.noDataTitle": "Sem dados disponíveis",
  "card.noActiveStations":
    "Não há sensores ativos nesta área no momento. Você pode continuar navegando no mapa e escolher outra região.",
  "card.noAqi": "Sem medição de qualidade do ar disponível.",
  "chart.noForecast": "Sem previsão disponível",
  "map.loading": "Carregando mapa…",
  "map.mean": "Média",
  "map.viewStats": "Ver estatísticas",
  "recommendations.sensitiveQuestion": "Quem são as pessoas sensíveis?",
  "recommendations.selectLevel": "Selecionar nível",
  "recommendations.group.older": "Idosos",
  "recommendations.group.heartCondition": "Pessoas com doenças cardíacas",
  "recommendations.group.kids": "Crianças",
  "recommendations.group.lungDisease": "Pessoas com doenças pulmonares",
  "recommendations.group.babies": "Bebês e gestantes",
  "recommendations.group.diabetes": "Pessoas com diabetes",
  "share.title": "Compartilhe o link",
  "share.linkLabel": "Link da página",

  "telegram.title": "Alertas via Telegram",
  "telegram.description":
    "Receba alertas automáticos no seu Telegram entrando no nosso grupo de Alertas.",
  "twitter.title": "Alertas via X (Twitter)",
  "twitter.descBefore": "Encontre-nos como",
  "twitter.descAfter": "no X para acompanhar nossas medições",
  "twitter.cta": "Ir para o X",

  "aqi.good.title": "Bom",
  "aqi.good.description": "É um dia excelente para atividades ao ar livre!",
  "aqi.moderate.title": "Moderado",
  "aqi.moderate.description":
    "Pessoas sensíveis podem apresentar sintomas como tosse ou dificuldade para respirar e devem seguir as precauções habituais, mas é um bom dia para atividades ao ar livre.",
  "aqi.unhealthySensitive.title": "Insalubre para grupos sensíveis",
  "aqi.unhealthySensitive.description":
    "Pessoas sensíveis podem apresentar sintomas e devem seguir as precauções habituais para se cuidar.",
  "aqi.unhealthy.title": "Insalubre",
  "aqi.unhealthy.description":
    "Todos devemos limitar as atividades ao ar livre. Pessoas sensíveis devem evitar atividades ao ar livre e reagendar quaisquer eventos ao ar livre.",
  "aqi.veryUnhealthy.title": "Muito Insalubre",
  "aqi.veryUnhealthy.description":
    "Leve as atividades desnecessárias para ambientes fechados. Todos devemos evitar atividades ao ar livre extenuantes e prolongadas. Reagende atividades ao ar livre.",
  "aqi.hazardous.title": "Perigoso",
  "aqi.hazardous.description":
    "Todos devemos evitar completamente atividades ao ar livre desnecessárias. Permaneça em ambientes fechados e mantenha um nível baixo de atividade.",

  "common.backToTop": "Voltar ao topo",

  "app.download.appStoreLabel": "Baixe na",
  "app.download.playStoreLabel": "Disponível no",
  "app.download.title": "Baixe o app do Proyecto Respira",
  "app.download.description":
    "Confira a qualidade do ar pelo celular e adicione o widget para ver o AQI instantaneamente na tela inicial, sem abrir o app.",
};

export const ui: Record<Lang, Dictionary> = { es, en, pt };

// AQI recommendations are lists (one bullet per item), so they live separately
// from the flat string dictionary. Keyed by language and AQI level id.
export const aqiRecommendations: Record<Lang, Record<AQILevelId, string[]>> = {
  es: {
    good: [
      "Ventilá habitaciones y oficinas.",
      "Disfrutá de actividades al aire libre.",
      "Aprovechá para hacer ejercicio.",
    ],
    moderate: [
      "Grupos sensibles: reducí la actividad física si presentás síntomas.",
      "Prestá atención a la tos, dificultad para respirar o irritación ocular.",
      "Evitá zonas con alta contaminación.",
    ],
    unhealthySensitive: [
      "Grupos sensibles: usá tapabocas y llevá medicamentos si es necesario salir.",
      "Evitá esfuerzos prolongados al aire libre.",
    ],
    unhealthy: [
      "Grupos sensibles: evitá cualquier actividad al aire libre.",
      "Si tenés que salir, usá tapabocas.",
      "Mantené tu hogar u oficina bien sellados para evitar el aire contaminado.",
    ],
    veryUnhealthy: [
      "Todos: evitá actividades al aire libre.",
      "Si es necesario salir, usá tapabocas y tené medicamentos a mano.",
      "Consultá a un médico si los síntomas se agravan.",
    ],
    hazardous: [
      "Todos: evitá la exposición al aire contaminado.",
      "Prestá atención a los síntomas respiratorios y consultá a un médico si es necesario.",
    ],
  },
  en: {
    good: [
      "Ventilate rooms and offices.",
      "Enjoy outdoor activities.",
      "Take advantage of the day to exercise.",
    ],
    moderate: [
      "Sensitive groups: reduce physical activity if you have symptoms.",
      "Watch for coughing, difficulty breathing or eye irritation.",
      "Avoid areas with high pollution.",
    ],
    unhealthySensitive: [
      "Sensitive groups: wear a mask and carry medication if you need to go out.",
      "Avoid prolonged exertion outdoors.",
    ],
    unhealthy: [
      "Sensitive groups: avoid any outdoor activity.",
      "If you have to go out, wear a mask.",
      "Keep your home or office well sealed to keep polluted air out.",
    ],
    veryUnhealthy: [
      "Everyone: avoid outdoor activities.",
      "If you must go out, wear a mask and keep medication on hand.",
      "See a doctor if symptoms worsen.",
    ],
    hazardous: [
      "Everyone: avoid exposure to polluted air.",
      "Watch for respiratory symptoms and see a doctor if necessary.",
    ],
  },
  pt: {
    good: [
      "Ventile quartos e escritórios.",
      "Aproveite as atividades ao ar livre.",
      "Aproveite para se exercitar.",
    ],
    moderate: [
      "Grupos sensíveis: reduza a atividade física se apresentar sintomas.",
      "Fique atento a tosse, dificuldade para respirar ou irritação ocular.",
      "Evite áreas com alta poluição.",
    ],
    unhealthySensitive: [
      "Grupos sensíveis: use máscara e leve medicamentos se precisar sair.",
      "Evite esforços prolongados ao ar livre.",
    ],
    unhealthy: [
      "Grupos sensíveis: evite qualquer atividade ao ar livre.",
      "Se precisar sair, use máscara.",
      "Mantenha sua casa ou escritório bem vedados para evitar o ar poluído.",
    ],
    veryUnhealthy: [
      "Todos: evitem atividades ao ar livre.",
      "Se for necessário sair, use máscara e tenha medicamentos à mão.",
      "Consulte um médico se os sintomas piorarem.",
    ],
    hazardous: [
      "Todos: evitem a exposição ao ar poluído.",
      "Fique atento aos sintomas respiratórios e consulte um médico se necessário.",
    ],
  },
};
