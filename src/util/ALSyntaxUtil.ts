import { TextDocument } from "vscode";
import { ALAccessLevel, ALObjectType, ALCodeunitType, ALObsoleteState, ALProcedureType, ALProcedureSubtype, ALXmlDocDiagnosticCode, ALXmlDocDiagnosticMessage, ALObjectExtensionType } from "../types";
import { FindALProceduresRegEx, ALProcedureDefinitionRegEx, FindALObjectRegEx, FindBeginEndKeywordRegEx } from "./ALRegEx";
import { ALObject } from "../al-types/ALObject";
import { ALProcedure } from "../al-types/ALProcedure";
import { ALParameter } from "../al-types/ALParameter";
import { ALDocCommentUtil } from "./ALDocCommentUtil";
import { performance } from "perf_hooks";
import { ALProcedureReturn } from "../al-types/ALProcedureReturn";

export class ALSyntaxUtil {

    /**
     * Get ALObject from currently loaded text document object.
     * @param document TextDocument to be analyzed.
     */
    public static GetObject(document: TextDocument): ALObject|null {
        let t0 = performance.now();
        let alObject: ALObject = new ALObject();

        try {            
            // get AL file properties
            alObject.FileName = document.fileName.replace(/^.*[\\\/]/, "");
            alObject.Path = document.fileName.replace(alObject.FileName, "");

            // get AL object definition
            let alObjectDefinition = document.getText().match(FindALObjectRegEx);
            if ((alObjectDefinition?.groups === null) || (alObjectDefinition?.groups === undefined)) {
                console.error(`Fatal error: Could not analyze ${alObject.FileName}. Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues.`);
                return null;
            }
            alObject.Type = this.SelectALObjectType(alObjectDefinition.groups["ObjectType"]);
            if (!((alObjectDefinition.groups["ObjectID"] === null) || (alObjectDefinition.groups["ObjectID"] === undefined))) {
                alObject.ID = parseInt(alObjectDefinition.groups["ObjectID"]);
            }
            alObject.Name = alObjectDefinition.groups["ObjectName"];

            if (!((alObjectDefinition.groups['ExtensionType'] === null) || (alObjectDefinition.groups['ExtensionType'] === undefined))) {
                switch (alObjectDefinition.groups['ExtensionType']) {
                    case "extends":
                        alObject.ExtensionType = ALObjectExtensionType.Extend;
                        break;
                    case "implements":
                        alObject.ExtensionType = ALObjectExtensionType.Implement;
                        break;
                }
                alObject.ExtensionObject = alObjectDefinition.groups['ExtensionObject'].trim();
            }

            // get AL object properties
            this.GetALObjectProperties(alObject, document.getText());

            // get AL procedures
            this.GetALObjectProcedures(alObject, document.getText());

            // get XML Documentation
            ALDocCommentUtil.GenerateObjectDocString(alObject);

            console.debug(alObject);
            
            let t1 = performance.now();
            console.debug("Processing time for object " + alObject.Name + ": " + Math.round((t1 - t0) * 100 / 100) + "ms.");

            return alObject;   
        }
        catch (ex)
        {
            console.error(`${ex} Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues.`);
            return null;
        }
    }

    /**
     * Retrieve AL procedures from AL source code.
     * @param alObject ALObject object.
     * @param code AL Source Code.
     */
    private static GetALObjectProcedures(alObject: ALObject, code: string) {
        try
        {
            let alProcedures: Array<ALProcedure> = [];

            code.match(FindALProceduresRegEx)?.forEach(match => {
                alProcedures.push(
                    this.GetALObjectProcedureDefinition(code, match)    
                );
            });

            alObject.Procedures = alProcedures;
        }
        catch (ex)
        {
            console.error(`Unable to retrieve procedures from object ${alObject.Name}. Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues.`);
            console.error(ex);
        }
    }

