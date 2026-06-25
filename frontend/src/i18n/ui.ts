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
  "nav.map": "Mapa",
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
  "card.backendError": "Error conectándose al backend",
  "card.dataError": "Error cargando los datos.",
  "card.generalMean": "Media General",
  "card.share": "Compartir",
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
  "nav.map": "Map",
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

  "home.intro.particles":
    "Particle pollution can cause serious health problems, such as asthma attacks, heart attacks, strokes and early death.",
  "home.intro.anytime":
    "Particle pollution can be a problem at any time of year.",
  "home.intro.forecast":
    "You can reduce your exposure to pollution and still exercise! Use the daily Air Quality Index (AQI) forecasts on this website to plan your outdoor activities.",
  "home.aqi.title": "Air Quality Index (AQI)",
  "home.aqi.source": "Via source",
  "home.recommendations": "Recommendations by level",

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
  "card.backendError": "Error connecting to the backend",
  "card.dataError": "Error loading the data.",
  "card.generalMean": "Overall average",
  "card.share": "Share",
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
  "nav.map": "Mapa",
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

  "home.intro.particles":
    "A poluição por partículas pode causar problemas graves de saúde, como crises de asma, ataques cardíacos, derrames e morte precoce.",
  "home.intro.anytime":
    "A poluição por partículas pode ser um problema em qualquer época do ano.",
  "home.intro.forecast":
    "Você pode reduzir a exposição à poluição e ainda se exercitar! Use as previsões diárias do Índice de Qualidade do Ar (AQI) deste site para planejar suas atividades ao ar livre.",
  "home.aqi.title": "Índice de Qualidade do Ar (AQI)",
  "home.aqi.source": "Ver fonte",
  "home.recommendations": "Recomendações por nível",

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
  "card.backendError": "Erro ao conectar com o backend",
  "card.dataError": "Erro ao carregar os dados.",
  "card.generalMean": "Média geral",
  "card.share": "Compartilhar",
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
