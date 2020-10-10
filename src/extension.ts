import { ExtensionContext, Disposable, workspace, window } from "vscode";
import { Controller } from "./Controller";
import { ALSyntaxUtil } from "./util/ALSyntaxUtil";

export async function activate(context: ExtensionContext) {	
	const controller = new Controller(context);
	
	let startTime = Date.now();

	controller.Initialize().then(() => {
		let endTime = Date.now();

		console.log(`AL XML Documentation Extension has been activated. Initialization took ${Math.round((endTime - startTime) * 100 / 100)}ms.`);
	});

	workspace.onDidChangeTextDocument(event => {
		const activeEditor = window.activeTextEditor;

		if (activeEditor && event.document === activeEditor.document) {
			ALSyntaxUtil.GetObject(event.document);
		}
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
