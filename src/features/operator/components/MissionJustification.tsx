import { useId } from 'react';
import { isValidJustification } from '../utils/missionJustifications';
import './mission-justification.css';

type Props = { kind: 'drone' | 'battery' | 'route'; value: string; onChange?: (value: string) => void; readOnly?: boolean };

export function MissionJustification({ kind, value, onChange, readOnly = false }: Props) {
  const id = useId();
  const title = `${kind[0].toUpperCase()}${kind.slice(1)} justification`;
  const target = kind === 'route' ? 'AI-recommended route' : `selected ${kind}`;
  const error = !isValidJustification(value)
    ? !value.trim() ? `Please provide a reason for changing the ${target}.`
      : 'Please provide a specific justification (at least 30 characters and 5 distinct words).'
    : '';
  return <div className="mission-justification fields">
    <label htmlFor={id}>
      <span>{title}{!readOnly && <span className="mission-justification-required"> *</span>}</span>
      {readOnly ? <div className="mission-justification-value">{value.trim() || '—'}</div> :
        <textarea id={id} rows={3} maxLength={2000} required value={value}
          onChange={event => onChange?.(event.target.value)}
          placeholder={`Explain why you selected a different ${kind}...`}
          aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />}
    </label>
    {!readOnly && error && <p id={`${id}-error`} className="mission-justification-error" role="status">{error}</p>}
  </div>;
}
