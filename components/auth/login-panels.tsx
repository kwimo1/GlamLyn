"use client";

import { ShieldCheck, Smartphone } from "lucide-react";
import { startTransition, useState } from "react";

type Tab = "client" | "admin";

export function LoginPanels() {
  const [tab, setTab] = useState<Tab>("client");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [customerStep, setCustomerStep] = useState<"request" | "verify">("request");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtp() {
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/customer/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: customerPhone,
          name: customerName,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible d'envoyer le code.");
      }

      startTransition(() => {
        setDemoCode(payload.demoCode ?? null);
        setStatus("Code envoyé. Vérifiez votre SMS.");
        setCustomerStep("verify");
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Impossible d'envoyer le code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/customer/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: customerPhone,
          code: customerCode,
          name: customerName,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Vérification impossible.");
      }

      window.location.href = "/compte";
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Vérification impossible.",
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
          La cliente gère ses rendez-vous par code SMS. L’administration suit le planning, les services, les photos et les avis.
        </p>

        <div className="mt-8 space-y-4 text-sm leading-7 text-[rgba(255,244,220,0.72)]">
          <p>
            <strong className="text-[var(--surface)]">
              Créez votre compte et gagnez 1 point maintenant
            </strong>
            , puis 1 point à chaque réservation.
          </p>
          <p>
            Mode démo inclus: si aucun fournisseur SMS n’est configuré, le code de test s’affiche ici après demande.
          </p>
          <p>
            Accès admin de démonstration: <strong>owner-glamlyn</strong> / <strong>GlamLyn2026!</strong>
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
              <Smartphone className="h-5 w-5 text-[var(--gold-deep)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Connexion par téléphone</p>
                <p className="text-sm text-[var(--muted-ink)]">
                  Un code SMS suffit pour accéder à vos réservations et à vos points.
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
                <span>Téléphone</span>
                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 outline-none focus:border-[var(--gold)]"
                  placeholder="+213..."
                />
              </label>
            </div>

            {customerStep === "verify" ? (
              <label className="space-y-2 text-sm">
                <span>Code reçu</span>
                <input
                  value={customerCode}
                  onChange={(event) => setCustomerCode(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 outline-none focus:border-[var(--gold)]"
                  placeholder="123456"
                />
              </label>
            ) : null}

            {demoCode ? (
              <p className="rounded-2xl bg-[rgba(181,138,71,0.12)] px-4 py-3 text-sm text-[var(--ink)]">
                Code de démonstration: <strong>{demoCode}</strong>
              </p>
            ) : null}

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
              onClick={() => void (customerStep === "request" ? requestOtp() : verifyOtp())}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)] disabled:opacity-60"
            >
              {busy
                ? "Un instant..."
                : customerStep === "request"
                  ? "Recevoir mon code"
                  : "Accéder à mon compte"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[var(--gold-deep)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Connexion administration</p>
                <p className="text-sm text-[var(--muted-ink)]">
                  Identifiant spécifique pour le dashboard owner et la gestion du site.
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
              {busy ? "Connexion..." : "Ouvrir le dashboard"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
