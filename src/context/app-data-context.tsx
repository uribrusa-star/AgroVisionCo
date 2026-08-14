
'use client';

import React, { ReactNode, useState, useCallback, useEffect } from 'react';
import type { AppData, User, Harvest, Collector, AgronomistLog, PhenologyLog, Batch, CollectorPaymentLog, EstablishmentData, ProducerLog, Transaction, Packer, PackagingLog, CulturalPracticeLog, Supply, PredictionLog, DiagnosisLog, Task, TaskStatus, KnowledgeItem, ContactRequest, ContactRequestStatus } from '@/lib/types';
import { initialEstablishmentData, users as availableUsers } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { sendPushNotification } from "@/lib/send-push";
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where, addDoc, getDoc, orderBy, limit, onSnapshot, updateDoc } from 'firebase/firestore';
import { getRoleAvatar } from '@/lib/utils';
import { getBatchPhiStatus } from '@/lib/phi-utils';

export const AppDataContext = React.createContext<AppData>({
  loading: true,
  currentUser: null,
  users: [],
  setCurrentUser: () => {},
  harvests: [],
  collectors: [],
  packers: [],
  packagingLogs: [],
  culturalPracticeLogs: [],
  agronomistLogs: [],
  phenologyLogs: [],
  predictionLogs: [],
  diagnosisLogs: [],
  supplies: [],
  tasks: [],
  batches: [],
  collectorPaymentLogs: [],
  establishmentData: null,
  producerLogs: [],
  transactions: [],
  knowledgeBase: [],
  contactRequests: [],
  expertChatHistory: [],
  setExpertChatHistory: () => {},
  addContactRequest: async () => { throw new Error('Not implemented') },
  updateContactRequestStatus: async () => { throw new Error('Not implemented') },
  deleteContactRequest: async () => { throw new Error('Not implemented') },
  addHarvest: async () => { throw new Error('Not implemented') },
  addMultipleHarvests: async () => { throw new Error('Not implemented') },
  editHarvest: async () => { throw new Error('Not implemented') },
  editCollector: async () => { throw new Error('Not implemented') },
  deleteCollector: () => { throw new Error('Not implemented') },
  addAgronomistLog: async () => { throw new Error('Not implemented') },
  addMultipleAgronomistLogs: async () => { throw new Error('Not implemented') },
  editAgronomistLog: () => { throw new Error('Not implemented') },
  deleteAgronomistLog: () => { throw new Error('Not implemented') },
  addPhenologyLog: () => { throw new Error('Not implemented') },
  editPhenologyLog: () => { throw new Error('Not implemented') },
  deletePhenologyLog: async () => { throw new Error('Not implemented') },
  addPredictionLog: () => { throw new Error('Not implemented') },
  deletePredictionLog: () => { throw new Error('Not implemented') },
  addDiagnosisLog: () => { throw new Error('Not implemented') },
  deleteDiagnosisLog: () => { throw new Error('Not implemented') },
  addSupply: () => { throw new Error('Not implemented') },
  editSupply: () => { throw new Error('Not implemented') },
  deleteSupply: () => { throw new Error('Not implemented') },
  addTask: () => { throw new Error('Not implemented') },
  updateTaskStatus: () => { throw new Error('Not implemented') },
  deleteTask: () => { throw new Error('Not implemented') },
  addCollector: () => { throw new Error('Not implemented') },
  addPacker: async () => { throw new Error('Not implemented') },
  deletePacker: () => { throw new Error('Not implemented') },
  addPackagingLog: () => { throw new Error('Not implemented') },
  deletePackagingLog: async () => { throw new Error('Not implemented') },
  addCulturalPracticeLog: () => { throw new Error('Not implemented') },
  deleteCulturalPracticeLog: async () => { throw new Error('Not implemented') },
  addBatch: () => { throw new Error('Not implemented') },
  editBatch: async () => { throw new Error('Not implemented') },
  deleteBatch: () => { throw new Error('Not implemented') },
  addCollectorPaymentLog: () => { throw new Error('Not implemented') },
  deleteCollectorPaymentLog: async () => { throw new Error('Not implemented') },
  updateEstablishmentData: async () => { throw new Error('Not implemented') },
  addProducerLog: () => { throw new Error('Not implemented') },
  editProducerLog: () => { throw new Error('Not implemented') },
  deleteProducerLog: () => { throw new Error('Not implemented') },
  addTransaction: () => { throw new Error('Not implemented') },
  deleteTransaction: async () => { throw new Error('Not implemented') },
  addKnowledgeItem: async () => { throw new Error('Not implemented') },
  deleteKnowledgeItem: async () => { throw new Error('Not implemented') },
  updateUserPassword: async () => { throw new Error('Not implemented') },
  updateUserProfile: async () => { throw new Error('Not implemented') },
  saveFcmToken: async () => { throw new Error('Not implemented') },
  isClient: false
});

