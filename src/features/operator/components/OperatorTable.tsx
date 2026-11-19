import type { ComponentProps } from 'react';
import {
  Table as SharedTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/ui/table';
import './operator-table.css';

/** Reuse the same table primitives as Technician, with Operator-scoped styling. */
export function OperatorTable({ className = '', ...props }: ComponentProps<'table'>) {
  return <SharedTable className={`operator-ui-table ${className}`.trim()} {...props} />;
}

export { TableHeader, TableBody, TableRow, TableHead, TableCell };
