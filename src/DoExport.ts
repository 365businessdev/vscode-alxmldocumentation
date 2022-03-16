import { window, commands, TextEditor, TextDocument, extensions, OutputChannel, Extension } from 'vscode';
import { ALObjectDocumentationExport } from './util/ALObjectDocumentationExport';
import { ALObjectCache } from './ALObjectCache';
import { ALObject } from './types/ALObject';
import { ALObjectType } from './types/ALObjectType';
import { StringUtil } from './util/string/StringUtil';
import { Configuration } from './util/Configuration';
import { FilesystemHelper } from './util/filesystem/FilesystemHelper';

export class DoExport {

    private output!: OutputChannel;
    private activeEditor!: TextEditor;

    private extension!: Extension<any>;
    private extensionManifest: any;

    constructor() {
        commands.registerCommand('al-xml-doc.exportPdf', () => {
            this.ExportPdf(window.activeTextEditor);
        });

        commands.registerCommand('al-xml-doc.exportMarkdown', () => {
            this.ExportMarkdown(window.activeTextEditor, true);
        });
    
        commands.registerCommand('al-xml-doc.exportProjectToMarkdown', () => {
            this.ExportMarkdown(window.activeTextEditor, false);
        });

        commands.registerCommand('al-xml-doc.deleteExportedMarkdown', () => {
            this.DeleteExistingDocumentationFiles();
        });
        
    }

    /**
     * Get or create extension specific output channel
     * @param outputName Name of the Output Channel
     * @returns OutputChannel
     */
    private getOutputChannel(outputName: string): OutputChannel {
        if ((this.output !== undefined) && (this.output !== null)) {
            this.output.clear();
            return this.output;
        }
        this.output = window.createOutputChannel(outputName);
        return this.output;
    }

    /**
     * Verify Prerequisites for exporting documentations.
     * @returns True if export can be processed. Otherwise false.
     */
    private VerifyPrerequisite(): boolean {
        if (this.activeEditor === undefined || this.activeEditor === null) {
            window.showErrorMessage('Please open a file in the project you want to export the documentation for.');
            return false;
        }

        if (ALObjectCache.ALObjects.length === 0) {
            window.showErrorMessage('No objects to export found in AL Object Cache.');
            return false;
        }

        var _extension = extensions.getExtension(Configuration.ExtensionName());
        if ((_extension === undefined) || (_extension === null)) {
            window.showErrorMessage('Unable to find Visual Studio Code extension. Please try re-install.');
            return false;
        }
        this.extension = _extension;
        this.extensionManifest = this.extension?.packageJSON;

        return true;
    }

    /**
     * Delete exported documentation (markdown) files and directories
     */
    public DeleteExistingDocumentationFiles() {
        try {            
            if (FilesystemHelper.DirectoryExists(ALObjectDocumentationExport.GetDocumentationExportPath())) {
                FilesystemHelper.ClearDirectory(ALObjectDocumentationExport.GetDocumentationExportPath());
            }
        } catch (ex) {
            window.showErrorMessage('An error occurred while processing. See output for further information.');

            this.output = this.getOutputChannel(Configuration.OutputChannelName());
            if (typeof ex === "string") {
                this.output.appendLine(ex);
            } else if (ex instanceof Error) {
                this.output.appendLine(ex.message);
            }
        }
    }

    public async ExportPdf(activeEditor: TextEditor | undefined) {
        if ((activeEditor === undefined) || (activeEditor === null)) {
            return;
        }

        this.activeEditor = activeEditor;
        
        this.VerifyPrerequisite();

        var document: TextDocument = activeEditor!.document;
        document.save();

        this.output = this.getOutputChannel(Configuration.OutputChannelName());
        this.output.show(true);
        this.output.appendLine(this.extensionManifest.displayName + ' version ' + this.extensionManifest.version);
        this.output.appendLine('Copyright (C) 365 business development. All rights reserved');
        this.output.appendLine('');
        try
        {
            this.output.appendLine(`${StringUtil.GetTimestamp()} Starting documentation PDF file export.`);
            let startTime = Date.now();
            await ALObjectDocumentationExport.ExportAsPdf(this.output);
            let endTime = Date.now();
            this.output.appendLine(`${StringUtil.GetTimestamp()} PDF file creation has finished. Processing took ${Math.round((endTime - startTime) * 100 / 100)}ms.`);
        } catch (ex) {
            window.showErrorMessage('An error occurred while processing. See output for further information.');

            this.output.appendLine('');
            if (typeof ex === "string") {
                this.output.appendLine(ex);
            } else if (ex instanceof Error) {
                this.output.appendLine(ex.message);
            }

            return;
        }
    }

