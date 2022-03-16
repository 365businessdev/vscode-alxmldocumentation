import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, Command, Diagnostic, ProviderResult, Range, Selection, TextDocument } from 'vscode';
import { ALXmlDocConfigurationPrefix, ALXmlDocDiagnosticCode, ALXmlDocDiagnosticPrefix } from '../types';
import { ALObject } from '../types/ALObject';
import { ALProcedure } from '../types/ALProcedure';
import { ALSyntaxUtil } from './ALSyntaxUtil';

export class ALDocumentationQuickFixProvider implements CodeActionProvider {
    // XML documentation CodeActions
    private QuickFixActions: CodeAction[] = [];

    public provideCodeActions(document: TextDocument, range: Range | Selection, context: CodeActionContext, token: CancellationToken): ProviderResult<(CodeAction | Command)[]> {
        this.QuickFixActions = [];

        return new Promise(resolve => {
            resolve(this.ProvideCodeActionsAsync(document, range, context, token));
         });
    }

    private async ProvideCodeActionsAsync(document: TextDocument, range: Range | Selection, context: CodeActionContext, token: CancellationToken): Promise<(CodeAction | Command)[] | null | undefined> {
        let alObject: ALObject | null = await ALSyntaxUtil.GetALObject(document);
        if (alObject === null) {
            return;
        }

        context.diagnostics.filter(diagnostics => diagnostics.source === ALXmlDocDiagnosticPrefix).forEach(diagnostic => {
            if (diagnostic === undefined) {
                return;
            }

            let diagCodes: Array<string> = [];
            if (diagnostic.code!.toString().indexOf(',') !== -1) { // multiple diagnostic codes
                diagnostic.code!.toString().split(', ').forEach(diagnosticCode => {
                    diagCodes.push(diagnosticCode);
                });
            } else { // just one diagnostic code
                diagCodes.push(diagnostic.code!.toString());
            }
            diagCodes.forEach(diagnosticCode => {
                let alProcedure: ALProcedure | undefined;
                if ((diagnosticCode !== ALXmlDocDiagnosticCode.ObjectDocumentationMissing) && (diagnosticCode !== ALXmlDocDiagnosticCode.ParameterUnnecessary)) {
                    alProcedure = alObject?.Procedures?.find(alProcedure => (alProcedure.LineNo === range.start.line));
                    if (alProcedure === undefined) {
                        console.error(`[ProvideCodeActionsAsync] - Unable to locate ALProcedure object for diagnostics entry. Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues`);
                        return;
                    }
                }

                switch (diagnosticCode) {
                    case ALXmlDocDiagnosticCode.DocumentationMissing:
                        this.AddDocumentationMissingCodeAction(alProcedure, diagnostic);
                        break;
                    case ALXmlDocDiagnosticCode.SummaryMissing:
                        this.AddSummaryDocumentationMissingCodeAction(alProcedure, diagnostic);
                        break;
                    case ALXmlDocDiagnosticCode.ParameterMissing:
                        this.AddParameterDocumentationMissingCodeAction(alProcedure, diagnostic);
                        break;
                    case ALXmlDocDiagnosticCode.ReturnTypeMissing:
                        this.AddReturnDocumentationMissingCodeAction(alProcedure, diagnostic);
                        break;
                    case ALXmlDocDiagnosticCode.ParameterUnnecessary:
                        this.AddUnnecessaryParameterDocumentationMissingCodeAction(alProcedure, diagnostic);
                        break;
                    case ALXmlDocDiagnosticCode.ObjectDocumentationMissing:
                        this.AddObjectDocumentationMissingCodeAction(alObject, diagnostic);
                        break;
                }
            });

        });
        
        return this.QuickFixActions;
    }    

