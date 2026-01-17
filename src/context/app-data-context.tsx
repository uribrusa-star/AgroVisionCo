

'use client';

import React, { ReactNode, useState, useCallback, useEffect } from 'react';
import type { AppData, User, Harvest, Collector, AgronomistLog, PhenologyLog, Batch, CollectorPaymentLog, EstablishmentData, ProducerLog, Transaction, Packer, PackagingLog, CulturalPracticeLog, Supply, PredictionLog, DiagnosisLog, Task, TaskStatus } from '@/lib/types';
import { initialEstablishmentData, users as availableUsers } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where, addDoc, getDoc, orderBy } from 'firebase/firestore';

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
  addHarvest: async () => { throw new Error('Not implemented') },
  editCollector: async () => { throw new Error('Not implemented') },
  deleteCollector: () => { throw new Error('Not implemented') },
  addAgronomistLog: () => { throw new Error('Not implemented') },
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
  deleteBatch: () => { throw new Error('Not implemented') },
  addCollectorPaymentLog: () => { throw new Error('Not implemented') },
  deleteCollectorPaymentLog: async () => { throw new Error('Not implemented') },
  updateEstablishmentData: async () => { throw new Error('Not implemented') },
  addProducerLog: () => { throw new Error('Not implemented') },
  deleteProducerLog: () => { throw new Error('Not implemented') },
  addTransaction: () => { throw new Error('Not implemented') },
  deleteTransaction: async () => { throw new Error('Not implemented') },
  updateUserPassword: async () => { throw new Error('Not implemented') },
  updateUserProfile: async () => { throw new Error('Not implemented') },
  isClient: false,
});

