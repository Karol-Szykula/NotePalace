import { useEffect, useState, type ChangeEvent, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t, type MessageKey } from "src/i18n";
import type { Anki } from "src/services/anki/anki";
import { startAsyncLoad } from "../../shared/hooks/useAsyncLoad";
import type { DeckModel } from "src/services/notes/fields";
import type {
  FieldMapping as FieldMap,
  FieldTarget,
} from "src/entities/field-mapping";
import { fieldTargets, resolveFieldMapping } from "src/entities/field-mapping";
import { isKnownModel } from "src/services/anki/anki-models";
import { discoverDeckModels } from "src/services/notes/fields";
import { builtInPackFor } from "src/services/notes/packs";
import { commonWizardClasses } from "@shared/classes";
import { transferFieldMappingClasses } from "../classes";
import { List, ListRow } from "@shared/components";

export interface FieldMappingProps {
  readonly anki: Anki;
  readonly className?: string;
  readonly deckName: string;
  readonly onMappingsChange: (mappings: Record<string, FieldMap>) => void;
  readonly savedMappings: Record<string, Record<string, string>>;
}

const fieldTargetLabels: Record<FieldTarget, MessageKey> = {
  Back: "fieldMapping.targets.back",
  Extra: "fieldMapping.targets.extra",
  Front: "fieldMapping.targets.front",
  Skip: "fieldMapping.targets.skip",
  Text: "fieldMapping.targets.text",
};

export function FieldMapping({
  anki,
  deckName,
  savedMappings,
  onMappingsChange,
  className,
}: FieldMappingProps): JSX.Element {
  const rootClassName = mergeClasses(commonWizardClasses.pageView, className);
  const [models, setModels] = useState<DeckModel[] | null>(null);
  const [mappings, setMappings] = useState<Record<string, FieldMap>>({});
  const [loadError, setLoadError] = useState("");

  const loadFieldMappings = (): (() => void) =>
    startAsyncLoad(async (isLive) => {
      try {
        const discovered = await discoverDeckModels(anki, deckName);
        if (!isLive()) {
          return;
        }
        const initial: Record<string, FieldMap> = {};
        for (const model of discovered) {
          const saved = savedMappings[model.modelName];
          const pack =
            saved === undefined ? builtInPackFor(model.modelName) : undefined;
          initial[model.modelName] = resolveFieldMapping(
            model.fields,
            pack?.mapping ?? saved,
          );
        }
        setModels(discovered);
        setMappings(initial);
        onMappingsChange(initial);
      } catch {
        if (isLive()) {
          setLoadError(t("errors.ankiNotConnected"));
        }
      }
    });

  useEffect(loadFieldMappings, [anki, deckName]);

  if (loadError) {
    return (
      <div className={rootClassName}>
        <p>{loadError}</p>
      </div>
    );
  }
  if (models === null) {
    return (
      <div className={rootClassName}>
        <p>{t("fieldMapping.loading")}</p>
      </div>
    );
  }
  if (!models.length) {
    return (
      <div className={rootClassName}>
        <p>{t("fieldMapping.noNotes")}</p>
      </div>
    );
  }
  return (
    <div className={rootClassName}>
      <p>{t("fieldMapping.title", { deckName })}</p>
      {models.map((model) => (
        <div
          className={transferFieldMappingClasses.modelSection}
          key={model.modelName}
        >
          <h4>
            {model.modelName}
            {isKnownModel(model.modelName) && (
              <span className={transferFieldMappingClasses.modelRecognized}>
                {" "}
                {t("fieldMapping.recognized")}
              </span>
            )}
          </h4>
          <List
            columns={[
              t("fieldMapping.columns.field"),
              t("fieldMapping.columns.sample"),
              t("fieldMapping.columns.target"),
            ]}
            columnWidths="auto 1fr auto"
          >
            {model.fields.map((field) => (
              <ListRow
                cells={[
                  <strong key="name">{field}</strong>,
                  model.sampleValues[field] ? (
                    <small
                      className={transferFieldMappingClasses.fieldSample}
                      key="sample"
                    >
                      {model.sampleValues[field].slice(0, 60)}
                    </small>
                  ) : (
                    <span key="sample" />
                  ),
                  <select
                    key="target"
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                      const next = {
                        ...mappings,
                        [model.modelName]: {
                          ...mappings[model.modelName],
                          [field]: event.target.value as FieldTarget,
                        },
                      };
                      setMappings(next);
                      onMappingsChange(next);
                    }}
                    value={mappings[model.modelName]?.[field] ?? "Skip"}
                  >
                    {fieldTargets.map((target) => (
                      <option key={target} value={target}>
                        {t(fieldTargetLabels[target])}
                      </option>
                    ))}
                  </select>,
                ]}
                className={transferFieldMappingClasses.fieldRow}
                key={field}
              />
            ))}
          </List>
        </div>
      ))}
    </div>
  );
}
