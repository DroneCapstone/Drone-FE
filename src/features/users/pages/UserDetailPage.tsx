import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Loading } from '../../../components/common/Loading';
import { getUserById } from '../services/userService';
import type { User } from '../types/user';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);

  const [result, setResult] = useState<{
    userId: number;
    data?: User;
    error?: string;
  } | null>(null);
  const loading = result?.userId !== userId;
  const data = result?.userId === userId ? result.data ?? null : null;
  const error = result?.userId === userId ? result.error ?? null : null;

  useEffect(() => {
    let cancelled = false;
    getUserById(userId)
      .then((result) => {
        if (!cancelled) setResult({ userId, data: result });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ userId, error: err instanceof Error ? err.message : 'Failed to load user' });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <section>
      <p>
        <Link to="/">&larr; Back to users</Link>
      </p>
      <h1>User detail</h1>

      {loading && <Loading label="Loading user..." />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <dl className="detail">
          <dt>ID</dt>
          <dd>{data.id}</dd>
          <dt>Full name</dt>
          <dd>{data.full_name}</dd>
          <dt>Email</dt>
          <dd>{data.email}</dd>
          <dt>Created at</dt>
          <dd>{new Date(data.created_at).toLocaleString()}</dd>
        </dl>
      )}
    </section>
  );
}
