'use client';

import { useEffect, useState } from 'react';
import { getTasks, updateTaskStatus } from '@/api/tasks';
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
  const [moveError, setMoveError] = useState<string | null>(null);
  const [movingTaskIds, setMovingTaskIds] = useState<Set<string>>(new Set());

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

  async function handleMoveTask(task: Task, nextStatus: TaskStatus) {
    const previousStatus = task.status;
    setMoveError(null);
    setMovingTaskIds((prev) => new Set(prev).add(task.id));

    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, status: nextStatus } : item
      )
    );

    try {
      const updatedTask = await updateTaskStatus(task.id, nextStatus);
      setTasks((prev) =>
        prev.map((item) => (item.id === task.id ? updatedTask : item))
      );
    } catch (err) {
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id ? { ...item, status: previousStatus } : item
        )
      );
      setMoveError(
        err instanceof Error ? err.message : 'Failed to move task'
      );
    } finally {
      setMovingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

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
        <>
          {moveError && (
            <div role="alert" className={styles.moveErrorBanner}>
              <p className={styles.errorMessage}>{moveError}</p>
              <button
                type="button"
                className={styles.dismissButton}
                onClick={() => setMoveError(null)}
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          )}

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
                    {columnTasks.map((task) => {
                      const isMoving = movingTaskIds.has(task.id);
                      const targetColumns = COLUMNS.filter(
                        (target) => target.status !== task.status
                      );

                      return (
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
                          <div className={styles.cardActions}>
                            {targetColumns.map((target) => (
                              <button
                                key={target.status}
                                type="button"
                                className={styles.moveButton}
                                disabled={isMoving}
                                onClick={() =>
                                  handleMoveTask(task, target.status)
                                }
                              >
                                Move to {target.label}
                              </button>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
