import {
  useEffect,
  useState,
  type ChangeEvent,
  type JSX,
  type ReactNode,
} from "react";
import { mergeClasses } from "src/gui/classes";
import { t, type MessageKey } from "src/i18n";
import type { Anki } from "src/services/anki/anki";
import { startAsyncLoad } from "../../shared/hooks/useAsyncLoad";
import type { DeckModel } from "src/services/notes/fields";
import type {
  FieldMapping as FieldMap,
  FieldTarget,
} from "src/entities/field-mapping";
import {
  assignFieldTarget,
  fieldTargets,
  resolveFieldMapping,
  skippedTarget,
} from "src/entities/field-mapping";
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

interface FieldMappingState {
  readonly loadError: string;
  readonly mappings: Record<string, FieldMap>;
  readonly models: DeckModel[] | null;
  readonly updateMappings: (mappings: Record<string, FieldMap>) => void;
}

function buildInitialMappings(
  models: DeckModel[],
  savedMappings: Record<string, Record<string, string>>,
): Record<string, FieldMap> {
  const initial: Record<string, FieldMap> = {};
  for (const model of models) {
    const saved = savedMappings[model.modelName];
    const pack =
      saved === undefined ? builtInPackFor(model.modelName) : undefined;
    initial[model.modelName] = resolveFieldMapping(
      model.fields,
      pack?.mapping ?? saved,
    );
  }
  return initial;
}

function useFieldMappings(
  anki: Anki,
  deckName: string,
  savedMappings: Record<string, Record<string, string>>,
  onMappingsChange: (mappings: Record<string, FieldMap>) => void,
): FieldMappingState {
  const [models, setModels] = useState<DeckModel[] | null>(null);
  const [mappings, setMappings] = useState<Record<string, FieldMap>>({});
  const [loadError, setLoadError] = useState("");

  const updateMappings = (next: Record<string, FieldMap>): void => {
    setMappings(next);
    onMappingsChange(next);
  };

  const loadFieldMappings = (): (() => void) =>
    startAsyncLoad(async (isLive) => {
      try {
        const discovered = await discoverDeckModels(anki, deckName);
        if (!isLive()) {
          return;
        }
        const initial = buildInitialMappings(discovered, savedMappings);
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

  return { loadError, mappings, models, updateMappings };
}

interface MessageViewProps {
  readonly children: ReactNode;
  readonly className?: string | undefined;
}

function MessageView({ children, className }: MessageViewProps): JSX.Element {
  return (
    <div className={className}>
      <p>{children}</p>
    </div>
  );
}

interface FieldMappingContentProps {
  readonly className: string;
  readonly deckName: string;
  readonly mappings: Record<string, FieldMap>;
  readonly models: DeckModel[];
  readonly onMappingsChange: (mappings: Record<string, FieldMap>) => void;
}

function FieldMappingContent({
  className,
  deckName,
  mappings,
  models,
  onMappingsChange,
}: FieldMappingContentProps): JSX.Element {
  return (
    <div className={className}>
      <p>{t("fieldMapping.title", { deckName })}</p>
      {models.map((model) => (
        <ModelSection
          key={model.modelName}
          mappings={mappings}
          model={model}
          onMappingsChange={onMappingsChange}
        />
      ))}
    </div>
  );
}

interface ModelSectionProps {
  readonly mappings: Record<string, FieldMap>;
  readonly model: DeckModel;
  readonly onMappingsChange: (mappings: Record<string, FieldMap>) => void;
}

function ModelSection({
  mappings,
  model,
  onMappingsChange,
}: ModelSectionProps): JSX.Element {
  const mapping = mappings[model.modelName] ?? {};
  const updateTarget = (field: string, target: FieldTarget): void => {
    const next = {
      ...mappings,
      [model.modelName]: assignFieldTarget(mapping, field, target),
    };
    onMappingsChange(next);
  };
  return (
    <div className={transferFieldMappingClasses.modelSection}>
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
          <FieldRow
            field={field}
            key={field}
            mapping={mapping}
            onTargetChange={updateTarget}
            sampleValue={model.sampleValues[field]}
          />
        ))}
      </List>
    </div>
  );
}

interface FieldRowProps {
  readonly field: string;
  readonly mapping: FieldMap;
  readonly onTargetChange: (field: string, target: FieldTarget) => void;
  readonly sampleValue: string | undefined;
}

function FieldRow({
  field,
  mapping,
  onTargetChange,
  sampleValue,
}: FieldRowProps): JSX.Element {
  return (
    <ListRow
      cells={[
        <strong key="name">{field}</strong>,
        sampleValue ? (
          <small
            className={transferFieldMappingClasses.fieldSample}
            key="sample"
          >
            {sampleValue.slice(0, 60)}
          </small>
        ) : (
          <span key="sample" />
        ),
        <select
          key="target"
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            onTargetChange(field, event.target.value as FieldTarget);
          }}
          value={mapping[field] ?? skippedTarget}
        >
          {fieldTargets.map((target) => (
            <option key={target} value={target}>
              {t(fieldTargetLabels[target])}
            </option>
          ))}
        </select>,
      ]}
      className={transferFieldMappingClasses.fieldRow}
    />
  );
}

export function FieldMapping({
  anki,
  deckName,
  savedMappings,
  onMappingsChange,
  className,
}: FieldMappingProps): JSX.Element {
  const rootClassName = mergeClasses(commonWizardClasses.pageView, className);
  const { loadError, mappings, models, updateMappings } = useFieldMappings(
    anki,
    deckName,
    savedMappings,
    onMappingsChange,
  );

  if (loadError) {
    return <MessageView className={rootClassName}>{loadError}</MessageView>;
  }
  if (models === null) {
    return (
      <MessageView className={rootClassName}>
        {t("fieldMapping.loading")}
      </MessageView>
    );
  }
  if (!models.length) {
    return (
      <MessageView className={rootClassName}>
        {t("fieldMapping.noNotes")}
      </MessageView>
    );
  }
  return (
    <FieldMappingContent
      className={rootClassName}
      deckName={deckName}
      mappings={mappings}
      models={models}
      onMappingsChange={updateMappings}
    />
  );
}
