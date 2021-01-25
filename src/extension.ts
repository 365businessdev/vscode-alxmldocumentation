import { ExtensionContext } from 'vscode';
import { ALObjectCache } from './ALObjectCache';
import { Controller } from './Controller';
import { Configuration } from './util/Configuration';

export async function activate(context: ExtensionContext) {	
	const controller = new Controller(context);
	
	if (Configuration.InitializeALObjectCacheOnStartUp()) {
		let startTime = Date.now();

		controller.Initialize().then(() => {
			let endTime = Date.now();

			console.log(`AL XML Documentation Extension has been activated. Initialization for ${ALObjectCache.ALObjects.length} AL Objects took ${Math.round((endTime - startTime) * 100 / 100)}ms.`);
		});			
	} else {
		console.log('AL XML Documentation Extension has been activated. Initialization skipped.');
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
	ALObjectCache.ALObjects = []; // delete cache
}
