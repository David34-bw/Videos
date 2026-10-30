import "server-only";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getToken, type JWT } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function fullDriveRead(): boolean {
  return process.env.GOOGLE_DRIVE_FULL_READ === "true";
}

const scopes = [
  "openid",
  "email",
  "profile",
  // Solo archivos elegidos en el selector o creados por la app (no exige verificación de Google)
  "https://www.googleapis.com/auth/drive.file",
  ...(fullDriveRead() ? ["https://www.googleapis.com/auth/drive.readonly"] : []),
];

interface GoogleJWT extends JWT {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

async function refresh(token: GoogleJWT): Promise<GoogleJWT> {
  if (!token.refreshToken) return { ...token, error: "NoRefreshToken" };
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    }),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; refresh_token?: string };
  if (!res.ok || !data.access_token) return { ...token, error: "RefreshFailed" };
  return {
    ...token,
    accessToken: data.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    refreshToken: data.refresh_token ?? token.refreshToken,
    error: undefined,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: googleEnabled()
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          authorization: {
            params: { scope: scopes.join(" "), access_type: "offline", prompt: "consent" },
          },
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, account }) {
      const t = token as GoogleJWT;
      if (account) {
        return {
          ...t,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }
      if (t.expiresAt && Date.now() / 1000 < t.expiresAt - 60) return t;
      return refresh(t);
    },
    async session({ session, token }) {
      // El token de Google NO se expone en la sesión del navegador
      return { ...session, error: (token as GoogleJWT).error };
    },
  },
};

/** Token de acceso de Google para usar en el servidor (renueva si venció) */
export async function getGoogleAccessToken(req: NextRequest): Promise<string | null> {
  const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as GoogleJWT | null;
  if (!token?.accessToken) return null;
  if (token.expiresAt && Date.now() / 1000 < token.expiresAt - 60) return token.accessToken;
  const renewed = await refresh(token);
  return renewed.accessToken ?? null;
}
