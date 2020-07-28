import { workspace, window, WorkspaceConfiguration, WorkspaceFolder, Uri } from "vscode";

export class Configuration {
    public static AskEnableCheckProcedureDocumentation() {  
        if (this.AskEnableCheckProcedureDocumentationIsEnabled()) {
            if (this.ConfigurationHasChanged('checkProcedureDocumentation')) {
                return; // do not ask again
            }

            window.showInformationMessage('Do you want to enable AL XML Documentation procedure check for this workspace?', ...['Yes', 'No']).then(answer => {
                if (answer === undefined) {
                    return;
                }
                this.SetConfigurationValue('checkProcedureDocumentation', (answer === "Yes"));
            });
        }
    }

    public static ExtensionIdent(): string {
        return "bdev-al-xml-doc";
    }

    public static DocumentationCommentsIsEnabled(fileUri: Uri | undefined = undefined): boolean {
        return this.GetConfigurationValue('enableDocComments', fileUri);
    }

    public static SummaryHoverIsEnabled(): boolean {
        return this.GetConfigurationValue('enableSummaryHover');
    }

    public static SignatureHoverIsEnabled(): boolean {
        return this.GetConfigurationValue('enableSignatureHover');
    }

    public static AskEnableCheckProcedureDocumentationIsEnabled(): boolean {
        return this.GetConfigurationValue('askEnableCheckProcedureDocumentation');
    }

    public static CheckProcedureDocumentationIsEnabled(fileUri: Uri | undefined = undefined): boolean {
        return this.GetConfigurationValue('checkProcedureDocumentation', fileUri);
    }

    public static ProcedureTypes(): string[] {
        return this.GetConfigurationValue('procedureTypes');
    }

    private static SetConfigurationValue(configParam: string, configValue: any) {
        let config: WorkspaceConfiguration | undefined = this.GetConfiguration();
        if (config === undefined) {
            workspace.getConfiguration(this.ExtensionIdent()).update(configParam, configValue);
            return;
        }

        config.update(configParam, configValue);
    }

    private static GetConfigurationValue(configParam: string, fileUri: Uri | undefined = undefined): any {
        let config: WorkspaceConfiguration | undefined = this.GetConfiguration(fileUri);
        if (config === undefined) {
            return;
        }
        return config.get(configParam);
    }

    private static GetConfiguration(fileUri: Uri | undefined = undefined): WorkspaceConfiguration | undefined {
        let config: WorkspaceConfiguration | undefined;
        if (fileUri === undefined) {
            let activeDocument = (window.activeTextEditor !== undefined) ? window.activeTextEditor.document : undefined;
            let workspaceFolder: WorkspaceFolder | undefined = undefined;
            if (activeDocument !== undefined) {
                workspaceFolder = workspace.getWorkspaceFolder(activeDocument.uri);
                config = workspace.getConfiguration(this.ExtensionIdent(), workspaceFolder);
            } else {
                config = workspace.getConfiguration(this.ExtensionIdent());
            }
        } else {
            let workspaceFolder = workspace.getWorkspaceFolder(fileUri);
            config = workspace.getConfiguration(this.ExtensionIdent(), workspaceFolder);
        }

        return config;
    }
    
    private static ConfigurationHasChanged(configParam: string): boolean {
        let config = workspace.getConfiguration(this.ExtensionIdent()).inspect(configParam);

        if (config?.workspaceFolderValue !== undefined) {
            return true;
        }
        if (config?.workspaceValue !== undefined) {
            return true;
        }        
        if (config?.globalValue !== undefined) {
            return true;
        }
        return false;
    }

    public dispose() {
    }
}