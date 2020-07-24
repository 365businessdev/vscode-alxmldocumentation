import { workspace, window, WorkspaceConfiguration } from "vscode";

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
                workspace.getConfiguration(this.ExtensionIdent()).update('checkProcedureDocumentation', (answer === "Yes"));
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

    private static GetConfigurationValue(configParam: string): any {
        let workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor!.document.uri); // workspace.workspaceFolders[].uri
        let config: WorkspaceConfiguration | undefined;
        if (workspaceFolder !== undefined) {
            config = workspace.getConfiguration(this.ExtensionIdent(), workspaceFolder).get(configParam);
        } else {
            config = workspace.getConfiguration(this.ExtensionIdent()).get(configParam);
        }

        return config;
    }

    public dispose() {
    }
}