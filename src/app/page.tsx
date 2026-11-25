'use client';

import { useEffect, useState } from 'react';
import { getTasks } from '@/api/tasks';
import type { Task, TaskStatus } from '@/types';
import styles from './page.module.css';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'TODO', label: 'To do' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'DONE', label: 'Done' },
];

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
        <div className={styles.board}>
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter(
              (task) => task.status === column.status
            );
            const headingId = `column-heading-${column.status.toLowerCase()}`;

            return (
              <section
                key={column.status}
                aria-labelledby={headingId}
                className={styles.column}
              >
                <header className={styles.columnHeader}>
                  <h2 id={headingId} className={styles.columnTitle}>
                    {column.label}{' '}
                    <span className={styles.columnCount}>
                      ({columnTasks.length})
                    </span>
                  </h2>
                </header>

                <ul className={styles.taskList}>
                  {columnTasks.map((task) => (
                    <li key={task.id} className={styles.card}>
                      <h3 className={styles.cardTitle}>{task.title}</h3>
                      {task.description && (
                        <p className={styles.cardDescription}>
                          {task.description}
                        </p>
                      )}
                      {task.dueDate && (
                        <p className={styles.cardDueDate}>
                          Due {task.dueDate}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
