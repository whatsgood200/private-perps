"use client";

import { Lock, Shield, Cpu, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  isEncrypting: boolean;
  isSubmitting: boolean;
}

const STEPS = [
  { icon: Lock,  label: "Encrypting order",           desc: "AES-256-GCM" },
  { icon: Shield, label: "Generating margin proof",   desc: "ZK Bulletproof" },
  { icon: Cpu,   label: "Submitting to Arcium MXE",   desc: "Solana CPI"    },
];

export function EncryptionProgress({ isEncrypting, isSubmitting }: Props) {
  const activeStep = isEncrypting ? 0 : isSubmitting ? 2 : -1;

  return (
    <div className="rounded-xl border border-arcium/20 bg-arcium/5 p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-1.5 h-1.5 rounded-full bg-arcium animate-pulse" />
        <span className="text-[10px] font-mono text-arcium-bright uppercase tracking-wider">
          Arcium MPC — Processing
        </span>
      </div>

      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const done    = i < activeStep;
          const active  = i === activeStep;
          const pending = i > activeStep;

          return (
            <div key={i} className="flex items-center gap-2">
              <div className={clsx(
                "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                done    && "bg-profit/20 border-profit/40",
                active  && "bg-arcium/20 border-arcium/60",
                pending && "bg-surface/40 border-border/30",
              )}>
                {done ? (
                  <CheckCircle2 size={10} className="text-profit" />
                ) : (
                  <step.icon size={10} className={clsx(
                    active ? "text-arcium-bright animate-pulse" : "text-dim",
                  )} />
                )}
              </div>
              <div className="flex-1">
                <div className={clsx(
                  "text-[10px] font-mono leading-none",
                  done    ? "text-profit"       :
                  active  ? "text-arcium-bright" :
                  "text-dim",
                )}>
                  {step.label}
                </div>
                <div className="text-[9px] font-mono text-dim/60">{step.desc}</div>
              </div>
              {active && (
                <div className="w-3 h-3 border border-arcium border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-2.5 h-0.5 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-arcium to-arcium-bright rounded-full transition-all duration-500"
          style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
