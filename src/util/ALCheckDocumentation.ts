import { Diagnostic, Range, TextDocument } from 'vscode';
import { ALXmlDocDiagnosticCode, ALXmlDocDiagnosticPrefix } from '../types';
import { ALObject } from '../types/ALObject';
import { ALObjectType } from '../types/ALObjectType';
import { ALProcedure } from '../types/ALProcedure';
import { ALDocumentationExists } from '../types/ALDocumentationExists';
import { ALSyntaxUtil } from './ALSyntaxUtil';
import { ALDocCommentUtil } from './ALDocCommentUtil';
import { Configuration } from './Configuration';
import { StringUtil } from './string/StringUtil';
import { ALProcedureType } from '../types/ALProcedureType';
import { ALCodeunitType } from '../types/ALCodeunitType';
import { ALDiagnosticCollection } from './ALDiagnosticCollection';

export class ALCheckDocumentation {    
    /**
     * Gathered diagnostics.
     */
    private diags: Diagnostic[] = [];

    /**
     * Actual AL Source Code file.
     */
    private document: any;

    /**
     * AL Object.
     */
    private alObject: ALObject;

    public constructor(document: TextDocument, alObject: ALObject) {
        this.document = document;
        this.alObject = alObject;
        
        // clear all diagnostics
        this.diags = [];
        this.UpdateDiagnosticCollection();
    }

    /**
     * General documentation check procedure.
     */
    public CheckDocumentation() {
        
        if ((!Configuration.ProcedureDocumentationCheckIsEnabled(this.document.uri)) && (!Configuration.ObjectDocumentationCheckIsEnabled(this.document.uri))) {
            return;
        }        

        if ((this.alObject === null) || (this.alObject.Uri?.scheme === 'al-preview')) {
            return;
        }

        if (Configuration.ObjectDocumentationCheckIsEnabled(this.document.uri)) {
            this.AnalyzeObjectDocumentation(this.alObject);
        }

        // do not check any kind of procedures in 'Test' codeunits.
        if ((this.alObject.Subtype === ALCodeunitType.Test) && (!Configuration.IsDocumentationMandatoryForTest())) {
            return;
        }

        if (Configuration.ProcedureDocumentationCheckIsEnabled(this.document.uri)) {
            this.alObject.Procedures?.forEach(alProcedure => {
                this.AnalyzeProcedureDocumentation(this.alObject, alProcedure);
            });
            
            this.AnalyzeUnnecessaryDocumentation(this.alObject, this.document);
        }
        
        this.UpdateDiagnosticCollection();
    }
    
    /**
     * Analyze source code for unnecessary XML documentations.
     * @param alObject ALObject
     * @param document TextDocument
     */
    private AnalyzeUnnecessaryDocumentation(alObject: ALObject | null, document: TextDocument) {
        if (alObject === null) {
            return;
        }
        let i = 0;
        try {
            let codeLines: string[] = ALSyntaxUtil.SplitALCodeToLines(document.getText());
            let documentation: string ='';
            for(i = 0; i < codeLines.length; i++) {
                let line: string = codeLines[i];
                if (!line.trim().startsWith('///')) {
                    if (ALSyntaxUtil.IsObjectDefinition(line)) {
                        documentation = '';
                        continue;
                    } else {
                        if (documentation !== '') {
                            let alProcedure: ALProcedure | undefined = alObject.Procedures?.find(alProcedure => (i <= alProcedure.LineNo));
                            if (alProcedure === undefined) {
                                console.debug(`Could not find AL Procedure for XML documentation found in ${alObject.FileName} line ${i}.`);
                                continue;
                            }
                            this.GetUnnecessaryProcedureDocumentationDiagnostics(codeLines, i, documentation, alObject, alProcedure);
                        }
                        documentation = '';
                        continue;
                    }
                }

                documentation += line.trim().replace('///','');
            }
        } catch (ex) {
            console.debug(`An error occurred in ${alObject.FileName} during analyze unnecessary documentations.\r\n${ex}`);
        }
    }

