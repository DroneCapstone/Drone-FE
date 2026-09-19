import { Suspense } from 'react';
import { AppRoutes } from '../routes/AppRoutes';
import { AppProviders } from './providers';
import { Loading } from '../components/common/Loading';

function App() {
  return (
    <AppProviders>
      <Suspense fallback={<Loading label="Loading workspace…" />}>
        <AppRoutes />
      </Suspense>
    </AppProviders>
  );
}

export default App;
