import { OutputChannel, ExtensionContext, commands, window, TextEditor, TextDocument, extensions, workspace } from "vscode";
import { DoComment } from "./DoComment";
import { DoExport } from "./DoExport";

export function activate(context: ExtensionContext) {
	const doComment = new DoComment();
	const doExport = new DoExport();

	context.subscriptions.push(doComment);
	context.subscriptions.push(doExport);

	console.log("AL XML Documentation Extension has been activated.");
}

// this method is called when your extension is deactivated
export function deactivate() {}
