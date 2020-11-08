import { TextDocument } from "vscode";
import { FindALProceduresRegEx, ALProcedureDefinitionRegEx, FindALObjectRegEx, FindBeginEndKeywordRegEx } from "./ALRegEx";
import { ALObject } from "../types/ALObject";
import { ALProcedure } from "../types/ALProcedure";
import { ALParameter } from "../types/ALParameter";
import { ALDocCommentUtil } from "./ALDocCommentUtil";
import { performance } from "perf_hooks";
import { ALProcedureReturn } from "../types/ALProcedureReturn";
import { ALAccessLevel } from "../types/ALAccessLevel";
import { ALCodeunitType } from "../types/ALCodeunitType";
import { ALObjectExtensionType } from "../types/ALObjectExtensionType";
import { ALObjectType } from "../types/ALObjectType";
import { ALObsoleteState } from "../types/ALObsoleteState";
import { ALProcedureSubtype } from "../types/ALProcedureSubtype";
import { ALProcedureType } from "../types/ALProcedureType";
import { XMLDocumentation } from "../types/XmlDocumentation";
import { XMLDocumentationExistType } from "../types/XMLDocumentationExistType";
import { ALObjectCache } from "../ALObjectCache";

export class ALSyntaxUtil {
    /**
     * Test whether the AL object is already in AL Object Cache and remove it from Cache if exist.
     * @param document Current TextDocument.
     */    
    public static ClearALObjectFromCache(document: TextDocument) {
        let alObjectDefinition = this.GetALObjectDefinition(document.getText());
        if ((alObjectDefinition?.groups === null) || (alObjectDefinition?.groups === undefined)) {
            return;
        }

        let objectName: string = alObjectDefinition.groups["ObjectName"];
        let objectType: ALObjectType = this.SelectALObjectType(alObjectDefinition.groups["ObjectType"]);

        let alObject: ALObject|null = this.GetALObjectFromCache(objectType, objectName);
        if (alObject === null) {
            // console.debug(`${ALObjectType[objectType]} ${objectName} has not been found AL Object cache.`);
            return;
        }

        ALObjectCache.ALObjects.splice(ALObjectCache.ALObjects.indexOf(alObject), 1);
        // console.debug(`Removed ${ALObjectType[objectType]} ${objectName} from AL Object cache.`);        
    }

    /**
     * Get AL Object from ALObjectCache by Object Type and Name.
     * @param objectType ALObjectType.
     * @param objectName AL Object Name.
     */
    public static GetALObjectFromCache(objectType: ALObjectType, objectName: string): ALObject | null {
        let alObject: ALObject | undefined = ALObjectCache.ALObjects.find(alObject => ((alObject.Name === objectName) && (alObject.Type === objectType)));
        if (alObject !== undefined) {
            //console.debug(`Found AL Object ${ALObjectType[alObject.Type]} ${alObject.Name} in cache.`);
            return alObject;
        }
        return null;
    }

