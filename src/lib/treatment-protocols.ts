
export interface TreatmentProtocol {
    pestOrDisease: string;
    keywords: string[];
    activeIngredient: string;
    suggestedProduct: string;
    dosage: string;
    applicationMethod: string;
    frequency: string;
    safetyPeriod: string;
    notes: string;
}

export const TREATMENT_PROTOCOLS: TreatmentProtocol[] = [
    {
        pestOrDisease: "Arañuela Roja (Tetranychus urticae)",
        keywords: ["arañuela", "acaro", "spider mite"],
        activeIngredient: "Abamectina 1.8%",
        suggestedProduct: "Vertimec / Abamectina 1.8",
        dosage: "100-150 cc / 100L de agua",
        applicationMethod: "Pulverización foliar con buen mojado (envés de hoja)",
        frequency: "Repetir a los 7-10 días si la presión persiste",
        safetyPeriod: "3 días",
        notes: "Realizar las aplicaciones preferentemente por la tarde o mañana temprano. Rotar con Spirodiclofen para evitar resistencias."
    },
    {
        pestOrDisease: "Trips (Frankliniella occidentalis)",
        keywords: ["trips", "thrips"],
        activeIngredient: "Spinosad 48%",
        suggestedProduct: "Tracer / Spintor",
        dosage: "20-30 cc / 100L de agua",
        applicationMethod: "Pulverización dirigida a flores y frutos",
        frequency: "Máximo 3 aplicaciones por ciclo",
        safetyPeriod: "1 día",
        notes: "Esencial el monitoreo de flores. Aplicar cuando se detecten más de 2-3 individuos por flor."
    },
    {
        pestOrDisease: "Pulgón (Aphis gossypii / Capitophorus fragaefolii)",
        keywords: ["pulgon", "aphid"],
        activeIngredient: "Imidacloprid 35%",
        suggestedProduct: "Confidor / Glacoxan Imida",
        dosage: "50 cc / 100L de agua",
        applicationMethod: "Pulverización foliar o vía riego",
        frequency: "Cada 15 días según monitoreo",
        safetyPeriod: "7 días",
        notes: "Proteger enemigos naturales. Evitar aplicaciones en plena floración para proteger polinizadores."
    },
    {
        pestOrDisease: "Botrytis / Moho Gris (Botrytis cinerea)",
        keywords: ["botrytis", "moho gris", "podredumbre"],
        activeIngredient: "Fenhexamid 50%",
        suggestedProduct: "Teldor / Sumilex",
        dosage: "150 gr / 100L de agua",
        applicationMethod: "Cobertura total, foco en frutos",
        frequency: "Preventivo en floración y post-lluvias",
        safetyPeriod: "1 día",
        notes: "Eliminar frutos afectados del lote. Evitar excesos de humedad y nitrógeno."
    },
    {
        pestOrDisease: "Oidio (Podosphaera macularis)",
        keywords: ["oidio", "ceniza", "polvillo"],
        activeIngredient: "Azoxistrobina 25%",
        suggestedProduct: "Amistar / Ortiva",
        dosage: "40-60 cc / 100L de agua",
        applicationMethod: "Pulverización foliar",
        frequency: "Cada 10-14 días con condiciones favorables",
        safetyPeriod: "3 días",
        notes: "Monitorear envés de hojas. El azufre también es una opción efectiva en preventivo."
    },
    {
        pestOrDisease: "Antracnosis (Colletotrichum acutatum)",
        keywords: ["antracnosis", "mancha negra", "colletotrichum"],
        activeIngredient: "Piraclostrobina + Boscalid",
        suggestedProduct: "Bellis",
        dosage: "60 gr / 100L de agua",
        applicationMethod: "Pulverización foliar",
        frequency: "Cada 7-10 días ante síntomas",
        safetyPeriod: "3 días",
        notes: "Enfermedad grave. Desinfectar herramientas de poda y evitar trasplantes de plantas sospechosas."
    }
];

export const getProtocolForSanitaryLog = (productName: string, notes: string): TreatmentProtocol | null => {
    const textToSearch = `${productName} ${notes}`.toLowerCase();
    return TREATMENT_PROTOCOLS.find(protocol => 
        protocol.keywords.some(keyword => textToSearch.includes(keyword))
    ) || null;
};
