'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, RefreshCcw, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { expertChat, type ExpertChatInput, type ExpertChatOutput } from '@/ai/flows/expert-chat';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AppDataContext } from '@/context/app-data-context.tsx';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export function StrawberryExpertChat() {
  const { establishmentData, harvests, agronomistLogs, phenologyLogs, batches } = React.useContext(AppDataContext);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: '¡Hola! Soy tu consultor experto en frutilla para la zona de Coronda. ¿En qué puedo ayudarte hoy con tus variedades San Andreas, Marisma o Cleopatra?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage } as Message];
    setMessages(newMessages);
    setIsLoading(true);

    // Generate context summary
    const generateContext = () => {
        if (!establishmentData) return "";

        let context = `Dato del Establecimiento:
- Productor: ${establishmentData.producer}
- Ubicación: ${establishmentData.location.locality}, ${establishmentData.location.province}
- Sistema: ${establishmentData.system}
- Variedades: ${establishmentData.planting.variety}
- Fecha de Plantación: ${establishmentData.planting.date}
- Superficie Frutilla: ${establishmentData.area.strawberry} ha

Estado Actual de los Lotes:
${batches.map(b => `- Lote ${b.id}: Variedades: ${b.varieties?.map(v => `${v.name} (${v.plantCount || 'cant. no especificada'})`).join(', ') || 'Sin variedades asignadas'}, Estado: ${b.status}`).join('\n')}

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
      const response = await expertChat({
        messages: newMessages,
        context: generateContext(),
      });

      if (response && response.text) {
        setMessages(prev => [...prev, { role: 'model', content: response.text }]);
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
    setMessages([
        {
          role: 'model',
          content: 'Chat reiniciado. Estoy listo para tus nuevas consultas sobre el cultivo en Coronda.'
        }
    ]);
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
            <Button variant="ghost" size="icon" onClick={handleReset} title="Limpiar chat">
                <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4 py-6" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((m, i) => (
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
