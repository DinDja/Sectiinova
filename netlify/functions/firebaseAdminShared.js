import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const FIREBASE_PROJECT_ID_HARDCODED = "inovasecti-a3dea";
const FIREBASE_CLIENT_EMAIL_HARDCODED =
  "firebase-adminsdk-fbsvc@inovasecti-a3dea.iam.gserviceaccount.com";
const FIREBASE_PRIVATE_KEY_HARDCODED = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDNivv2BzpFjWmj
P1BIyh/MU1U3dhKOBhweFaFh876OtWqmOUZHzA4jjrsbHTt6UOxMjsRouvamFKXS
GED+Nb/6AqG90BTquSrz331VvgTQ6GaGZtT8mwDeV62t5ZyacdCmICo4DSrM2De3
PU7k0wvNnjqInoeNWf2LWi/G64/s17NQnc2LiwlK2vK5x6oow1rtc3gJj4H0jA/a
h2ux2cz2Opz0GeZRZ0+47x5UEZ6E2dB/lcTxN9DdobCr5HYnyza4KAPlynwb9w/h
zkiLqDeBoiU7bASfyuGkWq/4THNhZoafa61+XVWip9RUWKLnkVvcgYp7Mhja9p5U
sG4AJGKrAgMBAAECggEAAIgri43ZO/TYISQFmsQ38NkGXDsuyrWy8CD+M4XkW41j
CUSv4EYW6a1xroN7QLj7SfduN32RLDzbCpm/EU+/GQm759HYbzZFD8lN4CFUKEML
Ta282PdNuUWUA+JkO8IWC1gDkMGRkS++DsTwP1QmFt7uwXInlHLdkehZ100kwjTx
59s7XtJl4t65CafkMQr1NpK2l++Afb6MD6mgQKMxOJGcpL52ZZJJZBAxngtHoVWM
2wtHpsbkIc/yCTOWs/iNzkFaLq3Go/6E3nMeoFaBv6aXgG0oz1jg3SQLCUi9MCrw
HYBiorMU7N/IV0dfp6KGTJT/4qlJmGHgx3OZSwazgQKBgQDySvVUmoNE/OSMBh9p
moizOSGom6k/JXIE096risTLvEkmpmdC3T6hV6NA7p3q5UYAef2CXc2+uwexOYQF
TVgakXre5wbvvDbP2yzuwvT0HdPatAF5HHvwHnHKdzuFcN1k+DJrLPzD3XZKX8QM
gNFn4cfRJrmCu3pxPlBm4BEAbwKBgQDZK8o+S1eaiqDN+rUpaN8ZUWloaYdtm2vY
mKQMbypZvOmYLnGFNr/7vRfRkMbpCURuhWPjsphlmggdHJqMFYiUScI4RN1UkezV
gdE8agI6GGyNN+2CS6C890H82/irXQZKC+bwYOX3RVUjheq5tZLFBqbnuoy6PngC
BhtH/kXnhQKBgG0CyKpN8m2hknplbtCmlIZ+V+RyVI1ynYAKiw6HGs/HYOogyCjP
PhR9R5g5Q5ehnAMu35498gm0QFu+UuXHzLH3bl7Hdtl5xvdx1x99W5RRrzWg82C4
LhL0v6GmT4NUKmf5O0X5Mag2BbikqaIuewjQDoTNdX2aOBanQKloen3FAoGBAJIp
UriSZKdyXb/D2GHCX0Te8h5/x9IRJIhmUyK7Prme12jA+U47BwMaxQkac4Ur446u
4AfDj6XyATv2oF1fsMh8y+arEnt0qv0XngcXIeCPx59T4NospEYJ87OHKNnMhgsX
75og3SWK2D5MRyot9lX8oCCeAVDn8kUKbxoJHGsxAoGBAMp1rO2xFPoos32ipThH
DOsMplhGfGqPj0r74MX+pTTWEifto/ey0SL1ds8D2GFUsbwpzKgVyXk3CuMGdjNx
shfd71Fejzg9n4p4+BCdAZs2ifk00SLXgfO38laItyxxLD3J2sILb6Ue2UQjrS/O
/NRsbGDO0d8r75qO0yTXCiwL
-----END PRIVATE KEY-----
`;

function readConfiguredValue(envName, fallbackValue, label) {
  const envValue = String(process.env[envName] || "").trim();
  if (envValue) {
    return envValue;
  }

  const hardcodedValue = String(fallbackValue || "").trim();
  if (hardcodedValue && !/^COLE_/i.test(hardcodedValue)) {
    return hardcodedValue;
  }

  throw new Error(
    `Valor ausente para ${label}. Defina ${envName} ou configure a constante hardcoded.`,
  );
}

function normalizePrivateKey(value) {
  return String(value || "").replace(/\\n/g, "\n");
}

function getServiceAccountFromConfig() {
  return {
    projectId: readConfiguredValue(
      "FIREBASE_ADMIN_PROJECT_ID",
      FIREBASE_PROJECT_ID_HARDCODED,
      "projectId",
    ),
    clientEmail: readConfiguredValue(
      "FIREBASE_ADMIN_CLIENT_EMAIL",
      FIREBASE_CLIENT_EMAIL_HARDCODED,
      "clientEmail",
    ),
    privateKey: normalizePrivateKey(
      readConfiguredValue(
        "FIREBASE_ADMIN_PRIVATE_KEY",
        FIREBASE_PRIVATE_KEY_HARDCODED,
        "privateKey",
      ),
    ),
  };
}

function ensureAdminApp() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(getServiceAccountFromConfig()),
    });
  }

  return getApps()[0];
}

export function getAdminDb() {
  ensureAdminApp();
  return getFirestore();
}

export function getAdminAuth() {
  ensureAdminApp();
  return getAuth();
}
