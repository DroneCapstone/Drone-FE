import { Children, isValidElement, type ReactNode } from 'react';
import { DropdownSelect, type DropdownSelectOption } from '../../../components/ui/DropdownSelect';

type OptionProps = { value?: string | number; disabled?: boolean; children?: ReactNode };
type ValueChange = { target: { value: string }; currentTarget: { value: string } };
interface AdminSelectProps {
  value: string | number | null | undefined;
  onChange: (event: ValueChange) => void;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

function optionText(node: ReactNode): string {
  return Children.toArray(node).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? optionText(child.props.children) : '';
  }).join('').replace(/\s+/g, ' ').trim();
}

/** Uses the same Radix DropdownSelect as Operator, with an adapter for existing Admin forms. */
export function AdminSelect({ value, onChange, children, className, required, disabled, id, 'aria-label': ariaLabel }: AdminSelectProps) {
  const entries: DropdownSelectOption[] = [];
  Children.forEach(children, child => {
    if (!isValidElement<OptionProps>(child) || child.type !== 'option') return;
    const label = optionText(child.props.children);
    entries.push({ value: String(child.props.value ?? label), label, disabled: child.props.disabled });
  });
  // Radix reserves an empty string for its placeholder. Required forms retain
  // a genuinely empty value until a real option is selected. Optional filters
  // can select the empty option again (All types, Unassigned, etc.).
  let emptyKey = '__admin_empty_option__';
  while (entries.some(entry => entry.value === emptyKey)) emptyKey += '_';
  const empty = entries.find(entry => entry.value === '');
  const options = entries.filter(entry => !required || entry.value !== '').map(entry => ({
    ...entry, value: entry.value === '' ? emptyKey : entry.value,
  }));
  const actual = String(value ?? '');
  const selected = actual === '' && empty && !required ? emptyKey : actual;
  return <DropdownSelect
    value={selected}
    options={options}
    onChange={next => {
      const target = { value: next === emptyKey ? '' : next };
      onChange({ target, currentTarget: target });
    }}
    ariaLabel={ariaLabel}
    id={id}
    disabled={disabled}
    required={required}
    placeholder={empty?.label ?? 'Select an option'}
    className={['admin-select-control', className].filter(Boolean).join(' ')}
    menuClassName="admin-select-menu"
  />;
}
