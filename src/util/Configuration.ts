import { workspace, window, WorkspaceConfiguration, WorkspaceFolder } from "vscode";

export class Configuration {
    public static AskEnableCheckProcedureDocumentation() {  
        if (this.AskEnableCheckProcedureDocumentationIsEnabled()) {
            if (workspace.getConfiguration(this.ExtensionIdent()).inspect('checkProcedureDocumentation')?.workspaceValue) {
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

    public static DocumentationCommentsIsEnabled(): boolean {
        return this.GetConfigurationValue('enableDocComments');
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

    public static CheckProcedureDocumentationIsEnabled(): boolean {
        return this.GetConfigurationValue('checkProcedureDocumentation');
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

    private static GetConfigurationValue(configParam: string): any {
        let config: WorkspaceConfiguration | undefined = this.GetConfiguration();
        if (config === undefined) {
            return;
        }
        return config.get(configParam);
    }

    private static GetConfiguration(): WorkspaceConfiguration | undefined {
        let config: WorkspaceConfiguration | undefined;
        let activeDocument = (window.activeTextEditor !== undefined) ? window.activeTextEditor.document : undefined;
        let workspaceFolder: WorkspaceFolder | undefined = undefined;
        if (activeDocument !== undefined) {
            workspaceFolder = workspace.getWorkspaceFolder(activeDocument.uri);
            config = workspace.getConfiguration(this.ExtensionIdent(), workspaceFolder);
        } else {
            config = workspace.getConfiguration(this.ExtensionIdent());
        }

        return config;
    }

    public dispose() {
    }
}