"use client";

import { useActionState, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { registerSalon } from "@/lib/actions/business";
import { BasicsFields, HoursFields, LocationFields } from "@/experiences/business/salon-fields";
import { StepProgress } from "@/experiences/shared/progress";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";

/**
 * New salon signup in four short steps. Every step stays in the same form (only
 * hidden), so nothing typed is lost when going back.
 */
export function JoinWizard() {
  const { t } = useI18n();
  const [state, action] = useActionState(registerSalon, undefined);
  const [step, setStep] = useState(0);
  const aboutRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const steps = [t.joinStepAbout, t.joinStepLocation, t.hours, t.joinStepCheck];

  function next() {
    const box = [aboutRef, locationRef, hoursRef][step]?.current;
    const invalid = box ? [...box.querySelectorAll<HTMLInputElement>("input, select, textarea")].find((el) => !el.checkValidity()) : undefined;
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form action={action} className="space-y-5">
      <StepProgress steps={steps} current={step} label={t.step} />
      <div ref={aboutRef} hidden={step !== 0} className="card p-4">
        <BasicsFields />
      </div>
      <div ref={locationRef} hidden={step !== 1} className="card p-4">
        <LocationFields />
      </div>
      <div ref={hoursRef} hidden={step !== 2}>
        <HoursFields />
      </div>
      {step === 3 && (
        <div className="card space-y-2 p-5 text-center">
          <p className="text-4xl">✅</p>
          <h2 className="text-xl font-bold">{t.joinCheckTitle}</h2>
          <p className="text-zinc-600">{t.joinCheckBody}</p>
        </div>
      )}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary min-h-12 flex-1">
            {t.back}
          </button>
        )}
        {step < steps.length - 1 ? (
          <button type="button" onClick={next} className="btn-primary min-h-12 flex-[2]">
            {t.next}
          </button>
        ) : (
          <SubmitButton className="btn-primary min-h-12 flex-[2]">{t.sendForApproval}</SubmitButton>
        )}
      </div>
    </form>
  );
}
