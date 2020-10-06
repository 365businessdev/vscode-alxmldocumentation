import { ExtensionContext, Disposable, workspace, window } from "vscode";
import {ALSyntaxUtil} from "./util/ALSyntaxUtil";

export function activate(context: ExtensionContext) {	
	// const subscriptions: Disposable[] = [];
	// let disposable: Disposable;

	workspace.onDidChangeTextDocument(event => {
		const activeEditor = window.activeTextEditor;

		if (activeEditor && event.document === activeEditor.document) {
			ALSyntaxUtil.GetObject(event.document);
		}
	});
	
	// disposable = Disposable.from(...subscriptions);

	console.log("AL XML Documentation Extension has been activated.");
}

// this method is called when your extension is deactivated
export function deactivate() {}
