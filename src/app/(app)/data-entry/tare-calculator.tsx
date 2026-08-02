'use client';
import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, Trash2, Plus, RotateCcw, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Entry = {
  id: string;
  gross: number;
  tare: number;
  net: number;
}

export function TareCalculator() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentGross, setCurrentGross] = useState('');
  const [tareMode, setTareMode] = useState<'564' | '954' | 'custom'>('564');
  const [customTare, setCustomTare] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeTare = tareMode === '564' ? 0.564 : tareMode === '954' ? 0.954 : (parseFloat(customTare) || 0);

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    const gross = parseFloat(currentGross);
    if (isNaN(gross) || gross <= 0) return;

    const newEntry: Entry = {
      id: Math.random().toString(36).substring(7),
      gross,
      tare: activeTare,
      net: parseFloat((gross - activeTare).toFixed(2))
    };

    setEntries([...entries, newEntry]);
    setCurrentGross('');
    
    // Focus back on input
    setTimeout(() => {
        inputRef.current?.focus();
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleClear = () => {
    setEntries([]);
  };

  const totalNet = entries.reduce((sum, e) => sum + e.net, 0);
  const totalCrates = entries.length;

  return (
    <Card className="h-full flex flex-col shadow-sm border-primary/20 bg-background">
      <CardHeader className="pb-3 border-b bg-card/50">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Calculator className="h-5 w-5" />
            </div>
            <div>
               <CardTitle className="text-lg">Calculadora de Taras</CardTitle>
               <CardDescription>Suma cajones y descuenta tara</CardDescription>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 flex-1 flex flex-col gap-4">
         <div className="space-y-2">
             <label className="text-xs font-semibold text-muted-foreground uppercase">Seleccionar Tara</label>
             <Tabs value={tareMode} onValueChange={(v: any) => setTareMode(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                   <TabsTrigger value="564">564 g</TabsTrigger>
                   <TabsTrigger value="954">954 g</TabsTrigger>
                   <TabsTrigger value="custom">Otro</TabsTrigger>
                </TabsList>
             </Tabs>
             {tareMode === 'custom' && (
                 <div className="pt-2 animate-in fade-in zoom-in-95 duration-200">
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="Ej: 0.85 (Kg)" 
                      value={customTare}
                      onChange={(e) => setCustomTare(e.target.value)}
                    />
                 </div>
             )}
         </div>

         <form onSubmit={handleAdd} className="flex gap-2">
            <Input 
               ref={inputRef}
               type="number" 
               step="0.01" 
               placeholder="Peso bruto del cajón (Kg)" 
               value={currentGross}
               onChange={(e) => setCurrentGross(e.target.value)}
               className="font-semibold text-lg"
            />
            <Button type="submit" disabled={!currentGross || parseFloat(currentGross) <= 0}>
               <Plus className="h-5 w-5" />
            </Button>
         </form>

         <div className="flex-1 min-h-[200px] border rounded-md bg-muted/20 overflow-hidden flex flex-col relative">
            {entries.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50 p-4 text-center">
                    <Calculator className="h-8 w-8 mb-2" />
                    <p className="text-sm">Ingrese el peso del primer cajón para comenzar.</p>
                </div>
            ) : (
                <ScrollArea className="h-full p-2">
                   <div className="space-y-2 h-full pr-3 pb-4">
                      {entries.map((entry, idx) => (
                          <div key={entry.id} className="flex items-center justify-between bg-background border p-2 rounded-lg text-sm shadow-sm animate-in slide-in-from-left-2">
                              <div className="flex flex-col">
                                 <span className="font-bold text-foreground">Cajón #{idx + 1}</span>
                                 <span className="text-xs text-muted-foreground">
                                    Bruto: {entry.gross}kg - Tara: {entry.tare}kg
                                 </span>
                              </div>
                              <div className="flex items-center gap-3">
                                 <Badge variant="default" className="text-sm px-2 py-0.5">{entry.net} kg</Badge>
                                 <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => removeEntry(entry.id)}>
                                     <Trash2 className="h-4 w-4" />
                                 </Button>
                              </div>
                          </div>
                      ))}
                      <div ref={scrollRef} />
                   </div>
                </ScrollArea>
            )}
         </div>
      </CardContent>

      <CardFooter className="bg-primary/5 border-t p-4 flex flex-col gap-3 rounded-b-xl">
         <div className="flex justify-between items-center w-full">
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Total Cajones</p>
                <p className="text-2xl font-black">{totalCrates}</p>
            </div>
            <div className="text-right">
                <p className="text-xs font-semibold text-primary uppercase">Peso Neto Total</p>
                <p className="text-3xl font-black text-primary">{totalNet.toFixed(2)} kg</p>
            </div>
         </div>
         
         <div className="w-full flex justify-end">
             <AlertDialog>
                 <AlertDialogTrigger asChild>
                     <Button variant="outline" className="w-full sm:w-auto" disabled={entries.length === 0}>
                         <RotateCcw className="mr-2 h-4 w-4" />
                         Limpiar Calculadora
                     </Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                     <AlertDialogHeader>
                         <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                             <AlertCircle className="h-5 w-5" /> Confirmar Acción
                         </AlertDialogTitle>
                         <AlertDialogDescription>
                             ¿Está seguro que desea limpiar la calculadora? Perderá todos los registros de los cajones actuales. Asegúrese de haber anotado el total en el formulario.
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <AlertDialogCancel>Cancelar</AlertDialogCancel>
                         <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                             Sí, Limpiar
                         </AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
             </AlertDialog>
         </div>
      </CardFooter>
    </Card>
  );
}