    /**
     * Get procedure definition from AL source code.
     * @param code AL Source Code.
     * @param procedureName AL procedure name.
     */
    private static GetALObjectProcedureDefinition(code: string, procedureName: string): ALProcedure {
        let alProcedure = new ALProcedure();

        alProcedure.Name = procedureName;
        alProcedure.LineNo = this.GetALObjectProcedureLineNo(code, procedureName);

        let alProcedureDefinition = procedureName.match(ALProcedureDefinitionRegEx)?.groups;
        if ((alProcedureDefinition === undefined) || (alProcedureDefinition === null)) {
            console.debug(`Failed to get procedure definition for ${alProcedure.Name}.`);
        } else {
            alProcedure.Name = alProcedureDefinition["ProcedureName"];
            alProcedure.Access = this.GetALProcedureAccessLevel(alProcedureDefinition['Access']);
            // get procedure type from procedure definition
            switch (alProcedureDefinition["Type"].toLowerCase()) {
                case "trigger":
                    alProcedure.Type = ALProcedureType.Trigger;
                    break;
                case "procedure":
                    alProcedure.Type = ALProcedureType.Procedure;
                    break;
            }
            // get parameters from procedure definition
            if (alProcedureDefinition["Params"] !== undefined) {
                let alProcedureParams: Array<string> = [];
                if (alProcedureDefinition["Params"].indexOf(";") === -1) { // only one parameter
                    alProcedureParams.push(alProcedureDefinition["Params"]);
                } else { // multiple parameters
                    alProcedureDefinition["Params"].split(";").forEach(param => {
                        alProcedureParams.push(param);
                    });
                }

                alProcedureParams.forEach(param => {
                    let alParameter: ALParameter = new ALParameter();
                    alParameter.CallByReference = (param.split(":")[0].match(/\bvar\s/) !== null);
                    alParameter.Name = param.split(":")[0].trim();
                    // remove var prefix for call-by-reference parameter
                    if (alParameter.CallByReference) {
                        alParameter.Name = alParameter.Name.substr(4).trim();
                    }
                    if (param.indexOf(":") !== -1) {
                        if (param.split(":")[1].trim().indexOf(" ") === -1) {
                            alParameter.Type = param.split(":")[1].trim();
                        } else {
                            alParameter.Type = param.split(":")[1].trim().split(" ")[0];
                            // TODO: Find a smarter solution
                            alParameter.Subtype = "";
                            for (let i = 1; i <= param.split(":")[1].trim().split(" ").length - 1; i++) {
                                alParameter.Subtype = `${alParameter.Subtype} ${param.split(":")[1].trim().split(" ")[i]}`;
                            }
                            alParameter.Subtype = alParameter.Subtype.trim();
                            if ((alParameter.Type === "Record") && (alParameter.Subtype.trim().match(/\btemporary\b/) !== null)) {
                                alParameter.Temporary = true;
                                alParameter.Subtype = alParameter.Subtype.replace(/\btemporary\b/,"").trim();
                            }
                        }
                        ALDocCommentUtil.GenerateParameterDocString(alParameter);
                        alProcedure.Parameters.push(alParameter);
                    }
                });
            }
            // get return type from procedure definition
            if ((alProcedureDefinition["ReturnType"] !== undefined) && (alProcedureDefinition["ReturnType"].trim() !== "")) {
                let alReturn: ALProcedureReturn = new ALProcedureReturn();
                if (alProcedureDefinition["ReturnType"].indexOf(":") === -1) {
                    alReturn.Type = alProcedureDefinition["ReturnType"].trim();
                } else {
                    alReturn.Name = alProcedureDefinition["ReturnType"].split(":")[0].trim();
                    alReturn.Type = alProcedureDefinition["ReturnType"].split(":")[1].trim();
                }     
                if (alReturn.Type[alReturn.Type.length - 1] === "/") {
                    alReturn.Type = alReturn.Type.substring(0, alReturn.Type.length - 2).trim();
                }
                if (alReturn.Type === "") {
                    alProcedure.Return = undefined;
                }
                ALDocCommentUtil.GenerateProcedureReturnDocString(alReturn);
                alProcedure.Return = alReturn;
            }
        }
        this.GetALProcedureProperties(alProcedure, code);
        ALDocCommentUtil.GenerateProcedureDocString(alProcedure);

        return alProcedure;
    }