    /**
     * Export documentation to markdown files.
     * @param activeEditor TextEditor
     * @param currFileOnly Specifies to export only current file or complete project.
     */
    public async ExportMarkdown(activeEditor: TextEditor | undefined, currFileOnly: boolean) {
        if ((activeEditor === undefined) || (activeEditor === null)) {
            return;
        }

        this.activeEditor = activeEditor;

        this.VerifyPrerequisite();
        
        if (currFileOnly) {
            if (this.activeEditor.document.languageId !== 'al') {
                window.showErrorMessage('XML documentation is not supported for this language.');
                return false;
            }
        }

        var document: TextDocument = activeEditor!.document;
        document.save();

        this.output = this.getOutputChannel(Configuration.OutputChannelName());
        this.output.show(true);
        this.output.appendLine(this.extensionManifest.displayName + ' version ' + this.extensionManifest.version);
        this.output.appendLine('Copyright (C) 365 business development. All rights reserved');
        this.output.appendLine('');
        try
        {
            this.output.appendLine(`${StringUtil.GetTimestamp()} Starting creation of documentation files.`);
            let startTime = Date.now();
            if (currFileOnly) {
                let alObjects: ALObject[] = ALObjectCache.ALObjects.filter(alObject => (alObject.Uri === this.activeEditor.document.uri));
                if (alObjects.length === 0) {
                    window.showErrorMessage('AL Object could not been found. Please save the file manually and try again.');
                    return false;
                }
                for (const alObject of alObjects) {
                    this.output.appendLine(`${StringUtil.GetTimestamp()} Exporting documentation for ${ALObjectType[alObject.Type]} ${alObject.Name} . . . `);
                    await ALObjectDocumentationExport.ExportObject(alObject, this.output, Configuration.IncludeProcedureDocumentationInObjectDocumentationFile());
                };    
                this.output.appendLine(`${StringUtil.GetTimestamp()} Note: Project documentation file will not been updated when exporting documentation for single files.`);
            } else {
                if (FilesystemHelper.DirectoryExists(ALObjectDocumentationExport.GetDocumentationExportPath())) {
                    this.output.appendLine(`${StringUtil.GetTimestamp()} Cleaning up previously created documentation files.`);
                    FilesystemHelper.ClearDirectory(ALObjectDocumentationExport.GetDocumentationExportPath());
                }

                let alObjects: ALObject[] = ALObjectCache.ALObjects;
                for (const alObject of alObjects) {
                    this.output.appendLine(`${StringUtil.GetTimestamp()} Exporting documentation for ${ALObjectType[alObject.Type]} ${alObject.Name} . . . `);
                    await ALObjectDocumentationExport.ExportObject(alObject, this.output, Configuration.IncludeProcedureDocumentationInObjectDocumentationFile());
                };
                await ALObjectDocumentationExport.ExportIndex(this.output);
            }
			let endTime = Date.now();
            this.output.appendLine(`${StringUtil.GetTimestamp()} Creation of documentation files has been finished. Processing took ${Math.round((endTime - startTime) * 100 / 100)}ms.`);
        } catch (ex) {
            window.showErrorMessage('An error occurred while processing. See output for further information.');

            this.output.appendLine('');
            if (typeof ex === "string") {
                this.output.appendLine(ex);
            } else if (ex instanceof Error) {
                this.output.appendLine(ex.message);
            }

            return;
        }
    }

    public dispose() {
    }
}