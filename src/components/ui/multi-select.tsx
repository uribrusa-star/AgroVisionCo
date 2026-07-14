'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface MultiSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  tag?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Seleccionar...',
  className,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    const option = options.find(o => o.value === value);
    if (option?.disabled) return;
    const newSelected = selected.includes(value)
      ? selected.filter((s) => s !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter((s) => s !== value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between h-auto min-h-10 py-2 px-3', className)}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selected.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {selected.map((value) => {
              const option = options.find((o) => o.value === value);
              return (
                <Badge
                  key={value}
                  variant="secondary"
                  className="mr-1 mb-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(value);
                  }}
                >
                  {option?.label || value}
                  <X className="ml-1 h-3 w-3 cursor-pointer" />
                </Badge>
              );
            })}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="max-h-64 overflow-y-auto p-2">
          {options.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hay opciones disponibles.
            </div>
          )}
          {options.map((option) => {
            const isDisabled = option.disabled;
            return (
              <div
                key={option.value}
                className={cn(
                  "flex items-center space-x-2 p-2 rounded-md my-0.5 transition-colors",
                  isDisabled 
                    ? "opacity-80 cursor-not-allowed bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-medium"
                    : "hover:bg-muted cursor-pointer"
                )}
                onClick={() => {
                  if (!isDisabled) handleSelect(option.value);
                }}
              >
                <Checkbox
                  id={`option-${option.value}`}
                  checked={selected.includes(option.value)}
                  disabled={isDisabled}
                  onCheckedChange={() => {
                    if (!isDisabled) handleSelect(option.value);
                  }}
                />
                <label
                  htmlFor={`option-${option.value}`}
                  className={cn(
                    "text-sm font-medium leading-none flex items-center flex-wrap gap-1.5 flex-grow",
                    isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  <span>{option.label}</span>
                  {option.tag && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shadow-sm">
                      {option.tag}
                    </span>
                  )}
                </label>
                {selected.includes(option.value) && !isDisabled && (
                  <Check className="h-4 w-4 ml-auto" />
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
