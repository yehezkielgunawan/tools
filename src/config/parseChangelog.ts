import type { ChangelogItem, ChangelogRelease, ChangeType } from './changelog';

const RELEASE_HEADING_PATTERN =
  /^##\s+(?:\[(?<linkedVersion>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]\([^)]*\)|(?<plainVersion>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?))\s*\((?<date>\d{4}-\d{2}-\d{2})\)\s*$/;
const SECTION_HEADING_PATTERN = /^###\s+(.+?)\s*$/;
const BULLET_PATTERN = /^\s*[*-]\s+(.+?)\s*$/;
const SCOPED_CHANGE_PATTERN = /^\*\*([^*]+):\*\*\s*(.+)$/;
const RELEASE_LINK_PATTERN = /\s+\(\[[^\]]+\]\([^)]+\)\)$/;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\([^)]+\)/g;
const REFERENCE_LINK_PATTERN = /^\[[^\]]+\]:\s+\S+$/;
const REFERENCE_USAGE_PATTERN = /^\[[^\]]+\]\[[^\]]+\]$/;

const SECTION_TYPES: Record<string, ChangeType> = {
  features: 'features',
  'bug fixes': 'fixes',
  bugfixes: 'fixes',
  fixes: 'fixes',
  performance: 'performance',
  'performance improvements': 'performance',
  refactors: 'refactors',
  refactoring: 'refactors',
};

function invalidLine(lineNumber: number, message: string): Error {
  return new Error(`Invalid changelog at line ${lineNumber}: ${message}`);
}

function assertValidDate(date: string, lineNumber: number): void {
  const parsedDate = new Date(`${date}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw invalidLine(lineNumber, `invalid release heading date ${date}.`);
  }
}

function getSectionType(section: string): ChangeType {
  const normalizedSection = section.trim().toLowerCase();
  return SECTION_TYPES[normalizedSection] ?? 'other';
}

function normalizeDescription(description: string): string {
  let result = description;

  while (RELEASE_LINK_PATTERN.test(result)) {
    result = result.replace(RELEASE_LINK_PATTERN, '').trim();
  }

  return result.replace(MARKDOWN_LINK_PATTERN, '$1').trim();
}

function parseChangeItem(value: string, lineNumber: number): ChangelogItem {
  const withoutLinks = normalizeDescription(value);
  const scopedChange = withoutLinks.match(SCOPED_CHANGE_PATTERN);

  if (!scopedChange) {
    if (!withoutLinks) {
      throw invalidLine(lineNumber, 'change description cannot be empty.');
    }

    return { description: withoutLinks };
  }

  const [, scope, description] = scopedChange;
  if (!scope || !description) {
    throw invalidLine(lineNumber, 'change description cannot be empty.');
  }

  return {
    scope,
    description,
  };
}

export function parseChangelog(markdown: string): ChangelogRelease[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const releases: ChangelogRelease[] = [];
  let currentRelease: ChangelogRelease | undefined;
  let currentSection: ChangeType | undefined;

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trimEnd();

    if (!line.trim() || /^#\s+Changelog\s*$/i.test(line)) {
      continue;
    }

    if (line.startsWith('## ')) {
      const releaseHeading = line.match(RELEASE_HEADING_PATTERN);
      if (!releaseHeading) {
        throw invalidLine(lineNumber, 'invalid release heading.');
      }

      const version =
        releaseHeading.groups?.linkedVersion ??
        releaseHeading.groups?.plainVersion;
      const date = releaseHeading.groups?.date;
      if (!version || !date) {
        throw invalidLine(lineNumber, 'invalid release heading.');
      }
      assertValidDate(date, lineNumber);

      currentRelease = {
        version,
        date,
        changes: {},
      };
      releases.push(currentRelease);
      currentSection = undefined;
      continue;
    }

    const sectionHeading = line.match(SECTION_HEADING_PATTERN);
    if (sectionHeading) {
      if (!currentRelease) {
        throw invalidLine(
          lineNumber,
          'section appears before a release heading.',
        );
      }

      currentSection = getSectionType(sectionHeading[1] ?? '');
      currentRelease.changes[currentSection] ??= [];
      continue;
    }

    const bullet = line.match(BULLET_PATTERN);
    if (bullet) {
      if (!currentRelease || !currentSection) {
        throw invalidLine(lineNumber, 'change entry appears before a section.');
      }

      const value = bullet[1];
      if (!value) {
        throw invalidLine(lineNumber, 'change description cannot be empty.');
      }

      currentRelease.changes[currentSection]?.push(
        parseChangeItem(value, lineNumber),
      );
      continue;
    }

    if (
      REFERENCE_LINK_PATTERN.test(line.trim()) ||
      REFERENCE_USAGE_PATTERN.test(line.trim())
    ) {
      continue;
    }

    if (!currentRelease && line.trim()) {
      throw invalidLine(
        lineNumber,
        'unexpected content before the first release.',
      );
    }

    if (currentRelease && line.trim()) {
      throw invalidLine(lineNumber, 'unexpected content inside a release.');
    }
  }

  if (releases.length === 0) {
    throw new Error('Invalid changelog: no releases found.');
  }

  const emptyRelease = releases.find((release) =>
    Object.values(release.changes).every((items) => !items?.length),
  );
  if (emptyRelease) {
    throw new Error(
      `Invalid changelog: release ${emptyRelease.version} has no changes.`,
    );
  }

  return releases.sort((left, right) => right.date.localeCompare(left.date));
}

export function validateCurrentRelease(
  packageVersion: string,
  releases: readonly ChangelogRelease[],
): void {
  const currentRelease = releases[0];

  if (!currentRelease || currentRelease.version !== packageVersion) {
    throw new Error(
      `Package version ${packageVersion} does not match changelog version ${currentRelease?.version ?? 'none'}.`,
    );
  }
}
