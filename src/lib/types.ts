

export type UserRole = 'Productor' | 'Ingeniero Agronomo' | 'Encargado';

export type User = {
  id: string;
  name: string;
  email: string;
  notificationEmail?: string;
  avatar: string;
  role: UserRole;
  password?: string; // Added for mock authentication
};

export type Collector = {
  id:string;
  name: string;
  avatar: string;
  totalHarvested: number; // in kg
  hoursWorked: number;
  productivity: number; // kg per hour
  joinDate: string;
};

export type Packer = {
  id: string;
  name: string;
  avatar: string;
  totalPackaged: number; // in kg
  hoursWorked: number;
  packagingRate: number; // kg per hour
  joinDate: string;
};

export type Harvest = {
  id: string;
  date: string;
  batchNumber: string;
  kilograms: number;
  collector: {
    id: string;
    name: string;
  };
  traceabilityId: string;
};

export type Batch = {
  id: string;
  preloadedDate: string;
  status: 'pending' | 'completed';
  completionDate?: string;
}

export type MonthlyData = {
  month: string;
  total: number;
};

export type EngineerLogStats = {
  totalProduction: number;
  totalInputs: number;
  averagePrice: number;
  collectorCount: number;
};

export type AgronomistLogType = 
    | 'Fertilización' 
    | 'Fumigación' 
    | 'Control' 
    | 'Sanidad'
    | 'Labor Cultural'
    | 'Riego'
    | 'Condiciones Ambientales';

export type ImageWithHint = {
    url: string;
    hint?: string;
}

export type AgronomistLog = {
    id: string;
    date: string;
    type: AgronomistLogType;
    batchId?: string;
    product?: string;
    quantityUsed?: number;
    notes: string;
    images?: ImageWithHint[];
    diagnosis?: string;
    probability?: number;
}

export type PhenologyLog = {
    id: string;
    date: string;
    developmentState: 'Floración' | 'Fructificación' | 'Maduración';
    batchId?: string;
    flowerCount?: number;
    fruitCount?: number;
    notes: string;
    images?: ImageWithHint[];
}

export type SupplyType = 'Fertilizante' | 'Fungicida' | 'Insecticida' | 'Acaricida';

export type Supply = {
  id: string;
  name: string;
  type: SupplyType;
  photoUrl?: string;
  stock?: number;
  lowStockThreshold?: number;
  info: {
    activeIngredient: string;
    dose: string;
    notes?: string;
  };
};

export type PredictionLog = {
  id: string;
  date: string;
  batchId: string;
  prediction: string;
  confidence: 'Alta' | 'Media' | 'Baja';
};

export type DiagnosisResult = {
  diagnosticoPrincipal: string;
  posiblesDiagnosticos: {
    nombre: string;
    probabilidad: number;
    descripcion: string;
  }[];
  recomendacionGeneral: string;
};


export type DiagnosisLog = {
  id: string;
  date: string;
  batchId: string;
  result: DiagnosisResult;
  userCorrection?: string;
};


export type CollectorPaymentLog = {
  id: string;
  date: string;
  harvestId: string;
  collectorId: string;
  collectorName: string;
  kilograms: number;
  hours: number;
  ratePerKg: number;
  payment: number;
  traceabilityId: string;
}

export type PackagingLog = {
  id: string;
  date: string;
  packerId: string;
  packerName: string;
  kilogramsPackaged: number;
  hoursWorked: number;
  costPerHour: number;
  payment: number;
};

export type CulturalPracticeLog = {
    id: string;
    date: string;
    practiceType: string;
    personnelId: string;
    personnelName: string;
    personnelType: 'Recolector' | 'Embalador';
    hoursWorked: number;
    costPerHour: number;
    payment: number;
    notes: string;
    batchId?: string;
};

export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type TaskPriority = 'baja' | 'media' | 'alta';


export type Task = {
    id: string;
    title: string;
    description: string;
    assignedTo: { id: string, name: string };
    createdBy: { id: string, name: string };
    status: TaskStatus;
    priority: TaskPriority;
    materials?: { supplyId: string, name: string, quantity: number }[];
    createdAt: string;
    dueDate?: string;
};


