'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, RefreshCcw, Info, BookOpen, Upload, Trash2, X, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { expertChat, type ExpertChatInput, type ExpertChatOutput } from '@/ai/flows/expert-chat';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { getRelevantKnowledge } from '@/ai/knowledge/strawberry-knowledge';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export function StrawberryExpertChat() {
  const { establishmentData, harvests, agronomistLogs, phenologyLogs, batches, supplies, expertChatHistory, setExpertChatHistory, knowledgeBase, addKnowledgeItem, deleteKnowledgeItem } = React.useContext(AppDataContext);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (expertChatHistory.length === 0) {
      setExpertChatHistory([
        {
          role: 'model',
          content: '¡Hola! Soy tu consultor experto en frutilla para la zona de Coronda. ¿En qué puedo ayudarte hoy con tus variedades San Andreas, Marisma o Cleopatra?'
        }
      ]);
    }
  }, [expertChatHistory.length, setExpertChatHistory]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }
  }, [expertChatHistory]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...expertChatHistory, { role: 'user', content: userMessage } as Message];
    setExpertChatHistory(newMessages);
    setIsLoading(true);

    // Generate context summary
    const generateContext = async () => {
        let weatherText = "Datos Climáticos Activos: [Falló la conexión o clave de OpenWeather ausente]";
        try {
            const locationString = establishmentData?.location?.locality || 'Coronda';
            const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
            if (apiKey) {
                const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${locationString},ar&appid=${apiKey}&units=metric&lang=es`);
                if (wRes.ok) {
                    const wData = await wRes.json();
                    weatherText = `🌤️ CONDICIONES CLIMÁTICAS EN TIEMPO REAL (${locationString}):
- Temperatura Actual: ${wData.main.temp}°C (Sensación Térmica: ${wData.main.feels_like}°C)
- Humedad Relativa: ${wData.main.humidity}%
- Estado Atmosférico: ${wData.weather[0].description}
- Viento: ${wData.wind.speed} m/s`;
                }
            }
        } catch (e) {
            console.warn("No se pudo obtener el clima para el chat", e);
        }

        if (!establishmentData) return weatherText;

        const varieties = establishmentData.planting.variety.split(',').map(v => v.trim());
        const specializedKnowledge = getRelevantKnowledge(varieties);

        // Include user-uploaded knowledge
        let userKnowledge = "";
        if (knowledgeBase.length > 0) {
            userKnowledge = "\nCONOCIMIENTO ADICIONAL CARGADO POR EL USUARIO:\n" + 
                knowledgeBase.map(item => `--- ${item.title} ---\n${item.content}`).join('\n\n');
        }

        let context = `${specializedKnowledge}
${userKnowledge}

${weatherText}

Dato del Establecimiento:
- Productor: ${establishmentData.producer}
- Ubicación: ${establishmentData.location.locality}, ${establishmentData.location.province}
- Sistema: ${establishmentData.system}
- Variedades: ${establishmentData.planting.variety}
- Fecha de Plantación: ${establishmentData.planting.date}
- Superficie Frutilla: ${establishmentData.area.strawberry} ha

Estado Actual de los Lotes:
${batches.map(b => `- Lote ${b.id}: Variedades: ${b.varieties?.map(v => `${v.name} (${v.plantCount || 'cant. no especificada'})`).join(', ') || 'Sin variedades asignadas'}, Estado: ${b.status}`).join('\n')}

Inventario de Insumos (Disponible en el Establecimiento):
${supplies.length > 0 
    ? supplies.map(s => `- ${s.name} (${s.type}): Composición: ${s.info.activeIngredient}, Stock: ${s.stock !== undefined ? s.stock.toFixed(2) : 'N/A'} kg/L, Dosis: ${s.info.dose}`).join('\n')
    : 'No hay insumos registrados en el inventario.'}

Últimas Cosechas:
${harvests.slice(0, 5).map(h => `- ${new Date(h.date).toLocaleDateString()}: ${h.kilograms}kg en Lote ${h.batchNumber}`).join('\n')}

Bitácora del Agrónomo (Reciente):
${agronomistLogs.slice(0, 5).map(l => `- ${new Date(l.date).toLocaleDateString()}: ${l.type} en Lote ${l.batchId || 'N/A'}: ${l.notes}`).join('\n')}

Estado Fenológico:
${phenologyLogs.slice(0, 5).map(p => `- ${new Date(p.date).toLocaleDateString()}: Lote ${p.batchId} en etapa ${p.developmentState}`).join('\n')}
`;
        return context;
    };

    try {
      const liveContext = await generateContext();
      
      const response = await expertChat({
        messages: newMessages,
        context: liveContext,
      });

      if (response && response.text) {
        setExpertChatHistory([...newMessages, { role: 'model', content: response.text }]);
      } else {
        throw new Error('Sin respuesta del experto');
      }
    } catch (error) {
      console.error('Error in expert chat:', error);
      toast({
        title: 'Error de conexión',
        description: 'El experto no pudo responder en este momento. Intente de nuevo.',
        variant: 'destructive'
      });
      // Remove the last user message if it failed significantly? No, keep it and let user retry.
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setExpertChatHistory([
        {
          role: 'model',
          content: 'Chat reiniciado. Estoy listo para tus nuevas consultas sobre el cultivo en Coronda.'
        }
    ]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        toast({ title: "Error", description: "Por favor, sube solo archivos PDF.", variant: "destructive" });
        return;
    }

    setIsUploading(true);
    try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
                const pdf = await pdfjs.getDocument(typedarray).promise;
                let fullText = "";
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    fullText += pageText + "\n";
                }

                await addKnowledgeItem({
                    title: file.name,
                    content: fullText,
                    type: 'pdf',
                    date: new Date().toISOString()
                });

                toast({ title: "Éxito", description: "Documento indexado correctamente." });
            } catch (err) {
                console.error(err);
                toast({ title: "Error", description: "No se pudo leer el PDF.", variant: "destructive" });
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    } catch (err) {
        console.error(err);
        toast({ title: "Error", description: "Error al cargar el procesador de PDF.", variant: "destructive" });
        setIsUploading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] border-primary/20 bg-gradient-to-b from-background to-primary/5">
      <CardHeader className="border-b bg-card/50 backdrop-blur-sm">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-xl">Chat Experto Corondino</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] py-0 px-1 border-primary/30 text-primary">Agrónomo Senior</Badge>
                        Especialista en Frutilla
                    </CardDescription>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setIsKnowledgeOpen(!isKnowledgeOpen)} title="Base de conocimiento">
                    <BookOpen className={`h-4 w-4 ${knowledgeBase.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleReset} title="Limpiar chat">
                    <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden relative">
        {isKnowledgeOpen && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-20 p-4 border-b animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center gap-2 text-primary">
                        <BookOpen className="h-4 w-4" /> 
                        Biblioteca Técnica ({knowledgeBase.length})
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => setIsKnowledgeOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                <div className="space-y-4">
                    <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center hover:bg-primary/5 transition-colors cursor-pointer relative">
                        <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept=".pdf"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        {isUploading ? (
                             <div className="flex flex-col items-center gap-2">
                                <RefreshCcw className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-xs font-medium">Procesando PDF...</span>
                             </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="h-6 w-6 text-primary/60" />
                                <span className="text-sm font-medium">Subir Manual Técnico (PDF)</span>
                                <span className="text-[10px] text-muted-foreground">La IA lo usará para aprender de tu zona.</span>
                            </div>
                        )}
                    </div>

                    <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                            {knowledgeBase.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground py-10">No hay documentos cargados.</p>
                            ) : (
                                knowledgeBase.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between bg-card p-2 rounded border border-border/50 group">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <span className="text-xs truncate font-medium">{item.title}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => deleteKnowledgeItem(item.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        )}
        <ScrollArea className="h-full px-4 py-6" ref={scrollAreaRef}>
          <div className="space-y-4">
            {expertChatHistory.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start hover:bg-black/5 dark:hover:bg-white/5 transition-colors p-1 rounded-lg'}`}>
                <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className={`h-8 w-8 mt-1 border ${m.role === 'user' ? 'border-primary/20' : 'border-secondary/20'}`}>
                    {m.role === 'user' ? (
                      <>
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </>
                    ) : (
                      <>
                        <div className="bg-primary h-full w-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                      </>
                    )}
                  </Avatar>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-card border border-border/50 rounded-tl-none whitespace-pre-wrap leading-relaxed'}`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                   <Avatar className="h-8 w-8 animate-pulse">
                        <div className="bg-muted h-full w-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-muted-foreground" />
                        </div>
                   </Avatar>
                   <div className="bg-muted/50 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t bg-card/50">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex w-full items-center space-x-2"
        >
          <Input
            placeholder="Escribe tu consulta agronómica..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-background"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
      <div className="px-4 pb-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Info className="h-3 w-3" />
        Respuestas generadas por IA basadas en agronomía regional. Valide con su ingeniero de campo.
      </div>
    </Card>
  );
}
