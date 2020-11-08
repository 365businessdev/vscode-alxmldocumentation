import { workspace, window, commands, TextEditor, TextDocument, extensions, OutputChannel, Extension, WorkspaceConfiguration } from 'vscode';
import path = require('path');
import { ALXmlDocConfigurationPrefix } from './types';

export class DoExport {

    private output!: OutputChannel;
    private activeEditor!: TextEditor;

    private extension!: Extension<any>;
    private extensionManifest: any;

    constructor() {
        commands.registerCommand('al-xml-doc.exportMarkdown', () => {
            this.ExportMarkdown(window.activeTextEditor, true);
        });
    
        commands.registerCommand('al-xml-doc.exportDirectoryToMarkdown', () => {
            this.ExportMarkdown(window.activeTextEditor, false);
        });
    }

    private getOutputChannel(outputName: string): OutputChannel {
        if ((this.output !== undefined) && (this.output !== null)) {
            this.output.clear();
            return this.output;
        }
        this.output = window.createOutputChannel(outputName);
        return this.output;
    }

    private getOutputChannelName(): string {
        return 'AL XML Documentation';
    }

    private getDirectoryName(filename: string): string {
        var path = require('path');
        return path.dirname(filename);
    }

    private getExtensionName():string {
        return '365businessdevelopment.bdev-al-xml-doc';
    }

    private getConfiguration():WorkspaceConfiguration {
        return workspace.getConfiguration(ALXmlDocConfigurationPrefix);
    }

    private VerifyPrerequisite(): boolean {
        if (this.activeEditor === undefined || this.activeEditor === null) {
            window.showErrorMessage('Please open a file in the project you want to export the documentation for.');
            return false;
        }

        if (this.activeEditor.document.languageId !== 'al') {
            window.showErrorMessage('XML documentation is not supported for this language.');
            return false;
        }
        
        var _extension = extensions.getExtension(this.getExtensionName());
        if ((_extension === undefined) || (_extension === null)) {
            window.showErrorMessage('Unable to find Visual Studio Code extension. Please try re-install.');
            return false;
        }
        this.extension = _extension;
        this.extensionManifest = this.extension?.packageJSON;

        return true;
    }

    public ExportMarkdown(activeEditor: TextEditor | undefined, useFile: boolean) {
        if ((activeEditor === undefined) || (activeEditor === null)) {
            return;
        }
        this.activeEditor = activeEditor;

        this.VerifyPrerequisite();     

        var document: TextDocument = activeEditor!.document;
        document.save();

        this.output = this.getOutputChannel(this.getOutputChannelName());
        this.output.show(true);
        this.output.appendLine(this.extensionManifest.displayName + ' version ' + this.extensionManifest.version);
        this.output.appendLine('Copyright (C) 365 business development. All rights reserved');
        this.output.appendLine('');
        try
        {
            var extensionPath = this.extension.extensionPath;

            var workingPath;
            if (useFile) {
                workingPath = document.fileName;
                console.debug('Using file: ' + workingPath);
            } else {
                workingPath = this.getDirectoryName(document.fileName);
                console.debug('Using working path: ' + workingPath);
            }
            var markdownPath = this.getConfiguration().markdown_path;
            if (markdownPath === undefined || markdownPath === null || markdownPath === '') {
                let workspaceRoot = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : '';
                if (workspaceRoot === '') {
                    window.showErrorMessage('Please setup \'markdown_path\' in workspace settings to define the export directory.');
                    return;
                }
                markdownPath = path.join(workspaceRoot, 'doc');			
            } else {
                if (workspace.workspaceFolders) {
                    markdownPath = markdownPath.replace('${workspaceFolder}', this.getDirectoryName(workspace.workspaceFolders[0].uri.toString()));
                }
            }
            console.debug('Using export path: ' + markdownPath);
        } catch (ex) {
            window.showErrorMessage('An error occurred while processing. See output for further information.');

            this.output.appendLine('');
            this.output.appendLine(ex.message);

            return;
        }

        var additionalArgs = '';
        var verbose = this.getConfiguration().verbose;
        if (verbose === true) {
            additionalArgs = additionalArgs + ' -v';
        }
        var exportScope = this.getConfiguration().exportScope;
        if (exportScope === 'global') {
            additionalArgs = additionalArgs + ' -g';
        }

        var exec = `'${extensionPath}/bin/ALCodeCommentMarkdownCreator.exe' ${additionalArgs} -o '${markdownPath}'`;
        if (useFile) {
            // use file mode (-f)
            this.output.appendLine(`Markdown export started for '${workingPath}' at '${new Date().toLocaleTimeString()}'`);
            exec += ` -f '${workingPath}'`;
        } else {
            // use directory mode (-i)
            this.output.appendLine(`Markdown export started for directory '${workingPath}' at '${new Date().toLocaleTimeString()}'`);
            exec += ` -i '${workingPath}'`;
        }
        console.debug(exec);
        this.output.appendLine('');

        require('child_process').exec(exec,  (_err: string, _stdout: string, _stderr: string) => {
            if (_err) {			
                window.showErrorMessage('An error occurred while processing. See output for further information.');

                this.output.appendLine('An error occurred while processing:');
                this.output.appendLine(_err);
            } else {
                window.showInformationMessage('XML documentation has been exported to markdown.');

                this.output.appendLine(_stdout);

                this.output.appendLine(`Markdown export ended at '${new Date().toLocaleTimeString()}'`);
                this.output.appendLine('');
                this.output.appendLine('Success: The AL XML documentation has been exported.');
                            
            }
        });
    }

    public dispose() {
    }
}