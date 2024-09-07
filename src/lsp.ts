import * as vscode from "vscode"

export async function GetLSPData() {
	const editor = vscode.window.activeTextEditor;
	if (!editor?.selection.isEmpty) return;

	const uri = editor.document.uri;
	const position = editor.selection.active;
	console.log(position);

	const hover: vscode.Hover[]
	= await vscode.commands.executeCommand(
		"vscode.executeHoverProvider", uri, position
	);

	const completion: vscode.CompletionList
	= await vscode.commands.executeCommand(
		"vscode.executeCompletionItemProvider", uri, position
	);

	const signature: vscode.SignatureHelp
	= await vscode.commands.executeCommand(
		"vscode.executeSignatureHelpProvider", uri, position
	);

	for (let h of hover) {
		for (let c of h.contents) {
			if (c instanceof vscode.MarkdownString) {
				console.log(c.value);
			} else {
				console.log(c.toString());
			}
		}
	}
	console.log(completion);
	console.log(signature);
}