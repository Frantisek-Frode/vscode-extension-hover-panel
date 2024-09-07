import * as vscode from "vscode"
import { Renderer } from "./renderer";

export class SignaturePanel implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private readonly _renderer = new Renderer();
	private readonly _disposables: vscode.Disposable[] = [];
	public static viewType = "signature"
	static instance?: SignaturePanel
	private _extensionUri;
	// private _md = markdownit()

	constructor(extUri: vscode.Uri)
	{
		this._extensionUri = extUri;

		vscode.window.onDidChangeActiveTextEditor(() =>
		{
			this._update();
		}, null, this._disposables);

		vscode.window.onDidChangeTextEditorSelection(() =>
		{
			this._update();
		}, null, this._disposables);

		this._renderer.needsRender(() =>
		{
			this._update();
		}, undefined, this._disposables);

		this._update();
	}

	dispose()
	{
		for (let d of this._disposables) {
			d.dispose();
		}
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		token: vscode.CancellationToken
	): Thenable<void> | void
	{
		this._view = webviewView;
		this._view.webview.options = {
			localResourceRoots: [
				vscode.Uri.joinPath(this._extensionUri, "media")
			]
		};
	}

	private _sigHelp(editor: vscode.TextEditor)
	{
		return vscode.commands.executeCommand<vscode.SignatureHelp | undefined>(
			"vscode.executeSignatureHelpProvider",
			editor.document.uri,
			editor.selection.active
		)
	}

	async _update()
	{
		let editor = vscode.window.activeTextEditor;
		if (!this._view || !editor) return;
		const signatures = await this._sigHelp(editor);

		this._view.webview.html = this._buildHTML(
			await this._renderer.RenderSignature(editor.document, signatures)
		);
	}

	_buildHTML(content: string | string[])
	{
		const styleUri = this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		const start =
		`<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
			</head>
			<body><article id="main"/>`
		const end = `</article></body></html>`

		if (typeof content === "string") return start + content + end;

		let total = start;
		for (let part of content) total += part;
		return total + end;
	}
}
