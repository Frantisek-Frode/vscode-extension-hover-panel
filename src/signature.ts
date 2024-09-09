import * as vscode from "vscode"
import { extractMarkdown, HTMLGenerator } from "./markdownView";


export const GenerateSignaturesHTML : HTMLGenerator
= async function (uri, pos, md2html) {
	const sigHelp = await GetHovers(uri, pos);
	if (sigHelp === undefined) return "";

	const md = SignatureHelpMD(sigHelp);
	return md2html(md);
}

function GetHovers(uri: vscode.Uri, pos: vscode.Position) {
	return vscode.commands.executeCommand<vscode.SignatureHelp | undefined>(
		"vscode.executeSignatureHelpProvider", uri, pos
	)
}

function SignatureHelpMD(sigHelp: vscode.SignatureHelp): string {
	if (!sigHelp?.signatures?.length) return '';

	sigHelp.signatures[sigHelp.activeSignature].activeParameter ??= sigHelp.activeParameter;
	const parts = sigHelp.signatures.map(SingleSignatureMD);

	return parts.join('\n\n---\n\n---\n\n');
}

function SingleSignatureMD(sig: vscode.SignatureInformation): string {
	let label: string;

	if (sig.activeParameter !== undefined) {
		let activeRange = sig.parameters[sig.activeParameter].label;
		if (typeof(activeRange) === "string") {
			const start = sig.label.indexOf(activeRange);
			activeRange = [start, start + activeRange.length];
		}

		label = sig.label.substring(0, activeRange[0])
		+ "<u>" + sig.label.substring(activeRange[0], activeRange[1]) + "</u>"
		+ sig.label.substring(activeRange[1]);

		return "**" + label + "**\n\n" 
		+ extractMarkdown(sig.parameters[sig.activeParameter].documentation ?? "")
		+ "\n\n---\n\n"
		+ extractMarkdown(sig.documentation ?? "");
	}
	else {
		label = sig.label;
		return "**" + label + "**\n\n"
		+ extractMarkdown(sig.documentation ?? "")
	}
}
