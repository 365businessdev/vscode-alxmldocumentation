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
        if (!Configuration.CheckProcedureDocumentationIsEnabled()) {
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

        let missingDocMessage: string = "";
        let missingDocCode: string = "";     
        let unnecessaryDocMessage: string = "";
        let unnecessaryDocCode: string = "";     
        let documented = true;

        if (alProcedureState.documentation === "") {
            documented = false;
            missingDocMessage = `The procedure ${alProcedureState.name} missing documentation.`;  
            missingDocCode = this.GetDiagnosticCode(ALXmlDocDiagnosticCode.XmlDocumentationMissing);
        } else {
            let jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedureState.documentation);
            if ((jsonDocumentation === undefined) || (jsonDocumentation === null)) {
                console.debug(`${this.document.fileName}, ${alProcedureState.name} could not be analyzed. Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues`);
                return;
            }
            if ((!jsonDocumentation.summary) || (jsonDocumentation.summary === "")) {
                documented = false;
                missingDocMessage = this.AddToStringList(missingDocMessage, 'summary');
                missingDocCode = this.AddToStringList(missingDocCode, this.GetDiagnosticCode(ALXmlDocDiagnosticCode.SummaryMissing));
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
                        missingDocMessage = this.AddToStringList(missingDocMessage, `parameter '${paramName}'`);
                        missingDocCode = this.AddToStringList(missingDocCode, this.GetDiagnosticCode(ALXmlDocDiagnosticCode.ParameterMissing));
                    }
                });
            }

            if (jsonDocumentation.param !== undefined) {
                if (jsonDocumentation.param.length !== undefined) {
                    jsonDocumentation.param.forEach((param: { attr: { name: string; }; }) => {
                        unnecessaryDocMessage = this.AddToStringList(unnecessaryDocMessage, `parameter '${param.attr.name}'`);
                        unnecessaryDocCode = this.AddToStringList(unnecessaryDocCode, this.GetDiagnosticCode(ALXmlDocDiagnosticCode.ParameterUnnecessary));                    
                    });
                } else {
                    unnecessaryDocMessage = this.AddToStringList(unnecessaryDocMessage, `parameter '${jsonDocumentation.param.attr.name}'`);
                    unnecessaryDocCode = this.AddToStringList(unnecessaryDocCode, this.GetDiagnosticCode(ALXmlDocDiagnosticCode.ParameterUnnecessary));
                }
            }

            if (alProcedureState.definition['ReturnType'] !== undefined) {
                if ((!jsonDocumentation.returns) || (jsonDocumentation.returns === "")) {
                    documented = false;
                    missingDocMessage = this.AddToStringList(missingDocMessage, 'return value');
                    missingDocCode = this.AddToStringList(missingDocCode, this.GetDiagnosticCode(ALXmlDocDiagnosticCode.ReturnTypeMissing));
                }
            }

            if (missingDocMessage !== "") {                
                missingDocMessage = `The procedure ${alProcedureState.name} is missing documentation for ${missingDocMessage}.`;
            }
            if (unnecessaryDocMessage !== "") {                
                unnecessaryDocMessage = `The ${unnecessaryDocMessage} are described in documentation for procedure ${alProcedureState.name} but do not exist.`;
            }
        }

        // if not fully documented add to missing documentations
        if (missingDocMessage !== "") {
            let diagnostic = new Diagnostic(alProcedureState.position, missingDocMessage, DiagnosticSeverity.Warning);
            diagnostic.source = ALXmlDocDiagnosticPrefix;
            diagnostic.code = missingDocCode;
            this.diagnostics.push(diagnostic);
        }    
        if (unnecessaryDocMessage !== "") {
            let diagnostic = new Diagnostic(alProcedureState.position, unnecessaryDocMessage, DiagnosticSeverity.Warning);
            diagnostic.source = ALXmlDocDiagnosticPrefix;
            diagnostic.code = unnecessaryDocCode;
            this.diagnostics.push(diagnostic);
        }
    }

    private AddToStringList(baseString: string, append: string): string {
        if (baseString.includes(append)) {
            return baseString;
        }
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