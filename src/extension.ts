import { ExtensionContext } from "vscode";
import { DoComment } from "./DoComment";
import { DoExport } from "./DoExport";
import { DoHover } from "./DoHover";

export function activate(context: ExtensionContext) {
	const doComment = new DoComment();
	const doExport = new DoExport();
	const doHover = new DoHover();

	context.subscriptions.push(doComment);
	context.subscriptions.push(doExport);
	context.subscriptions.push(doHover);

	console.log("AL XML Documentation Extension has been activated.");
}

// this method is called when your extension is deactivated
export function deactivate() {}
