import * as vscode from "vscode"
import { Renderer } from "./renderer";

export type HTMLGenerator = (
	uri: vscode.Uri,
	position: vscode.Position,
	md2html: (md: string) => Promise<string>
) => Promise<string>

export class MarkdownView implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private readonly _renderer = new Renderer();
	private readonly _disposables: vscode.Disposable[] = [];
	private _extensionUri;

	constructor(
		extUri: vscode.Uri,
		viewType: string,
		private GenerateHtml: HTMLGenerator
	) {
		this._extensionUri = extUri;

		this._disposables.push(
			vscode.window.registerWebviewViewProvider(viewType, this)
		);

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

	async _update()
	{
		let editor = vscode.window.activeTextEditor;
		if (!this._view || !editor) return;

		this._view.webview.html = this._buildHTML(
			await this.GenerateHtml(
				editor.document.uri,
				editor.selection.active,
				this._renderer.render.bind(this._renderer) // javascript this
			)
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

export function extractMarkdown(content: vscode.MarkedString | vscode.MarkdownString): string {
	if (typeof content === 'string') {
		return content;
	} else if (content instanceof vscode.MarkdownString) {
		return content.value;
	} else {
		const markdown = new vscode.MarkdownString();
		markdown.appendCodeblock(content.value, content.language);
		return markdown.value;
	}
}
