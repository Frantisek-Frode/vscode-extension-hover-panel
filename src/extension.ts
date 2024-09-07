import * as vscode from 'vscode';
import { GetLSPData } from './lsp';
import { HoverPanel } from './hover';

export function activate(context: vscode.ExtensionContext) {
	const hoverPanel = new HoverPanel(context.extensionUri);

	context.subscriptions.push(
		vscode.commands.registerCommand("suggestbox.lsp", GetLSPData),
		hoverPanel,
		vscode.window.registerWebviewViewProvider(
			HoverPanel.viewType, hoverPanel,
		),
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
