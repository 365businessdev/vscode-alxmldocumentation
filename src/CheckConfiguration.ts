import { workspace, window } from "vscode";

export class CheckConfiguration {    
    constructor() {  
        this.AskEnableCheckProcedureDocumentation();
    }

    private AskEnableCheckProcedureDocumentation() {  
        if (workspace.getConfiguration("bdev-al-xml-doc").askEnableCheckProcedureDocumentation) {
            if (workspace.getConfiguration("bdev-al-xml-doc").inspect('checkProcedureDocumentation')?.workspaceValue) {
                return; // do not ask again
            }

            window.showInformationMessage('Do you want to enable AL XML Documentation procedure check for this workspace?', ...['Yes', 'No']).then(answer => {
                if (answer === undefined) {
                    return;
                }
                workspace.getConfiguration("bdev-al-xml-doc").update('checkProcedureDocumentation', (answer === "Yes"));
            });
        }
    }

    public dispose() {
    }
}