const usePersistentState = <T,>(key: string): [T, (value: T | null, rememberMe?: boolean) => void] => {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      try {
        const localItem = window.localStorage.getItem(key);
        if (localItem) return JSON.parse(localItem);
        const sessionItem = window.sessionStorage.getItem(key);
        if (sessionItem) return JSON.parse(sessionItem);
      } catch (error) {
        console.warn(`Error reading storage key “${key}”:`, error);
      }
    }
    return null as T;
  });

  // Load state from storage only on the client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const localItem = window.localStorage.getItem(key);
        if (localItem) {
          setState(JSON.parse(localItem));
          return;
        }

        const sessionItem = window.sessionStorage.getItem(key);
        if (sessionItem) {
          setState(JSON.parse(sessionItem));
          return;
        }
      } catch (error) {
        console.warn(`Error reading storage key “${key}”:`, error);
      }
    }
  }, [key]);

  const setPersistentState = (value: T | null, rememberMe: boolean = false) => {
    if (typeof window !== 'undefined') {
      // Clear both storages to ensure only one is used
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
      
      if (value !== null) {
        const storage: Storage = rememberMe ? window.localStorage : window.sessionStorage;
        storage.setItem(key, JSON.stringify(value));
      }
    }
    setState(value as T);
  };

  return [state, setPersistentState];
};

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    const [currentUser, setCurrentUser] = usePersistentState<User | null>('currentUser');
    const [users, setUsers] = useState<User[]>([]);
    const [harvests, setHarvests] = useState<Harvest[]>([]);
    const [collectors, setCollectors] = useState<Collector[]>([]);
    const [packers, setPackers] = useState<Packer[]>([]);
    const [packagingLogs, setPackagingLogs] = useState<PackagingLog[]>([]);
    const [culturalPracticeLogs, setCulturalPracticeLogs] = useState<CulturalPracticeLog[]>([]);
    const [agronomistLogs, setAgronomistLogs] = useState<AgronomistLog[]>([]);
    const [phenologyLogs, setPhenologyLogs] = useState<PhenologyLog[]>([]);
    const [predictionLogs, setPredictionLogs] = useState<PredictionLog[]>([]);
    const [diagnosisLogs, setDiagnosisLogs] = useState<DiagnosisLog[]>([]);
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [notifications, setNotifications] = useState<PushNotification[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [collectorPaymentLogs, setCollectorPaymentLogs] = useState<CollectorPaymentLog[]>([]);
    const [establishmentData, setEstablishmentData] = useState<EstablishmentData | null>(null);
    const [producerLogs, setProducerLogs] = useState<ProducerLog[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
    const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
    const [expertChatHistory, setExpertChatHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
      setLoading(false); // Since we initialize synchronously from localStorage, we can immediately stop loading
      
      // If client says we are logged out, ensure the server cookie is also cleared.
      // This prevents redirect loops if the user logged out while offline.
      if (!currentUser) {
          fetch('/api/logout', { method: 'POST' }).catch(() => {});
      }
    }, [currentUser]);

    const fetchAllData = useCallback(async (silent = true) => {
      if (!isClient) return;
      if (!silent) setLoading(true);

      // Timeout de seguridad: Si después de 12 segundos no han cargado los datos, forzamos el fin de 'loading'
      // para evitar que el usuario se quede atrapado en la pantalla de carga (común en iOS/Safari móvil).
      const timeoutId = setTimeout(() => {
        setLoading(currentLoading => {
          if (currentLoading) {
            console.warn("Fetch timeout reached. Forcing loading to false.");
            toast({
              title: "Carga demorada",
              description: "Estamos teniendo problemas para conectar. Mostrando datos disponibles.",
              variant: "default",
            });
            return false;
          }
          return currentLoading;
        });
      }, 12000);

      try {
        const usersCollectionRef = collection(db, 'users');
        const usersQuery = query(usersCollectionRef, where('establishmentId', '==', currentUser?.establishmentId || 'main'));
        const usersSnapshot = await getDocs(usersQuery);

            if (usersSnapshot.empty) {
              const batch = writeBatch(db);
              availableUsers.forEach(user => {
                  const userRef = doc(db, 'users', user.id);
                  batch.set(userRef, user);
              });
              await batch.commit();
              setUsers(availableUsers);
            } else {
              const fetchedUsers = usersSnapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data, avatar: getRoleAvatar(data.role || 'Productor') };
              }) as User[];
              // Deduplicate by ID to be absolutely sure
              const uniqueUsers = Array.from(new Map(fetchedUsers.map(u => [u.id, u])).values());
              setUsers(uniqueUsers);
            }

            // Función auxiliar para fallar con gracia si una colección falla (aislamiento de errores)
            const safeFetch = async <T,>(promise: Promise<T>, defaultValue: T): Promise<T> => {
                try {
                    return await promise;
                } catch (e) {
                    console.error("Error fetching specific collection:", e);
                    return defaultValue;
                }
            };

            const [
              establishmentDocSnap,
              collectorsSnapshot,
              packersSnapshot,
              harvestsSnapshot,
              agronomistLogsSnapshot,
              phenologyLogsSnapshot,
              predictionLogsSnapshot,
              diagnosisLogsSnapshot,
              suppliesSnapshot,
              tasksSnapshot,
              batchesSnapshot,
              collectorPaymentsSnapshot,
              packagingLogsSnapshot,
              culturalPracticeLogsSnapshot,
              producerLogsSnapshot,
              transactionsSnapshot,
              knowledgeSnapshot,
              contactRequestsSnapshot,
            ] = await Promise.all([
              safeFetch(getDoc(doc(db, 'establishment', currentUser?.establishmentId || 'main')), null),
              safeFetch(getDocs(query(collection(db, 'collectors'), where('establishmentId', '==', currentUser?.establishmentId || 'main'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'packers'), where('establishmentId', '==', currentUser?.establishmentId || 'main'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'harvests'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('date', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'agronomistLogs'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('date', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'phenologyLogs'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('date', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'predictionLogs'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('date', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'diagnosisLogs'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('date', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'supplies'), where('establishmentId', '==', currentUser?.establishmentId || 'main'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'tasks'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('createdAt', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'batches'), where('establishmentId', '==', currentUser?.establishmentId || 'main'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'collectorPaymentLogs'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('date', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'packagingLogs'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('date', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'culturalPracticeLogs'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('date', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'producerLogs'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('date', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'transactions'), where('establishmentId', '==', currentUser?.establishmentId || 'main'), orderBy('date', 'desc'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'knowledge'), where('establishmentId', '==', currentUser?.establishmentId || 'main'))), { docs: [] } as any),
              safeFetch(getDocs(query(collection(db, 'contactRequests'), orderBy('createdAt', 'desc'))), { docs: [] } as any),
            ]);
            
            if (establishmentDocSnap && establishmentDocSnap.exists()) {
              setEstablishmentData({ id: establishmentDocSnap.id, ...establishmentDocSnap.data() } as EstablishmentData);
            } else if (establishmentDocSnap && !establishmentDocSnap.exists()) {
              await setDoc(doc(db, 'establishment', currentUser?.establishmentId || 'main'), initialEstablishmentData);
              setEstablishmentData({ id: currentUser?.establishmentId || 'main', ...initialEstablishmentData });
            } else {
              // Si establishmentDocSnap === null (fallo de red/permisos), NO seteamos iniciales
              // para evitar que el usuario los guarde accidentalmente y sobrescriba la BD.
              console.warn("Fallo al cargar establecimiento, no se sobrescribirán los datos.");
            }

            setCollectors(collectorsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Collector[]);
            setPackers(packersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Packer[]);
            setHarvests(harvestsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Harvest[]);
            setAgronomistLogs(agronomistLogsSnapshot.docs.map((doc: any) => {
              const data = doc.data();
              return { id: doc.id, ...data, batchIds: data.batchIds || (data.batchId ? [data.batchId] : []) };
            }) as AgronomistLog[]);
            setPhenologyLogs(phenologyLogsSnapshot.docs.map((doc: any) => {
              const data = doc.data();
              return { id: doc.id, ...data, batchIds: data.batchIds || (data.batchId ? [data.batchId] : []) };
            }) as PhenologyLog[]);
            setPredictionLogs(predictionLogsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as PredictionLog[]);
            setDiagnosisLogs(diagnosisLogsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as DiagnosisLog[]);
            setSupplies(suppliesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Supply[]);
            setTasks(tasksSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Task[]);
            setBatches(batchesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Batch[]);
            setCollectorPaymentLogs(collectorPaymentsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as CollectorPaymentLog[]);
            setPackagingLogs(packagingLogsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as PackagingLog[]);
            setCulturalPracticeLogs(culturalPracticeLogsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as CulturalPracticeLog[]);
            setProducerLogs(producerLogsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as ProducerLog[]);
            setTransactions(transactionsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Transaction[]);
            setKnowledgeBase(knowledgeSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as KnowledgeItem[]);
            setContactRequests(contactRequestsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as ContactRequest[]);
            setPackagingLogs(packagingLogsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as PackagingLog[]);
            setCulturalPracticeLogs(culturalPracticeLogsSnapshot.docs.map((doc: any) => {
              const data = doc.data();
              return { id: doc.id, ...data, batchIds: data.batchIds || (data.batchId ? [data.batchId] : []) };
            }) as CulturalPracticeLog[]);
            setProducerLogs(producerLogsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as ProducerLog[]);
            setTransactions(transactionsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Transaction[]);
            setKnowledgeBase(knowledgeSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as KnowledgeItem[]);
        
      } catch (error) {
        console.error("Error fetching data from Firestore:", error);
        toast({
          title: "Error de Conexión",
          description: "No se pudieron cargar los datos correctamente. Verifique su conexión.",
          variant: "destructive",
        })
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }, [toast, isClient, currentUser]);
    
    // Set up real-time listener for notifications once currentUser is established
    useEffect(() => {
        if (!currentUser) {
            setNotifications([]);
            return;
        }

        const notifsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', currentUser.id),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(notifsQuery, (snapshot) => {
            const notifsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as PushNotification));
            setNotifications(notifsData);
        }, (error) => {
            console.error("Error listening to notifications:", error);
        });

        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
       if (currentUser) {
         fetchAllData();
       }
    }, [fetchAllData, currentUser]);
    
    // Helper function to remove undefined values before saving to Firestore
    const sanitizeForFirestore = (data: any) => {
        return Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== undefined)
        );
    };
    
    const addHarvest = async (harvestData: Omit<Harvest, 'id' | 'traceabilityId'>, hoursWorked: number, ratePerKg: number): Promise<string | undefined> => {
        const collector = collectors.find(c => c.id === harvestData.collector.id);
        if (!collector) {
            toast({ title: "Error", description: "Recolector no encontrado.", variant: "destructive"});
            return undefined;
        }

        const phiStatus = getBatchPhiStatus(harvestData.batchNumber, agronomistLogs, new Date(harvestData.date));
        if (phiStatus.isBlocked) {
            const unlockStr = phiStatus.unlockDate ? phiStatus.unlockDate.toLocaleDateString('es-ES') : '';
            toast({
                title: "⛔ BLOQUEO DE SEGURIDAD PHI",
                description: `El lote está en período de carencia por ${phiStatus.productName} hasta el ${unlockStr}. Estrictamente prohibido registrar cosecha.`,
                variant: "destructive"
            });
            return undefined;
        }

        try {
            const batch = writeBatch(db);
            
            const harvestDate = new Date(harvestData.date);
            const dateString = `${harvestDate.getFullYear()}${(harvestDate.getMonth() + 1).toString().padStart(2, '0')}${harvestDate.getDate().toString().padStart(2, '0')}`;
            
            // Correctly filter harvests for the same day to get the sequential number
            const todayStart = new Date(harvestDate.getFullYear(), harvestDate.getMonth(), harvestDate.getDate()).toISOString();
            const todayEnd = new Date(harvestDate.getFullYear(), harvestDate.getMonth(), harvestDate.getDate(), 23, 59, 59, 999).toISOString();

            const harvestsToday = harvests.filter(h => h.date >= todayStart && h.date <= todayEnd);
            const sequentialNumber = (harvestsToday.length + 1).toString().padStart(3, '0');
            const traceabilityId = `AGRO-${dateString}-${harvestData.batchNumber}-${sequentialNumber}`;

            const harvestWithTraceability: Omit<Harvest, 'id'> = {
              ...harvestData,
              traceabilityId,
            }

            const newHarvestRef = doc(collection(db, 'harvests'));
            batch.set(newHarvestRef, { ...harvestWithTraceability, establishmentId: currentUser?.establishmentId || 'main' });

            const collectorRef = doc(db, 'collectors', harvestData.collector.id);
            const newTotalHarvested = collector.totalHarvested + harvestData.kilograms;
            const newHoursWorked = collector.hoursWorked + hoursWorked;
            const updatedCollectorData = {
                totalHarvested: newTotalHarvested,
                hoursWorked: newHoursWorked,
                productivity: newHoursWorked > 0 ? newTotalHarvested / newHoursWorked : 0,
            };
            batch.update(collectorRef, updatedCollectorData);
            
            // Create and set the payment log in the same batch
            const newPaymentLogRef = doc(collection(db, 'collectorPaymentLogs'));
            const calculatedPayment = harvestData.kilograms * ratePerKg;
            const paymentLog: Omit<CollectorPaymentLog, 'id'> = {
              harvestId: newHarvestRef.id, 
              date: harvestData.date,
              collectorId: harvestData.collector.id,
              collectorName: collector.name,
              kilograms: harvestData.kilograms,
              hours: hoursWorked,
              ratePerKg: ratePerKg,
              payment: calculatedPayment,
              traceabilityId: traceabilityId, // Ensure traceabilityId is included
            };
            batch.set(newPaymentLogRef, { ...paymentLog, establishmentId: currentUser?.establishmentId || 'main' });

            await batch.commit();
            setCollectors(prev => prev.map(c => {
                if (c.id === harvestData.collector.id) {
                    return {
                        ...c,
                        totalHarvested: newTotalHarvested,
                        hoursWorked: newHoursWorked,
                        productivity: newHoursWorked > 0 ? newTotalHarvested / newHoursWorked : 0
                    };
                }
                return c;
            }));
            await fetchAllData();
            return newHarvestRef.id;

        } catch(error) {
            console.error("Failed to add harvest and payment:", error);
            toast({ title: "Error", description: "No se pudo guardar la cosecha y el pago.", variant: "destructive"});
            return undefined;
        }
    };

    const addMultipleHarvests = async (harvestsData: { harvest: Omit<Harvest, 'id' | 'traceabilityId'>, hoursWorked: number, ratePerKg: number }[]): Promise<void> => {
        for (const { harvest: hData } of harvestsData) {
            const phiStatus = getBatchPhiStatus(hData.batchNumber, agronomistLogs, new Date(hData.date));
            if (phiStatus.isBlocked) {
                const unlockStr = phiStatus.unlockDate ? phiStatus.unlockDate.toLocaleDateString('es-ES') : '';
                toast({
                    title: "⛔ BLOQUEO DE SEGURIDAD PHI",
                    description: `El lote ${hData.batchNumber} está en período de carencia por ${phiStatus.productName} hasta el ${unlockStr}. Operación abortada por seguridad fitosanitaria.`,
                    variant: "destructive"
                });
                return;
            }
        }

        try {
            const batch = writeBatch(db);
            let harvestsAdded = 0;
            const updatedCollectors = new Map<string, { totalHarvested: number; hoursWorked: number }>();
            const newHarvests: Harvest[] = [];
            const newPayments: CollectorPaymentLog[] = [];

            for (const { harvest: harvestData, hoursWorked, ratePerKg } of harvestsData) {
                const collector = collectors.find(c => c.id === harvestData.collector.id);
                if (!collector) {
                    console.error("Collector not found for id:", harvestData.collector.id);
                    continue; // skip
                }

                const harvestDate = new Date(harvestData.date);
                const dateString = `${harvestDate.getFullYear()}${(harvestDate.getMonth() + 1).toString().padStart(2, '0')}${harvestDate.getDate().toString().padStart(2, '0')}`;
                
                const todayStart = new Date(harvestDate.getFullYear(), harvestDate.getMonth(), harvestDate.getDate()).toISOString();
                const todayEnd = new Date(harvestDate.getFullYear(), harvestDate.getMonth(), harvestDate.getDate(), 23, 59, 59, 999).toISOString();
                const harvestsToday = harvests.filter(h => h.date >= todayStart && h.date <= todayEnd);
                
                const sequentialNumber = (harvestsToday.length + 1 + harvestsAdded).toString().padStart(3, '0');
                const traceabilityId = `AGRO-${dateString}-${harvestData.batchNumber}-${sequentialNumber}`;

                const harvestWithTraceability: Omit<Harvest, 'id'> = {
                  ...harvestData,
                  traceabilityId,
                }

                const newHarvestRef = doc(collection(db, 'harvests'));
                batch.set(newHarvestRef, { ...harvestWithTraceability, establishmentId: currentUser?.establishmentId || 'main' });

                const collectorRef = doc(db, 'collectors', harvestData.collector.id);
                const prevStats = updatedCollectors.get(harvestData.collector.id) || { totalHarvested: collector.totalHarvested, hoursWorked: collector.hoursWorked };
                const newTotalHarvested = prevStats.totalHarvested + harvestData.kilograms;
                const newHoursWorked = prevStats.hoursWorked + hoursWorked;
                updatedCollectors.set(harvestData.collector.id, { totalHarvested: newTotalHarvested, hoursWorked: newHoursWorked });

                const updatedCollectorData = {
                    totalHarvested: newTotalHarvested,
                    hoursWorked: newHoursWorked,
                    productivity: newHoursWorked > 0 ? newTotalHarvested / newHoursWorked : 0,
                };
                batch.update(collectorRef, updatedCollectorData);
                
                const newPaymentLogRef = doc(collection(db, 'collectorPaymentLogs'));
                const calculatedPayment = harvestData.kilograms * ratePerKg;
                const paymentLog: Omit<CollectorPaymentLog, 'id'> = {
                  harvestId: newHarvestRef.id, 
                  date: harvestData.date,
                  collectorId: harvestData.collector.id,
                  collectorName: collector.name,
                  kilograms: harvestData.kilograms,
                  hours: hoursWorked,
                  ratePerKg: ratePerKg,
                  payment: calculatedPayment,
                  traceabilityId,
                };
                batch.set(newPaymentLogRef, { ...paymentLog, establishmentId: currentUser?.establishmentId || 'main' });
                
                newHarvests.push({ id: newHarvestRef.id, ...harvestWithTraceability } as Harvest);
                newPayments.push({ id: newPaymentLogRef.id, ...paymentLog } as CollectorPaymentLog);
                
                harvestsAdded++;
            }

            if (harvestsAdded > 0) {
                // Fire and forget to prevent blocking the UI when offline
                batch.commit().catch(err => console.error("Offline batch commit pending/failed:", err));
                
                setCollectors(prev => prev.map(c => {
                    const updatedStats = updatedCollectors.get(c.id);
                    if (updatedStats) {
                        return {
                            ...c,
                            totalHarvested: updatedStats.totalHarvested,
                            hoursWorked: updatedStats.hoursWorked,
                            productivity: updatedStats.hoursWorked > 0 ? updatedStats.totalHarvested / updatedStats.hoursWorked : 0
                        };
                    }
                    return c;
                }));
                
                setHarvests(prev => [...newHarvests, ...prev]);
                setCollectorPaymentLogs(prev => [...newPayments, ...prev]);
                
                // Fire and forget refresh so history updates eventually (from cache or net)
                fetchAllData().catch(e => console.error(e));
            }

        } catch(error) {
            console.error("Failed to add multiple harvests:", error);
            toast({ title: "Error", description: "No se pudieron guardar las cosechas.", variant: "destructive"});
        }
    };

    const editHarvest = async (logId: string, harvestId: string, updatedData: { kilograms: number; hours: number; ratePerKg: number; batchNumber: string }) => {
        const oldLog = collectorPaymentLogs.find(l => l.id === logId);
        const oldHarvest = harvests.find(h => h.id === harvestId);
        const collector = collectors.find(c => c.id === oldLog?.collectorId);
        
        if (!oldLog || !oldHarvest || !collector) {
            toast({ title: "Error", description: "No se encontró la información original.", variant: "destructive"});
            return;
        }

        try {
            const batch = writeBatch(db);
            
            const kiloDiff = updatedData.kilograms - oldLog.kilograms;
            const hoursDiff = updatedData.hours - oldLog.hours;
            
            const newTotalHarvested = collector.totalHarvested + kiloDiff;
            const newHoursWorked = collector.hoursWorked + hoursDiff;
            
            const collectorRef = doc(db, 'collectors', collector.id);
            batch.update(collectorRef, {
                totalHarvested: newTotalHarvested,
                hoursWorked: newHoursWorked,
                productivity: newHoursWorked > 0 ? newTotalHarvested / newHoursWorked : 0,
            });

            const harvestRef = doc(db, 'harvests', harvestId);
            batch.update(harvestRef, {
                kilograms: updatedData.kilograms,
                batchNumber: updatedData.batchNumber
            });

            const paymentLogRef = doc(db, 'collectorPaymentLogs', logId);
            const calculatedPayment = updatedData.kilograms * updatedData.ratePerKg;
            batch.update(paymentLogRef, {
                kilograms: updatedData.kilograms,
                hours: updatedData.hours,
                ratePerKg: updatedData.ratePerKg,
                payment: calculatedPayment
            });

            await batch.commit();
            setCollectors(prev => prev.map(c => {
                if (c.id === collector.id) {
                    return {
                        ...c,
                        totalHarvested: newTotalHarvested,
                        hoursWorked: newHoursWorked,
                        productivity: newHoursWorked > 0 ? newTotalHarvested / newHoursWorked : 0
                    };
                }
                return c;
            }));
            await fetchAllData();
            toast({ title: "Éxito", description: "Registro modificado exitosamente."});
        } catch(error) {
            console.error("Failed to edit harvest:", error);
            toast({ title: "Error", description: "No se pudo editar el registro.", variant: "destructive"});
        }
    };

    const editCollector = async (updatedCollector: Collector) => {
      try {
        const batch = writeBatch(db);

        const collectorRef = doc(db, 'collectors', updatedCollector.id);
        const { id, ...collectorData } = updatedCollector;
        batch.set(collectorRef, collectorData, { merge: true });

        const harvestsQuery = query(collection(db, 'harvests'), where('collector.id', '==', updatedCollector.id));
        const harvestsSnapshot = await getDocs(harvestsQuery);
        harvestsSnapshot.forEach(doc => {
            batch.update(doc.ref, { 'collector.name': updatedCollector.name });
        });

        const paymentsQuery = query(collection(db, 'collectorPaymentLogs'), where('collectorId', '==', updatedCollector.id));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        paymentsSnapshot.forEach(doc => {
            batch.update(doc.ref, { collectorName: updatedCollector.name });
        });
        
        await batch.commit();
        await fetchAllData();
      } catch (error) {
        console.error("Failed to edit collector and related documents:", error);
        toast({ title: "Error", description: "No se pudo actualizar el nombre del recolector en todos los registros.", variant: "destructive"});
        await fetchAllData(); 
      }
    };

    const deleteCollector = (collectorId: string) => {
        const originalState = { collectors, harvests, collectorPaymentLogs };
        
        setCollectors(prev => prev.filter(c => c.id !== collectorId));
        setHarvests(prev => prev.filter(h => h.collector.id !== collectorId));
        setCollectorPaymentLogs(prev => prev.filter(p => p.collectorId !== collectorId));

        const runDelete = async () => {
            const batchOp = writeBatch(db);
            batchOp.delete(doc(db, 'collectors', collectorId));
            const harvestsQuery = query(collection(db, 'harvests'), where('collector.id', '==', collectorId));
            const paymentsQuery = query(collection(db, 'collectorPaymentLogs'), where('collectorId', '==', collectorId));
            const [harvestsSnapshot, paymentsSnapshot] = await Promise.all([getDocs(harvestsQuery), getDocs(paymentsQuery)]);
            harvestsSnapshot.forEach(doc => batchOp.delete(doc.ref));
            paymentsSnapshot.forEach(doc => batchOp.delete(doc.ref));
            await batchOp.commit();
        }

        runDelete().catch(error => {
            console.error("Failed to delete collector:", error);
            setCollectors(originalState.collectors);
            setHarvests(originalState.harvests);
            setCollectorPaymentLogs(originalState.collectorPaymentLogs);
            toast({ title: "Error", description: "No se pudo eliminar al recolector.", variant: "destructive"});
        });
    };

    const addCollector = (collector: Omit<Collector, 'id'>) => {
        const tempId = `collector_${Date.now()}`;
        setCollectors(prev => [...prev, { id: tempId, ...collector }]);
        
        addDoc(collection(db, 'collectors'), { ...(collector), establishmentId: currentUser?.establishmentId || 'main' }).then(ref => {
            setCollectors(prev => prev.map(c => c.id === tempId ? { ...c, id: ref.id } : c));
        }).catch(error => {
            console.error("Failed to add collector:", error);
            setCollectors(prev => prev.filter(c => c.id !== tempId));
            toast({ title: "Error", description: "No se pudo agregar al recolector.", variant: "destructive"});
        });
    };

    const addPacker = async (packer: Omit<Packer, 'id'>) => {
      const tempId = `packer_${Date.now()}`;
      setPackers(prev => [...prev, { id: tempId, ...packer }]);

      try {
          const ref = await addDoc(collection(db, 'packers'), { ...(packer), establishmentId: currentUser?.establishmentId || 'main' });
          setPackers(prev => prev.map(p => p.id === tempId ? { ...p, id: ref.id } : p));
      } catch (error) {
          console.error("Failed to add packer:", error);
          setPackers(prev => prev.filter(p => p.id !== tempId));
          toast({ title: "Error", description: "No se pudo agregar al embalador.", variant: "destructive"});
      }
    };

    const deletePacker = (packerId: string) => {
        const originalState = { packers, packagingLogs };
        
        setPackers(prev => prev.filter(p => p.id !== packerId));
        setPackagingLogs(prev => prev.filter(p => p.packerId !== packerId));

        const runDelete = async () => {
            const batchOp = writeBatch(db);
            batchOp.delete(doc(db, 'packers', packerId));
            const logsQuery = query(collection(db, 'packagingLogs'), where('packerId', '==', packerId));
            const logsSnapshot = await getDocs(logsQuery);
            logsSnapshot.forEach(doc => batchOp.delete(doc.ref));
            await batchOp.commit();
        }

        runDelete().catch(error => {
            console.error("Failed to delete packer:", error);
            setPackers(originalState.packers);
            setPackagingLogs(originalState.packagingLogs);
            toast({ title: "Error", description: "No se pudo eliminar al embalador.", variant: "destructive"});
        });
    };
    
    const addPackagingLog = (log: Omit<PackagingLog, 'id'>) => {
        const tempId = `packaginglog_${Date.now()}`;
        setPackagingLogs(prev => [{ id: tempId, ...log }, ...prev]);
        
        addDoc(collection(db, 'packagingLogs'), { ...(log), establishmentId: currentUser?.establishmentId || 'main' }).then(async (ref) => {
            setPackagingLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: ref.id } : l));
            
            const packer = packers.find(p => p.id === log.packerId);
            if (packer) {
                const packerRef = doc(db, 'packers', packer.id);
                const newTotalPackaged = packer.totalPackaged + log.kilogramsPackaged;
                const newHoursWorked = packer.hoursWorked + log.hoursWorked;
                const updatedPackerData = {
                    totalPackaged: newTotalPackaged,
                    hoursWorked: newHoursWorked,
                    packagingRate: newHoursWorked > 0 ? newTotalPackaged / newHoursWorked : 0,
                };
                await setDoc(packerRef, updatedPackerData, { merge: true });
                fetchAllData();
            }
        }).catch(error => {
            console.error("Failed to add packaging log:", error);
            setPackagingLogs(prev => prev.filter(l => l.id !== tempId));
            toast({ title: "Error", description: "No se pudo guardar el registro de embalaje.", variant: "destructive"});
        });
    };

    const deletePackagingLog = async (logId: string) => {
        const logToDelete = packagingLogs.find(l => l.id === logId);
        if (!logToDelete) return;

        const originalPackers = [...packers];
        const originalLogs = [...packagingLogs];

        const packer = packers.find(p => p.id === logToDelete.packerId);
        if (packer) {
            const newTotalPackaged = packer.totalPackaged - logToDelete.kilogramsPackaged;
            const newHoursWorked = packer.hoursWorked - logToDelete.hoursWorked;
            const updatedPacker = {
                ...packer,
                totalPackaged: newTotalPackaged,
                hoursWorked: newHoursWorked,
                packagingRate: newHoursWorked > 0 ? newTotalPackaged / newHoursWorked : 0,
            };
            setPackers(prev => prev.map(p => p.id === packer.id ? updatedPacker : p));
        }
        setPackagingLogs(prev => prev.filter(l => l.id !== logId));

        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'packagingLogs', logId));

            if(packer) {
                const packerRef = doc(db, 'packers', packer.id);
                const newTotalPackaged = packer.totalPackaged - logToDelete.kilogramsPackaged;
                const newHoursWorked = packer.hoursWorked - logToDelete.hoursWorked;
                const updatedPackerData = {
                    totalPackaged: newTotalPackaged,
                    hoursWorked: newHoursWorked,
                    packagingRate: newHoursWorked > 0 ? newTotalPackaged / newHoursWorked : 0,
                };
                batch.update(packerRef, updatedPackerData);
            }

            await batch.commit();

        } catch (error) {
            console.error("Failed to delete packaging log:", error);
            setPackers(originalPackers);
            setPackagingLogs(originalLogs);
            toast({ title: "Error", description: "No se pudo eliminar el registro de embalaje.", variant: "destructive"});
        }
    };
    
    const addCulturalPracticeLog = (log: Omit<CulturalPracticeLog, 'id'>) => {
        const tempId = `culturallog_${Date.now()}`;
        setCulturalPracticeLogs(prev => [{ id: tempId, ...log }, ...prev]);
        
        addDoc(collection(db, 'culturalPracticeLogs'), { ...(log), establishmentId: currentUser?.establishmentId || 'main' }).then(ref => {
            setCulturalPracticeLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: ref.id } : l));
        }).catch(error => {
            console.error("Failed to add cultural practice log:", error);
            setCulturalPracticeLogs(prev => prev.filter(l => l.id !== tempId));
            toast({ title: "Error", description: "No se pudo guardar el registro de la labor.", variant: "destructive"});
        });
    };

    const deleteCulturalPracticeLog = async (logId: string) => {
        const originalLogs = culturalPracticeLogs;
        setCulturalPracticeLogs(prev => prev.filter(l => l.id !== logId));
        
        try {
            await deleteDoc(doc(db, 'culturalPracticeLogs', logId));
        } catch (error) {
            console.error("Failed to delete cultural practice log:", error);
            setCulturalPracticeLogs(originalLogs);
            toast({ title: "Error", description: "No se pudo eliminar el registro de la labor.", variant: "destructive"});
        }
    };


    const extractLogSupplies = (log?: Partial<AgronomistLog>): { supplyId?: string; name?: string; quantity: number }[] => {
        if (!log) return [];
        const list: { supplyId?: string; name?: string; quantity: number }[] = [];

        if (log.supplies && Array.isArray(log.supplies)) {
            for (const s of log.supplies) {
                const qty = Number(s.quantity) || 0;
                if (qty > 0) {
                    list.push({ supplyId: s.supplyId, name: s.name, quantity: qty });
                }
            }
        }

        if (log.product && log.quantityUsed && Number(log.quantityUsed) > 0) {
            const qty = Number(log.quantityUsed);
            const existing = list.find(s => s.name === log.product || (s.supplyId && s.supplyId === log.product));
            if (!existing) {
                list.push({ name: log.product, quantity: qty });
            }
        }

        return list;
    };

    const findSupplyInList = (supplyList: Supply[], entry: { supplyId?: string; name?: string }) => {
        if (entry.supplyId) {
            const found = supplyList.find(s => s.id === entry.supplyId);
            if (found) return found;
        }
        if (entry.name) {
            const found = supplyList.find(s => s.name.trim().toLowerCase() === entry.name!.trim().toLowerCase());
            if (found) return found;
        }
        return undefined;
    };

    const addAgronomistLog = async (log: Omit<AgronomistLog, 'id'>) => {
        const newLogRef = doc(collection(db, 'agronomistLogs'));
        const tempId = newLogRef.id;
        setAgronomistLogs(prev => [{ id: tempId, ...log }, ...prev]);
    
        const runAdd = async () => {
            const batch = writeBatch(db);
            batch.set(newLogRef, { ...sanitizeForFirestore(log), establishmentId: currentUser?.establishmentId || 'main' });
            
            let lowStockAlertTriggered = false;
            const newTasksToEmail: { task: any, user: any }[] = [];

            const logSupplies = extractLogSupplies(log);
            const updatedSuppliesMap = new Map<string, number>();

            for (const entry of logSupplies) {
                const supplyToUpdate = findSupplyInList(supplies, entry);
                if (supplyToUpdate && supplyToUpdate.stock !== undefined) {
                    const currentStock = updatedSuppliesMap.has(supplyToUpdate.id) ? updatedSuppliesMap.get(supplyToUpdate.id)! : supplyToUpdate.stock;
                    const newStock = Math.max(0, currentStock - entry.quantity);
                    updatedSuppliesMap.set(supplyToUpdate.id, newStock);

                    const supplyRef = doc(db, 'supplies', supplyToUpdate.id);
                    batch.update(supplyRef, { stock: newStock });

                    if (supplyToUpdate.lowStockThreshold !== undefined && newStock < supplyToUpdate.lowStockThreshold && currentStock >= supplyToUpdate.lowStockThreshold) {
                        lowStockAlertTriggered = true;
                        const producerUser = users.find(u => u.role === 'Productor');
                        if (producerUser && currentUser) {
                            const newTask: Omit<Task, 'id'> = {
                                title: `Stock bajo: ${supplyToUpdate.name}`,
                                description: `El stock de '${supplyToUpdate.name}' ha caído a ${newStock.toFixed(2)} kg/L, por debajo del umbral de ${supplyToUpdate.lowStockThreshold} kg/L. Se recomienda reponer.`,
                                assignedTo: { id: producerUser.id, name: producerUser.name },
                                createdBy: { id: currentUser.id, name: currentUser.name },
                                status: 'pending',
                                priority: 'media',
                                createdAt: new Date().toISOString(),
                                establishmentId: currentUser?.establishmentId || 'main',
                            };
                            const newTaskRef = doc(collection(db, 'tasks'));
                            batch.set(newTaskRef, newTask);
                            newTasksToEmail.push({ task: { ...newTask, id: newTaskRef.id }, user: producerUser });
                        }
                    }
                }
            }

            if (updatedSuppliesMap.size > 0) {
                setSupplies(prev => prev.map(s => updatedSuppliesMap.has(s.id) ? { ...s, stock: updatedSuppliesMap.get(s.id)! } : s));
            }
    
            await batch.commit();
            await fetchAllData();
            
            for (const item of newTasksToEmail) {
                fetch('/api/send-task-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item),
                }).catch(err => console.error("Failed to send low stock task email:", err));
            }

            if (lowStockAlertTriggered) {
                toast({ title: "Alerta de Stock Bajo", description: `Se ha creado una tarea para reponer insumos y se ha enviado un correo al productor.` });
            }
        }
    
        return runAdd().catch(error => {
            console.error("Failed to add agronomist log and update stock:", error);
            setAgronomistLogs(prev => prev.filter(l => l.id !== tempId));
            toast({ title: "Error", description: "No se pudo guardar el registro y actualizar el stock.", variant: "destructive"});
        });
    };

    const addMultipleAgronomistLogs = async (logs: Omit<AgronomistLog, 'id'>[]) => {
        if (logs.length === 0) return;
        const batch = writeBatch(db);
        const tempLogs = logs.map(log => {
            const newLogRef = doc(collection(db, 'agronomistLogs'));
            batch.set(newLogRef, { ...sanitizeForFirestore(log), establishmentId: currentUser?.establishmentId || 'main' });
            return { id: newLogRef.id, ...log };
        });
        
        setAgronomistLogs(prev => [...tempLogs, ...prev]);

        try {
            await batch.commit();
            await fetchAllData();
        } catch (error) {
            console.error("Failed to add multiple agronomist logs:", error);
            setAgronomistLogs(prev => prev.filter(l => !tempLogs.some(tl => tl.id === l.id)));
            toast({ title: "Error", description: "No se pudieron guardar las alertas en bloque.", variant: "destructive"});
        }
    };

    const editAgronomistLog = (updatedLog: AgronomistLog) => {
        const originalLogs = agronomistLogs;
        const originalSupplies = supplies;
        const oldLog = agronomistLogs.find(l => l.id === updatedLog.id);

        setAgronomistLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));

        const runEdit = async () => {
            const batch = writeBatch(db);
            const logRef = doc(db, 'agronomistLogs', updatedLog.id);
            const { id, ...data } = updatedLog;
            batch.set(logRef, sanitizeForFirestore(data), { merge: true });

            if (oldLog) {
                const oldLogSupplies = extractLogSupplies(oldLog);
                const newLogSupplies = extractLogSupplies(updatedLog);
                const updatedSuppliesMap = new Map<string, number>();

                for (const supplyItem of supplies) {
                    if (supplyItem.stock === undefined) continue;

                    // Sum quantities used in oldLog for this supply
                    let oldQty = 0;
                    for (const entry of oldLogSupplies) {
                        const target = findSupplyInList(supplies, entry);
                        if (target && target.id === supplyItem.id) {
                            oldQty += entry.quantity;
                        }
                    }

                    // Sum quantities used in newLog for this supply
                    let newQty = 0;
                    for (const entry of newLogSupplies) {
                        const target = findSupplyInList(supplies, entry);
                        if (target && target.id === supplyItem.id) {
                            newQty += entry.quantity;
                        }
                    }

                    const delta = oldQty - newQty; // positive means stock returned, negative means more stock deducted
                    if (Math.abs(delta) > 0.0001) {
                        const currentStock = supplyItem.stock;
                        const restoredStock = Math.max(0, currentStock + delta);
                        updatedSuppliesMap.set(supplyItem.id, restoredStock);

                        const supplyRef = doc(db, 'supplies', supplyItem.id);
                        batch.update(supplyRef, { stock: restoredStock });

                        // Resolve pending low stock tasks if stock is restored above threshold
                        if (supplyItem.lowStockThreshold !== undefined && currentStock < supplyItem.lowStockThreshold && restoredStock >= supplyItem.lowStockThreshold) {
                            const relatedTask = tasks.find(t => t.title === `Stock bajo: ${supplyItem.name}` && t.status === 'pending');
                            if (relatedTask) {
                                batch.delete(doc(db, 'tasks', relatedTask.id));
                                setTasks(prev => prev.filter(t => t.id !== relatedTask.id));
                            }
                        }
                    }
                }

                if (updatedSuppliesMap.size > 0) {
                    setSupplies(prev => prev.map(s => updatedSuppliesMap.has(s.id) ? { ...s, stock: updatedSuppliesMap.get(s.id)! } : s));
                }
            }

            await batch.commit();
        };

        runEdit().catch(error => {
            console.error("Failed to edit agronomist log and adjust stock:", error);
            setAgronomistLogs(originalLogs);
            setSupplies(originalSupplies);
            toast({ title: "Error", description: "No se pudo editar el registro ni ajustar el stock.", variant: "destructive"});
        });
    };

    const deleteAgronomistLog = (logId: string) => {
        const originalState = { logs: [...agronomistLogs], supplies: [...supplies], tasks: [...tasks] };
        const logToDelete = agronomistLogs.find(l => l.id === logId);
        if (!logToDelete) return;

        setAgronomistLogs(prev => prev.filter(l => l.id !== logId));

        const runDelete = async () => {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'agronomistLogs', logId));

            const suppliesToRestore = extractLogSupplies(logToDelete);
            const updatedSuppliesMap = new Map<string, number>();

            for (const entry of suppliesToRestore) {
                const supplyToUpdate = findSupplyInList(supplies, entry);
                if (supplyToUpdate && supplyToUpdate.stock !== undefined) {
                    const currentStock = updatedSuppliesMap.has(supplyToUpdate.id) ? updatedSuppliesMap.get(supplyToUpdate.id)! : supplyToUpdate.stock;
                    const restoredStock = currentStock + entry.quantity;
                    updatedSuppliesMap.set(supplyToUpdate.id, restoredStock);

                    const supplyRef = doc(db, 'supplies', supplyToUpdate.id);
                    batch.update(supplyRef, { stock: restoredStock });

                    if (supplyToUpdate.lowStockThreshold !== undefined && currentStock < supplyToUpdate.lowStockThreshold && restoredStock >= supplyToUpdate.lowStockThreshold) {
                        const relatedTask = tasks.find(t => t.title === `Stock bajo: ${supplyToUpdate.name}` && t.status === 'pending');
                        if (relatedTask) {
                            batch.delete(doc(db, 'tasks', relatedTask.id));
                            setTasks(prev => prev.filter(t => t.id !== relatedTask.id));
                        }
                    }
                }
            }

            if (updatedSuppliesMap.size > 0) {
                setSupplies(prev => prev.map(s => updatedSuppliesMap.has(s.id) ? { ...s, stock: updatedSuppliesMap.get(s.id)! } : s));
            }

            await batch.commit();
        };

        runDelete().catch(error => {
            console.error("Failed to delete agronomist log and related data:", error);
            setAgronomistLogs(originalState.logs);
            setSupplies(originalState.supplies);
            setTasks(originalState.tasks);
            toast({ title: "Error", description: "No se pudo eliminar el registro o restaurar los datos asociados.", variant: "destructive"});
        });
    };

    const addPhenologyLog = (log: Omit<PhenologyLog, 'id'>) => {
        const tempId = `phenologylog_${Date.now()}`;
        setPhenologyLogs(prev => [{ id: tempId, ...log }, ...prev]);
    
        addDoc(collection(db, 'phenologyLogs'), { ...sanitizeForFirestore(log), establishmentId: currentUser?.establishmentId || 'main' }).then(ref => {
            setPhenologyLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: ref.id } : l));
        }).catch(error => {
            console.error("Failed to add phenology log:", error);
            setPhenologyLogs(prev => prev.filter(l => l.id !== tempId));
            toast({ title: "Error", description: "No se pudo guardar el registro de fenología.", variant: "destructive"});
        });
    };

    const editPhenologyLog = (updatedLog: PhenologyLog) => {
        const originalLogs = phenologyLogs;
        setPhenologyLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));

        const logRef = doc(db, 'phenologyLogs', updatedLog.id);
        const { id, ...data } = updatedLog;
        setDoc(logRef, sanitizeForFirestore(data), { merge: true }).catch(error => {
            console.error("Failed to edit phenology log:", error);
            setPhenologyLogs(originalLogs);
            toast({ title: "Error", description: "No se pudo editar el registro.", variant: "destructive"});
        });
    };

    const deletePhenologyLog = (logId: string) => {
        return new Promise<void>((resolve, reject) => {
            const originalLogs = phenologyLogs;
            setPhenologyLogs(prev => prev.filter(l => l.id !== logId));
            
            deleteDoc(doc(db, 'phenologyLogs', logId))
            .then(resolve)
            .catch(error => {
                console.error("Failed to delete phenology log:", error);
                setPhenologyLogs(originalLogs);
                toast({ title: "Error", description: "No se pudo eliminar el registro.", variant: "destructive"});
                reject(error);
            });
        });
    };

    const addPredictionLog = (log: Omit<PredictionLog, 'id'>) => {
        const tempId = `predictionlog_${Date.now()}`;
        setPredictionLogs(prev => [{ id: tempId, ...log }, ...prev]);

        addDoc(collection(db, 'predictionLogs'), { ...(log), establishmentId: currentUser?.establishmentId || 'main' }).then(ref => {
            setPredictionLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: ref.id } : l));
            
            // Trigger push notification if frost or risk is detected
            if (log.riskAlert === 'helada' || log.aiRecommendation?.toLowerCase().includes('alerta') || log.aiRecommendation?.toLowerCase().includes('riesgo')) {
                sendPushNotification({
                    title: 'Alerta de Predicción',
                    body: `Riesgo detectado: ${log.riskAlert || 'Posible anomalía climática/productiva'}. Revisa las predicciones.`,
                    severity: 'warning',
                    targetRoles: ['Productor', 'Ingeniero Agronomo'],
                });
            }
        }).catch(error => {
            console.error("Failed to add prediction log:", error);
            setPredictionLogs(prev => prev.filter(l => l.id !== tempId));
            toast({ title: "Error", description: "No se pudo guardar la predicción.", variant: "destructive"});
        });
    };

    const deletePredictionLog = (logId: string) => {
        const originalLogs = predictionLogs;
        setPredictionLogs(prev => prev.filter(l => l.id !== logId));

        deleteDoc(doc(db, 'predictionLogs', logId)).catch(error => {
            console.error("Failed to delete prediction log:", error);
            setPredictionLogs(originalLogs);
            toast({ title: "Error", description: "No se pudo eliminar la predicción.", variant: "destructive"});
        });
    };

    const addDiagnosisLog = (log: Omit<DiagnosisLog, 'id'>) => {
        const tempId = `diagnosislog_${Date.now()}`;
        setDiagnosisLogs(prev => [{ id: tempId, ...log }, ...prev]);

        addDoc(collection(db, 'diagnosisLogs'), { ...(log), establishmentId: currentUser?.establishmentId || 'main' }).then(ref => {
            setDiagnosisLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: ref.id } : l));
            
            // Trigger push notification if disease or pest is detected
            if (log.diagnosisResult && (log.diagnosisResult.toLowerCase().includes('enferm') || log.diagnosisResult.toLowerCase().includes('plaga'))) {
                sendPushNotification({
                    title: 'Nuevo Diagnóstico Crítico',
                    body: `Se ha detectado un posible problema: ${log.diagnosisResult}. Revisa la Bitácora del Agrónomo.`,
                    severity: 'critical',
                    targetRoles: ['Productor', 'Ingeniero Agronomo'],
                });
            }
        }).catch(error => {
            console.error("Failed to add diagnosis log:", error);
            setDiagnosisLogs(prev => prev.filter(l => l.id !== tempId));
            toast({ title: "Error", description: "No se pudo guardar el diagnóstico.", variant: "destructive"});
        });
    };

    const deleteDiagnosisLog = (logId: string) => {
        const originalLogs = diagnosisLogs;
        setDiagnosisLogs(prev => prev.filter(l => l.id !== logId));

        deleteDoc(doc(db, 'diagnosisLogs', logId)).catch(error => {
            console.error("Failed to delete diagnosis log:", error);
            setDiagnosisLogs(originalLogs);
            toast({ title: "Error", description: "No se pudo eliminar el diagnóstico.", variant: "destructive"});
        });
    };

    const addSupply = (supply: Omit<Supply, 'id'>) => {
        const tempId = `supply_${Date.now()}`;
        setSupplies(prev => [{ id: tempId, ...supply }, ...prev]);

        addDoc(collection(db, 'supplies'), { ...(supply), establishmentId: currentUser?.establishmentId || 'main' }).then(ref => {
            setSupplies(prev => prev.map(s => s.id === tempId ? { ...s, id: ref.id } : s));
        }).catch(error => {
            console.error("Failed to add supply:", error);
            setSupplies(prev => prev.filter(s => s.id !== tempId));
            toast({ title: "Error", description: "No se pudo agregar el insumo.", variant: "destructive"});
        });
    };

    const editSupply = (updatedSupply: Supply) => {
        const originalSupplies = supplies;
        setSupplies(prev => prev.map(s => s.id === updatedSupply.id ? updatedSupply : s));

        const supplyRef = doc(db, 'supplies', updatedSupply.id);
        const { id, ...data } = updatedSupply;
        setDoc(supplyRef, data, { merge: true }).catch(error => {
            console.error("Failed to edit supply:", error);
            setSupplies(originalSupplies);
            toast({ title: "Error", description: "No se pudo editar el insumo.", variant: "destructive"});
        });
    };

    const deleteSupply = (supplyId: string) => {
        const originalSupplies = supplies;
        setSupplies(prev => prev.filter(s => s.id !== supplyId));

        deleteDoc(doc(db, 'supplies', supplyId)).catch(error => {
            console.error("Failed to delete supply:", error);
            setSupplies(originalSupplies);
            toast({ title: "Error", description: "No se pudo eliminar el insumo.", variant: "destructive"});
        });
    };

    const addTask = (task: Omit<Task, 'id'>) => {
        const tempId = `task_${Date.now()}`;
        const newTask = { id: tempId, ...task };
        setTasks(prev => [newTask, ...prev]);

        addDoc(collection(db, 'tasks'), { ...(task), establishmentId: currentUser?.establishmentId || 'main' })
        .then(ref => {
            setTasks(prev => prev.map(t => (t.id === tempId ? { ...t, id: ref.id } : t)));
            const assignedUser = users.find(u => u.id === task.assignedTo.id);
            if (assignedUser) {
                fetch('/api/send-task-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task: { ...task, id: ref.id }, user: assignedUser }),
                }).catch(err => console.error("Failed to send task email:", err));
                
                sendPushNotification({
                    title: 'Nueva Tarea Asignada',
                    body: `Se te ha asignado la tarea: ${task.title}.`,
                    severity: 'info',
                    targetUserId: assignedUser.id,
                });
            }
        })
        .catch(error => {
            console.error("Failed to add task:", error);
            setTasks(prev => prev.filter(t => t.id !== tempId));
            toast({ title: "Error", description: "No se pudo agregar la tarea.", variant: "destructive"});
        });
    };
    
    const updateTaskStatus = (taskId: string, status: TaskStatus) => {
        const originalTasks = tasks;
        const taskToUpdate = tasks.find(t => t.id === taskId);
        
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
        
        const taskRef = doc(db, 'tasks', taskId);
        setDoc(taskRef, { status }, { merge: true })
        .then(() => {
            if (status === 'completed' && taskToUpdate) {
                const creatorUser = users.find(u => u.id === taskToUpdate.createdBy.id);
                if (creatorUser) {
                    fetch('/api/send-task-completed-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task: { ...taskToUpdate, status }, user: creatorUser }),
                    }).catch(err => console.error("Failed to send completed task email:", err));
                    
                    sendPushNotification({
                        title: 'Tarea Completada',
                        body: `La tarea "${taskToUpdate.title}" ha sido marcada como completada.`,
                        severity: 'info',
                        targetUserId: creatorUser.id,
                    });
                }
            }
        })
        .catch(error => {
            console.error("Failed to update task status:", error);
            setTasks(originalTasks);
            toast({ title: "Error", description: "No se pudo actualizar el estado de la tarea.", variant: "destructive"});
        });
    };

    const deleteTask = (taskId: string) => {
        const originalTasks = tasks;
        setTasks(prev => prev.filter(t => t.id !== taskId));
        
        deleteDoc(doc(db, 'tasks', taskId)).catch(error => {
            console.error("Failed to delete task:", error);
            setTasks(originalTasks);
            toast({ title: "Error", description: "No se pudo eliminar la tarea.", variant: "destructive"});
        });
    };


    const addBatch = (batchData: Omit<Batch, 'status' | 'preloadedDate'> & { preloadedDate?: string, status?: 'pending' | 'completed' }) => {
        const newBatch: Batch = { 
            preloadedDate: new Date().toISOString(),
            status: 'pending',
            establishmentId: currentUser?.establishmentId || 'main',
            ...batchData, 
        };
        setBatches(prev => [newBatch, ...prev]);

        const batchDocId = `${currentUser?.establishmentId || 'main'}_${newBatch.id}`;
        const batchRef = doc(db, 'batches', batchDocId);
        setDoc(batchRef, newBatch).catch(error => {
            console.error("Failed to add batch:", error);
            setBatches(prev => prev.filter(b => b.id !== newBatch.id));
            toast({ title: "Error", description: "No se pudo agregar el lote.", variant: "destructive"});
        });
    };

    const editBatch = async (updatedBatch: Batch) => {
        const originalBatches = [...batches];
        setBatches(prev => prev.map(b => b.id === updatedBatch.id ? updatedBatch : b));

        try {
            const batchDocId = `${currentUser?.establishmentId || 'main'}_${updatedBatch.id}`;
            const batchRef = doc(db, 'batches', batchDocId);
            await setDoc(batchRef, updatedBatch, { merge: true });
        } catch (error) {
            console.error("Failed to edit batch:", error);
            setBatches(originalBatches);
            toast({ title: "Error", description: "No se pudo editar el lote.", variant: "destructive"});
        }
    };

    const deleteBatch = (batchId: string) => {
        const originalBatches = batches;
        setBatches(prev => prev.filter(b => b.id !== batchId));
        const batchDocId = `${currentUser?.establishmentId || 'main'}_${batchId}`;
        deleteDoc(doc(db, 'batches', batchDocId)).catch(error => {
            console.error("Failed to delete batch:", error);
            setBatches(originalBatches);
            toast({ title: "Error", description: "No se pudo eliminar el lote.", variant: "destructive"});
        });
    };

    const addCollectorPaymentLog = (log: Omit<CollectorPaymentLog, 'id'>) => {
        // This function is now deprecated in favor of the logic inside addHarvest.
        // It's kept for type safety but should not be called directly.
        console.warn("addCollectorPaymentLog is deprecated and should not be called directly.");
    };

    const deleteCollectorPaymentLog = (logId: string) => {
        return new Promise<void>((resolve, reject) => {
            const originalState = { collectors: [...collectors], harvests: [...harvests], collectorPaymentLogs: [...collectorPaymentLogs] };
            const logToDelete = collectorPaymentLogs.find(l => l.id === logId);
            if (!logToDelete) {
                return reject("Log not found");
            }
            const collectorDoc = collectors.find(c => c.id === logToDelete.collectorId);

            // Optimistic UI updates
            setCollectorPaymentLogs(prev => prev.filter(l => l.id !== logId));
            setHarvests(prev => prev.filter(h => h.id !== logToDelete.harvestId));
            if (collectorDoc) {
                const newTotalHarvested = collectorDoc.totalHarvested - logToDelete.kilograms;
                const newHoursWorked = collectorDoc.hoursWorked - logToDelete.hours;
                const updatedCollector = {
                    ...collectorDoc,
                    totalHarvested: newTotalHarvested,
                    hoursWorked: newHoursWorked,
                    productivity: newHoursWorked > 0 ? newTotalHarvested / newHoursWorked : 0,
                };
                setCollectors(prev => prev.map(c => c.id === logToDelete.collectorId ? updatedCollector : c));
            }
        
            const runDelete = async () => {
                const batchOp = writeBatch(db);
                batchOp.delete(doc(db, 'collectorPaymentLogs', logId));
                batchOp.delete(doc(db, 'harvests', logToDelete.harvestId));
                
                if (collectorDoc) {
                    const collectorRef = doc(db, 'collectors', logToDelete.collectorId);
                    const newTotalHarvested = collectorDoc.totalHarvested - logToDelete.kilograms;
                    const newHoursWorked = collectorDoc.hoursWorked - logToDelete.hours;
                    batchOp.update(collectorRef, {
                        totalHarvested: newTotalHarvested,
                        hoursWorked: newHoursWorked,
                        productivity: newHoursWorked > 0 ? newTotalHarvested / newHoursWorked : 0,
                    });
                }
                
                await batchOp.commit();
                await fetchAllData();
                resolve();
            }

            runDelete().catch(error => {
                console.error("Failed to delete payment log:", error);
                setCollectors(originalState.collectors);
                setHarvests(originalState.harvests);
                setCollectorPaymentLogs(originalState.collectorPaymentLogs);
                toast({ title: "Error", description: "No se pudo eliminar el registro de pago y restaurar los datos.", variant: "destructive"});
                reject(error);
            });
        });
    };

    const updateEstablishmentData = (data: Partial<EstablishmentData>) => {
        return new Promise<void>((resolve, reject) => {
            const originalData = establishmentData;
            setEstablishmentData(prev => prev ? { ...prev, ...data } : null);
            
            const estId = currentUser?.establishmentId || 'main';
            const establishmentRef = doc(db, 'establishment', estId);
            const updateData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
            
            setDoc(establishmentRef, updateData, { merge: true })
            .then(resolve)
            .catch(error => {
                console.error("Failed to update establishment data:", error);
                setEstablishmentData(originalData);
                toast({ title: "Error", description: "No se pudieron actualizar los datos.", variant: "destructive"});
                reject(error);
            });
        });
    };

    const addProducerLog = (log: Omit<ProducerLog, 'id'>) => {
        const newRef = doc(collection(db, 'producerLogs'));
        const tempId = newRef.id;
        setProducerLogs(prev => [{ id: tempId, ...log }, ...prev]);
        
        setDoc(newRef, { ...(log), establishmentId: currentUser?.establishmentId || 'main' }).catch(error => {
            console.error("Failed to add producer log:", error);
            setProducerLogs(prev => prev.filter(l => l.id !== tempId));
            toast({ title: "Error", description: "No se pudo guardar la nota.", variant: "destructive"});
        });
    };

    const editProducerLog = (updatedLog: ProducerLog) => {
        const originalLogs = producerLogs;
        setProducerLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));

        const logRef = doc(db, 'producerLogs', updatedLog.id);
        const { id, ...data } = updatedLog;
        setDoc(logRef, data, { merge: true }).catch(error => {
            console.error("Failed to edit producer log:", error);
            setProducerLogs(originalLogs);
            toast({ title: "Error", description: "No se pudo editar la nota.", variant: "destructive"});
        });
    };

    const deleteProducerLog = (logId: string) => {
        const originalLogs = producerLogs;
        setProducerLogs(prev => prev.filter(l => l.id !== logId));
        
        deleteDoc(doc(db, 'producerLogs', logId)).catch(error => {
            console.error("Failed to delete producer log:", error);
            setProducerLogs(originalLogs);
            toast({ title: "Error", description: "No se pudo eliminar la nota.", variant: "destructive"});
        });
    };

    const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newRef = doc(collection(db, 'transactions'));
        const tempId = newRef.id;
        
        if (transaction.pricePerUnit === undefined) {
            delete (transaction as Partial<Transaction>).pricePerUnit;
        }

        setTransactions(prev => [{ id: tempId, ...transaction }, ...prev]);
        
        setDoc(newRef, { ...(transaction), establishmentId: currentUser?.establishmentId || 'main' }).catch(error => {
            console.error("Failed to add transaction:", error);
            setTransactions(prev => prev.filter(t => t.id !== tempId));
            toast({ title: "Error", description: "No se pudo guardar la transacción.", variant: "destructive"});
        });
    };

    const deleteTransaction = (transactionId: string) => {
        return new Promise<void>((resolve, reject) => {
            const originalTransactions = transactions;
            setTransactions(prev => prev.filter(t => t.id !== transactionId));
            
            deleteDoc(doc(db, 'transactions', transactionId))
            .then(resolve)
            .catch(error => {
                console.error("Failed to delete transaction:", error);
                setTransactions(originalTransactions);
                toast({ title: "Error", description: "No se pudo eliminar la transacción.", variant: "destructive"});
                reject(error);
            });
        });
    };

    const addKnowledgeItem = async (item: Omit<KnowledgeItem, 'id'>) => {
        await addDoc(collection(db, 'knowledge'), { ...(item), establishmentId: currentUser?.establishmentId || 'main' });
        await fetchAllData();
    };

    const deleteKnowledgeItem = async (itemId: string) => {
        await deleteDoc(doc(db, 'knowledge', itemId));
        await fetchAllData();
    };

    const updateUserPassword = async (userId: string, newPassword: string) => {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { password: newPassword }, { merge: true });
        
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
        if (currentUser?.id === userId) {
            setCurrentUser({ ...currentUser, password: newPassword }, true);
        }
    };

    const updateUserProfile = async (userId: string, profileData: { name: string; notificationEmail?: string; avatar?: string }) => {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, profileData, { merge: true });
        
        const updatedUser = users.find(u => u.id === userId);
        if(updatedUser) {
            const newUsers = users.map(u => u.id === userId ? { ...u, ...profileData } : u);
            setUsers(newUsers);
            if (currentUser?.id === userId) {
                const updatedCurrentUser = { ...currentUser, ...profileData };
                setCurrentUser(updatedCurrentUser, true); // Assume rememberMe
            }
        }
    };

    const markNotificationAsRead = async (notificationId: string) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
        try {
            const notifRef = doc(db, 'notifications', notificationId);
            await setDoc(notifRef, { read: true }, { merge: true });
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    const markAllNotificationsAsRead = async () => {
        if (notifications.length === 0) return;
        
        const batch = writeBatch(db);
        const unreadNotifs = notifications.filter(n => !n.read);
        
        if (unreadNotifs.length === 0) return;

        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        unreadNotifs.forEach(notif => {
            const notifRef = doc(db, 'notifications', notif.id);
            batch.update(notifRef, { read: true });
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        }
    };

    const saveFcmToken = async (token: string) => {
        if (!currentUser) return;
        const currentTokens = currentUser.fcmTokens || [];
        if (!currentTokens.includes(token)) {
            const newTokens = [...currentTokens, token];
            const userRef = doc(db, 'users', currentUser.id);
            await setDoc(userRef, { fcmTokens: newTokens }, { merge: true });
            
            setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, fcmTokens: newTokens } : u));
            setCurrentUser({ ...currentUser, fcmTokens: newTokens }, true);
        }
    };

    const addContactRequest = async (request: Omit<ContactRequest, 'id' | 'createdAt' | 'status'>) => {
        try {
            const newDocRef = doc(collection(db, 'contactRequests'));
            const newRequest: ContactRequest = {
                ...request,
                id: newDocRef.id,
                createdAt: new Date().toISOString(),
                status: 'pending',
            };
            await setDoc(newDocRef, newRequest);
            setContactRequests(prev => [newRequest, ...prev]);
        } catch (error) {
            console.error("Error al agregar solicitud de contacto:", error);
            throw error;
        }
    };

    const updateContactRequestStatus = async (requestId: string, status: ContactRequestStatus, notes?: string) => {
        try {
            const docRef = doc(db, 'contactRequests', requestId);
            const updatePayload: any = { status };
            if (notes !== undefined) updatePayload.notes = notes;
            await updateDoc(docRef, updatePayload);
            setContactRequests(prev => prev.map(req => req.id === requestId ? { ...req, ...updatePayload } : req));
        } catch (error) {
            console.error("Error actualizando estado de solicitud:", error);
            throw error;
        }
    };

    const deleteContactRequest = async (requestId: string) => {
        try {
            const docRef = doc(db, 'contactRequests', requestId);
            await deleteDoc(docRef);
            setContactRequests(prev => prev.filter(req => req.id !== requestId));
        } catch (error) {
            console.error("Error eliminando solicitud de contacto:", error);
            throw error;
        }
    };

    const value = {
        loading,
        currentUser,
        users,
        setCurrentUser,
        harvests,
        collectors,
        packers,
        packagingLogs,
        culturalPracticeLogs,
        agronomistLogs,
        phenologyLogs,
        predictionLogs,
        diagnosisLogs,
        supplies,
        tasks,
        batches,
        collectorPaymentLogs,
        establishmentData,
        producerLogs,
        transactions,
        knowledgeBase,
        contactRequests,
        expertChatHistory,
        setExpertChatHistory,
        addContactRequest,
        updateContactRequestStatus,
        deleteContactRequest,
        addHarvest,
        addMultipleHarvests,
        editHarvest,
        editCollector,
        deleteCollector,
        addAgronomistLog,
        addMultipleAgronomistLogs,
        editAgronomistLog,
        deleteAgronomistLog,
        addPhenologyLog,
        editPhenologyLog,
        deletePhenologyLog,
        addPredictionLog,
        deletePredictionLog,
        addDiagnosisLog,
        deleteDiagnosisLog,
        addSupply,
        editSupply,
        deleteSupply,
        addTask,
        updateTaskStatus,
        deleteTask,
        addCollector,
        addPacker,
        deletePacker,
        addPackagingLog,
        deletePackagingLog,
        addCulturalPracticeLog,
        deleteCulturalPracticeLog,
        addBatch,
        editBatch,
        deleteBatch,
        addCollectorPaymentLog,
        deleteCollectorPaymentLog,
        updateEstablishmentData,
        addProducerLog,
        editProducerLog,
        deleteProducerLog,
        addTransaction,
        deleteTransaction,
        addKnowledgeItem,
        deleteKnowledgeItem,
        updateUserPassword,
        updateUserProfile,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        saveFcmToken,
        isClient
    };

    return (
        <AppDataContext.Provider value={value}>
            {children}
        </AppDataContext.Provider>
    );
};
