import { CodeActionProvider, CodeActionKind, TextDocument, Range, Selection, CodeActionContext, CancellationToken, CodeAction } from "vscode";
import { ALSyntaxUtil } from "./ALSyntaxUtil";
import { ALXmlDocDiagnosticPrefix, ALXmlDocDiagnosticCode } from "../types";

export class ALFixDocumentation implements CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: TextDocument, range: Range | Selection, context: CodeActionContext, token: CancellationToken): CodeAction[] {
        let procedureState: { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null;
        procedureState = ALSyntaxUtil.GetALProcedureState(document, range.start.line);
        if ((procedureState === null) || (procedureState === undefined)) {
            return [ ];
        }

        let quickFixActions: CodeAction[] = [];
        context.diagnostics.filter(diagnostic => diagnostic.source === ALXmlDocDiagnosticPrefix).forEach(diagnostic => {
            let procedureDefinition = ALSyntaxUtil.AnalyzeProcedureDefinition(document.getText().split("\r\n")[procedureState!.position.start.line])?.groups;
            if (procedureDefinition) {
                if (procedureState!.documentation === "") {
                    let action = new CodeAction('Add documentation', CodeActionKind.QuickFix);
                    action.command = { 
                        command: "bdev-al-xml-doc.fixDocumentation", 
                        title: 'Add procedure documentation', 
                        tooltip: 'This quick fix is automatically adding procedure documentation.',
                        arguments: [ procedureState ]
                    };
                    action.diagnostics = [diagnostic];
                    action.isPreferred = true;
                    quickFixActions.push(action);
                } else {
                    let action = null;
                    let codes = diagnostic.code?.toString().split(', ');
                    [...new Set(codes)].forEach(diagnosticCode => {
                        switch (diagnosticCode) {
                            case ALXmlDocDiagnosticCode.SummaryMissing:
                                action = new CodeAction('Add summary documentation', CodeActionKind.QuickFix);
                                action.command = { 
                                    command: "bdev-al-xml-doc.fixSummaryDocumentation", 
                                    title: 'Add procedure summary documentation', 
                                    tooltip: 'This quick fix is automatically adding procedure summary documentation.',
                                    arguments: [ procedureState ] 
                                };
                                action.diagnostics = [diagnostic];
                                action.isPreferred = true;
                                quickFixActions.push(action);
                                break;
                            case ALXmlDocDiagnosticCode.ParameterMissing:
                                action = new CodeAction('Add parameter documentation', CodeActionKind.QuickFix);
                                action.command = { 
                                    command: "bdev-al-xml-doc.fixParameterDocumentation", 
                                    title: 'Add procedure parameter documentation', 
                                    tooltip: 'This quick fix is automatically adding procedure parameter documentation.',
                                    arguments: [ procedureState ] 
                                };
                                action.diagnostics = [diagnostic];
                                action.isPreferred = true;
                                quickFixActions.push(action);
                                break;
                            case ALXmlDocDiagnosticCode.ReturnTypeMissing:
                                action = new CodeAction('Add return type documentation', CodeActionKind.QuickFix);
                                action.command = { 
                                    command: "bdev-al-xml-doc.fixReturnTypeDocumentation", 
                                    title: 'Add procedure return type documentation', 
                                    tooltip: 'This quick fix is automatically adding procedure return type documentation.',
                                    arguments: [ procedureState ] 
                                };
                                action.diagnostics = [diagnostic];
                                action.isPreferred = true;
                                quickFixActions.push(action);
                                break;
                        }
                    });
                }

            }
        });

        return quickFixActions;
    }
}