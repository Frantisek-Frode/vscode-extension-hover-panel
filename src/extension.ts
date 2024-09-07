import * as vscode from 'vscode';
import { GetLSPData } from './lsp';
import { HoverPanel } from './hover';
import { SignaturePanel } from './signature';

export function activate(context: vscode.ExtensionContext) {
	const hoverPanel = new HoverPanel(context.extensionUri);
	const sigPanel = new SignaturePanel(context.extensionUri);

	context.subscriptions.push(
		vscode.commands.registerCommand("suggestbox.lsp", GetLSPData),
		hoverPanel,
		vscode.window.registerWebviewViewProvider(
			HoverPanel.viewType, hoverPanel,
		),
		sigPanel,
		vscode.window.registerWebviewViewProvider(
			SignaturePanel.viewType, sigPanel,
		),
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
