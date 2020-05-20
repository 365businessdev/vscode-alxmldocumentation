import { OutputChannel, ExtensionContext, commands, window, TextEditor, TextDocument, extensions, workspace } from "vscode";
import { isNullOrUndefined } from "util";
import { DoComment } from "./doComment";
import path = require("path");

let output: OutputChannel;

export function activate(_context: ExtensionContext) {
	console.log("AL XML Documentation Extension has been activated.");

	commands.registerCommand("bdev-al-xml-doc.exportMarkdown", () => {
		ExportMarkdown(window.activeTextEditor, true);
	});

	commands.registerCommand("bdev-al-xml-doc.exportDirectoryToMarkdown", () => {
		ExportMarkdown(window.activeTextEditor, false);
	});

	const doComment = new DoComment();

	_context.subscriptions.push(doComment);
}

function ExportMarkdown(activeEditor: TextEditor | undefined, useFile: boolean) {
	if (activeEditor === undefined || activeEditor === null) {
		window.showErrorMessage("Please open a file in the project you want to export the documentation for.");
		return;
	}
	if (activeEditor.document.languageId !== "al") {
		window.showErrorMessage("XML documentation is not supported for this language.");
		return;
	}

	var document: TextDocument = activeEditor!.document;
	var extension = extensions.getExtension(GetExtensionName());
	if (isNullOrUndefined(extension)) {
		window.showErrorMessage("Unable to find Visual Studio Code extension. Please try re-install.");
		return;
	}
	var manifest = extension?.packageJSON;

	output = getOutputChannel(getOutputChannelName());
	output.show(true);
	output.appendLine(manifest.displayName + " version " + manifest.version);
	output.appendLine("Copyright (C) 365 business development. All rights reserved");
	output.appendLine("");
	try
	{
		var extensionPath = extension!.extensionPath;

		var workingPath;
		if (useFile) {
			workingPath = document.fileName;
			console.debug("Using file: " + workingPath);
		} else {
			workingPath = getDirectoryName(document.fileName);
			console.debug("Using working path: " + workingPath);
		}
		var markdownPath = workspace.getConfiguration("bdev-al-xml-doc").markdown_path;
		if (markdownPath === undefined || markdownPath === null || markdownPath === "") {
			let workspaceRoot = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : '';
			if (workspaceRoot === '') {
				window.showErrorMessage("Please setup 'markdown_path' in workspace settings to define the export directory.");
				return;
			}
			markdownPath = path.join(workspaceRoot, "doc");			
		}
		console.debug("Using export path: " + markdownPath);
	} catch (ex) {
		window.showErrorMessage("An error occured while processing. See output for further information.");

		output.appendLine("");
		output.appendLine(ex.message);

		return;
	}

	var additionalArgs = "";
	var verbose = workspace.getConfiguration("bdev-al-xml-doc").verbose;
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
			window.showErrorMessage("An error occured while processing. See output for further information.");

			output.appendLine("An error occured while processing:");
			output.appendLine(_err);
		} else {
			window.showInformationMessage("XML documentation has been exported to markdown.");

			output.appendLine(_stdout);

			output.appendLine(`Markdown export ended at '${new Date().toLocaleTimeString()}'`);
			output.appendLine("");
			output.appendLine("Success: The AL XML documentation has been exported.");
						
		}
	});
}

function getOutputChannel(outputName: string): OutputChannel {
	if (!isNullOrUndefined(output)) {
		output.clear();
		return output;
	}
	output = window.createOutputChannel(outputName);
	return output;
}

function getOutputChannelName() {
	return "AL XML Documentation";
}

function getDirectoryName(filename: string) {
	var path = require("path");
	return path.dirname(filename);
}

function GetExtensionName():string {
	return "365businessdevelopment.bdev-al-xml-doc";
}

// this method is called when your extension is deactivated
export function deactivate() {}
