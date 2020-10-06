import { ExtensionContext, Disposable, workspace, window } from "vscode";
import { ALObject } from "./al-types/ALObject";
import { ALXmlDoc } from "./ALXmlDoc";

export async function activate(context: ExtensionContext) {	
	const alXmlDoc = new ALXmlDoc();
	
	let startTime = Date.now();
	let ALObjects: Array<ALObject> = [];

	alXmlDoc.Initialize().then(alObjects => {
		let endTime = Date.now();

		ALObjects = alObjects;

		console.log(`AL XML Documentation Extension has been activated in ${endTime - startTime}ms.`);
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