    /**
     * Analyze code lines prior to AL procedure declaration to get AL procedure properties.
     * @param alProcedure ALProcedure object.
     * @param code AL Source Code.
     */
    private static GetALProcedureProperties(alProcedure: ALProcedure, code: string) {
        if ((alProcedure.Name === "") || (alProcedure.LineNo === 0)) {
            return;
        }

        let codeLines = this.SplitALCodeToLines(code);
        for (let lineNo: number = alProcedure.LineNo; lineNo >= 0; lineNo--) {
            if (this.IsBeginEnd(codeLines[lineNo])) {
                return;
            }
            // get TableNo property for OnRun trigger
            if ((alProcedure.Type === ALProcedureType.Trigger) && (alProcedure.Name === "OnRun")) {                
                let tableNoSubtype = codeLines[lineNo].match(/(?<!\/\/.*).*?TableNo\s\=(?<Subtype>.*)\;/);
                if ((tableNoSubtype !== null) && (tableNoSubtype !== undefined) && (tableNoSubtype.groups !== undefined)) {
                    
                    let alParameter = new ALParameter();
                    alParameter.Name = "Rec";
                    alParameter.Type = "Record";
                    alParameter.Subtype = tableNoSubtype.groups['Subtype'].trim();

                    ALDocCommentUtil.GenerateParameterDocString(alParameter);
                    alProcedure.Parameters.push(alParameter);  
                }
            }

            // check for TryFunction Property
            if (codeLines[lineNo].match(/(?<!\/\/.*).*?\[TryFunction\]/) !== null) {
                alProcedure.TryFunction = true;
            }
            // check for EventSubscriber Subtype
            if (codeLines[lineNo].match(/(?<!\/\/.*).*?\[EventSubscriber\(.*\]/) !== null) {
                this.SetALProcedureSubtype(alProcedure, ALProcedureSubtype.EventSubscriber);
            }
            // check for EventPublisher Subtype
            if (codeLines[lineNo].match(/(?<!\/\/.*).*?\[IntegrationEvent\(.*\]/) !== null) {
                this.SetALProcedureSubtype(alProcedure, ALProcedureSubtype.EventPublisher);
            }
            if (codeLines[lineNo].match(/(?<!\/\/.*).*?\[BusinessEvent\(.*\]/) !== null) {
                this.SetALProcedureSubtype(alProcedure, ALProcedureSubtype.EventPublisher);
            }
            // check for Test Subtype
            if (codeLines[lineNo].match(/(?<!\/\/.*).*?\[Test\(.*\]/) !== null) {
                this.SetALProcedureSubtype(alProcedure, ALProcedureSubtype.Test);
            }
            // check for ObsoleteState
            let obsoleteReason = codeLines[lineNo].match(/(?<!\/\/.*).*?\[Obsolete\((?<ObsoleteReason>.*)\)\]/);
            if ((obsoleteReason !== null) && (obsoleteReason !== undefined) && (obsoleteReason.groups !== undefined)) {
                alProcedure.ObsoleteState = ALObsoleteState.Pending;
                alProcedure.ObsoleteReason = obsoleteReason.groups['ObsoleteReason'];
            }
        }
    }

    /**
     * Set ALProcedureSubtype in ALProcedure object.
     * @param alProcedure ALProcedure object.
     * @param subtype ALProcedureSubtype object to be assigned.
     */
    private static SetALProcedureSubtype(alProcedure: ALProcedure, subtype: ALProcedureSubtype) {
        if (alProcedure.Subtype !== ALProcedureSubtype.Normal) {
            console.debug(`WARNING: Procedure ${alProcedure.Name} has already been assigned to ${alProcedure.Subtype}, but now ${subtype} subtype has been found.`);
        }
        alProcedure.Subtype = ALProcedureSubtype.EventPublisher;
    }

    /**
     * Get Access Modifier from AL procedure.
     * @param code AL Source Code.
     */
    private static GetALProcedureAccessLevel(accessLevel: string | undefined): ALAccessLevel {
        try {
            if (accessLevel === undefined) {
                return ALAccessLevel.Public;
            }

            switch(accessLevel.trim().toLowerCase()) {
                case "internal":
                    return ALAccessLevel.Internal;
                case "local":
                    return ALAccessLevel.Local;
                case "protected":
                    return ALAccessLevel.Protected;
                default:
                    throw new Error(`Unexpected Access Modifier ${accessLevel}.`);
            }
        }
        catch (ex)
        {
            console.debug(`[GetALProcedureAccessLevel] - ${ex}`);
            return ALAccessLevel.Public;
        }
    }

    /**
     * Get line number of the AL procedure.
     * @param code AL Source Code.
     * @param procedureName Name of the AL procedure.
     */
    private static GetALObjectProcedureLineNo(code: string, procedureName: string): number {        
        let pos: number = -1;

        code = code.substring(0, code.indexOf(procedureName));
        let newLinesInCode: RegExpMatchArray | null = code.match(/\n/g); // count occurance of newline char
        if (newLinesInCode === null) {
            pos = 0;
        } else {
            pos = newLinesInCode.length;
        }

        return pos;
    }

    /**
     * Retrieve AL Object properties.
     * @param alObject ALObject object.
     * @param code AL Source Code.
     */
    private static GetALObjectProperties(alObject: ALObject, code: string) {
        alObject.Access = this.GetALObjectAccessLevel(code);
        alObject.Subtype = this.GetALObjectSubtype(code);
        alObject.ObsoleteState = this.GetALObjectObsoleteState(code);
        alObject.ObsoleteReason = this.GetALObjectObsoleteReason(code);
    }

    /**
     * Retrieve AL Object ObsoleteReason Property from Source Code.
     * @param code AL Source Code.
     */
    private static GetALObjectObsoleteReason(code: string): string {
        let obsoleteReason = code.match(/ObsoleteReason = (.*);/m);
        try 
        {
            if ((obsoleteReason === null) || (obsoleteReason[1] === undefined)) {
                return "";
            }
            return obsoleteReason[1];
        }
        catch(ex)
        {
            console.debug(`[GetALObjectObsoleteReason] - ${ex}`);
            return "";
        }
    }

    /**
     * Retrieve AL Object ObsoleteState Property from Source Code.
     * @param code AL Source Code.
     */
    private static GetALObjectObsoleteState(code: string): ALObsoleteState {
        let obsoleteState = code.match(/ObsoleteState = (.*);/m);
        try 
        {
            if ((obsoleteState === null) || (obsoleteState[1] === undefined)) {
                return ALObsoleteState.No;
            }
            
            switch(obsoleteState[1].toLowerCase()) {
                case "no":
                    return ALObsoleteState.No;
                case "pending":
                    return ALObsoleteState.Pending;
                default:
                    throw new Error(`Unexpected ObsoleteState: ${obsoleteState[1]}.`);
            }
        }
        catch(ex)
        {
            console.debug(`[GetALObjectObsoleteState] - ${ex}`);
            return ALObsoleteState.No;
        }
    }

    /**
     * Retrieve AL Object Subtype Property from Source Code.
     * @param code AL Source Code.
     */
    private static GetALObjectSubtype(code: string): ALCodeunitType {
        let subtype = code.match(/Subtype = (.*);/m);
        try 
        {
            if ((subtype === null) || (subtype[1] === undefined)) {
                return ALCodeunitType.Normal;
            }
            
            switch(subtype[1].toLowerCase()) {
                case "normal":
                    return ALCodeunitType.Normal;
                case "install":
                    return ALCodeunitType.Install;            
                case "upgrade":
                    return ALCodeunitType.Upgrade;
                case "test":
                    return ALCodeunitType.Test;
                case "testrunner":
                    return ALCodeunitType.TestRunner;
                default:
                    throw new Error(`Unexpected Subtype: ${subtype[1]}.`);
            }
        }
        catch(ex)
        {
            console.debug(`[GetALObjectSubtype] - ${ex}`);
            return ALCodeunitType.Normal;
        }
    }

    /**
     * Retrieve AL Object Access Property from Source Code.
     * @param code AL Source Code.
     */
    private static GetALObjectAccessLevel(code: string): ALAccessLevel {
        let accessLevel = code.match(/Access = (.*);/m);
        try 
        {
            if ((accessLevel === null) || (accessLevel[1] === undefined)) {
                return ALAccessLevel.Public;;
            }

            switch(accessLevel[1].toLowerCase()) {
                case "internal":
                    return ALAccessLevel.Internal;
                case "public":
                    return ALAccessLevel.Public;
                default:
                    throw new Error(`Unexpected Access Modifier: ${accessLevel[1]}.`);
            }
        }
        catch(ex)
        {
            console.debug(`[GetALObjectAccessLevel] - ${ex}`);
            return ALAccessLevel.Public;
        }
    }

    /**
     * Select ALObjectType Enum based on given AL Keyword (e.g. tableextension).
     * @param alKeyword AL keyword from source code.
     */
    private static SelectALObjectType(alKeyword: string): ALObjectType {
        switch (alKeyword) {
            case "codeunit":
                return ALObjectType.Codeunit;
            case "table":
                return ALObjectType.Table;
            case "tableextension":
                return ALObjectType.TableExtension;
            case "page": 
                return ALObjectType.Page;
            case "pageextension":
                return ALObjectType.PageExtension;
            case "report":
                return ALObjectType.Report;
            case "query":
                return ALObjectType.Query;
            case "xmlport":
                return ALObjectType.XmlPort;
            case "controladdin":
                return ALObjectType.ControlAddIn;
            case "enum":
                return ALObjectType.Enum;
            case "enumextension":
                return ALObjectType.EnumExtension;
            case "interface":
                return ALObjectType.Interface;
            default:
                console.debug(`Fatal error: Unknown AL object keyword received ${alKeyword}!`);
                return ALObjectType.Unknown;
        }
    }

    /**
     * Split string object, containing AL Source Code, in string array per line.
     * @param code AL Source Code.
     */
    private static SplitALCodeToLines(code: string): Array<string> {
        return code.replace(/\r/g,"").split("\n");
    }

    /**
     * Test current AL Source Code line for containing "begin" or "end;" keyword.
     * @param line AL Source Code line.
     */
    public static IsBeginEnd(line: string): boolean {
        return (line.toLowerCase().match(FindBeginEndKeywordRegEx) !== null);
    }

    /**
     * Get AL Procedure documentation.
     * @param code AL Source Code.
     * @param alProcedure ALProcedure object.
     */
    // private static GetALProcedureDocumentation(code: string, startingLineNo: number): ALDocumentation {
    //     let sourceCodeLines = this.SplitALCodeToLines(code);
    //     let alDocumentation = new ALDocumentation();
    //     for (let lineNo = startingLineNo - 1; lineNo >= 0; lineNo--) {
    //         if (this.IsBeginEnd(sourceCodeLines[lineNo])) {
    //             break;
    //         }
    //         if (sourceCodeLines[lineNo].match(FindALObjectRegEx) !== null) {
    //             break;
    //         }
    //         if (sourceCodeLines[lineNo].match(FindALProceduresRegEx) !== null) {
    //             break;
    //         }
    //         if (sourceCodeLines[lineNo].trim().startsWith("///")) {
    //             alDocumentation.XmlDocumentation = `${sourceCodeLines[lineNo].replace("///","".trim())}\r\n${alDocumentation.XmlDocumentation}`;
    //         }
    //     }
    //     alDocumentation.IsDocumented = (alDocumentation.XmlDocumentation !== "");        

    //     return alDocumentation;
    // }

    // private static CheckALProcedureDocumentation(code: string, alProcedure: ALProcedure) {
    //     alProcedure.ALDocumentation = this.GetALProcedureDocumentation(code, alProcedure.LineNo);
    //     alProcedure.ALDocumentation.SuggestedXmlDocumentation = ALDocCommentUtil.GenerateProcedureDocString(alProcedure, 1);
    //     if (!alProcedure.ALDocumentation.IsDocumented) {
    //         return;
    //     }

    //     // check procedure documentation.
    //     let documentationAsJson = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedure.ALDocumentation.XmlDocumentation);
    //     if ((documentationAsJson === undefined) || (documentationAsJson === null)) {
    //         console.error(`${alProcedure.Name} could not be analyzed. Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues`);
    //         return;
    //     }

    //     // check summary description
    //     if ((!documentationAsJson.summary) || (documentationAsJson.summary === "")) {
    //         alProcedure.ALDocumentation.IsDocumented = false;
    //         alProcedure.ALDocumentation.DocumentationHints.push(
    //             new ALDocumentationHints(
    //                 ALXmlDocDiagnosticCode.SummaryMissing, 
    //                 ALXmlDocDiagnosticMessage.SummaryMissing));
    //     }

    //     alProcedure.Parameters.forEach(function(alParameter: ALParameter, index: number) {
    //         // attach initialized AL Documentation object to AL Procedure.
    //         alParameter.ALDocumentation = ALSyntaxUtil.GetALProcedureDocumentation(code, alProcedure.LineNo);
    //         alParameter.ALDocumentation.SuggestedXmlDocumentation = ALDocCommentUtil.GenerateParameterDocString(alParameter, 1);
    //         alParameter.ALDocumentation.IsDocumented = false;
    //         if (documentationAsJson.param !== undefined) {
    //             if (documentationAsJson.param.length !== undefined) {
    //                 for (let i = 0; i < documentationAsJson.param.length; i++) {
    //                     if (documentationAsJson.param[i].attr.name === alParameter.Name) {
    //                         if (documentationAsJson.param[i].value !== "") {
    //                             alParameter.ALDocumentation.IsDocumented = true;
    //                             documentationAsJson.param.splice(i, 1);
    //                         }
    //                         break;
    //                     }
    //                 }
    //             } else {
    //                 if (documentationAsJson.param.value !== "") {
    //                     alParameter.ALDocumentation.IsDocumented = true;
    //                     documentationAsJson.param = undefined;
    //                 }
    //             }
    //         }            

    //         if (!alParameter.ALDocumentation.IsDocumented) {
    //             alParameter.ALDocumentation.DocumentationHints.push(
    //                     new ALDocumentationHints(
    //                         ALXmlDocDiagnosticCode.ParameterMissing, 
    //                         ALXmlDocDiagnosticMessage.ParameterMissing));
    //         }

    //         // reassign parameter to object
    //         alProcedure.Parameters[index] = alParameter;
    //     });
    // }

}