const usePersistentState = <T,>(key: string): [T, (value: T | null, rememberMe?: boolean) => void] => {
  const [state, setState] = useState<T>(() => null as T); // Start with null state on server

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
    const [tasks, setTasks] = useState<Task[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [collectorPaymentLogs, setCollectorPaymentLogs] = useState<CollectorPaymentLog[]>([]);
    const [establishmentData, setEstablishmentData] = useState<EstablishmentData | null>(null);
    const [producerLogs, setProducerLogs] = useState<ProducerLog[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
      // Removed user fetching logic from here, as it's now handled by the persistent state hook
      // and the initial session check in the layout.
      if (!currentUser) {
          setLoading(false);
      }
    }, [currentUser]);

    const fetchAllData = useCallback(async () => {
      if (!isClient) return;
      setLoading(true);
      try {
        const usersCollectionRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollectionRef);

            if (usersSnapshot.empty) {
              const batch = writeBatch(db);
              availableUsers.forEach(user => {
                  const userRef = doc(db, 'users', user.id);
                  batch.set(userRef, user);
              });
              await batch.commit();
              setUsers(availableUsers);
            } else {
              setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[]);
            }

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
            ] = await Promise.all([
              getDoc(doc(db, 'establishment', 'main')),
              getDocs(collection(db, 'collectors')),
              getDocs(collection(db, 'packers')),
              getDocs(query(collection(db, 'harvests'), orderBy('date', 'desc'))),
              getDocs(query(collection(db, 'agronomistLogs'), orderBy('date', 'desc'))),
              getDocs(query(collection(db, 'phenologyLogs'), orderBy('date', 'desc'))),
              getDocs(query(collection(db, 'predictionLogs'), orderBy('date', 'desc'))),
              getDocs(query(collection(db, 'diagnosisLogs'), orderBy('date', 'desc'))),
              getDocs(collection(db, 'supplies')),
              getDocs(query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))),
              getDocs(collection(db, 'batches')),
              getDocs(query(collection(db, 'collectorPaymentLogs'), orderBy('date', 'desc'))),
              getDocs(query(collection(db, 'packagingLogs'), orderBy('date', 'desc'))),
              getDocs(query(collection(db, 'culturalPracticeLogs'), orderBy('date', 'desc'))),
              getDocs(query(collection(db, 'producerLogs'), orderBy('date', 'desc'))),
              getDocs(query(collection(db, 'transactions'), orderBy('date', 'desc'))),
            ]);
            
            if (establishmentDocSnap.exists()) {
              setEstablishmentData({ id: establishmentDocSnap.id, ...establishmentDocSnap.data() } as EstablishmentData);
            } else {
              await setDoc(doc(db, 'establishment', 'main'), initialEstablishmentData);
              setEstablishmentData({ id: 'main', ...initialEstablishmentData });
            }
            setCollectors(collectorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Collector[]);
            setPackers(packersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Packer[]);
            setHarvests(harvestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Harvest[]);
            setAgronomistLogs(agronomistLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AgronomistLog[]);
            setPhenologyLogs(phenologyLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PhenologyLog[]);
            setPredictionLogs(predictionLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PredictionLog[]);
            setDiagnosisLogs(diagnosisLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DiagnosisLog[]);
            setSupplies(suppliesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supply[]);
            setTasks(tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[]);
            setBatches(batchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Batch[]);
            setCollectorPaymentLogs(collectorPaymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CollectorPaymentLog[]);
            setPackagingLogs(packagingLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PackagingLog[]);
            setCulturalPracticeLogs(culturalPracticeLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CulturalPracticeLog[]);
            setProducerLogs(producerLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProducerLog[]);
            setTransactions(transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
        
      } catch (error) {
        console.error("Error fetching data from Firestore:", error);
        toast({
          title: "Error de Conexión",
          description: "No se pudieron cargar los datos. Asegúrese de que Firestore esté configurado y con las reglas de seguridad correctas.",
          variant: "destructive",
        })
      } finally {
        setLoading(false);
      }
    }, [toast, isClient]);
    
    useEffect(() => {
       if (currentUser) {
         fetchAllData();
       }
    }, [fetchAllData, currentUser]);
    
    const addHarvest = async (harvestData: Omit<Harvest, 'id' | 'traceabilityId'>, hoursWorked: number, ratePerKg: number): Promise<string | undefined> => {
        const collector = collectors.find(c => c.id === harvestData.collector.id);
        if (!collector) {
            toast({ title: "Error", description: "Recolector no encontrado.", variant: "destructive"});
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
            batch.set(newHarvestRef, harvestWithTraceability);

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
            batch.set(newPaymentLogRef, paymentLog);

            await batch.commit();
            await fetchAllData();
            return newHarvestRef.id;

        } catch(error) {
            console.error("Failed to add harvest and payment:", error);
            toast({ title: "Error", description: "No se pudo guardar la cosecha y el pago.", variant: "destructive"});
            return undefined;
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
        
        addDoc(collection(db, 'collectors'), collector).then(ref => {
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
          const ref = await addDoc(collection(db, 'packers'), packer);
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
        
        addDoc(collection(db, 'packagingLogs'), log).then(async (ref) => {
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
        
        addDoc(collection(db, 'culturalPracticeLogs'), log).then(ref => {
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


    const addAgronomistLog = (log: Omit<AgronomistLog, 'id'>) => {
        const tempId = `agrolog_${Date.now()}`;
        setAgronomistLogs(prev => [{ id: tempId, ...log }, ...prev]);
    
        const runAdd = async () => {
            const batch = writeBatch(db);
            const newLogRef = doc(collection(db, 'agronomistLogs'));
            batch.set(newLogRef, log);
            
            let lowStockAlertTriggered = false;

            if ((log.type === 'Fertilización' || log.type === 'Fumigación') && log.product && log.quantityUsed) {
                const supplyToUpdate = supplies.find(s => s.name === log.product);
                if (supplyToUpdate && supplyToUpdate.stock !== undefined) {
                    const oldStock = supplyToUpdate.stock;
                    const newStock = oldStock - log.quantityUsed;
                    const supplyRef = doc(db, 'supplies', supplyToUpdate.id);
                    batch.update(supplyRef, { stock: newStock });

                    if (supplyToUpdate.lowStockThreshold !== undefined && newStock < supplyToUpdate.lowStockThreshold && oldStock >= supplyToUpdate.lowStockThreshold) {
                       lowStockAlertTriggered = true;
                       const producerUser = users.find(u => u.role === 'Productor');
                       if (producerUser && currentUser) {
                           const newTask: Omit<Task, 'id'> = {
                                title: `Stock bajo: ${supplyToUpdate.name}`,
                                description: `El stock de '${supplyToUpdate.name}' ha caído a ${newStock.toFixed(1)} kg/L, por debajo del umbral de ${supplyToUpdate.lowStockThreshold} kg/L. Se recomienda reponer.`,
                                assignedTo: { id: producerUser.id, name: producerUser.name },
                                createdBy: { id: currentUser.id, name: currentUser.name },
                                status: 'pending',
                                priority: 'media',
                                createdAt: new Date().toISOString(),
                           };
                           const newTaskRef = doc(collection(db, 'tasks'));
                           batch.set(newTaskRef, newTask);
                       }
                    }
                }
            }
    
            await batch.commit();
            await fetchAllData();
            if (lowStockAlertTriggered) {
                toast({ title: "Alerta de Stock Bajo", description: `Se ha creado una tarea para reponer ${log.product}.` });
            }
        }
    
        runAdd().catch(error => {
            console.error("Failed to add agronomist log and update stock:", error);
            setAgronomistLogs(prev => prev.filter(l => l.id !== tempId));
            toast({ title: "Error", description: "No se pudo guardar el registro y actualizar el stock.", variant: "destructive"});
        });
    };

    const editAgronomistLog = (updatedLog: AgronomistLog) => {
        const originalLogs = agronomistLogs;
        setAgronomistLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));

        const logRef = doc(db, 'agronomistLogs', updatedLog.id);
        const { id, ...data } = updatedLog;
        setDoc(logRef, data, { merge: true }).catch(error => {
            console.error("Failed to edit agronomist log:", error);
            setAgronomistLogs(originalLogs);
            toast({ title: "Error", description: "No se pudo editar el registro.", variant: "destructive"});
        });
    };

    const deleteAgronomistLog = (logId: string) => {
        const originalState = { logs: [...agronomistLogs], supplies: [...supplies], tasks: [...tasks] };
        const logToDelete = agronomistLogs.find(l => l.id === logId);

        setAgronomistLogs(prev => prev.filter(l => l.id !== logId));

        const runDelete = async () => {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'agronomistLogs', logId));

            if (logToDelete && (logToDelete.type === 'Fertilización' || logToDelete.type === 'Fumigación') && logToDelete.product && logToDelete.quantityUsed) {
                const supplyToUpdate = supplies.find(s => s.name === logToDelete.product);
                if (supplyToUpdate && supplyToUpdate.stock !== undefined) {
                    const restoredStock = supplyToUpdate.stock + logToDelete.quantityUsed;
                    const supplyRef = doc(db, 'supplies', supplyToUpdate.id);
                    batch.update(supplyRef, { stock: restoredStock });

                    setSupplies(prev => prev.map(s => s.id === supplyToUpdate.id ? { ...s, stock: restoredStock } : s));

                    if (supplyToUpdate.lowStockThreshold !== undefined && supplyToUpdate.stock < supplyToUpdate.lowStockThreshold && restoredStock >= supplyToUpdate.lowStockThreshold) {
                        const relatedTask = tasks.find(t => t.title === `Stock bajo: ${supplyToUpdate.name}` && t.status === 'pending');
                        if (relatedTask) {
                            batch.delete(doc(db, 'tasks', relatedTask.id));
                            setTasks(prev => prev.filter(t => t.id !== relatedTask.id));
                        }
                    }
                }
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

        addDoc(collection(db, 'phenologyLogs'), log).then(ref => {
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
        setDoc(logRef, data, { merge: true }).catch(error => {
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

        addDoc(collection(db, 'predictionLogs'), log).then(ref => {
            setPredictionLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: ref.id } : l));
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

        addDoc(collection(db, 'diagnosisLogs'), log).then(ref => {
            setDiagnosisLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: ref.id } : l));
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

        addDoc(collection(db, 'supplies'), supply).then(ref => {
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

        addDoc(collection(db, 'tasks'), task)
        .then(ref => {
            setTasks(prev => prev.map(t => (t.id === tempId ? { ...t, id: ref.id } : t)));
            const assignedUser = users.find(u => u.id === task.assignedTo.id);
            if (assignedUser) {
                fetch('/api/send-task-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task: { ...task, id: ref.id }, user: assignedUser }),
                }).catch(err => console.error("Failed to send task email:", err));
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
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
        
        const taskRef = doc(db, 'tasks', taskId);
        setDoc(taskRef, { status }, { merge: true }).catch(error => {
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


    const addBatch = (batchData: Omit<Batch, 'id' | 'status' | 'preloadedDate'> & { id: string, preloadedDate: string, status: string }) => {
        const newBatch = { ...batchData, status: 'pending' as 'pending' | 'completed' };
        setBatches(prev => [newBatch, ...prev]);

        const batchRef = doc(db, 'batches', batchData.id);
        setDoc(batchRef, newBatch).catch(error => {
            console.error("Failed to add batch:", error);
            setBatches(prev => prev.filter(b => b.id !== batchData.id));
            toast({ title: "Error", description: "No se pudo agregar el lote.", variant: "destructive"});
        });
    };

    const deleteBatch = (batchId: string) => {
        const originalBatches = batches;
        setBatches(prev => prev.filter(b => b.id !== batchId));
        
        deleteDoc(doc(db, 'batches', batchId)).catch(error => {
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
            
            const establishmentRef = doc(db, 'establishment', 'main');
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
        const tempId = `producerlog_${Date.now()}`;
        setProducerLogs(prev => [{ id: tempId, ...log }, ...prev]);
        
        addDoc(collection(db, 'producerLogs'), log).then(ref => {
            setProducerLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: ref.id } : l));
        }).catch(error => {
            console.error("Failed to add producer log:", error);
            setProducerLogs(prev => prev.filter(l => l.id !== tempId));
            toast({ title: "Error", description: "No se pudo guardar la nota.", variant: "destructive"});
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
        const tempId = `transaction_${Date.now()}`;
        
        if (transaction.pricePerUnit === undefined) {
            delete (transaction as Partial<Transaction>).pricePerUnit;
        }

        setTransactions(prev => [{ id: tempId, ...transaction }, ...prev]);
        
        addDoc(collection(db, 'transactions'), transaction).then(ref => {
            setTransactions(prev => prev.map(t => t.id === tempId ? { ...t, id: ref.id } : t));
        }).catch(error => {
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

    const updateUserPassword = async (userId: string, newPassword: string) => {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { password: newPassword }, { merge: true });
        
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
        if (currentUser?.id === userId) {
            setCurrentUser(prev => prev ? { ...prev, password: newPassword } : null);
        }
    };

    const updateUserProfile = async (userId: string, profileData: { name: string; notificationEmail?: string }) => {
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
        addHarvest,
        editCollector,
        deleteCollector,
        addAgronomistLog,
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
        deleteBatch,
        addCollectorPaymentLog,
        deleteCollectorPaymentLog,
        updateEstablishmentData,
        addProducerLog,
        deleteProducerLog,
        addTransaction,
        deleteTransaction,
        updateUserPassword,
        updateUserProfile,
        isClient
    };

    return (
        <AppDataContext.Provider value={value}>
            {children}
        </AppDataContext.Provider>
    );
};
