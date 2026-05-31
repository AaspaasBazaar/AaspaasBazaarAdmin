import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cachedApp: App | null = null;

const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), "service-account.json");

type ResolvedCreds = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function fromEnv(): ResolvedCreds | null {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel stores \n as literal backslash-n — restore real newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

function fromFile(): ResolvedCreds | null {
  if (!existsSync(SERVICE_ACCOUNT_FILE)) return null;
  try {
    const raw = JSON.parse(readFileSync(SERVICE_ACCOUNT_FILE, "utf8")) as Record<string, string>;
    if (!raw.project_id || !raw.client_email || !raw.private_key) return null;
    return {
      projectId: raw.project_id,
      clientEmail: raw.client_email,
      privateKey: raw.private_key,
    };
  } catch {
    return null;
  }
}

function resolveCreds(): ResolvedCreds | null {
  return fromEnv() ?? fromFile();
}

export function hasAdminCreds(): boolean {
  return resolveCreds() !== null;
}

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }
  const creds = resolveCreds();
  if (!creds) {
    throw new Error(
      "Firebase Admin credentials missing. Either: " +
        "(a) drop service-account.json at repo root, or " +
        "(b) set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars, or " +
        "(c) set STORAGE_MODE=json to force local db.json mode.",
    );
  }
  cachedApp = initializeApp({
    credential: cert({
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      privateKey: creds.privateKey,
    }),
    projectId: creds.projectId,
  });
  return cachedApp;
}

export function getDb(): Firestore {
  return getFirestore(getAdminApp());
}
