'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AuthPasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function AuthPasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  disabled,
  placeholder = '••••••••',
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Field>
      <FieldLabel htmlFor={id} className="text-foreground font-medium">
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'h-11 rounded-xl border-border bg-card py-2.5 pr-11 pl-3 text-foreground shadow-sm transition-none placeholder:text-muted-foreground/50 focus-visible:border-primary-blue focus-visible:ring-primary-blue/20'
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 h-9 w-9 -translate-y-1/2 rounded-lg text-muted-foreground transition-none hover:bg-accent hover:text-foreground active:-translate-y-1/2"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Eye className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </Button>
      </div>
    </Field>
  );
}
