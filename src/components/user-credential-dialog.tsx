'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserCredentialView } from './user-credential-view';
import type { User } from '@/lib/types';

interface UserCredentialDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
  onOpenScanner?: () => void;
}

export function UserCredentialDialog({
  isOpen,
  onOpenChange,
  user,
  onOpenScanner
}: UserCredentialDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-center font-bold text-lg sm:text-xl">
            Credencial Oficial y Control de Asistencia
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Presente este código QR en el escáner de la tranquera para registrar ingreso y salida.
          </DialogDescription>
        </DialogHeader>

        <UserCredentialView 
          user={user} 
          onOpenScanner={() => {
            onOpenChange(false);
            if (onOpenScanner) onOpenScanner();
          }} 
        />
      </DialogContent>
    </Dialog>
  );
}
