import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, languages, Range, TextDocument } from 'vscode';
import { ALXmlDocDiagnosticCode, ALXmlDocDiagnosticPrefix } from '../types';
import { ALObject } from '../types/ALObject';
import { ALObjectType } from '../types/ALObjectType';
import { ALProcedure } from '../types/ALProcedure';
import { XMLDocumentationExistType } from '../types/XMLDocumentationExistType';
import { ALSyntaxUtil } from './ALSyntaxUtil';
import { Configuration } from './Configuration';
import { StringUtil } from './StringUtil';
import * as fs from 'fs';

export class ALCheckDocumentation {
    /**
     * Collection to store all gathered diagnostics.
     */
    private static diagCollection: DiagnosticCollection = languages.createDiagnosticCollection(ALXmlDocDiagnosticPrefix);
    
    /**
     * Gathered diagnostics.
     */
    private static diags: Diagnostic[] = [];

    /**
     * Actual AL Source Code file.
     */
    private static document: any;

    /**
     * AL Object.
     */
    private static alObject: ALObject | null = null;

    /**
     * Check documentation for passed TextDocument.
     * @param document {TextDocument}
     */
    public static CheckDocumentationForDocument(document: TextDocument) {
        this.document = document;

        this.CheckDocumentation();
    }

    /**
     * Check documentation for passed AL Object.
     * @param alObject {ALObject}
     */
    public static CheckDocumentationForALObject(alObject: ALObject) {
        this.document = Object.assign({});
        this.document.getText = () => fs.readFileSync(`${alObject.Path}/${alObject.FileName}`, 'utf8');
        this.document.fileName = `${alObject.Path}/${alObject.FileName}`;
        this.document.uri = alObject.Uri;

        this.alObject = alObject;

        this.CheckDocumentation();
    }

    /**
     * General documentation check procedure.
     */
    private static CheckDocumentation() {
        if (!Configuration.ProcedureDocumentationCheckIsEnabled(this.document.uri)) {
            return;
        }

        this.Initialize();

        if (this.alObject === null) {
            return;
        }
        this.alObject.Procedures?.forEach(alProcedure => {
            this.AnalyzeProcedureDocumentation(this.alObject, alProcedure);
        });
        
        // TODO: Send diagnostics for unnecessary documentations
        
        this.UpdateDiagnosticCollection();
    }

    /**
     * Initialize documentation check and clear previously reported diagnostics.
     */
    private static Initialize() {
        // clear all diagnostics
        this.diags = [];
        this.UpdateDiagnosticCollection();

        if (this.alObject === null) {
            this.alObject = ALSyntaxUtil.GetALObject(this.document);
        }
    }

    /**
     * Analyse documentation of the given procedure.
     * @param alObject {ALObject}
     * @param alProcedure {ALProcedure}
     */
    private static AnalyzeProcedureDocumentation(alObject: ALObject | null, alProcedure: ALProcedure) {
        if (alObject === null) {
            return;
        }

        let diag: { 
            type: DiagnosticSeverity, 
            diagnosticCode: ALXmlDocDiagnosticCode,
            element: string,
            range: Range | undefined
        }[] = [];

        if (alProcedure.XmlDocumentation.Exists !== XMLDocumentationExistType.Inherit) {
            if (alProcedure.XmlDocumentation.Exists === XMLDocumentationExistType.No) {
                diag.push({
                    type: DiagnosticSeverity.Warning,
                    diagnosticCode: ALXmlDocDiagnosticCode.SummaryMissing,
                    element: 'summary',
                    range: alProcedure.Range
                });
            }

            alProcedure.Parameters?.forEach(alParameter => {
                if (alParameter.XmlDocumentation.Exists === XMLDocumentationExistType.No) {
                    diag.push({
                        type: DiagnosticSeverity.Warning,
                        diagnosticCode: ALXmlDocDiagnosticCode.ParameterMissing,
                        element: `${alParameter.Name}`,
                        range: alProcedure.Range
                    });
                }
            });

            if (alProcedure.Return?.XmlDocumentation.Exists === XMLDocumentationExistType.No) {
                diag.push({
                    type: DiagnosticSeverity.Warning,
                    diagnosticCode: ALXmlDocDiagnosticCode.ReturnTypeMissing,
                    element: `${((alProcedure.Return.Name !== '') ? ` '${alProcedure.Return.Name}'` : '')}`,
                    range: alProcedure.Range
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
            let msg: string = '';
            let code: string = '';
            if (missingDoc[0].diagnosticCode !== ALXmlDocDiagnosticCode.XmlDocumentationMissing) {
                missingDoc.forEach(diag => {
                    switch (diag.diagnosticCode) {
                        case ALXmlDocDiagnosticCode.ParameterMissing:
                            diag.element = `parameter '${diag.element}'`;
                        break;
                        case ALXmlDocDiagnosticCode.ReturnTypeMissing:
                            diag.element = `return value${(diag.element !== '') ? '\'' + diag.element + '\'' : ''}`;
                        break;
                    }
                    msg = StringUtil.AppendString(msg, diag.element, ', ');
                    code = StringUtil.AppendString(code, this.GetDiagnosticCode(diag.diagnosticCode), ', ');
                });

                msg = `The procedure ${alProcedure.Name} is missing documentation for ${msg}.`;
            } else {
                code = this.GetDiagnosticCode(missingDoc[0].diagnosticCode);
                msg = `The procedure ${alProcedure.Name} missing documentation.`;
            }
            let diagnostic = new Diagnostic(alProcedure.Range!, msg, Configuration.GetProcedureDocumentationCheckInformationLevel(alObject.Uri));
            diagnostic.source = ALXmlDocDiagnosticPrefix;
            diagnostic.code = code;

            this.diags.push(diagnostic);
        }
    }

    /**
     * Returns diagnostics string.
     * @param diagnosticCode {ALXmlDocDiagnosticCode}
     */
    private static GetDiagnosticCode(diagnosticCode: ALXmlDocDiagnosticCode): any {
        return diagnosticCode.toString();
    }

    /**
     * Returns true if actual diagnostic code is representing a missing documentation.
     */
    private static IsMissingDocumentationDiag(element: { diagnosticCode: ALXmlDocDiagnosticCode; }, index: any, array: any) {
        return (
            (element.diagnosticCode === ALXmlDocDiagnosticCode.XmlDocumentationMissing) || 
            (element.diagnosticCode === ALXmlDocDiagnosticCode.SummaryMissing) ||
            (element.diagnosticCode === ALXmlDocDiagnosticCode.ParameterMissing) || 
            (element.diagnosticCode === ALXmlDocDiagnosticCode.ReturnTypeMissing));
    }

    /**
     * Returns true if actual diagnostic code is representing a unnecessary documentation.
     */
    private static IsUnnecessaryDocumentationDiag(element: { diagnosticCode: ALXmlDocDiagnosticCode; }, index: any, array: any) {
        return ((element.diagnosticCode === ALXmlDocDiagnosticCode.ParameterUnnecessary));
    }

    /**
     * Update DiagnosticCollection to present them to the user.
     */
    private static UpdateDiagnosticCollection() {
        if (this.diags === []) {
            this.diagCollection.clear();
            return;
        }
        
        this.diagCollection.set(this.document.uri, this.diags);
    }

}