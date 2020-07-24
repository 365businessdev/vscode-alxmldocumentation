import { languages, Range, Diagnostic, DiagnosticCollection, TextDocument } from "vscode";
import { DiagnosticSeverity } from "vscode-languageclient";
import { ALSyntaxUtil } from "./ALSyntaxUtil";
import { ALDocCommentUtil } from "./ALDocCommentUtil";
import { ALXmlDocDiagnosticCode, ALXmlDocDiagnosticPrefix } from "../types";
import { Configuration } from "./Configuration";

export class ALCheckDocumentation { 
    private document!: TextDocument;
    private diagnosticsCollection: DiagnosticCollection = languages.createDiagnosticCollection('al-xml-doc');
    private diagnostics: Diagnostic[] = [];

    public CheckDocumentation(document: TextDocument) {
        this.document = document;

        // clear all diagnostics
        this.diagnostics = [];
        this.UpdateDiagnostics();

        // check configuration
        if (!Configuration.CheckProcedureDocumentationIsEnabled(document.uri)) {
            return;
        }

        // retrieve all procedures in current document
        let alProcedures = ALSyntaxUtil.FindProcedures(this.document.getText());
        if (!alProcedures) {
            return;
        }

        // check documentation
        alProcedures.forEach((alProcedure: { procedureName : string, lineNo: number }) => {
            this.UpdateMissingDocumentations(ALSyntaxUtil.GetALProcedureState(this.document, alProcedure.lineNo));
        });        
        this.UpdateDiagnostics();
    }

    private UpdateMissingDocumentations(alProcedureState: { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null) {      
        if ((alProcedureState === null) || (alProcedureState === undefined)) {
            return;
        }

        let diag: { 
            type: DiagnosticSeverity, 
            diagnosticCode: ALXmlDocDiagnosticCode,
            element: string
        }[] = [];

        if (alProcedureState.documentation === "") {
            diag.push({
                type: DiagnosticSeverity.Warning,
                diagnosticCode: ALXmlDocDiagnosticCode.XmlDocumentationMissing,
                element: ''
            });
        } else {
            let jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedureState.documentation);
            if ((jsonDocumentation === undefined) || (jsonDocumentation === null)) {
                console.debug(`${this.document.fileName}, ${alProcedureState.name} could not be analyzed. Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues`);
                return;
            }
            if ((!jsonDocumentation.summary) || (jsonDocumentation.summary === "")) {
                diag.push({
                    type: DiagnosticSeverity.Warning,
                    diagnosticCode: ALXmlDocDiagnosticCode.SummaryMissing,
                    element: 'summary'
                });
            }
            if ((!(alProcedureState.definition['Params'] === null) || (alProcedureState.definition['Params'] === undefined)) && (alProcedureState.definition['Params'] !== "")) {
                alProcedureState.definition['Params'].split(';').forEach(paramDefinition => {
                    let paramName = paramDefinition.split(':')[0].trim();
                    if (paramName.match(/\bvar\s/) !== null) {
                        paramName = paramName.substring(paramName.indexOf('var') + 4);
                    }

                    let documented = false;
                    if (jsonDocumentation.param !== undefined) {
                        if (jsonDocumentation.param.length !== undefined) {
                            for (let i = 0; i < jsonDocumentation.param.length; i++) {
                                if (jsonDocumentation.param[i].attr.name === paramName) {
                                    if (jsonDocumentation.param[i].value !== "") {
                                        documented = true;
                                        jsonDocumentation.param.splice(i, 1);
                                    }
                                    break;
                                }
                            }
                        } else {
                            if (jsonDocumentation.param.attr.name === paramName) {
                                if (jsonDocumentation.param.value !== "") {
                                    documented = true;
                                    jsonDocumentation.param = undefined;
                                }
                            }
                        }
                    }
                    if (!documented) {
                        diag.push({
                            type: DiagnosticSeverity.Warning,
                            diagnosticCode: ALXmlDocDiagnosticCode.ParameterMissing,
                            element: paramName
                        });
                    }
                });
            }

            if (jsonDocumentation.param !== undefined) {
                if (jsonDocumentation.param.length !== undefined) {
                    jsonDocumentation.param.forEach((param: { attr: { name: string; }; }) => {
                        diag.push({
                            type: DiagnosticSeverity.Warning,
                            diagnosticCode: ALXmlDocDiagnosticCode.ParameterUnnecessary,
                            element: param.attr.name
                        });
                    });
                } else {
                    diag.push({
                        type: DiagnosticSeverity.Warning,
                        diagnosticCode: ALXmlDocDiagnosticCode.ParameterUnnecessary,
                        element: jsonDocumentation.param.attr.name
                    });
                }
            }

            if (alProcedureState.definition['ReturnType'] !== undefined) {
                if ((!jsonDocumentation.returns) || (jsonDocumentation.returns === "")) {
                    diag.push({
                        type: DiagnosticSeverity.Warning,
                        diagnosticCode: ALXmlDocDiagnosticCode.ReturnTypeMissing,
                        element: 'return value'
                    });
                }
            }
        }

        let missingDoc = diag.filter(this.IsMissingDocumentationDiag);
        if ((missingDoc !== undefined) && (missingDoc.length > 0)) {
            let msg: string = "";
            let code: string = "";
            if (missingDoc[0].diagnosticCode !== ALXmlDocDiagnosticCode.XmlDocumentationMissing) {
                missingDoc.forEach(diag => {
                    switch (diag.diagnosticCode) {
                        case ALXmlDocDiagnosticCode.ParameterMissing:
                            diag.element = `parameter '${diag.element}'`;
                        break;
                    }
                    msg = this.AppendString(msg, diag.element, ", ");
                    code = this.AppendString(code, this.GetDiagnosticCode(diag.diagnosticCode), ", ");
                });

                msg = `The procedure ${alProcedureState.name} is missing documentation for ${msg}.`;
            } else {
                code = this.GetDiagnosticCode(missingDoc[0].diagnosticCode);
                msg = `The procedure ${alProcedureState.name} missing documentation.`;
            }
            let diagnostic = new Diagnostic(alProcedureState.position, msg, DiagnosticSeverity.Warning);
            diagnostic.source = ALXmlDocDiagnosticPrefix;
            diagnostic.code = code;
            this.diagnostics.push(diagnostic);
        }
        let unnecessaryDoc = diag.filter(this.IsUnnecessaryDocumentationDiag);
        if ((unnecessaryDoc !== undefined) && (unnecessaryDoc.length > 0)) {
            let msg: string = "";
            let code: string = "";
            unnecessaryDoc.forEach(diag => {
                switch (diag.diagnosticCode) {
                    case ALXmlDocDiagnosticCode.ParameterUnnecessary:
                        diag.element = `parameter '${diag.element}'`;
                    break;
                }
                msg = this.AppendString(msg, diag.element, ", ");
                code = this.AppendString(code, diag.diagnosticCode, ", ");
            });

            let subMsg: string = "";
            if (unnecessaryDoc.length > 1) {
                subMsg = "are";
            } else {
                subMsg = "is";
            }
            msg = `The ${msg} ${subMsg} described in documentation for procedure ${alProcedureState.name} but do not exist.`;

            let diagnostic = new Diagnostic(alProcedureState.position, msg, DiagnosticSeverity.Warning);
            diagnostic.source = ALXmlDocDiagnosticPrefix;
            diagnostic.code = code;
            this.diagnostics.push(diagnostic);
        }
    }

