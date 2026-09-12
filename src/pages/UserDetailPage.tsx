import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { getUserById } from '../services/userService';
import type { User } from '../types/user';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);

  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getUserById(userId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load user');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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
