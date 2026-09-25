"use client";

import { useActionState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { loginStep, type LoginState } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";

export function LoginForm({ next, demo }: { next: string; demo: boolean }) {
  const { t } = useI18n();
  const [state, action] = useActionState<LoginState, FormData>(loginStep, { step: "phone" });

  return (
    <div className="mx-auto max-w-sm space-y-5 pt-6">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-3xl font-black text-white">ب</span>
        <h1 className="mt-3 text-2xl font-extrabold">{t.loginTitle}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.loginSub}</p>
      </div>

      <form action={action} className="card space-y-4 p-5">
        <input type="hidden" name="next" value={next} />

        {state.step === "phone" && (
          <label className="block">
            <span className="label">{t.phoneNumber}</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0300 1234567"
              required
              dir="ltr"
              className="input num text-lg"
            />
          </label>
        )}

        {state.step === "code" && (
          <>
            <p className="text-sm text-slate-600">
              {t.codeSentTo} <span className="num font-semibold" dir="ltr">{state.phone}</span>
            </p>
            {state.demoCode && (
              <Notice tone="warn">
                {t.demoCode} <span className="num font-mono text-base font-bold">{state.demoCode}</span>
              </Notice>
            )}
            <label className="block">
              <span className="label">{t.enterCode}</span>
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                dir="ltr"
                className="input num text-center text-2xl tracking-[0.5em]"
              />
            </label>
          </>
        )}

        {state.step === "name" && (
          <label className="block">
            <span className="label">{t.yourName}</span>
            <input name="name" required maxLength={60} autoFocus autoComplete="name" className="input" />
          </label>
        )}

        {state.error && <Notice tone="error">{state.error}</Notice>}

        <SubmitButton className="btn-primary w-full py-3">
          {state.step === "phone" ? t.sendCode : state.step === "code" ? t.verify : t.continue}
        </SubmitButton>
        {state.step === "code" && (
          <button name="intent" value="restart" formNoValidate className="w-full text-sm text-brand-700">
            {t.changeNumber}
          </button>
        )}
      </form>

      {demo && state.step === "phone" && (
        <p className="text-center text-xs text-slate-400">
          Demo: 0300 1111111 (customer) · 0300 2222222 (salon owner) · 0300 0000000 (admin)
        </p>
      )}
    </div>
  );
}
