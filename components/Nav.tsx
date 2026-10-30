"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useStatus } from "./useStatus";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/personas", label: "Personas" },
  { href: "/crear", label: "Crear video" },
  { href: "/referencias", label: "Plantillas de reels" },
];

export function Nav() {
  const path = usePathname();
  const { data: session } = useSession();
  const status = useStatus();
  return (
    <header className="border-b border-[var(--line)] bg-[var(--card)]">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-[var(--accent)]">
          Momentos
        </Link>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={path === l.href || (l.href !== "/" && path.startsWith(l.href)) ? "font-semibold" : "muted"}
          >
            {l.label}
          </Link>
        ))}
        <div className="ml-auto">
          {status?.google ? (
            session ? (
              <button className="btn btn-ghost text-sm" onClick={() => signOut()}>
                Salir ({session.user?.name?.split(" ")[0]})
              </button>
            ) : (
              <button className="btn text-sm" onClick={() => signIn("google")}>
                Conectar Google Drive
              </button>
            )
          ) : (
            <span className="muted text-sm">Google no configurado</span>
          )}
        </div>
      </nav>
    </header>
  );
}
