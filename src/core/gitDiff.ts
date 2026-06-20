import { execSync } from 'child_process';
import * as vscode from 'vscode';

export function getGitDiff(): string {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) throw new Error('No workspace open');

  const maxLines: number = vscode.workspace
    .getConfiguration('prNoir').get('maxDiffLines', 500);

  let diff: string;
  try {
    diff = execSync('git diff --staged', { cwd: workspaceRoot }).toString();
    if (!diff.trim()) {
      diff = execSync('git diff HEAD', { cwd: workspaceRoot }).toString();
    }
    if (!diff.trim()) {
      diff = execSync('git diff HEAD~1', { cwd: workspaceRoot }).toString();
    }
  } catch (err: unknown) {
    throw new Error('Git diff failed. Is this a git repo?', { cause: err });
  }

  diff = diff.replace(/Binary files .* differ\n/g, '');

  const lines = diff.split('\n');
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join('\n')
      + `\n\n... [truncated — ${lines.length - maxLines} lines omitted]`;
  }
  return diff;
}
