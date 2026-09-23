export type ChangeType =
  | 'features'
  | 'fixes'
  | 'performance'
  | 'refactors'
  | 'other';

export interface ChangelogItem {
  scope?: string;
  description: string;
}

export interface ChangelogRelease {
  version: string;
  date: string;
  changes: Partial<Record<ChangeType, ChangelogItem[]>>;
}

export const CHANGELOG: readonly ChangelogRelease[] = __CHANGELOG__;
