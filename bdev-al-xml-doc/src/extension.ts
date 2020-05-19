import * as vscode from "vscode";
import { isNullOrUndefined } from "util";

let output: vscode.OutputChannel;

export function activate(_context: vscode.ExtensionContext) {
	console.log("AL XML Documentation Extension has been activated.");

	vscode.commands.registerCommand("bdev-al-xml-doc.exportMarkdown", () => {
		let activeEditor = vscode.window.activeTextEditor;
		if (activeEditor === undefined || activeEditor === null) {
			vscode.window.showErrorMessage("Please open a file in the project you want to export the documentation for.");
			return;
		}

		ExportMarkdown(activeEditor!.document, true);
	});

	vscode.commands.registerCommand("bdev-al-xml-doc.exportDirectoryToMarkdown", () => {
		let activeEditor = vscode.window.activeTextEditor;
		if (activeEditor === undefined || activeEditor === null) {
			vscode.window.showErrorMessage("Please open a file in the project you want to export the documentation for.");
			return;
		}

		ExportMarkdown(activeEditor!.document, false);
	});
}

function ExportMarkdown(document: vscode.TextDocument, useFile: boolean) {
	var extension = vscode.extensions.getExtension("365businessdev.bdev-al-xml-doc");

	var manifest = extension?.packageJSON;

	output = getOutputChannel(getOutputChannelName());
	output.show(true);
	output.appendLine(manifest.displayName + " version " + manifest.version);
	output.appendLine("Copyright (C) business development Christoph Krieg. All rights reserved");
	output.appendLine("");
	try
	{
		extension = vscode.extensions.getExtension("365businessdev.bdev-al-xml-doc");
		var extensionPath = extension!.extensionPath;

		var workingPath;
		if (useFile) {
			workingPath = document.fileName;
			console.log("Using file: " + workingPath);
		} else {
			workingPath = getDirectoryName(document.fileName);
			console.log("Using working path: " + workingPath);
		}
		var markdownPath = vscode.workspace.getConfiguration("bdev-al-xml-doc").markdown_path;
		if (markdownPath === undefined || markdownPath === null || markdownPath === "") {
			vscode.window.showErrorMessage("Please setup 'markdown_path' in workspace settings to define the export directory.");
			return;
		}
		console.log("Using export path: " + markdownPath);
	} catch (ex) {
		vscode.window.showErrorMessage("An error occured while processing. See terminal for further information.");

		output.appendLine("");
		output.appendLine(ex.message);

		return;
	}

	var additionalArgs = "";
	var verbose = vscode.workspace.getConfiguration("bdev-al-xml-doc").verbose;
	if (verbose === true) {
		additionalArgs = " -v ";
	}

	var exec;
	if (useFile) {
		output.appendLine(`Markdown export started for '${workingPath}' at '${new Date().toLocaleTimeString()}'`);
		exec = `"${extensionPath}/bin/ALCodeCommentMarkdownCreator.exe" ${additionalArgs} -o "${markdownPath}" -f "${workingPath}"`;
	} else {
		output.appendLine(`Markdown export started for directory '${workingPath}' at '${new Date().toLocaleTimeString()}'`);
		exec = `"${extensionPath}/bin/ALCodeCommentMarkdownCreator.exe" ${additionalArgs} -o "${markdownPath}" -i "${workingPath}"`;
	}
	output.appendLine("");

	require("child_process").exec(exec,  (_err: string, _stdout: string, _stderr: string) => {
		if (_err) {			
			vscode.window.showErrorMessage("An error occured while processing. See terminal for further information.");

			output.appendLine("An error occured while processing:");
			output.appendLine(_err);
		} else {
			vscode.window.showInformationMessage("XML documentation has been exported to markdown.");

			output.appendLine(_stdout);

			output.appendLine(`Markdown export ended at '${new Date().toLocaleTimeString()}'`);
			output.appendLine("");
			output.appendLine("Success: The AL XML documentation has been exported.");
						
		}
	});
}

function getOutputChannel(outputName: string): vscode.OutputChannel {
	if (!isNullOrUndefined(output)) {
		output.clear();
		return output;
	}
	output = vscode.window.createOutputChannel(outputName);
	return output;
}

function getOutputChannelName() {
	return "AL XML Documentation";
}

function getDirectoryName(filename: string) {
	var path = require("path");
	return path.dirname(filename);
}

// this method is called when your extension is deactivated
export function deactivate() {}
