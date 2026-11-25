'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createTask, getTasks, updateTaskStatus } from '@/api/tasks';
import type { Task, TaskStatus } from '@/types';
import styles from './page.module.css';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'TODO', label: 'To do' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'DONE', label: 'Done' },
];

function isValidFutureOrTodayDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return parsed >= today;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [movingTaskIds, setMovingTaskIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskError, setNewTaskError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

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

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) {
      setNewTaskError('Title is required.');
      return;
    }

    if (trimmedTitle.length > 80) {
      setNewTaskError('Title must be at most 80 characters.');
      return;
    }

    const descriptionInput = window.prompt('Enter description (optional):');
    if (descriptionInput === null) {
      return;
    }

    const dueDateInput = window.prompt(
      'Enter due date in YYYY-MM-DD format (optional):'
    );
    if (dueDateInput === null) {
      return;
    }

    const trimmedDescription = descriptionInput.trim();
    const trimmedDueDate = dueDateInput.trim();

    if (trimmedDueDate && !isValidFutureOrTodayDate(trimmedDueDate)) {
      setNewTaskError('Due date must be today or a future date (YYYY-MM-DD).');
      return;
    }

    setNewTaskError(null);
    setIsCreating(true);

    try {
      const created = await createTask({
        title: trimmedTitle,
        status: 'TODO',
        description: trimmedDescription || undefined,
        dueDate: trimmedDueDate || undefined,
      });
      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle('');
    } catch (err) {
      setNewTaskError(
        err instanceof Error ? err.message : 'Failed to create task'
      );
    } finally {
      setIsCreating(false);
    }
  }

  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const filteredTasks = normalizedQuery
    ? tasks.filter((task) =>
        task.title.toLowerCase().includes(normalizedQuery)
      )
    : tasks;

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
          <div className={styles.searchContainer}>
            <label htmlFor="search-tasks" className={styles.searchLabel}>
              Search tasks
            </label>
            <input
              id="search-tasks"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title"
              className={styles.searchInput}
            />
          </div>

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
              const columnTasks = filteredTasks.filter(
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

                  {column.status === 'TODO' && (
                    <form
                      onSubmit={handleAddTask}
                      className={styles.addTaskForm}
                      noValidate
                    >
                      <label
                        htmlFor="new-task-title"
                        className={styles.addTaskLabel}
                      >
                        New task
                      </label>
                      <div className={styles.addTaskRow}>
                        <input
                          id="new-task-title"
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => {
                            setNewTaskTitle(e.target.value);
                            if (newTaskError) {
                              setNewTaskError(null);
                            }
                          }}
                          disabled={isCreating}
                          aria-invalid={Boolean(newTaskError)}
                          aria-describedby={
                            newTaskError ? 'new-task-error' : undefined
                          }
                          className={styles.addTaskInput}
                        />
                        <button
                          type="submit"
                          disabled={isCreating}
                          className={styles.addTaskButton}
                        >
                          {isCreating ? 'Adding...' : 'Add task'}
                        </button>
                      </div>
                      {newTaskError && (
                        <p
                          id="new-task-error"
                          role="alert"
                          className={styles.fieldError}
                        >
                          {newTaskError}
                        </p>
                      )}
                    </form>
                  )}

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
