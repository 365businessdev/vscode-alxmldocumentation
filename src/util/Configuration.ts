import { workspace, window } from "vscode";

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
        return workspace.getConfiguration(this.ExtensionIdent()).enableDocComments;
    }

    public static SummaryHoverIsEnabled(): boolean {
        return workspace.getConfiguration(this.ExtensionIdent()).enableSummaryHover;
    }

    public static SignatureHoverIsEnabled(): boolean {
        return workspace.getConfiguration(this.ExtensionIdent()).enableSignatureHover;
    }

    public static AskEnableCheckProcedureDocumentationIsEnabled(): boolean {
        return workspace.getConfiguration(this.ExtensionIdent()).askEnableCheckProcedureDocumentation;
    }

    public static CheckProcedureDocumentationIsEnabled(): boolean {
        return workspace.getConfiguration(this.ExtensionIdent()).checkProcedureDocumentation;
    }

    public static ProcedureTypes(): string[] {
        return workspace.getConfiguration(this.ExtensionIdent()).procedureTypes;
    }

    public dispose() {
    }
}