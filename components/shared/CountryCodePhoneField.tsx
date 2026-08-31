'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COUNTRY_DIAL_CODES,
  CUSTOM_COUNTRY_CODE_VALUE,
  digitsOnly,
  findCountryByDialDigits,
  findCountryByIsoCode,
  formatCountryOptionLabel,
  normalizeDialDigits,
  type CountryDialCode,
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

function countrySearchScore(name: string, query: string): number | null {
  const normalizedName = name.toLowerCase();
  if (normalizedName === query) return 0;
  if (normalizedName.startsWith(query)) return 1;
  if (normalizedName.includes(query)) return 2;
  return null;
}

function filterCountriesByQuery(query: string): CountryDialCode[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRY_DIAL_CODES;

  const dialQuery = normalizeDialDigits(q);

  return COUNTRY_DIAL_CODES.filter((row) => {
    const name = row.name.toLowerCase();
    const dialDigits = normalizeDialDigits(row.dial_code);
    const dialLabel = row.dial_code.toLowerCase();
    return (
      countrySearchScore(name, q) != null ||
      dialLabel.includes(q) ||
      (dialQuery.length > 0 && dialDigits.includes(dialQuery))
    );
  }).sort((a, b) => {
    const scoreA =
      countrySearchScore(a.name.toLowerCase(), q) ??
      (a.dial_code.toLowerCase().includes(q) ||
      (dialQuery && normalizeDialDigits(a.dial_code).includes(dialQuery))
        ? 3
        : 99);
    const scoreB =
      countrySearchScore(b.name.toLowerCase(), q) ??
      (b.dial_code.toLowerCase().includes(q) ||
      (dialQuery && normalizeDialDigits(b.dial_code).includes(dialQuery))
        ? 3
        : 99);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.name.localeCompare(b.name);
  });
}

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
  const [selectedIso, setSelectedIso] = useState<string | null>(() => {
    const digits = normalizeDialDigits(countryCode);
    return findCountryByDialDigits(digits)?.code ?? null;
  });
  const matched = useMemo(() => {
    if (selectedIso) {
      const byIso = findCountryByIsoCode(selectedIso);
      if (byIso && normalizeDialDigits(byIso.dial_code) === dialDigits) {
        return byIso;
      }
    }
    return findCountryByDialDigits(dialDigits);
  }, [dialDigits, selectedIso]);
  const [useCustom, setUseCustom] = useState(() =>
    Boolean(dialDigits && !findCountryByDialDigits(dialDigits))
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCountries = useMemo(
    () => filterCountriesByQuery(search),
    [search]
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [search]);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: 0 });
    }
  }, [open]);

  useEffect(() => {
    if (!dialDigits) {
      setSelectedIso(null);
      return;
    }
    if (selectedIso) {
      const byIso = findCountryByIsoCode(selectedIso);
      if (byIso && normalizeDialDigits(byIso.dial_code) === dialDigits) {
        return;
      }
    }
    setSelectedIso(findCountryByDialDigits(dialDigits)?.code ?? null);
  }, [dialDigits, selectedIso]);

  useEffect(() => {
    if (dialDigits && !findCountryByDialDigits(dialDigits)) {
      setUseCustom(true);
    }
  }, [dialDigits]);

  const showCustomInput = useCustom || Boolean(dialDigits && !matched);
  const selectValue = matched
    ? matched.code
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
      setSelectedIso(null);
      setOpen(false);
      return;
    }
    if (value === '') {
      setUseCustom(false);
      setSelectedIso(null);
      onChange('', nationalNumber);
      setOpen(false);
      return;
    }
    const country = findCountryByIsoCode(value);
    if (!country) return;
    setUseCustom(false);
    setSelectedIso(country.code);
    onChange(normalizeDialDigits(country.dial_code), nationalNumber);
    setOpen(false);
  };

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:gap-3', className)}>
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-[13.5rem]">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setSearch('');
          }}
        >
          <PopoverTrigger asChild>
            <Button
              id={`${id}-country`}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label="Country code"
              className={cn(
                'h-11 w-full justify-between rounded-full border-default bg-hover px-3 text-left text-base font-normal text-default hover:bg-hover focus-visible:border-strong focus-visible:ring-strong',
                !selectValue && 'text-secondary',
                selectClassName
              )}
            >
              <span className="truncate">{triggerLabel}</span>
              <ChevronsUpDown
                className="ml-2 h-4 w-4 shrink-0 text-secondary opacity-70"
                aria-hidden
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[min(22rem,calc(100vw-2rem))] p-0"
          >
            <Command
              shouldFilter={false}
              className="rounded-lg bg-overlay text-popover-foreground"
            >
              <CommandInput
                placeholder="Search country or code…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList ref={listRef}>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {!search.trim() ? (
                    <CommandItem
                      value="no country code"
                      data-checked={!selectValue ? true : undefined}
                      onSelect={() => handleSelect('')}
                    >
                      No country code
                    </CommandItem>
                  ) : null}
                  {filteredCountries.map((row) => {
                    const digits = normalizeDialDigits(row.dial_code);
                    const label = formatCountryOptionLabel(row);
                    const selected = matched?.code === row.code;
                    return (
                      <CommandItem
                        key={row.code}
                        value={`${row.name} ${row.dial_code} ${digits} ${row.code}`}
                        data-checked={selected ? true : undefined}
                        onSelect={() => handleSelect(row.code)}
                      >
                        <span className="truncate">{label}</span>
                      </CommandItem>
                    );
                  })}
                  {!search.trim() ? (
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
                  ) : null}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {showCustomInput ? (
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-secondary">
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
          <Smartphone className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 icon-tertiary" />
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
