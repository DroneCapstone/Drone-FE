import { Navigate, useRoutes } from 'react-router-dom';
import { OperatorLayout } from '../layouts/OperatorLayout';
import { operatorRoutes } from './operatorRoutes';

export function AppRoutes() {
  return useRoutes([
    { element: <OperatorLayout/>, children: operatorRoutes },
    { path: '*', element: <Navigate to="/operator/dashboard" replace/> },
  ]);
}