    /**
     * Analyze procedure for unnecessary XML documentations.
     * @param codeLines AL Source Code.
     * @param currentLineNo Actual line no. in AL Source Code.
     * @param documentation Captured XML documentation.
     * @param alObject ALObject
     * @param alProcedure ALProcedure
     */
    private GetUnnecessaryProcedureDocumentationDiagnostics(codeLines: string[], currentLineNo: number, documentation: string, alObject: ALObject, alProcedure: ALProcedure) {
        // convert to JSON to make it more accessible 
        let jsonDocumentation = ALDocCommentUtil.GetJsonFromALDocumentation(documentation);
        if (!jsonDocumentation.param) {
            return;
        }

        let unnecessaryParameters: Array<string> = [];

        if (jsonDocumentation.param.length) { // multiple parameters
            for (let i = 0; i < jsonDocumentation.param.length; i++) {
                this.GetUnnecessaryParameterDocumentationDiagnostics(unnecessaryParameters, jsonDocumentation.param[i], alProcedure);
            }
        } else { // one parameter
            this.GetUnnecessaryParameterDocumentationDiagnostics(unnecessaryParameters, jsonDocumentation.param, alProcedure);
        }

        if (unnecessaryParameters.length !== 0) {
            let message = '';
            unnecessaryParameters.forEach(parameter => {
                message = StringUtil.AppendString(message, `'${parameter}'`, ', ');

                let paramRange: Range = alProcedure.Range!;
                for (let i = currentLineNo; i >= 0; i--) {
                    if (codeLines[i].indexOf(`/// <param name="${parameter}">`) !== -1) {
                        paramRange = ALSyntaxUtil.GetRange(codeLines.join('\r\n'), i);
                        break;
                    }
                }

                message = `Parameter '${parameter}' is described in XML documentation for procedure ${alProcedure.Name}, but do not exist in procedure signature.`;
                let diagnostic = new Diagnostic(paramRange,
                    message, 
                    Configuration.GetProcedureDocumentationCheckInformationLevel(alObject.Uri));
                diagnostic.source = ALXmlDocDiagnosticPrefix;
                diagnostic.code = this.GetDiagnosticCode(ALXmlDocDiagnosticCode.ParameterUnnecessary);
    
                this.diags.push(diagnostic);
            });
        }
    }

    /**
     * Search for documented parameter in ALProcedure and add to array if unnecessary.
     * @param unnecessaryParameters Array<string> to collect unnecessary parameters.
     * @param param Documented parameter
     * @param alProcedure ALProcedure
     */
    private GetUnnecessaryParameterDocumentationDiagnostics(unnecessaryParameters: Array<string>, param: { value: string, attr: { name: string }}, alProcedure: ALProcedure) {
        if (!param) {
            return;
        }
        
        if (alProcedure.Parameters.find(alParameter => (alParameter.Name === param.attr.name)) === undefined) {
            unnecessaryParameters.push(param.attr.name);
        }
    }

    /**
     * Analyse documentation of the given procedure.
     * @param alObject {ALObject}
     * @param alProcedure {ALProcedure}
     */
    private AnalyzeProcedureDocumentation(alObject: ALObject | null, alProcedure: ALProcedure) {
        if (alObject === null) {
            return;
        }

        if (!Configuration.IsProcedureDocumentationMandatory(alObject, alProcedure.Type, alProcedure.Subtype, alProcedure.Access, alObject.Uri)) {
            return;
        }

        let diag: { 
            diagnosticCode: ALXmlDocDiagnosticCode,
            element: string
        }[] = [];

        if (this.IsMissingDocumentation(alProcedure)) {
            let diagnostic = new Diagnostic(alProcedure.Range!, 
                `XML documentation is expected for ${ALProcedureType[alProcedure.Type]} ${alProcedure.Name}.`, 
                Configuration.GetProcedureDocumentationCheckInformationLevel(alObject.Uri));
            diagnostic.source = ALXmlDocDiagnosticPrefix;
            diagnostic.code = ALXmlDocDiagnosticCode.DocumentationMissing;

            this.diags.push(diagnostic);
            return;
        }

        if (alProcedure.ALDocumentation.Exists !== ALDocumentationExists.Inherit) {
            if (alProcedure.ALDocumentation.Exists === ALDocumentationExists.No) {
                let diagnostic = new Diagnostic(alProcedure.Range!, 
                    `Summary is expected in XML documentation for ${ALProcedureType[alProcedure.Type]} ${alProcedure.Name}.`, 
                    Configuration.GetProcedureDocumentationCheckInformationLevel(alObject.Uri));
                diagnostic.source = ALXmlDocDiagnosticPrefix;
                diagnostic.code = ALXmlDocDiagnosticCode.SummaryMissing;

                this.diags.push(diagnostic);
            }

            alProcedure.Parameters?.forEach(alParameter => {
                if (alParameter.ALDocumentation.Exists === ALDocumentationExists.No) {
                    diag.push({
                        diagnosticCode: ALXmlDocDiagnosticCode.ParameterMissing,
                        element: alParameter.Name!
                    });
                }
            });

            if (alProcedure.Return?.ALDocumentation.Exists === ALDocumentationExists.No) {
                diag.push({
                    diagnosticCode: ALXmlDocDiagnosticCode.ReturnTypeMissing,
                    element: `${((alProcedure.Return.Name !== '') ? alProcedure.Return.Name : '')}`
                });
            }
        } else {
            if ((alObject === null) || (alObject.ExtensionObject === undefined)) {
                return;
            }
            let inheritALObject: ALObject | null = ALSyntaxUtil.GetALObjectFromCache(ALObjectType.Interface, alObject.ExtensionObject);
            if (inheritALObject === null) {
                return;
            }
            let inheritALProcedure: ALProcedure | undefined = inheritALObject.Procedures?.find(inheritALProcedure => (inheritALProcedure.Name === alProcedure.Name));
            if (inheritALProcedure !== undefined) {
                this.AnalyzeProcedureDocumentation(inheritALObject, inheritALProcedure);
            }
        }       

        let missingDoc = diag.filter(this.IsMissingDocumentationDiag);
        if ((missingDoc !== undefined) && (missingDoc.length > 0)) {
            let message: string = '';
            let code: string = '';
            if (missingDoc[0].diagnosticCode !== ALXmlDocDiagnosticCode.DocumentationMissing) {
                missingDoc.forEach(diag => {
                    switch (diag.diagnosticCode) {
                        case ALXmlDocDiagnosticCode.ParameterMissing:
                            diag.element = `Parameter '${diag.element}'`;
                        break;
                        case ALXmlDocDiagnosticCode.ReturnTypeMissing:
                            diag.element = `Return value${(diag.element !== '') ? ' \'' + diag.element + '\'' : ''}`;
                        break;
                    }
                    message = StringUtil.AppendString(message, diag.element, ', ');
                    code = StringUtil.AppendString(code, this.GetDiagnosticCode(diag.diagnosticCode), ', ');
                });
                let isAre = 'is';
                if (missingDoc.length > 1) {
                    isAre = 'are';
                }
                message = `${message} ${isAre} defined in signature for ${ALProcedureType[alProcedure.Type]} ${alProcedure.Name}, but ${isAre} not documented.`;
            } else {
                code = this.GetDiagnosticCode(missingDoc[0].diagnosticCode);
                message = `The ${ALProcedureType[alProcedure.Type]} ${alProcedure.Name} is missing XML documentation.`;
            }
            let diagnostic = new Diagnostic(alProcedure.Range!, 
                message, 
                Configuration.GetProcedureDocumentationCheckInformationLevel(alObject.Uri));
            diagnostic.source = ALXmlDocDiagnosticPrefix;
            diagnostic.code = code;

            this.diags.push(diagnostic);
        }
    }
    
