import type { ComponentType } from "react";
import {
  Read as BasicRead,
  ReadWithError as BasicReadWithError,
  ReadWithImage as BasicReadWithImage,
  ReadWithList as BasicReadWithList,
} from "./stories/note-form/BasicNoteForm.story";
import {
  Read as ClozeRead,
  ReadWithError as ClozeReadWithError,
  ReadWithImage as ClozeReadWithImage,
} from "./stories/note-form/ClozeNoteForm.story";

export const stories: Record<string, ComponentType> = {
  "note-form/BasicNoteForm/Read": BasicRead,
  "note-form/BasicNoteForm/ReadWithError": BasicReadWithError,
  "note-form/BasicNoteForm/ReadWithImage": BasicReadWithImage,
  "note-form/BasicNoteForm/ReadWithList": BasicReadWithList,
  "note-form/ClozeNoteForm/Read": ClozeRead,
  "note-form/ClozeNoteForm/ReadWithError": ClozeReadWithError,
  "note-form/ClozeNoteForm/ReadWithImage": ClozeReadWithImage,
};

export const storyIds: string[] = Object.keys(stories).sort();
