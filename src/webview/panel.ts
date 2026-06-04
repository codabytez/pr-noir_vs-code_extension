import * as vscode from 'vscode';
import { ReviewResult } from '../types';
import { getWebviewContent } from './template';

export class PrNoirPanel {
  public static currentPanel: PrNoirPanel | undefined;
  public static lastResult: ReviewResult | null = null;

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(context: vscode.ExtensionContext): PrNoirPanel {
    const col = vscode.ViewColumn.Beside;
    if (PrNoirPanel.currentPanel) {
      PrNoirPanel.currentPanel._panel.reveal(col);
      return PrNoirPanel.currentPanel;
    }
    const panel = vscode.window.createWebviewPanel(
      'prNoir', 'PR Noir', col,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    PrNoirPanel.currentPanel = new PrNoirPanel(panel, context);
    return PrNoirPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    _context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._panel.webview.html = getWebviewContent(null, true);
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(msg => {
      this._handleMessage(msg);
    }, null, this._disposables);
  }

  public update(result: ReviewResult): void {
    PrNoirPanel.lastResult = result;
    this._panel.webview.html = getWebviewContent(result, false);
  }

  public setLoading(provider = 'groq'): void {
    this._panel.webview.html = getWebviewContent(null, true, provider);
  }

  private _handleMessage(msg: { command: string; file?: string; line?: number }): void {
    switch (msg.command) {
      case 'openFile':
        if (msg.file) {
          const wf = vscode.workspace.workspaceFolders?.[0];
          if (!wf) return;
          const uri = vscode.Uri.joinPath(wf.uri, msg.file);
          vscode.window.showTextDocument(uri, {
            selection: new vscode.Range(
              (msg.line ?? 1) - 1, 0,
              (msg.line ?? 1) - 1, 0
            )
          });
        }
        break;
      case 'exportMarkdown':
        vscode.commands.executeCommand('pr-noir.exportMarkdown');
        break;
    }
  }

  public dispose(): void {
    PrNoirPanel.currentPanel = undefined;
    this._panel.dispose();
    this._disposables.forEach(d => d.dispose());
    this._disposables = [];
  }
}
