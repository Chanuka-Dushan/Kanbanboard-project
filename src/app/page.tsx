'use client';

import { useEffect, useState } from 'react';
import { getTasks } from '@/api/tasks';
import type { Task } from '@/types';
import styles from './page.module.css';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTasks() {
      try {
        const data = await getTasks();
        if (isMounted) {
          setTasks(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load tasks');
          setIsLoading(false);
        }
      }
    }

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Task Board</h1>
      </header>

      {isLoading && (
        <div role="status" aria-live="polite" className={styles.loadingContainer}>
          <p className={styles.loadingMessage}>Loading tasks...</p>
        </div>
      )}

      {error && (
        <div role="alert" className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className={styles.content}>
          <p className={styles.taskCount}>
            Loaded {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}.
          </p>
        </div>
      )}
    </main>
  );
}
