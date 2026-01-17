
import { WifiOff } from 'lucide-react';
import { AgroVisionLogo } from '@/components/icons';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative mb-4">
                <AgroVisionLogo className="w-24 h-24 text-muted" />
                <div className="absolute bottom-0 right-0 bg-destructive text-destructive-foreground rounded-full p-2">
                    <WifiOff className="h-6 w-6" />
                </div>
            </div>
            <h1 className="text-3xl font-headline">Sin Conexión</h1>
            <p className="text-muted-foreground max-w-md">
                Parece que no tienes conexión a internet. La aplicación funcionará en modo offline, pero algunas funcionalidades podrían estar limitadas.
            </p>
             <p className="text-sm text-muted-foreground mt-4">
                Tus datos se sincronizarán automáticamente cuando vuelvas a estar en línea.
            </p>
        </div>
    </div>
  );
}
