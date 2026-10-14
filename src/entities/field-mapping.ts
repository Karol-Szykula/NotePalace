import { ankiFieldNames } from "src/conf/constants";

export const fieldTargets = [
  ankiFieldNames.front,
  ankiFieldNames.back,
  ankiFieldNames.text,
  ankiFieldNames.extra,
  "Skip",
] as const;

export type FieldTarget = (typeof fieldTargets)[number];

export const skippedTarget: FieldTarget = "Skip";

export type FieldMapping = Record<string, FieldTarget>;

export function presetFieldMapping(fields: string[]): FieldMapping {
  const mapping: FieldMapping = {};
  for (const field of fields) {
    mapping[field] =
      fieldTargets.find((target) => target === field) ?? skippedTarget;
  }
  return mapping;
}

export function resolveFieldMapping(
  fields: string[],
  savedMapping: Record<string, string> | undefined,
): FieldMapping {
  const mapping = presetFieldMapping(fields);
  for (const [field, target] of Object.entries(savedMapping ?? {})) {
    if ((fieldTargets as readonly string[]).includes(target)) {
      mapping[field] = target as FieldTarget;
    }
  }
  return mapping;
}

export function assignFieldTarget(
  mapping: FieldMapping,
  field: string,
  target: FieldTarget,
): FieldMapping {
  const assigned: FieldMapping = { ...mapping, [field]: target };
  return target === skippedTarget
    ? assigned
    : releaseTargetFromOthers(assigned, field, target);
}

function releaseTargetFromOthers(
  mapping: FieldMapping,
  holder: string,
  target: FieldTarget,
): FieldMapping {
  const released: FieldMapping = {};
  for (const [name, held] of Object.entries(mapping)) {
    const heldByAnother = held === target && name !== holder;
    released[name] = heldByAnother ? skippedTarget : held;
  }
  return released;
}

export function mergeFieldMappings(
  stored: Record<string, Record<string, string>>,
  incoming: Record<string, FieldMapping>,
): Record<string, Record<string, string>> {
  const merged: Record<string, Record<string, string>> = { ...stored };
  for (const [modelName, mapping] of Object.entries(incoming)) {
    merged[modelName] = { ...(merged[modelName] ?? {}), ...mapping };
  }
  return merged;
}
