import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Server-only module. Never import this from a "use client" file.
// Reads a standard Firebase service account (Project Settings -> Service
// accounts -> Generate new private key) from three separate env vars so the
// key can live safely in Vercel's encrypted environment variable store.

let app: App | null = null;

function getAdminApp(): App | null {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel's env var UI can double-escape newlines or wrap the value in quotes.
  // We normalise both cases so the key works regardless of how it was pasted.
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const privateKey = rawKey
    .replace(/^["']|["']$/g, "")   // strip surrounding quotes if any
    .replace(/\\n/g, "\n");         // convert escaped \n back to real newlines

  if (!projectId || !clientEmail || !privateKey) {
    // Admin credentials are optional for local UI development, but required
    // for any API route that verifies auth tokens or writes with elevated
    // privileges. Routes should check `adminAvailable` and fail gracefully.
    return null;
  }

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

export const adminAvailable = Boolean(getAdminApp());

export function getAdminAuth() {
  const a = getAdminApp();
  if (!a) throw new Error("Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
  return getAuth(a);
}

export function getAdminDb() {
  const a = getAdminApp();
  if (!a) throw new Error("Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
  return getFirestore(a);
}

/** Verifies the `Authorization: Bearer <idToken>` header sent from the client and returns the uid. */
export async function verifyRequestToken(request: Request): Promise<{ uid: string } | null> {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const idToken = header.slice("Bearer ".length).trim();
  if (!idToken) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
