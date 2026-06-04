import { Project, JournalPost } from './types';

export const PROJECTS: Project[] = [
  {
    id: 'robot-energy',
    title: 'Robot Energy & Peace',
    category: 'E-commerce / Beverage',
    imageUrl: '/RobotEnergy.webp',
    url: 'https://www.robotenergy.com/',
    description: 'Plataforma Shopify personalizada para una marca de bebidas premium, con un diseño inmersivo y enfocado en la conversión.',
    detailedDescription: 'Desarrollo de una plataforma de comercio electrónico de alto rendimiento en Shopify. Diseñada con una estética moderna e inmersiva que guía al usuario hacia la conversión mediante interacciones fluidas y un rendimiento altamente optimizado.',
    client: 'Robot Energy',
    year: '2024',
    services: ['Shopify Development', 'UI/UX Design', 'E-Commerce Strategy'],
    colSpanDesktop: 8,
    aspectRatio: 'aspect-[16/9]'
  },
  {
    id: 'madre-superiora',
    title: 'Madre Superiora',
    category: 'E-commerce / Lifestyle',
    imageUrl: '/madresuperiora.webp',
    url: 'https://madresuperioracoffee.com',
    description: 'Tienda online para una marca de café de especialidad. Foco en la estética editorial y narrativa de producto premium.',
    detailedDescription: 'Desarrollo de un e-commerce inmersivo con estética editorial. El enfoque principal fue transmitir la esencia premium del café de especialidad mediante un diseño limpio, grandes tipografías y una experiencia de compra fluida.',
    client: 'Madre Superiora Coffee',
    year: '2024',
    services: ['Web Design', 'E-Commerce', 'Frontend Development'],
    colSpanDesktop: 4,
    marginTopDesktop: 'md:mt-24',
    aspectRatio: 'aspect-[4/5]'
  },
  {
    id: 'autotietz',
    title: 'AutoTietz',
    category: 'Automotive / Sales',
    imageUrl: '/autotietz.webp',
    url: 'https://www.autotietz.com/',
    description: 'Portal de compraventa de vehículos con una experiencia de usuario fluida y sistemas de filtrado avanzados.',
    detailedDescription: 'Diseño e implementación de un portal avanzado para la compra y venta de vehículos. Integración de potentes sistemas de filtrado de búsqueda y una arquitectura de información orientada a facilitar la toma de decisiones del usuario.',
    client: 'AutoTietz',
    year: '2023',
    services: ['UX/UI Design', 'Advanced Filtering', 'Portal Development'],
    colSpanDesktop: 5,
    marginTopDesktop: 'md:-mt-12',
    aspectRatio: 'aspect-square'
  },
  {
    id: 'b2tech',
    title: 'B2Tech',
    category: 'Technology / B2B',
    imageUrl: '/b2tech.webp',
    url: 'https://b2tech.augustocs.com/',
    isDemo: true,
    description: 'Branding corporativo y técnico para una consultoría de Ingeniería Cloud e IoT.',
    detailedDescription: 'Creación de una identidad visual técnica y un sitio web corporativo robusto para representar servicios avanzados de Ingeniería Cloud y soluciones IoT para el sector B2B.',
    client: 'B2Tech',
    year: '2023',
    services: ['Corporate Branding', 'Web Development', 'B2B Strategy'],
    colSpanDesktop: 7,
    marginTopDesktop: 'md:mt-12',
    aspectRatio: 'aspect-[16/9]'
  },
  {
    id: 'nova-restaurante',
    title: 'Nova Restaurante',
    category: 'Restaurant / E-commerce',
    imageUrl: '/nova.webp',
    url: 'https://nova.augustocs.com/',
    isDemo: true,
    description: 'Gastronomía mediterránea con producto de temporada, técnica respetuosa y la sal del mar.',
    detailedDescription: 'En Restaurante Nova creemos que la cocina mediterránea es la más honesta del mundo. Producto de temporada, técnica respetuosa y la sal del mar que baña nuestra ciudad. Paella de mariscos con arroz bomba y azafrán de La Mancha. Lubina a la sal del Mediterráneo. Pulpo gallego braseado. El mejor producto, sin artificios.',
    client: 'Nova Restaurante',
    year: '2024',
    services: ['Digital Platform', 'UI/UX Design', 'Restaurant E-commerce'],
    colSpanDesktop: 5,
    marginTopDesktop: 'md:mt-10',
    aspectRatio: 'aspect-[16/9]'
  },
  {
    id: 'odentrics',
    title: 'Odentrics',
    category: 'Healthcare / Dental',
    imageUrl: '/odentrics.webp',
    url: 'http://odentrics.augustocs.com/',
    isDemo: true,
    description: 'Diseño moderno y profesional para una clínica dental, enfocado en generar confianza y facilitar la captación de pacientes.',
    detailedDescription: 'Desarrollo de una landing page optimizada para conversión en el sector salud. Destaca por una estética limpia y serena, integrando testimonios y llamadas a la acción claras para la solicitud de citas online.',
    client: 'Odentrics',
    year: '2026',
    services: ['Web Design', 'UI/UX Healthcare', 'Frontend Development'],
    colSpanDesktop: 7,
    marginTopDesktop: 'md:mt-12',
    aspectRatio: 'aspect-[16/9]'
  },
  {
    id: 'latrattoria',
    title: 'La Trattoria',
    category: 'Restaurant / Dining',
    imageUrl: '/latrattoria.webp',
    url: 'https://latrattoria.augustocs.com',
    isDemo: true,
    description: 'Diseño elegante y apetecible para un restaurante italiano, destacando su menú y atmósfera auténtica.',
    detailedDescription: 'Creación de una experiencia web inmersiva para un restaurante tradicional italiano. El diseño se centra en resaltar la calidad de los ingredientes y la calidez del local, facilitando las reservas online.',
    client: 'La Trattoria',
    year: '2026',
    services: ['Web Design', 'Frontend Development', 'Restaurant Booking'],
    colSpanDesktop: 5,
    marginTopDesktop: 'md:mt-16',
    aspectRatio: 'aspect-[3/2]'
  },
  {
    id: 'building-new',
    title: 'Próximamente',
    category: 'Work in progress',
    imageUrl: '', // This will show a grey placeholder if the url is empty
    url: '#',
    isDemo: false,
    isBuilding: true,
    description: 'Nuevo proyecto en desarrollo. Próximamente disponible.',
    detailedDescription: 'Estamos cocinando algo nuevo. Vuelve pronto para ver el resultado de este proyecto en fase de desarrollo.',
    client: 'Confidential',
    year: '2026',
    services: ['Design', 'Development'],
    colSpanDesktop: 7,
    marginTopDesktop: 'md:mt-8',
    aspectRatio: 'aspect-[16/9]'
  }
];

export const JOURNAL_POSTS: JournalPost[] = [
  {
    id: 'art-of-whitespace',
    title: 'El Arte del Espacio en Blanco en el Diseño de Interfaces',
    date: 'May 18, 2026',
    readTime: '4 min lectura',
    category: 'Filosofía de Diseño',
    excerpt: 'Cómo tratar el espacio negativo como un elemento activo puede transformar información compleja en una experiencia intuitiva.'
  },
  {
    id: 'fluid-microinteractions',
    title: 'Refinando las Microinteracciones y Tiempos de Respuesta',
    date: 'April 29, 2026',
    readTime: '6 min lectura',
    category: 'Ingeniería',
    excerpt: 'Profundizando en las curvas Bezier cúbicas para lograr interfaces ligeras que responden con el peso y calidad física del lujo.'
  },
  {
    id: 'tactile-dark-mode',
    title: 'Más allá del negro absoluto: Modos oscuros texturizados',
    date: 'March 14, 2026',
    readTime: '5 min lectura',
    category: 'Estética',
    excerpt: 'Por qué el alto contraste no significa blanco y negro puro, y cómo los tonos sutiles mantienen el estatus premium visual.'
  }
];
