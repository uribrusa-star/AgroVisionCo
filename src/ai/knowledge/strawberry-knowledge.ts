/**
 * Base de conocimiento técnica especializada para la producción de frutilla en Coronda, Santa Fe.
 * Esta información se utiliza para enriquecer el contexto del Chat Experto.
 */

export const strawberryKnowledgeBase = {
    varieties: {
        'San Andreas': {
            description: 'Variedad de día neutro, muy popular en Coronda por su alta productividad y calidad de fruta.',
            management: 'Requiere un manejo preciso del nitrógeno para evitar exceso de follaje. Sensible a la salinidad.',
            strengths: 'Fruta firme, buen sabor, excelente post-cosecha.',
            weaknesses: 'Susceptible a enfermedades de corona si el suelo no está bien drenado.'
        },
        'Marisma': {
            description: 'Variedad de día corto, adaptada a climas templados.',
            management: 'Suele tener una cosecha más concentrada. Requiere monitoreo intensivo de plagas durante el pico de producción.',
            strengths: 'Gran tamaño de fruta, color rojo intenso.',
            weaknesses: 'Susceptible a Botrytis en condiciones de alta humedad.'
        },
        'Cleopatra': {
            description: 'Variedad de día corto con muy buena adaptación local.',
            management: 'Vigorosa, requiere distanciamientos adecuados para evitar problemas sanitarios.',
            strengths: 'Alta precocidad, muy buen sabor.',
            weaknesses: 'Requiere control estricto de riego para evitar rajado de fruta.'
        }
    },
    regionalContext: {
        'Coronda': {
            soil: 'Suelos franco-arenosos con buen drenaje. pH ideal entre 5.8 y 6.5.',
            climate: 'Influencia del Río Paraná, alta humedad relativa. Riesgo de heladas tardías en septiembre.',
            pests: ['Araña Roja (Tetranychus urticae)', 'Trips', 'Pulgones'],
            diseases: ['Botrytis (Podredumbre gris)', 'Antracnosis', 'Oídio']
        }
    },
    technicalParameters: {
        irrigation: {
            method: 'Riego por goteo localizado.',
            frequency: 'Diario en etapas críticas, ajustado según evapotranspiración (ETc).',
            water_quality: 'Controlar conductividad eléctrica (CE) < 1.0 dS/m para evitar estrés salino.'
        },
        fertilization: {
            base: 'N-P-K equilibrado en pre-plantación.',
            fertigation: 'Ajustar relación K/N según etapa (mayor K durante fructificación).'
        }
    }
};

/**
 * Función para obtener el conocimiento relevante basado en las variedades del establecimiento.
 */
export const getRelevantKnowledge = (varieties: string[]) => {
    let relevantText = "CONOCIMIENTO TÉCNICO ESPECIALIZADO:\n";
    
    varieties.forEach(v => {
        if (strawberryKnowledgeBase.varieties[v as keyof typeof strawberryKnowledgeBase.varieties]) {
            const info = strawberryKnowledgeBase.varieties[v as keyof typeof strawberryKnowledgeBase.varieties];
            relevantText += `- Variedad ${v}: ${info.description} Manejo: ${info.management} Fortalezas: ${info.strengths}\n`;
        }
    });

    relevantText += `\nCONTEXTO REGIONAL (Coronda):
- Suelo: ${strawberryKnowledgeBase.regionalContext.Coronda.soil}
- Clima: ${strawberryKnowledgeBase.regionalContext.Coronda.climate}
- Plagas/Enfermedades clave: ${strawberryKnowledgeBase.regionalContext.Coronda.pests.join(', ')}, ${strawberryKnowledgeBase.regionalContext.Coronda.diseases.join(', ')}\n`;

    return relevantText;
};
