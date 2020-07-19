import { languages, workspace, Range, Diagnostic, DiagnosticCollection, TextDocument } from "vscode";
import { DiagnosticSeverity } from "vscode-languageclient";
import { ALSyntaxUtil } from "./ALSyntaxUtil";
import { ALDocCommentUtil } from "./ALDocCommentUtil";
import { ALXmlDocDiagnosticCode, ALXmlDocDiagnosticPrefix } from "../types";

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
        if (!workspace.getConfiguration("bdev-al-xml-doc").checkProcedureDocumentation) {
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

        let warningMessage: string = "";
        let warningCodes: string = "";     
        let documented = true;

        if (alProcedureState.documentation === "") {
            documented = false;
            warningMessage = `The procedure ${alProcedureState.name} missing documentation.`;  
            warningCodes = this.GetDiagnosticCode(ALXmlDocDiagnosticCode.XmlDocumentationMissing);
        } else {
            let jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedureState.documentation);
            if ((jsonDocumentation === undefined) || (jsonDocumentation === null)) {
                console.debug(`${this.document.fileName}, ${alProcedureState.name} could not be analyzed. Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues`);
                return;
            }
            if ((!jsonDocumentation.summary) || (jsonDocumentation.summary === "")) {
                documented = false;
                warningMessage = this.AddToStringList(warningMessage, 'Summary');
                warningCodes = this.AddToStringList(warningCodes, this.GetDiagnosticCode(ALXmlDocDiagnosticCode.SummaryMissing));
            }
            if ((!(alProcedureState.definition['Params'] === null) || (alProcedureState.definition['Params'] === undefined)) && (alProcedureState.definition['Params'] !== "")) {
                alProcedureState.definition['Params'].split(';').forEach(paramDefinition => {
                    let paramName = paramDefinition.split(':')[0].trim();
                    if (paramName.match(/\bvar\s/) !== null) {
                        paramName = paramName.substring(paramName.indexOf('var') + 4);
                    }

                    documented = false;
                    if (jsonDocumentation.param !== undefined) {
                        if (jsonDocumentation.param.length !== undefined) {
                            for (let i = 0; i < jsonDocumentation.param.length; i++) {
                                if (jsonDocumentation.param[i].attr.name === paramName) {
                                    if (jsonDocumentation.param[i].value !== "") {
                                        documented = true;
                                    }
                                    break;
                                }
                            }
                        } else {
                            if (jsonDocumentation.param.attr.name === paramName) {
                                if (jsonDocumentation.param.value !== "") {
                                    documented = true;
                                }
                            }
                        }
                    }
                    if (!documented) {                        
                        warningMessage = this.AddToStringList(warningMessage, `Parameter '${paramName}'`);
                        warningCodes = this.AddToStringList(warningCodes, this.GetDiagnosticCode(ALXmlDocDiagnosticCode.ParameterMissing));
                    }
                });
            }
            if (alProcedureState.definition['ReturnType'] !== undefined) {
                if ((!jsonDocumentation.returns) || (jsonDocumentation.returns === "")) {
                    documented = false;
                    warningMessage = this.AddToStringList(warningMessage, 'Return Value');
                    warningCodes = this.AddToStringList(warningCodes, this.GetDiagnosticCode(ALXmlDocDiagnosticCode.ReturnTypeMissing));
                }
            }

            if (warningMessage !== "") {                
                warningMessage = `The procedure ${alProcedureState.name} is missing documentation for ${warningMessage}.`;
            }
        }

        // if not fully documented add to missing documentations
        if (warningMessage !== "") {
            let diagnostic = new Diagnostic(alProcedureState.position, warningMessage, DiagnosticSeverity.Warning);
            diagnostic.source = ALXmlDocDiagnosticPrefix;
            diagnostic.code = warningCodes;
            this.diagnostics.push(diagnostic);
        }    
    }

    private AddToStringList(baseString: string, append: string): string {
        if (baseString !== "") {
            baseString = `${baseString}, `;
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