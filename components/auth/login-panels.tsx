"use client";

import { Mail, ShieldCheck } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Tab = "client" | "admin";

export function LoginPanels() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("client");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const callbackError = searchParams.get("erreur");
    if (callbackError) {
      setTab("client");
      setError(callbackError);
    }
  }, [searchParams]);

  async function requestMagicLink() {
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/customer/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: customerEmail,
          name: customerName,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible d'envoyer le lien magique.");
      }

      startTransition(() => {
        setStatus("Lien envoyé. Vérifiez votre boîte mail pour accéder à votre compte.");
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d'envoyer le lien magique.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loginAdmin() {
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Connexion admin impossible.");
      }

      window.location.href = "/admin";
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Connexion admin impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
      <aside className="rounded-[34px] border border-[var(--line)] bg-[rgba(36,26,19,0.94)] p-6 text-[var(--surface)]">
        <p className="text-xs uppercase tracking-[0.34em] text-[rgba(255,244,220,0.72)]">
          Connexion
        </p>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-none">
          Deux accès, un même salon.
        </h2>
        <p className="mt-4 text-sm leading-7 text-[rgba(255,244,220,0.78)]">
          La cliente se connecte par lien magique reçu par e-mail. L’administration suit le
          planning, les services, les photos et les avis depuis un accès séparé.
        </p>

        <div className="mt-8 space-y-4 text-sm leading-7 text-[rgba(255,244,220,0.72)]">
          <p>
            <strong className="text-[var(--surface)]">
              Créez votre compte et gagnez 1 point maintenant
            </strong>
            , puis 1 point à chaque réservation terminée.
          </p>
          <p>
            Les confirmations, reports, annulations et rappels passent désormais par e-mail.
          </p>
          <p>
            Accès admin de démonstration: <strong>owner-glamlyn</strong> /{" "}
            <strong>GlamLyn2026!</strong>
          </p>
        </div>
      </aside>

      <section className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-4 sm:p-6">
        <div className="mb-6 inline-flex rounded-full border border-[var(--line)] bg-white/70 p-1">
          <button
            type="button"
            onClick={() => setTab("client")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === "client" ? "bg-[var(--ink)] text-[var(--surface)]" : "text-[var(--muted-ink)]"
            }`}
          >
            Espace client
          </button>
          <button
            type="button"
            onClick={() => setTab("admin")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === "admin" ? "bg-[var(--ink)] text-[var(--surface)]" : "text-[var(--muted-ink)]"
            }`}
          >
            Administration
          </button>
        </div>

        {tab === "client" ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[var(--gold-deep)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Connexion par e-mail</p>
                <p className="text-sm text-[var(--muted-ink)]">
                  Un lien magique suffit pour accéder à vos réservations et à vos points.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="space-y-2 text-sm">
                <span>Nom complet</span>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 outline-none focus:border-[var(--gold)]"
                  placeholder="Ex: Nadia K."
                />
              </label>
              <label className="space-y-2 text-sm">
                <span>E-mail</span>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 outline-none focus:border-[var(--gold)]"
                  placeholder="vous@exemple.com"
                />
              </label>
            </div>

            {status ? (
              <p className="rounded-2xl bg-[rgba(181,138,71,0.12)] px-4 py-3 text-sm text-[var(--ink)]">
                {status}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-2xl bg-[#fff1eb] px-4 py-3 text-sm text-[#8d3f21]">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={busy}
              onClick={() => void requestMagicLink()}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)] disabled:opacity-60"
            >
              {busy ? "Envoi..." : "Recevoir mon lien magique"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[var(--gold-deep)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Connexion administration</p>
                <p className="text-sm text-[var(--muted-ink)]">
                  Identifiant spécifique pour le tableau de bord et la gestion du site.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="space-y-2 text-sm">
                <span>Identifiant admin</span>
                <input
                  value={adminUsername}
                  onChange={(event) => setAdminUsername(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 outline-none focus:border-[var(--gold)]"
                  placeholder="owner-glamlyn"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span>Mot de passe</span>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 outline-none focus:border-[var(--gold)]"
                  placeholder="••••••••"
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-2xl bg-[#fff1eb] px-4 py-3 text-sm text-[#8d3f21]">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={busy}
              onClick={() => void loginAdmin()}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)] disabled:opacity-60"
            >
              {busy ? "Connexion..." : "Ouvrir le tableau de bord"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