    /**
     * Get ALObject from currently loaded text document object.
     * @param document TextDocument to be analyzed.
     */
    public static GetALObject(document: TextDocument): ALObject|null {
        let t0 = performance.now();
        let alObject: ALObject|null;

        try {
            let alObjectDefinition = this.GetALObjectDefinition(document.getText());
            if ((alObjectDefinition?.groups === null) || (alObjectDefinition?.groups === undefined)) {
                throw new Error(`Fatal error: Could not analyze ${document.fileName}.`);
            }
            let objectName: string = alObjectDefinition.groups["ObjectName"];
            let objectType: ALObjectType = this.SelectALObjectType(alObjectDefinition.groups["ObjectType"]);
            alObject = this.GetALObjectFromCache(objectType, objectName);
            if (alObject !== null) {
                return alObject;
            }
            alObject = new ALObject();
            alObject.Type = objectType;
            alObject.Name = objectName;
            alObject.LineNo = this.GetALKeywordDefinitionLineNo(document.getText(), alObjectDefinition[0]);
            if (!((alObjectDefinition.groups["ObjectID"] === null) || (alObjectDefinition.groups["ObjectID"] === undefined))) {
                alObject.ID = parseInt(alObjectDefinition.groups["ObjectID"]);
            }

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
                        
            // get AL file properties
            if (document.fileName !== "__symbol__") {
                alObject.FileName = document.fileName.replace(/^.*[\\\/]/, "");
                alObject.Path = document.fileName.replace(alObject.FileName, "");
            } else {
                alObject.FileName = `${alObject.Name.replace(" ","")}.${ALObjectType[alObject.Type]}.dal`;
            }

            // get XML Documentation
            alObject.XmlDocumentation = this.GetALObjectDocumentation(alObject, document.getText());
            if ((alObject.XmlDocumentation.Exists === XMLDocumentationExistType.No)) {
                ALDocCommentUtil.GenerateObjectDocString(alObject);
            }

            // console.debug(alObject);            

            let t1 = performance.now();
            console.debug("Processing time for object " + alObject.Name + ": " + Math.round((t1 - t0) * 100 / 100) + "ms.");

            ALObjectCache.ALObjects.push(alObject); // add AL object to AL Object cache.
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
        alProcedure.LineNo = this.GetALKeywordDefinitionLineNo(code, procedureName);

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
                        // get XML Documentation
                        alParameter.XmlDocumentation = this.GetALObjectProcedureParameterDocumentation(alProcedure, alParameter, code);
                        if ((alParameter.XmlDocumentation.Exists === XMLDocumentationExistType.No)) {
                            ALDocCommentUtil.GenerateParameterDocString(alParameter);
                        }
                        alProcedure.Parameters.push(alParameter);
                    }
                });
            }
            // get return type from procedure definition
            alProcedureDefinition["ReturnType"] = alProcedureDefinition["ReturnType"].trim();
            if ((alProcedureDefinition["ReturnType"] !== undefined) && (alProcedureDefinition["ReturnType"] !== "")) {
                let alReturn: ALProcedureReturn | undefined = new ALProcedureReturn();
                if (alProcedureDefinition["ReturnType"][alProcedureDefinition["ReturnType"].length - 1] === ";") {
                    alProcedureDefinition["ReturnType"] = alProcedureDefinition["ReturnType"].substring(0, alProcedureDefinition["ReturnType"].length - 1).trim();
                }
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
                    alReturn = undefined;
                }
                if (alReturn !== undefined) {
                    // get XML Documentation
                    alReturn.XmlDocumentation = this.GetALObjectProcedureReturnDocumentation(alProcedure, alReturn, code);
                    if ((alReturn.XmlDocumentation.Exists === XMLDocumentationExistType.No)) {
                        ALDocCommentUtil.GenerateProcedureReturnDocString(alReturn);
                    }
                }
                alProcedure.Return = alReturn;
            }
        }
        this.GetALProcedureProperties(alProcedure, code);

        // get XML Documentation
        alProcedure.XmlDocumentation = this.GetALObjectProcedureDocumentation(alProcedure, code);
        switch (alProcedure.XmlDocumentation.Exists) {
            case XMLDocumentationExistType.No:
                if ((alProcedure.XmlDocumentation.Exists === XMLDocumentationExistType.No)) {
                    ALDocCommentUtil.GenerateProcedureDocString(alProcedure);
                }
                break;
            case XMLDocumentationExistType.Inherit:                
                // clear parameter and return documentation previously collected
                for (let i = 0; i < alProcedure.Parameters.length; i++) {
                    alProcedure.Parameters[i].XmlDocumentation = new XMLDocumentation();
                }
                if (alProcedure.Return !== undefined) {
                    alProcedure.Return.XmlDocumentation = new XMLDocumentation();
                }
                break;
        }

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
     * Get line number from Source Code.
     * @param code AL Source Code.
     * @param searchTerm Search term, e.g. Name of the AL procedure or object.
     */
    private static GetALKeywordDefinitionLineNo(code: string, searchTerm: string): number {        
        let pos: number = -1;

        code = code.substring(0, code.indexOf(searchTerm));
        let newLinesInCode: RegExpMatchArray | null = code.match(/\n/g); // count occurrence of newline char
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
        let obsoleteReason = code.match(/^ObsoleteReason = (.*);/m);
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
        let obsoleteState = code.match(/^ObsoleteState = (.*);/m);
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
                case "removed":
                    return ALObsoleteState.Removed;
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
        let subtype = code.match(/^(\s*)?Subtype\s=\s(.*);/m);
        try 
        {
            if ((subtype === null) || (subtype[1] === undefined)) {
                return ALCodeunitType.Normal;
            }
            
            switch(subtype[2].toLowerCase()) {
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
                    throw new Error(`Unexpected Subtype: ${subtype[2]}.`);
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
        let accessLevel = code.match(/^Access = (.*);/m);
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
        switch (alKeyword.toLowerCase()) {
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
    public static SplitALCodeToLines(code: string): Array<string> {
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
     * Test current AL Source Code line for containing object definition match.
     * @param line AL Source Code line.
     */
    public static IsObjectDefinition(line: string): boolean {
        return (line.toLowerCase().match(FindALObjectRegEx) !== null);
    }

    /**
     * Test current AL Source Code line for containing object definition match.
     * @param line AL Source Code line.
     */
    public static IsProcedureDefinition(line: string): boolean {
        return (line.toLowerCase().match(FindALProceduresRegEx) !== null);
    }    

    /**
     * Read XML Documentation for AL Object from Source Code.
     * @param alObject ALObject object.
     * @param code AL Source Code.
     */
    private static GetALObjectDocumentation(alObject: ALObject, code: string): XMLDocumentation {
        let result: XMLDocumentation = new XMLDocumentation();

        try {
            let codeLines: Array<string>  = this.SplitALCodeToLines(code);

            for (var i = 0; (i < codeLines.length); i++) {
                let line: string = codeLines[i];
                if ((line.trim().startsWith('///')) && (line.trim().replace('///','').trim() !== "")) {
                    result.Documentation = `${result.Documentation}\r\n${line.replace('///','').trim()}`;
                }
                if ((ALSyntaxUtil.IsProcedureDefinition(line)) || (ALSyntaxUtil.IsObjectDefinition(line)) || (ALSyntaxUtil.IsBeginEnd(line))) {
                    break;
                }
            }

            if (result.Documentation !== "") {
                result.Exists = XMLDocumentationExistType.Yes;
            }
        }
        catch (ex)
        { }

        return result;
    }

    /**
     * Read XML Documentation for AL Procedure from Source Code.
     * @param alProcedure ALProcedure object.
     * @param code AL Source Code.
     */
    static GetALObjectProcedureDocumentation(alProcedure: ALProcedure, code: string): XMLDocumentation {
        let result: XMLDocumentation = new XMLDocumentation();
        
        try {
            let codeLines: Array<string> = this.SplitALCodeToLines(code);

            let collect: Boolean = false;

            for (var i = (alProcedure.LineNo - 1); (i > 0); i--) {
                let line: string = codeLines[i];
                if (line.trim().startsWith('///')) {
                    if ((line.indexOf("</summary>") !== -1) || (line.indexOf("</remarks>") !== -1) || (line.indexOf("</example>") !== -1)) {
                        collect = true;
                    }

                    if (collect) {
                        if (result.Documentation !== "") {
                            result.Documentation = `${line.replace('///','').trim()}\r\n${result.Documentation}`;
                        } else {
                            result.Documentation = line.replace('///','').trim();
                        }
                    }

                    if ((line.indexOf("<summary>") !== -1) || (line.indexOf("<remarks>") !== -1) || (line.indexOf("<example>") !== -1)) {
                        collect = false;
                    }

                    if (line.match(/\/\/\/ <inheritdoc cref="(?<CodeReference>.*)"\/>/) !== null) {
                        result.Exists = XMLDocumentationExistType.Inherit;
                        result.Documentation = line.trim().replace('///','');
                        return result;
                    }
                }
                if ((ALSyntaxUtil.IsProcedureDefinition(line)) || (ALSyntaxUtil.IsObjectDefinition(line)) || (ALSyntaxUtil.IsBeginEnd(line))) {
                    break;
                }
            }

            if (result.Documentation !== "") {
                result.Exists = XMLDocumentationExistType.Yes;            
            }
        }
        catch (ex)
        { }

        return result;
    }

    /**
     * Read XML Documentation for AL Procedure Parameter from Source Code.
     * @param alProcedure ALProcedure object.
     * @param alParameter ALParameter object.
     * @param code AL Source Code.
     */
    static GetALObjectProcedureParameterDocumentation(alProcedure: ALProcedure, alParameter: ALParameter, code: string): XMLDocumentation {
        let result: XMLDocumentation = new XMLDocumentation();
        
        try {
            let codeLines: Array<string> = this.SplitALCodeToLines(code);

            let collect: Boolean = false;

            for (var i = (alProcedure.LineNo - 1); (i > 0); i--) {
                let line: string = codeLines[i];
                if (line.trim().startsWith('///')) {
                    if (line.indexOf("</param>") !== -1) {
                        collect = true;
                    }

                    if (collect) {
                        if (result.Documentation !== "") {
                            result.Documentation = `${line.replace('///','').trim()}\r\n${result.Documentation}`;
                        } else {
                            result.Documentation = line.replace('///','').trim();
                        }
                    }

                    if (line.indexOf('<param name=') !== -1) {
                        collect = false;

                        if (line.indexOf(`<param name="${alParameter.Name}">`) === -1) {
                            result.Documentation = "";
                        }
                    }
                }
                if ((ALSyntaxUtil.IsProcedureDefinition(line)) || (ALSyntaxUtil.IsObjectDefinition(line)) || (ALSyntaxUtil.IsBeginEnd(line))) {
                    break;
                }
            }

            if (result.Documentation !== "") {
                result.Exists = XMLDocumentationExistType.Yes;
            }
        }
        catch (ex)
        { }

        return result;
    }

    /**
     * Read XML Documentation for AL Procedure Return Value from Source Code.
     * @param alProcedure ALProcedure object.
     * @param alReturn ALProcedureReturn object.
     * @param code AL Source Code.
     */
    static GetALObjectProcedureReturnDocumentation(alProcedure: ALProcedure, alReturn: ALProcedureReturn, code: string): XMLDocumentation {
        let result: XMLDocumentation = new XMLDocumentation();
        
        try {
            let codeLines: Array<string> = this.SplitALCodeToLines(code);

            let collect: Boolean = false;

            for (var i = (alProcedure.LineNo - 1); (i > 0); i--) {
                let line: string = codeLines[i];
                if (line.trim().startsWith('///')) {
                    if (line.indexOf("</returns>") !== -1) {
                        collect = true;
                    }

                    if (collect) {
                        if (result.Documentation !== "") {
                            result.Documentation = `${line.replace('///','').trim()}\r\n${result.Documentation}`;
                        } else {
                            result.Documentation = line.replace('///','').trim();
                        }
                    }

                    if (line.indexOf("<returns>") !== -1) {
                        collect = false;
                    }
                }
                if ((ALSyntaxUtil.IsProcedureDefinition(line)) || (ALSyntaxUtil.IsObjectDefinition(line)) || (ALSyntaxUtil.IsBeginEnd(line))) {
                    break;
                }
            }

            if (result.Documentation !== "") {
                result.Exists = XMLDocumentationExistType.Yes;
            }
        }
        catch (ex)
        { }

        return result;
    }
    
    /**
     * Get AL Object definition from source code.
     * @param documentText AL Source Code.
     */
    private static GetALObjectDefinition(documentText: string): RegExpMatchArray | null {
        let alObjectDefinition = documentText.match(FindALObjectRegEx);
        return alObjectDefinition;
    }
}