    /**
     * Add Code Action to fix Object XML Documentation missing.
     * @param alProcedure AL Procedure.
     * @param diagnostic Diagnostic entry.
     */
    private AddObjectDocumentationMissingCodeAction(alObject: ALObject | null, diagnostic: Diagnostic) {
        let action: CodeAction = new CodeAction('Add XML documentation', CodeActionKind.QuickFix);
        action.command = {
            command: `${ALXmlDocConfigurationPrefix}.fixObjectDocumentation`,
            title: 'Add object XML documentation',
            tooltip: `Automatically fix missing XML documentation for object ${alObject?.Name}.`,
            arguments: [alObject]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        this.QuickFixActions.push(action);
    }

    /**
     * Add Code Action to fix Procedure XML Documentation missing.
     * @param alProcedure AL Procedure.
     * @param diagnostic Diagnostic entry.
     */
    private AddDocumentationMissingCodeAction(alProcedure: ALProcedure | undefined, diagnostic: Diagnostic) {
        let action: CodeAction = new CodeAction('Add XML documentation', CodeActionKind.QuickFix);
        action.command = {
            command: `${ALXmlDocConfigurationPrefix}.fixDocumentation`,
            title: 'Add procedure XML documentation',
            tooltip: `Automatically fix missing XML documentation for procedure ${alProcedure?.Name}.`,
            arguments: [alProcedure]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        this.QuickFixActions.push(action);
    }

    /**
     * Add Code Action to fix Summary XML Documentation missing.
     * @param alProcedure AL Procedure.
     * @param diagnostic Diagnostic entry.
     */
    private AddSummaryDocumentationMissingCodeAction(alProcedure: ALProcedure | undefined, diagnostic: Diagnostic) {
        let action: CodeAction = new CodeAction('Add summary XML documentation', CodeActionKind.QuickFix);
        action.command = {
            command: `${ALXmlDocConfigurationPrefix}.fixSummaryDocumentation`,
            title: 'Add procedure summary XML documentation',
            tooltip: `Automatically fix missing summary XML documentation for procedure ${alProcedure?.Name}.`,
            arguments: [alProcedure]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        this.QuickFixActions.push(action);
    }

    /**
     * Add Code Action to fix Parameter XML Documentation missing.
     * @param alProcedure AL Procedure.
     * @param diagnostic Diagnostic entry.
     */
    private AddParameterDocumentationMissingCodeAction(alProcedure: ALProcedure | undefined, diagnostic: Diagnostic) {
        let action: CodeAction = new CodeAction('Add parameter XML documentation', CodeActionKind.QuickFix);
        action.command = {
            command: `${ALXmlDocConfigurationPrefix}.fixParameterDocumentation`,
            title: 'Add parameter XML documentation',
            tooltip: `Automatically fix missing parameter XML documentation for procedure ${alProcedure?.Name}.`,
            arguments: [alProcedure]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        this.QuickFixActions.push(action);
    }

    /**
     * Add Code Action to fix Return Value XML Documentation missing.
     * @param alProcedure AL Procedure.
     * @param diagnostic Diagnostic entry.
     */
    private AddReturnDocumentationMissingCodeAction(alProcedure: ALProcedure | undefined, diagnostic: Diagnostic) {
        let action: CodeAction = new CodeAction('Add return value XML documentation', CodeActionKind.QuickFix);
        action.command = {
            command: `${ALXmlDocConfigurationPrefix}.fixReturnDocumentation`,
            title: 'Add return value XML documentation',
            tooltip: `Automatically fix missing return value XML documentation for procedure ${alProcedure?.Name}.`,
            arguments: [alProcedure]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        this.QuickFixActions.push(action);
    }

    /**
     * Add Code Action to fix unnecessary Parameter XML Documentation missing.
     * @param alProcedure AL Procedure.
     * @param diagnostic Diagnostic entry.
     */
    private AddUnnecessaryParameterDocumentationMissingCodeAction(alProcedure: ALProcedure | undefined, diagnostic: Diagnostic) {
        let action: CodeAction = new CodeAction('Remove unnecessary parameter XML documentation', CodeActionKind.QuickFix);
        action.command = {
            command: `${ALXmlDocConfigurationPrefix}.fixUnnecessaryParameterDocumentation`,
            title: 'Remove unnecessary parameter XML documentation',
            tooltip: `Automatically fix unnecessary parameter XML documentation for procedure ${alProcedure?.Name}.`,
            arguments: [alProcedure, diagnostic.range]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        this.QuickFixActions.push(action);
    }
}