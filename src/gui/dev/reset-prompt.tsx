import type { JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { Button } from "src/gui/components/Button";
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
        <Button onClick={onCancel}>{t("dev.cancel")}</Button>
        <Button className={devResetClasses.confirmButton} onClick={onConfirm}>
          {t("dev.resetButton")}
        </Button>
      </div>
    </div>
  );
}