    private IsMissingDocumentationDiag(element: { diagnosticCode: ALXmlDocDiagnosticCode; }, index: any, array: any) {
        return (
            (element.diagnosticCode === ALXmlDocDiagnosticCode.XmlDocumentationMissing) || 
            (element.diagnosticCode === ALXmlDocDiagnosticCode.SummaryMissing) ||
            (element.diagnosticCode === ALXmlDocDiagnosticCode.ParameterMissing) || 
            (element.diagnosticCode === ALXmlDocDiagnosticCode.ReturnTypeMissing) || 
            (element.diagnosticCode === ALXmlDocDiagnosticCode.RemarkMissing));
    }

    private IsUnnecessaryDocumentationDiag(element: { diagnosticCode: ALXmlDocDiagnosticCode; }, index: any, array: any) {
        return ((element.diagnosticCode === ALXmlDocDiagnosticCode.ParameterUnnecessary));
    }
    private AppendString(baseString: string, append: string, concatString: string = ""): string {
        if (baseString.includes(append)) {
            return baseString;
        }
        if (baseString !== "") {
            baseString = `${baseString}${concatString}`;
        }
        baseString = `${baseString}${append}`;

        return baseString;
    }

    private GetDiagnosticCode(code: ALXmlDocDiagnosticCode): string {
        return code.toString();
    }

    private UpdateDiagnostics() {
        if (this.diagnostics === []) {
            this.diagnosticsCollection.clear();
        }
        
        this.diagnosticsCollection.set(this.document.uri, this.diagnostics);
    }

    public dispose() {
    }
}