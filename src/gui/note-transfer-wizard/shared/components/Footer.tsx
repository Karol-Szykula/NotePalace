import type { JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { Button } from "src/gui/components/Button";
import { t } from "src/i18n";
import { footerClasses } from "../classes/common";

export interface FooterButton {
  disabled?: boolean | undefined;
  label: string;
  onClick: () => void;
}

export interface FooterProps {
  readonly className?: string | undefined;
  readonly leftButtons: FooterButton[];
  readonly pagination?:
    | {
        readonly currentPage: number;
        readonly totalPages: number;
        readonly onPageChange: (page: number) => void;
      }
    | undefined;
  readonly rightButtons: FooterButton[];
}

interface FooterButtonGroupProps {
  readonly buttons: FooterButton[];
}

function FooterButtonGroup({ buttons }: FooterButtonGroupProps) {
  return (
    <>
      {buttons.map((button) => (
        <Button
          disabled={button.disabled}
          key={button.label}
          onClick={button.onClick}
        >
          {button.label}
        </Button>
      ))}
    </>
  );
}

export function Footer({
  leftButtons,
  rightButtons,
  pagination,
  className,
}: FooterProps): JSX.Element {
  const isPaginationVisible = pagination && pagination.totalPages > 1;

  return (
    <div className={mergeClasses(footerClasses.footer, className)}>
      <div>
        <FooterButtonGroup buttons={leftButtons} />
      </div>
      {isPaginationVisible && (
        <div className={footerClasses.footerCenter}>
          <Button
            disabled={pagination.currentPage === 0}
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
          >
            {t("wizard.prevPage")}
          </Button>
          <span className={footerClasses.pageIndicator}>
            {pagination.currentPage + 1} / {pagination.totalPages}
          </span>
          <Button
            disabled={pagination.currentPage >= pagination.totalPages - 1}
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
          >
            {t("wizard.nextPage")}
          </Button>
        </div>
      )}
      <div className={footerClasses.footerRight}>
        <FooterButtonGroup buttons={rightButtons} />
      </div>
    </div>
  );
}
