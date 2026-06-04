import * as vscode from 'vscode';
import { PrNoirPanel } from '../webview/panel';
import { getGitDiff } from '../core/gitDiff';
import { analyzeWithAI } from '../core/analyzer';

export async function runReview(context: vscode.ExtensionContext): Promise<void> {
  const provider = vscode.workspace.getConfiguration('prNoir').get<string>('provider', 'groq');
  const panel = PrNoirPanel.createOrShow(context);
  panel.setLoading(provider);
  try {
    const diff = getGitDiff();
    if (!diff.trim()) {
      vscode.window.showWarningMessage('PR Noir: No git diff found.');
      return;
    }
    const result = await analyzeWithAI(diff);
    panel.update(result);
    const cached = result.cached ? ' [CACHED]' : '';
    vscode.window.showInformationMessage(
      `PR Noir: Review complete. Score: ${result.score}/100${cached}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`PR Noir Error: ${message}`);
  }
}
