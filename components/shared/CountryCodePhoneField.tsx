'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronsUpDown, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COUNTRY_DIAL_CODES,
  CUSTOM_COUNTRY_CODE_VALUE,
  digitsOnly,
  findCountryByDialDigits,
  formatCountryOptionLabel,
  normalizeDialDigits,
} from '@/lib/country-codes';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type CountryCodePhoneFieldProps = {
  countryCode: string;
  nationalNumber: string;
  onChange: (countryCode: string, nationalNumber: string) => void;
  id?: string;
  className?: string;
  selectClassName?: string;
  customInputClassName?: string;
  numberInputClassName?: string;
  nationalPlaceholder?: string;
  showPhoneIcon?: boolean;
};

export function CountryCodePhoneField({
  countryCode,
  nationalNumber,
  onChange,
  id = 'businesscontact',
  className,
  selectClassName,
  customInputClassName,
  numberInputClassName,
  nationalPlaceholder = '98765 43210',
  showPhoneIcon = true,
}: CountryCodePhoneFieldProps) {
  const dialDigits = normalizeDialDigits(countryCode);
  const matched = useMemo(
    () => findCountryByDialDigits(dialDigits),
    [dialDigits]
  );
  const [useCustom, setUseCustom] = useState(
    () => Boolean(dialDigits && !findCountryByDialDigits(dialDigits))
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (dialDigits && !findCountryByDialDigits(dialDigits)) {
      setUseCustom(true);
    }
  }, [dialDigits]);

  const showCustomInput = useCustom || Boolean(dialDigits && !matched);
  const selectValue = matched
    ? dialDigits
    : showCustomInput
      ? CUSTOM_COUNTRY_CODE_VALUE
      : '';

  const triggerLabel = matched
    ? formatCountryOptionLabel(matched)
    : showCustomInput
      ? 'Other (add code)'
      : 'Select country';

  const handleSelect = (value: string) => {
    if (value === CUSTOM_COUNTRY_CODE_VALUE) {
      setUseCustom(true);
      setOpen(false);
      return;
    }
    if (value === '') {
      setUseCustom(false);
      onChange('', nationalNumber);
      setOpen(false);
      return;
    }
    setUseCustom(false);
    onChange(value, nationalNumber);
    setOpen(false);
  };

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:gap-3', className)}>
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-[13.5rem]">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={`${id}-country`}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label="Country code"
              className={cn(
                'h-11 w-full justify-between rounded-xl border-border bg-accent/30 px-3 text-left text-base font-normal text-foreground shadow-sm hover:bg-accent/50 focus-visible:border-primary-blue focus-visible:ring-primary-blue/20',
                !selectValue && 'text-muted-foreground',
                selectClassName
              )}
            >
              <span className="truncate">{triggerLabel}</span>
              <ChevronsUpDown
                className="ml-2 h-4 w-4 shrink-0 text-muted-foreground opacity-70"
                aria-hidden
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[min(22rem,calc(100vw-2rem))] p-0"
          >
            <Command className="rounded-lg bg-popover text-popover-foreground">
              <CommandInput placeholder="Search country or code…" />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="no country code"
                    data-checked={!selectValue ? true : undefined}
                    onSelect={() => handleSelect('')}
                  >
                    No country code
                  </CommandItem>
                  {COUNTRY_DIAL_CODES.map((row) => {
                    const digits = normalizeDialDigits(row.dial_code);
                    const label = formatCountryOptionLabel(row);
                    const selected = selectValue === digits;
                    return (
                      <CommandItem
                        key={`${row.code}-${digits}`}
                        value={`${row.name} ${row.dial_code} ${digits}`}
                        data-checked={selected ? true : undefined}
                        onSelect={() => handleSelect(digits)}
                      >
                        <span className="truncate">{label}</span>
                      </CommandItem>
                    );
                  })}
                  <CommandItem
                    value="other add code custom"
                    data-checked={
                      selectValue === CUSTOM_COUNTRY_CODE_VALUE
                        ? true
                        : undefined
                    }
                    onSelect={() => handleSelect(CUSTOM_COUNTRY_CODE_VALUE)}
                  >
                    Other (add code)
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {showCustomInput ? (
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
              +
            </span>
            <input
              id={`${id}-country-custom`}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-country-code"
              maxLength={5}
              value={dialDigits}
              onChange={(e) =>
                onChange(digitsOnly(e.target.value).slice(0, 5), nationalNumber)
              }
              placeholder="91"
              aria-label="Custom country code"
              className={cn(customInputClassName, 'pl-7')}
            />
          </div>
        ) : null}
      </div>

      <div className="relative min-w-0 flex-1">
        {showPhoneIcon ? (
          <Smartphone className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        ) : null}
        <input
          id={id}
          name={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={12}
          value={nationalNumber}
          onChange={(e) =>
            onChange(countryCode, digitsOnly(e.target.value).slice(0, 12))
          }
          placeholder={nationalPlaceholder}
          aria-label="Phone number"
          className={cn(numberInputClassName, showPhoneIcon && 'pl-10')}
        />
      </div>
    </div>
  );
}
