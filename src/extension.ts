import * as vscode from 'vscode';
import { GetLSPData } from './lsp';
import { GenerateHoversHTML } from './hover';
import { GenerateSignaturesHTML } from './signature';
import { GenerateCompletionsHTML } from './suggestions';
import { MarkdownView } from './markdownView';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("suggestbox.lsp", GetLSPData),
		new MarkdownView(context.extensionUri, "hover", GenerateHoversHTML),
		new MarkdownView(context.extensionUri, "signature", GenerateSignaturesHTML),
		new MarkdownView(context.extensionUri, "suggest", GenerateCompletionsHTML),
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
