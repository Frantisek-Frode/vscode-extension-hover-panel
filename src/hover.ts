import * as vscode from "vscode"
import { extractMarkdown, HTMLGenerator } from "./markdownView";


export const GenerateHoversHTML : HTMLGenerator
= async function (uri, pos, md2html) {
	const hovers = await GetHovers(uri, pos);
	const md = HoversMD(hovers);
	return md2html(md);
}

function GetHovers(uri: vscode.Uri, pos: vscode.Position) {
	return vscode.commands.executeCommand<vscode.Hover[]>(
		"vscode.executeHoverProvider", uri, pos,
	);
}

function HoversMD(hovers: readonly vscode.Hover[]): string {
	const parts = (hovers)
		.flatMap(hover => hover.contents)
		.map(extractMarkdown)
		.filter(content => content.length > 0);

	if (!parts.length) {
		return '';
	}

	return parts.join('\n---\n');
}
