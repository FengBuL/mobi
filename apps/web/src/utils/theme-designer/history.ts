export interface HistoryState<T> {
  past: T[]
  future: T[]
}

export interface HistoryTransition<T> {
  entry: T
  state: HistoryState<T>
}

export function createHistoryState<T>(): HistoryState<T> {
  return { past: [], future: [] }
}

export function pushHistory<T>(state: HistoryState<T>, entry: T, limit = 60): HistoryState<T> {
  return {
    past: [...state.past, entry].slice(-limit),
    future: [],
  }
}

export function undoHistory<T>(state: HistoryState<T>, current: T, limit = 60): HistoryTransition<T> | null {
  const entry = state.past[state.past.length - 1]
  if (!entry)
    return null

  return {
    entry,
    state: {
      past: state.past.slice(0, -1),
      future: [current, ...state.future].slice(0, limit),
    },
  }
}

export function redoHistory<T>(state: HistoryState<T>, current: T, limit = 60): HistoryTransition<T> | null {
  const entry = state.future[0]
  if (!entry)
    return null

  return {
    entry,
    state: {
      past: [...state.past, current].slice(-limit),
      future: state.future.slice(1),
    },
  }
}
