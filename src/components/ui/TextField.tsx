import type { InputHTMLAttributes } from 'react';
import { Input } from './Input';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, id, ...rest }: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label className="field" htmlFor={inputId}>
      {label}
      <Input id={inputId} {...rest} />
    </label>
  );
}
