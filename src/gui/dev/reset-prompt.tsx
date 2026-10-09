import type { JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";

const devResetClasses = {
  actions: "notepalace-dev-reset__actions",
  confirmButton: "notepalace-dev-reset__confirm-button",
  prompt: "notepalace-dev-reset",
  warning: "notepalace-dev-reset__warning",
} as const;

export interface ResetPromptProps {
  readonly className?: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function ResetPrompt({
  className,
  onCancel,
  onConfirm,
}: ResetPromptProps): JSX.Element {
  return (
    <div className={mergeClasses(devResetClasses.prompt, className)}>
      <p className={devResetClasses.warning}>{t("dev.resetConfirm")}</p>
      <div className={devResetClasses.actions}>
        <button onClick={onCancel}>{t("dev.cancel")}</button>
        <button className={devResetClasses.confirmButton} onClick={onConfirm}>
          {t("dev.resetButton")}
        </button>
      </div>
    </div>
  );
}
