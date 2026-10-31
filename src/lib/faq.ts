export type FAQItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: '¿Es difícil de usar AgroVista?',
    answer:
      'Para nada. Diseñamos AgroVista para que sea tan fácil e intuitivo como usar tus redes sociales o WhatsApp. Los botones son grandes, claros y todo está en español. No necesitas conocimientos avanzados de tecnología para sacarle todo el provecho.',
  },
  {
    question: '¿Necesito internet en el campo para que funcione?',
    answer:
      'La aplicación está optimizada para cargar súper rápido incluso con muy mala señal (2G/3G). Si te quedas totalmente sin cobertura en medio de un lote, siempre puedes guardar tus registros en la libreta de tu celular y subirlos a AgroVista fácilmente ni bien regreses a un lugar con WiFi o mejor señal.',
  },
  {
    question: '¿Mis datos de producción y mapas son privados?',
    answer:
      'Totalmente. La privacidad de tu establecimiento es nuestra prioridad absoluta. Toda tu información agrícola, mapas de rendimiento y datos financieros están encriptados y solo tú (y a quienes decidas invitar a tu espacio de trabajo) tienen acceso a ellos.',
  },
  {
    question: '¿Puedo crear cuentas para mis empleados o mi ingeniero?',
    answer:
      '¡Sí! AgroVista es multi-usuario. Puedes invitar a tu ingeniero agrónomo con permisos especiales para que pueda ver la fenología y emitir diagnósticos, o crear cuentas limitadas para que tus encargados solo registren las cosechas diarias sin ver tus reportes financieros.',
  },
];
