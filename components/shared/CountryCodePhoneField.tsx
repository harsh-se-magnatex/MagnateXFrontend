'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COUNTRY_DIAL_CODES,
  CUSTOM_COUNTRY_CODE_VALUE,
  digitsOnly,
  findCountryByDialDigits,
  formatCountryOptionLabel,
  normalizeDialDigits,
} from '@/lib/country-codes';

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

  const handleSelectChange = (value: string) => {
    if (value === CUSTOM_COUNTRY_CODE_VALUE) {
      setUseCustom(true);
      return;
    }
    setUseCustom(false);
    onChange(value, nationalNumber);
  };

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:gap-3', className)}>
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-[13.5rem]">
        <div className="relative">
          <select
            id={`${id}-country`}
            aria-label="Country code"
            autoComplete="tel-country-code"
            value={selectValue}
            onChange={(e) => handleSelectChange(e.target.value)}
            className={cn(selectClassName, 'appearance-none pr-9')}
          >
            <option value="" disabled>
              Country code
            </option>
            {COUNTRY_DIAL_CODES.map((row) => {
              const digits = normalizeDialDigits(row.dial_code);
              return (
                <option key={`${row.code}-${digits}`} value={digits}>
                  {formatCountryOptionLabel(row)}
                </option>
              );
            })}
            <option value={CUSTOM_COUNTRY_CODE_VALUE}>Other (add code)</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        </div>

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
