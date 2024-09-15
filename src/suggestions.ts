import * as vscode from "vscode"
import { HTMLGenerator } from "./markdownView";

type RankedCompletionList = { dist: number, item: vscode.CompletionItem, match: string }[];

function LabelString(compl: vscode.CompletionItem) {
	const label = compl.label;
	if (typeof(label) === 'string') return label;
	else return label.label;
}


// #region Fetching
let completionItemsCache: vscode.CompletionItem[] = [];
function CacheDiffers(newCompl: vscode.CompletionItem[]) {
	if (completionItemsCache.length !== newCompl.length) {
		return true;
	}

	for (let i = 0; i < newCompl.length; i++) {
		if (LabelString(completionItemsCache[i]) !== LabelString(newCompl[i])) return true;
	}

	return false;
}

function GetCompletions(uri: vscode.Uri, pos: vscode.Position) {
	return vscode.commands.executeCommand<vscode.CompletionList>(
		"vscode.executeCompletionItemProvider", uri, pos
	);
}

export const GenerateCompletionsHTML : HTMLGenerator
= async function (uri, pos, md2html, draw) {
	const completionsPromise = GetCompletions(uri, pos);

	draw(await SortAvailable(completionItemsCache));

	const completions = await completionsPromise;
	const redrawNeeded = CacheDiffers(completions.items)
	completionItemsCache = completions.items;

	if (redrawNeeded) {
		draw(await SortAvailable(completions.items));
	}
}

async function SortAvailable(completions: vscode.CompletionItem[]) {
	const rankedCompletions : RankedCompletionList = [];

	const editor = vscode.window.activeTextEditor;
	if (!editor) return "";
	
	const wordRange = editor.document.getWordRangeAtPosition(editor.selection.active);
	let word = "";
	if (wordRange) {
		const range = wordRange.with(undefined, editor.selection.active);
		word = editor.document.getText(range);
	}

	if (completions.length * word.length > 10000) {
		completions = completions.filter(item => {
			return SimpleMatcher(word, LabelString(item))
		});
	}

	for (const item of completions) {
		const dist = (new DistanceRecursor(word, LabelString(item))).CachedCompute();

		rankedCompletions.push({
			item: item,
			dist: dist.dist,
			match: dist.path,
		});
	}

	rankedCompletions.sort((a, b) => a.dist - b.dist);
	return CompletionsHTML(rankedCompletions);
}


// #region Ordering
const append_cost = 1
const insert_cost = 3
const delete_cost = 10
const replace_cost = 10
const case_cost = 2
const swap_cost = 5

class DistanceRecursor {
	private _cache: (ReturnType<typeof this._compute> | undefined)[] = [];

	constructor (
		private ctx: string,
		private compl: string,
	) {
		this._cache = new Array((ctx.length + 1) * (compl.length + 1)).fill(undefined);
	};

	public CachedCompute(offset1=0, offset2=0) {
		const cacheIndex = offset1 + (this.ctx.length + 1) * offset2;
		if (this._cache[cacheIndex] !== undefined) return this._cache[cacheIndex];
		
		const result = this._compute(offset1, offset2);

		this._cache[cacheIndex] = result;
		return result;
	}

	private _compute(offset1 = 0, offset2 = 0): { dist: number, path: string }
	{
		if (this.ctx.length - offset1 <= 0) return { dist: (this.compl.length - offset2) * append_cost, path: "+" };
		if (this.compl.length - offset2 <= 0) return { dist: (this.ctx.length - offset1) * delete_cost, path: "<" };
		if (this.ctx[offset1] === this.compl[offset2]) {
			const rest = this.CachedCompute(offset1 + 1, offset2 + 1);
			return { dist: rest.dist, path: "=" + rest.path };
		}

		let swp: ReturnType<typeof this.CachedCompute>;
		let swpd = Infinity;
		if (this.ctx[offset1 + 1] === this.compl[offset2] && this.compl[offset2 + 1] === this.ctx[offset1]) {
			swp = this.CachedCompute(offset1 + 2, offset2 + 2);
			swpd = swp.dist + swap_cost;
		}


		const del = this.CachedCompute(offset1 + 1, offset2);
		const deld = del.dist + delete_cost;
		const ins = this.CachedCompute(offset1, offset2 + 1);
		const insd = ins.dist + insert_cost;
		const rep = this.CachedCompute(offset1 + 1, offset2 + 1);
		let repd = rep.dist + replace_cost;
		const onlyCase = this.ctx[offset1]?.toLowerCase() === this.compl[offset2]?.toLowerCase();
		if (onlyCase) {
			repd = rep.dist + case_cost;
		}

		switch (Math.min(swpd, deld, insd, repd)) {
			case swpd:
				return { dist: swpd, path: "ss" + swp!.path }
			case deld:
				return { dist: deld, path: "d" + del.path }
			case insd:
				return { dist: insd, path: "i" + ins.path }
			case repd:
				return { dist: repd, path: (onlyCase ? "~" : "r") + rep.path }
			default: throw "Math.min is implmented incorrectly";
		}
	}
}

function SimpleMatcher(ctx: string, compl: string) {
	let i = 0;
	for (let char of ctx) {
		i = compl.indexOf(char, i);
		if (i < 0) return false;
	}

	return true;
}


const render_threshold = 10;

// #region Rendering
function CompletionsHTML(completions: RankedCompletionList): string {
	if (completions.length === 0) return '';

	const parts = completions
		.filter(compl => {
			let label = LabelString(compl.item);
			if (label.length === 0) return false;
			return compl.dist / label.length < render_threshold;
		})
		.map(SingleCompletionHTML);

	return '<div class="suggestions">' + parts.join('\n<br/>\n') + "</div>";
}

function MatchCssClass(match: string) {
	switch (match) {
		case "=": return "suggestion-same";
		case "~": return "suggestion-sim";
		case "s": return "suggestion-sim";
		case "r": return "suggestion-repl";
		default: return "suggestion";
	}
}

function SingleCompletionHTML(
	compl: RankedCompletionList[number],
): string {
	let result = "";
	const match = compl.match.replaceAll("d", "");

	let label = LabelString(compl.item);

	let currentClass: string | undefined = undefined;
	let currentText = "";
	let i = 0;
	for (; i < label.length && i < match.length; i++) {
		let cssClass = MatchCssClass(match[i]);
		if (cssClass === currentClass) {
			currentText += label[i];
		} else {
			if (currentClass) {
				result += `<span class="${currentClass}">${currentText}</span>`;
			} else {
				result += `<span>${currentText}</span>`;
			}

			currentClass = cssClass;
			currentText = label[i];
		}
	}

	if (currentClass) {
		result += `<span class="${currentClass}">${currentText}</span>`;
		// result += `<span style="color: ${currentColor}; padding: 0">${currentText}</span>`;
	} else {
		result += `<span>${currentText}</span>`;
	}

	return result + `<span>${label.substring(i)}</span>`;
}
