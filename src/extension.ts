import * as vscode from 'vscode';
import { runReview } from './commands/runReview';
import { exportMarkdown } from './commands/exportMarkdown';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('pr-noir.runReview', () => {
      runReview(context);
    }),
    vscode.commands.registerCommand('pr-noir.exportMarkdown', () => {
      exportMarkdown();
    })
  );
}

export function deactivate(): void {}