export type EstablishmentData = {
  id: string;
  producer: string;
  technicalManager: string;
  location: {
    coordinates: string;
    locality: string;
    province: string;
  };
  area: {
    total: number;
    strawberry: number;
  };
  system: string;
  planting: {
    variety: string;
    date: string;
    origin: string;
    density: string;
    mulching: string;
  };
  soil: {
    type: string;
    analysis: boolean;
  };
  irrigation: {
    system: string;
    flowRate: string;
    frequency: string;
    waterAnalysis: boolean;
  };
  management: {
    weeds: string;
    sanitaryPlan: string;
  };
  harvest: {
    period: string;
    frequency: string;
    destination: string;
  };
  economics: {
    objective: string;
  };
  geoJsonData?: string;
};

export type ProducerLogType = 'Nota' | 'Actividad Omitida';

export type ProducerLog = {
    id: string;
    date: string;
    notes: string;
    type?: ProducerLogType;
    omittedActivity?: string;
    images?: ImageWithHint[];
}

export type Transaction = {
    id: string;
    date: string;
    type: 'Ingreso' | 'Gasto';
    category: string;
    description: string;
    amount: number;
    quantity?: number;
    unit?: string;
    pricePerUnit?: number;
}


export type AppData = {
  loading: boolean;
  currentUser: User | null;
  users: User[];
  setCurrentUser: (user: User | null, rememberMe?: boolean) => void;
  harvests: Harvest[];
  collectors: Collector[];
  packers: Packer[];
  packagingLogs: PackagingLog[];
  culturalPracticeLogs: CulturalPracticeLog[];
  agronomistLogs: AgronomistLog[];
  phenologyLogs: PhenologyLog[];
  predictionLogs: PredictionLog[];
  diagnosisLogs: DiagnosisLog[];
  supplies: Supply[];
  tasks: Task[];
  batches: Batch[];
  collectorPaymentLogs: CollectorPaymentLog[];
  establishmentData: EstablishmentData | null;
  producerLogs: ProducerLog[];
  transactions: Transaction[];
  addHarvest: (harvest: Omit<Harvest, 'id' | 'traceabilityId'>, hoursWorked: number) => Promise<string | undefined>;
  editCollector: (collector: Collector) => Promise<void>;
  deleteCollector: (collectorId: string) => void;
  addAgronomistLog: (log: Omit<AgronomistLog, 'id'>) => void;
  editAgronomistLog: (log: AgronomistLog) => void;
  deleteAgronomistLog: (logId: string) => void;
  addPhenologyLog: (log: Omit<PhenologyLog, 'id'>) => void;
  editPhenologyLog: (log: PhenologyLog) => void;
  deletePhenologyLog: (logId: string) => Promise<void>;
  addPredictionLog: (log: Omit<PredictionLog, 'id'>) => void;
  deletePredictionLog: (logId: string) => void;
  addDiagnosisLog: (log: Omit<DiagnosisLog, 'id'>) => void;
  deleteDiagnosisLog: (logId: string) => void;
  addSupply: (supply: Omit<Supply, 'id'>) => void;
  editSupply: (supply: Supply) => void;
  deleteSupply: (supplyId: string) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  addCollector: (collector: Omit<Collector, 'id'>) => void;
  addPacker: (packer: Omit<Packer, 'id'>) => Promise<void>;
  deletePacker: (packerId: string) => void;
  addPackagingLog: (log: Omit<PackagingLog, 'id'>) => void;
  deletePackagingLog: (logId: string) => Promise<void>;
  addCulturalPracticeLog: (log: Omit<CulturalPracticeLog, 'id'>) => void;
  deleteCulturalPracticeLog: (logId: string) => Promise<void>;
  addBatch: (batch: Omit<Batch, 'id' | 'status' | 'preloadedDate'> & { id: string, preloadedDate: string, status: string }) => void;
  deleteBatch: (batchId: string) => void;
  addCollectorPaymentLog: (log: Omit<CollectorPaymentLog, 'id' | 'traceabilityId'>) => void;
  deleteCollectorPaymentLog: (logId: string) => Promise<void>;
  updateEstablishmentData: (data: Partial<EstablishmentData>) => Promise<void>;
  addProducerLog: (log: Omit<ProducerLog, 'id'>) => void;
  deleteProducerLog: (logId: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (transactionId: string) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  updateUserProfile: (userId: string, profileData: { name: string; notificationEmail?: string }) => Promise<void>;
  isClient: boolean;
};
