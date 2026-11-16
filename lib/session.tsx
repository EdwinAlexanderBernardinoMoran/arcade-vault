"use client";

import {
  createContext,
  use,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export interface SessionUser {
  name: string; // máx. 10 caracteres, mayúsculas
}

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";
const MAX_NAME_LENGTH = 10;

// --- Almacenamiento con respaldo en memoria -------------------------------
// Si localStorage está bloqueado (modo privado), la sesión sigue funcionando
// mientras dure la pestaña, aunque no persista.

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // localStorage bloqueado: usar el respaldo en memoria.
    return memory.get(key) ?? null;
  }
}

function writeItem(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // localStorage bloqueado: usar el respaldo en memoria.
    if (value === null) memory.delete(key);
    else memory.set(key, value);
  }
  listeners.forEach((notify) => notify());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Sincroniza cambios hechos desde otras pestañas.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getUserSnapshot = (): string | null => readItem(USER_KEY);
// En el servidor y durante la hidratación siempre hay invitado.
const getServerSnapshot = (): string | null => null;

function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as SessionUser).name === "string"
    ) {
      return { name: (parsed as SessionUser).name };
    }
  } catch {
    // JSON corrupto: se trata como sin sesión.
  }
  return null;
}

// --- Acciones (referencias estables a nivel de módulo) --------------------

function login(next: SessionUser): void {
  const name = next.name.trim().toUpperCase().slice(0, MAX_NAME_LENGTH);
  writeItem(USER_KEY, JSON.stringify({ name }));
}

function signOut(): void {
  writeItem(USER_KEY, null);
}

function saveScore(entry: Omit<SavedScore, "at">): void {
  let all: SavedScore[] = [];
  try {
    const parsed: unknown = JSON.parse(readItem(SCORES_KEY) ?? "[]");
    if (Array.isArray(parsed)) all = parsed as SavedScore[];
  } catch {
    // JSON corrupto: se reinicia la lista.
  }
  all.push({ ...entry, at: Date.now() });
  writeItem(SCORES_KEY, JSON.stringify(all));
}

// --- Contexto -------------------------------------------------------------

interface SessionContextValue {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  signOut: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const rawUser = useSyncExternalStore(
    subscribe,
    getUserSnapshot,
    getServerSnapshot,
  );
  const user = useMemo(() => parseUser(rawUser), [rawUser]);
  const value = useMemo(() => ({ user, login, signOut, saveScore }), [user]);

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