    /**
     * Analyse documentation of the given object.
     * @param alObject 
     */
    private AnalyzeObjectDocumentation(alObject: ALObject) {
        if (alObject === null) {
            return;
        }

        if (!Configuration.IsDocumentationMandatoryForAccessLevel(alObject.Access)) {
            return;
        }
        
        if (alObject.ALDocumentation.Exists === ALDocumentationExists.No) {            
            let diagnostic = new Diagnostic(alObject.Range!, 
                `XML documentation is expected for Object ${alObject.Name}.`, 
                Configuration.GetObjectDocumentationCheckInformationLevel(alObject.Uri));
            diagnostic.source = ALXmlDocDiagnosticPrefix;
            diagnostic.code = ALXmlDocDiagnosticCode.ObjectDocumentationMissing;

            this.diags.push(diagnostic);
        }
    }

    /**
     * Checks whether any XML documentation is present for AL Procedure or not.
     * @param alProcedure ALProcedure to search for any XML documentation present
     */
    private IsMissingDocumentation(alProcedure: ALProcedure): boolean {
        return (alProcedure.ALDocumentation.Exists === ALDocumentationExists.No) && 
            ((alProcedure.Return === undefined) || (alProcedure.Return?.ALDocumentation.Exists === ALDocumentationExists.No)) && 
            (alProcedure.Parameters?.find(alProcedure => (alProcedure.ALDocumentation.Exists === ALDocumentationExists.Yes)) === undefined);
    }

    /**
     * Returns diagnostics string.
     * @param diagnosticCode {ALXmlDocDiagnosticCode}
     */
    private GetDiagnosticCode(diagnosticCode: ALXmlDocDiagnosticCode): any {
        return diagnosticCode.toString();
    }

    /**
     * Returns true if actual diagnostic code is representing a missing documentation.
     */
    private IsMissingDocumentationDiag(element: { diagnosticCode: ALXmlDocDiagnosticCode; }, index: any, array: any) {
        return (
            (element.diagnosticCode === ALXmlDocDiagnosticCode.DocumentationMissing) || 
            (element.diagnosticCode === ALXmlDocDiagnosticCode.SummaryMissing) ||
            (element.diagnosticCode === ALXmlDocDiagnosticCode.ParameterMissing) || 
            (element.diagnosticCode === ALXmlDocDiagnosticCode.ReturnTypeMissing));
    }

    /**
     * Returns true if actual diagnostic code is representing a unnecessary documentation.
     */
    private IsUnnecessaryDocumentationDiag(element: { diagnosticCode: ALXmlDocDiagnosticCode; }, index: any, array: any) {
        return ((element.diagnosticCode === ALXmlDocDiagnosticCode.ParameterUnnecessary));
    }

    /**
     * Update DiagnosticCollection to present them to the user.
     */
    private UpdateDiagnosticCollection() {
        if (this.diags === []) {
            ALDiagnosticCollection.Diagnostics.clear();
            return;
        }
        
        ALDiagnosticCollection.Diagnostics.set(this.document.uri, this.diags);
    }

}