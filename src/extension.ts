import { ExtensionContext } from "vscode";
import { DoComment } from "./DoComment";
import { DoExport } from "./DoExport";
import { DoHover } from "./DoHover";
import { DoCheckDocumentation } from "./DoCheckDocumentation";
import { Configuration } from "./util/Configuration";

export async function activate(context: ExtensionContext) {	
	Configuration.AskEnableCheckProcedureDocumentation();

	const doComment = new DoComment();
	const doExport = new DoExport();
	const doHover = new DoHover();
	const doCheckDocumentation = new DoCheckDocumentation();
	let startTime = Date.now();
	doCheckDocumentation.InitializeCheckDocumentation().then(() => {
		let endDate = Date.now();
		console.log(`AL XML Documentation full-scan finished in ${endDate - startTime}ms`);
	});
	
	context.subscriptions.push(doComment);
	context.subscriptions.push(doExport);
	context.subscriptions.push(doHover);
	context.subscriptions.push(doCheckDocumentation);

	console.log("AL XML Documentation Extension has been activated.");
}

// this method is called when your extension is deactivated
export function deactivate() {}
