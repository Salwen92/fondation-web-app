import { Option } from 'commander';

export const modelOption = new Option('-m, --model <model>', 'Claude model to use').choices([
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
]);

export const outputDirOption = new Option(
  '-o, --output-dir <dir>',
  'output directory for generated files',
);

export const toolsOption = new Option(
  '--tools <tools...>',
  'allowed tools (comma-separated)',
).default(['Read', 'Write', 'Edit', 'Bash']);

export const quietOption = new Option('-q, --quiet', 'suppress non-essential output');
