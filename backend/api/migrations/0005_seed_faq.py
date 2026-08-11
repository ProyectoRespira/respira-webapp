"""Seeds the FAQ with the content that used to be hardcoded in the frontend.

Generated from `frontend/src/data/faq.ts`, which stays in the repo as the
fallback the page renders when the backend is unreachable. After this migration
runs, the database is the source of truth: edit the questions in the Django
Admin, not here.

Idempotent by slug, so re-running against a database that already has FAQ rows
leaves admin edits untouched.
"""

from django.db import migrations


SEED = [
    {
        "slug": "project",
        "order": 0,
        "label_es": "Proyecto Respira",
        "label_en": "Proyecto Respira",
        "label_pt": "Proyecto Respira",
        "questions": [
            {
                "order": 0,
                "question_es": "¿Qué es Proyecto Respira?",
                "answer_es": "Proyecto Respira es una plataforma abierta de monitoreo y pronóstico de la calidad del aire que permite conocer, interpretar y actuar ante la contaminación del aire mediante sensores ambientales, pronósticos, alertas y recomendaciones para proteger la salud.",
                "question_en": "What is Proyecto Respira?",
                "answer_en": "Proyecto Respira is an open air quality monitoring and forecasting platform that lets you understand, interpret and act on air pollution through environmental sensors, forecasts, alerts and health recommendations.",
                "question_pt": "O que é o Proyecto Respira?",
                "answer_pt": "O Proyecto Respira é uma plataforma aberta de monitoramento e previsão da qualidade do ar que permite conhecer, interpretar e agir diante da poluição do ar por meio de sensores ambientais, previsões, alertas e recomendações para proteger a saúde.",
            },
            {
                "order": 1,
                "question_es": "¿Qué hace diferente a Proyecto Respira de otras aplicaciones?",
                "answer_es": "Muchas aplicaciones muestran información regional o proveniente de estaciones lejanas. Proyecto Respira ofrece información específica del lugar donde se encuentra instalado el sensor, además de pronósticos, recomendaciones de salud, alertas automáticas e historial de mediciones para facilitar la toma de decisiones.",
                "question_en": "What makes Proyecto Respira different from other apps?",
                "answer_en": "Many apps show regional data or readings from distant stations. Proyecto Respira provides information specific to the place where the sensor is installed, plus forecasts, health recommendations, automatic alerts and a measurement history to support decision-making.",
                "question_pt": "O que diferencia o Proyecto Respira de outros aplicativos?",
                "answer_pt": "Muitos aplicativos mostram informações regionais ou provenientes de estações distantes. O Proyecto Respira oferece informações específicas do local onde o sensor está instalado, além de previsões, recomendações de saúde, alertas automáticos e histórico de medições para facilitar a tomada de decisões.",
            },
            {
                "order": 2,
                "question_es": "¿Quién puede utilizar Proyecto Respira?",
                "answer_es": "Cualquier persona puede acceder gratuitamente a la información desde la página web o la aplicación móvil. Además, instituciones, empresas y organizaciones pueden instalar un sensor propio para obtener información localizada y personalizada.",
                "question_en": "Who can use Proyecto Respira?",
                "answer_en": "Anyone can access the information for free from the website or the mobile app. In addition, institutions, companies and organizations can install their own sensor to get localized, tailored information.",
                "question_pt": "Quem pode utilizar o Proyecto Respira?",
                "answer_pt": "Qualquer pessoa pode acessar gratuitamente as informações pelo site ou pelo aplicativo móvel. Além disso, instituições, empresas e organizações podem instalar seu próprio sensor para obter informações localizadas e personalizadas.",
            },
            {
                "order": 3,
                "question_es": "¿Proyecto Respira es gratuito?",
                "answer_es": "Sí. La plataforma pública y la aplicación móvil son gratuitas para la ciudadanía. El programa de instalación de sensores para instituciones corresponde a un servicio de pago que incluye instalación, monitoreo, mantenimiento y acceso a funcionalidades adicionales.",
                "question_en": "Is Proyecto Respira free?",
                "answer_en": "Yes. The public platform and the mobile app are free for everyone. The sensor installation program for institutions is a paid service that includes installation, monitoring, maintenance and access to additional features.",
                "question_pt": "O Proyecto Respira é gratuito?",
                "answer_pt": "Sim. A plataforma pública e o aplicativo móvel são gratuitos para a população. O programa de instalação de sensores para instituições é um serviço pago que inclui instalação, monitoramento, manutenção e acesso a funcionalidades adicionais.",
            },
        ],
    },
    {
        "slug": "air-quality",
        "order": 1,
        "label_es": "Calidad del aire",
        "label_en": "Air quality",
        "label_pt": "Qualidade do ar",
        "questions": [
            {
                "order": 0,
                "question_es": "¿Qué es la calidad del aire?",
                "answer_es": "La calidad del aire indica qué tan limpio o contaminado se encuentra el aire que respiramos. Se calcula a partir de distintos contaminantes, principalmente material particulado (PM2.5 y PM10), que pueden afectar la salud cuando alcanzan concentraciones elevadas.",
                "question_en": "What is air quality?",
                "answer_en": "Air quality indicates how clean or polluted the air we breathe is. It is calculated from different pollutants, mainly particulate matter (PM2.5 and PM10), which can affect health when they reach high concentrations.",
                "question_pt": "O que é a qualidade do ar?",
                "answer_pt": "A qualidade do ar indica o quão limpo ou poluído está o ar que respiramos. Ela é calculada a partir de diferentes poluentes, principalmente material particulado (PM2.5 e PM10), que podem afetar a saúde quando atingem concentrações elevadas.",
            },
            {
                "order": 1,
                "question_es": "¿Por qué debería preocuparme por la calidad del aire si no veo contaminación?",
                "answer_es": "Muchas veces la contaminación del aire no es visible. Partículas muy pequeñas como el PM2.5 pueden afectar la salud incluso cuando el cielo parece despejado.",
                "question_en": "Why should I care about air quality if I can't see any pollution?",
                "answer_en": "Air pollution is often invisible. Very small particles such as PM2.5 can affect health even when the sky looks clear.",
                "question_pt": "Por que devo me preocupar com a qualidade do ar se não vejo poluição?",
                "answer_pt": "Muitas vezes a poluição do ar não é visível. Partículas muito pequenas, como o PM2.5, podem afetar a saúde mesmo quando o céu parece limpo.",
            },
            {
                "order": 2,
                "question_es": "¿Qué puede pasar si respiro aire de mala calidad durante varias horas?",
                "answer_es": "La exposición prolongada al aire contaminado puede provocar irritación en los ojos y las vías respiratorias, tos, dificultad para respirar y agravar enfermedades respiratorias y cardiovasculares. Niños, adultos mayores, embarazadas y personas con enfermedades respiratorias son los grupos más sensibles.",
                "question_en": "What can happen if I breathe poor quality air for several hours?",
                "answer_en": "Prolonged exposure to polluted air can cause eye and airway irritation, coughing and difficulty breathing, and can worsen respiratory and cardiovascular conditions. Children, older adults, pregnant people and people with respiratory conditions are the most sensitive groups.",
                "question_pt": "O que pode acontecer se eu respirar ar de má qualidade durante várias horas?",
                "answer_pt": "A exposição prolongada ao ar poluído pode provocar irritação nos olhos e nas vias respiratórias, tosse, dificuldade para respirar e agravar doenças respiratórias e cardiovasculares. Crianças, idosos, gestantes e pessoas com doenças respiratórias são os grupos mais sensíveis.",
            },
            {
                "order": 3,
                "question_es": "¿Qué acciones puedo tomar cuando la calidad del aire es mala?",
                "answer_es": "Dependiendo del nivel de contaminación, la plataforma recomienda acciones concretas como:\n• Reducir actividades físicas al aire libre.\n• Modificar horarios deportivos.\n• Proteger a grupos sensibles.\n• Mantener puertas y ventanas cerradas cuando corresponda.\n• Comunicar recomendaciones a estudiantes, familias o colaboradores.",
                "question_en": "What can I do when air quality is poor?",
                "answer_en": "Depending on the pollution level, the platform recommends concrete actions such as:\n• Reducing outdoor physical activity.\n• Rescheduling sports activities.\n• Protecting sensitive groups.\n• Keeping doors and windows closed when appropriate.\n• Sharing recommendations with students, families or staff.",
                "question_pt": "Que ações posso tomar quando a qualidade do ar está ruim?",
                "answer_pt": "Dependendo do nível de poluição, a plataforma recomenda ações concretas como:\n• Reduzir atividades físicas ao ar livre.\n• Alterar os horários das atividades esportivas.\n• Proteger os grupos sensíveis.\n• Manter portas e janelas fechadas quando for necessário.\n• Comunicar as recomendações a estudantes, famílias ou colaboradores.",
            },
            {
                "order": 4,
                "question_es": "¿Cómo interpreta Proyecto Respira la calidad del aire?",
                "answer_es": "Proyecto Respira utiliza estándares internacionales de calidad del aire para clasificar el nivel de riesgo y acompañar cada medición con recomendaciones prácticas para la ciudadanía.",
                "question_en": "How does Proyecto Respira interpret air quality?",
                "answer_en": "Proyecto Respira uses international air quality standards to classify the risk level and pair every measurement with practical recommendations for the public.",
                "question_pt": "Como o Proyecto Respira interpreta a qualidade do ar?",
                "answer_pt": "O Proyecto Respira utiliza padrões internacionais de qualidade do ar para classificar o nível de risco e acompanhar cada medição com recomendações práticas para a população.",
            },
        ],
    },
    {
        "slug": "sensor",
        "order": 2,
        "label_es": "El sensor",
        "label_en": "The sensor",
        "label_pt": "O sensor",
        "questions": [
            {
                "order": 0,
                "question_es": "¿Qué sensor voy a recibir?",
                "answer_es": "Proyecto Respira utiliza sensores de calidad del aire de grado comunitario con monitoreo continuo de partículas contaminantes y variables ambientales. El modelo podrá variar según el tipo de institución y el alcance del servicio contratado.",
                "question_en": "Which sensor will I receive?",
                "answer_en": "Proyecto Respira uses community-grade air quality sensors with continuous monitoring of particulate pollutants and environmental variables. The model may vary depending on the type of institution and the scope of the contracted service.",
                "question_pt": "Qual sensor vou receber?",
                "answer_pt": "O Proyecto Respira utiliza sensores de qualidade do ar de grau comunitário com monitoramento contínuo de partículas poluentes e variáveis ambientais. O modelo pode variar conforme o tipo de instituição e o alcance do serviço contratado.",
            },
            {
                "order": 1,
                "question_es": "¿Qué mide el sensor?",
                "answer_es": "Dependiendo del modelo instalado, el sensor puede medir:\n• PM2.5\n• PM10\n• Temperatura\n• Humedad\n• Presión atmosférica\n• Otros parámetros ambientales disponibles según el equipo.",
                "question_en": "What does the sensor measure?",
                "answer_en": "Depending on the model installed, the sensor can measure:\n• PM2.5\n• PM10\n• Temperature\n• Humidity\n• Atmospheric pressure\n• Other environmental parameters available on the device.",
                "question_pt": "O que o sensor mede?",
                "answer_pt": "Dependendo do modelo instalado, o sensor pode medir:\n• PM2.5\n• PM10\n• Temperatura\n• Umidade\n• Pressão atmosférica\n• Outros parâmetros ambientais disponíveis conforme o equipamento.",
            },
            {
                "order": 2,
                "question_es": "¿Cuál es el rango de cobertura del sensor?",
                "answer_es": "La cobertura depende del entorno donde se encuentre instalado el equipo. Como referencia, organismos internacionales como la EPA y la OMS consideran que una estación representa aproximadamente entre 1 y 4 km² en zonas urbanas, aunque este valor puede variar según la topografía, la densidad urbana, la presencia de edificios, el viento y las fuentes de contaminación cercanas.\nPor este motivo, Proyecto Respira recomienda interpretar las mediciones como representativas del área inmediata al sensor y no de una ciudad completa.",
                "question_en": "What is the sensor's coverage range?",
                "answer_en": "Coverage depends on the environment where the device is installed. As a reference, international bodies such as the EPA and the WHO consider that one station represents roughly 1 to 4 km² in urban areas, although this value can vary with topography, urban density, nearby buildings, wind and nearby pollution sources.\nFor this reason, Proyecto Respira recommends reading the measurements as representative of the area immediately around the sensor, not of an entire city.",
                "question_pt": "Qual é o alcance de cobertura do sensor?",
                "answer_pt": "A cobertura depende do ambiente onde o equipamento está instalado. Como referência, organismos internacionais como a EPA e a OMS consideram que uma estação representa aproximadamente entre 1 e 4 km² em áreas urbanas, embora esse valor possa variar conforme a topografia, a densidade urbana, a presença de edifícios, o vento e as fontes de poluição próximas.\nPor esse motivo, o Proyecto Respira recomenda interpretar as medições como representativas da área imediata ao sensor e não de uma cidade inteira.",
            },
            {
                "order": 3,
                "question_es": "¿Cuál es el margen de error del sensor?",
                "answer_es": "Los sensores utilizados por Proyecto Respira ofrecen una alta precisión para monitoreo continuo y siguen estándares ampliamente utilizados por redes comunitarias de calidad del aire. Como cualquier instrumento de medición, pueden presentar pequeñas variaciones respecto a estaciones de referencia, especialmente bajo determinadas condiciones ambientales.\nProyecto Respira realiza procesos de calibración, mantenimiento y control de calidad para garantizar mediciones confiables.",
                "question_en": "What is the sensor's margin of error?",
                "answer_en": "The sensors used by Proyecto Respira offer high accuracy for continuous monitoring and follow standards widely used by community air quality networks. Like any measuring instrument, they can show small variations compared to reference stations, especially under certain environmental conditions.\nProyecto Respira runs calibration, maintenance and quality control processes to guarantee reliable measurements.",
                "question_pt": "Qual é a margem de erro do sensor?",
                "answer_pt": "Os sensores utilizados pelo Proyecto Respira oferecem alta precisão para monitoramento contínuo e seguem padrões amplamente utilizados por redes comunitárias de qualidade do ar. Como qualquer instrumento de medição, podem apresentar pequenas variações em relação a estações de referência, especialmente sob determinadas condições ambientais.\nO Proyecto Respira realiza processos de calibração, manutenção e controle de qualidade para garantir medições confiáveis.",
            },
            {
                "order": 4,
                "question_es": "¿Dónde debe instalarse el sensor?",
                "answer_es": "El sensor debe instalarse en un lugar abierto, con buena circulación de aire y lejos de fuentes directas de contaminación o de obstáculos que puedan alterar las mediciones, como vapor o humo. Proyecto Respira acompaña a la institución durante la definición del mejor punto de instalación.",
                "question_en": "Where should the sensor be installed?",
                "answer_en": "The sensor must be installed in an open location with good air circulation, away from direct pollution sources or obstacles that could distort the readings, such as steam or smoke. Proyecto Respira supports the institution in choosing the best installation point.",
                "question_pt": "Onde o sensor deve ser instalado?",
                "answer_pt": "O sensor deve ser instalado em um local aberto, com boa circulação de ar e longe de fontes diretas de poluição ou de obstáculos que possam alterar as medições, como vapor ou fumaça. O Proyecto Respira acompanha a instituição na definição do melhor ponto de instalação.",
            },
            {
                "order": 5,
                "question_es": "¿Qué sucede si el sensor deja de funcionar?",
                "answer_es": "El equipo monitorea continuamente su estado de funcionamiento. Ante una falla, Proyecto Respira realiza el diagnóstico correspondiente y coordina el mantenimiento o reemplazo cuando sea necesario, según las condiciones del servicio contratado.",
                "question_en": "What happens if the sensor stops working?",
                "answer_en": "The device continuously monitors its own operating status. In the event of a failure, Proyecto Respira runs the corresponding diagnosis and arranges maintenance or replacement when needed, according to the terms of the contracted service.",
                "question_pt": "O que acontece se o sensor parar de funcionar?",
                "answer_pt": "O equipamento monitora continuamente seu estado de funcionamento. Diante de uma falha, o Proyecto Respira realiza o diagnóstico correspondente e coordena a manutenção ou substituição quando necessário, conforme as condições do serviço contratado.",
            },
            {
                "order": 6,
                "question_es": "¿El sensor necesita mantenimiento?",
                "answer_es": "Sí. Requiere mantenimiento preventivo periódico para garantizar la calidad de las mediciones.",
                "question_en": "Does the sensor need maintenance?",
                "answer_en": "Yes. It requires periodic preventive maintenance to guarantee the quality of the measurements.",
                "question_pt": "O sensor precisa de manutenção?",
                "answer_pt": "Sim. Requer manutenção preventiva periódica para garantir a qualidade das medições.",
            },
        ],
    },
    {
        "slug": "leasing",
        "order": 3,
        "label_es": "Sensor Leasing",
        "label_en": "Sensor Leasing",
        "label_pt": "Sensor Leasing",
        "questions": [
            {
                "order": 0,
                "question_es": "¿Por qué una institución necesita medir la calidad del aire?",
                "answer_es": "Porque la contaminación del aire no siempre es visible y puede afectar la salud, el aprendizaje y las actividades al aire libre. Contar con información local permite tomar decisiones basadas en datos objetivos y no únicamente en percepción visual o noticias.",
                "question_en": "Why does an institution need to measure air quality?",
                "answer_en": "Because air pollution is not always visible and can affect health, learning and outdoor activities. Having local information makes it possible to decide based on objective data rather than on visual perception or news reports alone.",
                "question_pt": "Por que uma instituição precisa medir a qualidade do ar?",
                "answer_pt": "Porque a poluição do ar nem sempre é visível e pode afetar a saúde, o aprendizado e as atividades ao ar livre. Contar com informações locais permite tomar decisões baseadas em dados objetivos e não apenas na percepção visual ou em notícias.",
            },
            {
                "order": 1,
                "question_es": "¿Cómo se justifica la inversión?",
                "answer_es": "El servicio no consiste únicamente en un sensor. Incluye:\n• Instalación.\n• Monitoreo continuo.\n• Mantenimiento.\n• Plataforma web.\n• Aplicación móvil.\n• Alertas automáticas.\n• Reportes mensuales.\n• Historial de mediciones.\n• Recomendaciones para la toma de decisiones.",
                "question_en": "How is the investment justified?",
                "answer_en": "The service is not just a sensor. It includes:\n• Installation.\n• Continuous monitoring.\n• Maintenance.\n• Web platform.\n• Mobile app.\n• Automatic alerts.\n• Monthly reports.\n• Measurement history.\n• Recommendations to support decision-making.",
                "question_pt": "Como se justifica o investimento?",
                "answer_pt": "O serviço não consiste apenas em um sensor. Inclui:\n• Instalação.\n• Monitoramento contínuo.\n• Manutenção.\n• Plataforma web.\n• Aplicativo móvel.\n• Alertas automáticos.\n• Relatórios mensais.\n• Histórico de medições.\n• Recomendações para a tomada de decisões.",
            },
            {
                "order": 2,
                "question_es": "¿Cuál es el beneficio de tener un sensor de calidad del aire de Proyecto Respira?",
                "answer_es": "Proyecto Respira transforma datos ambientales en información útil para la toma de decisiones. La plataforma incorpora recomendaciones prácticas, reportes interpretados, alertas y visualizaciones que permiten actuar rápidamente para proteger la salud de estudiantes, colaboradores y comunidades.",
                "question_en": "What is the benefit of having a Proyecto Respira air quality sensor?",
                "answer_en": "Proyecto Respira turns environmental data into information that is useful for decision-making. The platform includes practical recommendations, interpreted reports, alerts and visualizations that make it possible to act quickly to protect the health of students, staff and communities.",
                "question_pt": "Qual é o benefício de ter um sensor de qualidade do ar do Proyecto Respira?",
                "answer_pt": "O Proyecto Respira transforma dados ambientais em informações úteis para a tomada de decisões. A plataforma incorpora recomendações práticas, relatórios interpretados, alertas e visualizações que permitem agir rapidamente para proteger a saúde de estudantes, colaboradores e comunidades.",
            },
            {
                "order": 3,
                "question_es": "¿Qué incluye el servicio?",
                "answer_es": "El programa Sensor Leasing incluye:\n• Instalación del sensor.\n• Configuración inicial.\n• Mantenimiento.\n• Monitoreo continuo.\n• Acceso a la plataforma web.\n• Aplicación móvil.\n• Alertas automáticas.\n• Reportes mensuales.\n• Soporte técnico.",
                "question_en": "What does the service include?",
                "answer_en": "The Sensor Leasing program includes:\n• Sensor installation.\n• Initial setup.\n• Maintenance.\n• Continuous monitoring.\n• Access to the web platform.\n• Mobile app.\n• Automatic alerts.\n• Monthly reports.\n• Technical support.",
                "question_pt": "O que o serviço inclui?",
                "answer_pt": "O programa Sensor Leasing inclui:\n• Instalação do sensor.\n• Configuração inicial.\n• Manutenção.\n• Monitoramento contínuo.\n• Acesso à plataforma web.\n• Aplicativo móvel.\n• Alertas automáticos.\n• Relatórios mensais.\n• Suporte técnico.",
            },
            {
                "order": 4,
                "question_es": "¿Qué no incluye el servicio?",
                "answer_es": "El servicio cubre la provisión del sensor, su instalación, mantenimiento, acceso a la plataforma, reportes y soporte técnico. Obras civiles, infraestructura eléctrica especial o requerimientos fuera del alcance del proyecto podrán presupuestarse por separado cuando corresponda.",
                "question_en": "What is not included in the service?",
                "answer_en": "The service covers supplying the sensor, its installation, maintenance, platform access, reports and technical support. Civil works, special electrical infrastructure or requirements outside the project's scope may be quoted separately where applicable.",
                "question_pt": "O que o serviço não inclui?",
                "answer_pt": "O serviço cobre o fornecimento do sensor, sua instalação, manutenção, acesso à plataforma, relatórios e suporte técnico. Obras civis, infraestrutura elétrica especial ou requisitos fora do escopo do projeto poderão ser orçados separadamente quando for o caso.",
            },
            {
                "order": 5,
                "question_es": "¿Cómo funciona el proceso de contratación?",
                "answer_es": "La institución completa el formulario de solicitud en Proyecto Respira. Posteriormente:\n1. Analizamos las necesidades de la institución.\n2. Presentamos una propuesta comercial.\n3. Realizamos una demostración del proyecto.\n4. Una vez aprobada la propuesta, instalamos el sensor, configuramos la plataforma y realizamos la capacitación inicial.",
                "question_en": "How does the contracting process work?",
                "answer_en": "The institution fills out the request form on Proyecto Respira. After that:\n1. We analyze the institution's needs.\n2. We present a commercial proposal.\n3. We run a demonstration of the project.\n4. Once the proposal is approved, we install the sensor, configure the platform and deliver the initial training.",
                "question_pt": "Como funciona o processo de contratação?",
                "answer_pt": "A instituição preenche o formulário de solicitação no Proyecto Respira. Em seguida:\n1. Analisamos as necessidades da instituição.\n2. Apresentamos uma proposta comercial.\n3. Realizamos uma demonstração do projeto.\n4. Uma vez aprovada a proposta, instalamos o sensor, configuramos a plataforma e realizamos a capacitação inicial.",
            },
            {
                "order": 6,
                "question_es": "¿Cuánto tiempo lleva la instalación?",
                "answer_es": "Una vez aprobada la propuesta comercial y coordinada la visita técnica, la instalación y configuración inicial normalmente pueden completarse en una sola jornada, dependiendo de las características del sitio.",
                "question_en": "How long does installation take?",
                "answer_en": "Once the commercial proposal is approved and the technical visit is scheduled, installation and initial setup can normally be completed in a single day, depending on the characteristics of the site.",
                "question_pt": "Quanto tempo leva a instalação?",
                "answer_pt": "Uma vez aprovada a proposta comercial e agendada a visita técnica, a instalação e a configuração inicial normalmente podem ser concluídas em um único dia, dependendo das características do local.",
            },
            {
                "order": 7,
                "question_es": "¿Necesito conocimientos técnicos para utilizar la plataforma?",
                "answer_es": "No. Proyecto Respira está diseñado para que cualquier persona pueda interpretar fácilmente la información mediante indicadores, recomendaciones y alertas.",
                "question_en": "Do I need technical knowledge to use the platform?",
                "answer_en": "No. Proyecto Respira is designed so that anyone can easily interpret the information through indicators, recommendations and alerts.",
                "question_pt": "Preciso de conhecimentos técnicos para usar a plataforma?",
                "answer_pt": "Não. O Proyecto Respira foi projetado para que qualquer pessoa possa interpretar facilmente as informações por meio de indicadores, recomendações e alertas.",
            },
        ],
    },
    {
        "slug": "alerts",
        "order": 4,
        "label_es": "Alertas y aplicación",
        "label_en": "Alerts and the app",
        "label_pt": "Alertas e aplicativo",
        "questions": [
            {
                "order": 0,
                "question_es": "¿Quién recibe las alertas?",
                "answer_es": "Cualquier persona puede seguir un sensor específico desde la aplicación móvil de Proyecto Respira y recibir notificaciones push cuando la calidad del aire alcance niveles definidos para ese sensor.",
                "question_en": "Who receives the alerts?",
                "answer_en": "Anyone can follow a specific sensor from the Proyecto Respira mobile app and receive push notifications when air quality reaches the levels defined for that sensor.",
                "question_pt": "Quem recebe os alertas?",
                "answer_pt": "Qualquer pessoa pode seguir um sensor específico pelo aplicativo móvel do Proyecto Respira e receber notificações push quando a qualidade do ar atingir os níveis definidos para esse sensor.",
            },
            {
                "order": 1,
                "question_es": "¿Puedo seguir más de un sensor?",
                "answer_es": "Inicialmente cada dispositivo podrá seguir un sensor como favorito. El usuario podrá cambiar el sensor seguido en cualquier momento desde la aplicación.",
                "question_en": "Can I follow more than one sensor?",
                "answer_en": "Initially each device can follow one sensor as a favorite. You can change the sensor you follow at any time from the app.",
                "question_pt": "Posso seguir mais de um sensor?",
                "answer_pt": "Inicialmente cada dispositivo poderá seguir um sensor como favorito. O usuário poderá alterar o sensor seguido a qualquer momento pelo aplicativo.",
            },
            {
                "order": 2,
                "question_es": "¿Los usuarios verán automáticamente la información?",
                "answer_es": "Sí. Toda persona que instale la aplicación móvil de Proyecto Respira o visite la página web podrá consultar la calidad del aire de una región o de un sensor específico cuando esa información sea pública.",
                "question_en": "Will users see the information automatically?",
                "answer_en": "Yes. Anyone who installs the Proyecto Respira mobile app or visits the website can check the air quality of a region or of a specific sensor whenever that information is public.",
                "question_pt": "Os usuários verão automaticamente as informações?",
                "answer_pt": "Sim. Toda pessoa que instalar o aplicativo móvel do Proyecto Respira ou visitar o site poderá consultar a qualidade do ar de uma região ou de um sensor específico quando essa informação for pública.",
            },
            {
                "order": 3,
                "question_es": "¿Qué ocurre si la calidad del aire es mala y no sé qué hacer?",
                "answer_es": "Proyecto Respira no solo informa el estado del aire; también muestra recomendaciones adaptadas al nivel de contaminación registrado, ayudando a instituciones y ciudadanos a tomar decisiones para proteger la salud.",
                "question_en": "What if air quality is poor and I don't know what to do?",
                "answer_en": "Proyecto Respira does more than report the state of the air: it also shows recommendations tailored to the pollution level recorded, helping institutions and citizens make decisions that protect health.",
                "question_pt": "O que acontece se a qualidade do ar estiver ruim e eu não souber o que fazer?",
                "answer_pt": "O Proyecto Respira não apenas informa o estado do ar; também mostra recomendações adaptadas ao nível de poluição registrado, ajudando instituições e cidadãos a tomar decisões para proteger a saúde.",
            },
        ],
    },
    {
        "slug": "privacy",
        "order": 5,
        "label_es": "Privacidad y datos",
        "label_en": "Privacy and data",
        "label_pt": "Privacidade e dados",
        "questions": [
            {
                "order": 0,
                "question_es": "¿Proyecto Respira recopila datos personales?",
                "answer_es": "La plataforma únicamente recopila la información necesaria para brindar el servicio. El monitoreo de calidad del aire no implica la captura de información personal de las personas que se encuentran cerca del sensor.",
                "question_en": "Does Proyecto Respira collect personal data?",
                "answer_en": "The platform only collects the information needed to provide the service. Air quality monitoring does not involve capturing personal information about the people near the sensor.",
                "question_pt": "O Proyecto Respira coleta dados pessoais?",
                "answer_pt": "A plataforma coleta apenas as informações necessárias para prestar o serviço. O monitoramento da qualidade do ar não implica a captura de informações pessoais das pessoas que estão perto do sensor.",
            },
            {
                "order": 1,
                "question_es": "¿Quién puede acceder a la información del sensor?",
                "answer_es": "La información pública puede consultarse desde la plataforma web y la aplicación móvil cuando el sensor sea de acceso público. Algunas funcionalidades adicionales, como reportes institucionales o configuraciones específicas, están disponibles únicamente para la institución responsable del sensor.",
                "question_en": "Who can access the sensor's information?",
                "answer_en": "Public information can be consulted from the web platform and the mobile app whenever the sensor is publicly accessible. Some additional features, such as institutional reports or specific settings, are available only to the institution responsible for the sensor.",
                "question_pt": "Quem pode acessar as informações do sensor?",
                "answer_pt": "As informações públicas podem ser consultadas na plataforma web e no aplicativo móvel quando o sensor for de acesso público. Algumas funcionalidades adicionais, como relatórios institucionais ou configurações específicas, estão disponíveis apenas para a instituição responsável pelo sensor.",
            },
            {
                "order": 2,
                "question_es": "¿Los datos pertenecen a la institución?",
                "answer_es": "Las mediciones corresponden al sensor instalado en la institución y forman parte de la red de monitoreo de Proyecto Respira. El uso y publicación de los datos se realizan conforme a los términos del servicio y a la política de datos abiertos del proyecto, cuando corresponda.",
                "question_en": "Does the data belong to the institution?",
                "answer_en": "The measurements correspond to the sensor installed at the institution and are part of the Proyecto Respira monitoring network. Data use and publication follow the terms of service and the project's open data policy where applicable.",
                "question_pt": "Os dados pertencem à instituição?",
                "answer_pt": "As medições correspondem ao sensor instalado na instituição e fazem parte da rede de monitoramento do Proyecto Respira. O uso e a publicação dos dados são realizados conforme os termos do serviço e a política de dados abertos do projeto, quando aplicável.",
            },
        ],
    },
]


def seed_faq(apps, schema_editor):
    FaqCategory = apps.get_model("api", "FaqCategory")
    FaqQuestion = apps.get_model("api", "FaqQuestion")

    for category_data in SEED:
        questions = category_data.pop("questions")
        category, created = FaqCategory.objects.get_or_create(
            slug=category_data["slug"], defaults=category_data
        )
        if not created:
            # A category with this slug already exists (someone created it in the
            # admin before the migration ran); leave it and its questions alone.
            continue
        FaqQuestion.objects.bulk_create(
            FaqQuestion(category=category, **question) for question in questions
        )


def unseed_faq(apps, schema_editor):
    FaqCategory = apps.get_model("api", "FaqCategory")
    # Questions cascade with their category.
    FaqCategory.objects.filter(slug__in=[c["slug"] for c in SEED]).delete()


class Migration(migrations.Migration):
    dependencies = [("api", "0004_faqcategory_faqquestion")]

    operations = [migrations.RunPython(seed_faq, unseed_faq)]
