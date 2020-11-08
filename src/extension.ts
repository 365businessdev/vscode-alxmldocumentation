import { commands, ExtensionContext, TextEditor, window } from 'vscode';
import { ALObjectCache } from './ALObjectCache';
import { Controller } from './Controller';

export async function activate(context: ExtensionContext) {	
	const controller = new Controller(context);
	
	let startTime = Date.now();

	controller.Initialize().then(() => {
		let endTime = Date.now();

		console.log(`AL XML Documentation Extension has been activated. Initialization for ${ALObjectCache.ALObjects.length} AL Objects took ${Math.round((endTime - startTime) * 100 / 100)}ms.`);
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
