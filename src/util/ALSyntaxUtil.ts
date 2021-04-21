import { commands, Location, Position, Range, TextDocument, Uri, workspace } from 'vscode';
import { FindALProceduresRegEx, ALProcedureDefinitionRegEx, FindALObjectRegEx, FindBeginEndKeywordRegEx, InheritDocRegEx } from './regex/ALRegEx';
import { ALObject } from '../types/ALObject';
import { ALProcedure } from '../types/ALProcedure';
import { ALParameter } from '../types/ALParameter';
import { ALDocCommentUtil } from './ALDocCommentUtil';
import { ALProcedureReturn } from '../types/ALProcedureReturn';
import { ALAccessLevel } from '../types/ALAccessLevel';
import { ALCodeunitType } from '../types/ALCodeunitType';
import { ALObjectExtensionType } from '../types/ALObjectExtensionType';
import { ALObjectType } from '../types/ALObjectType';
import { ALObsoleteState } from '../types/ALObsoleteState';
import { ALProcedureSubtype } from '../types/ALProcedureSubtype';
import { ALProcedureType } from '../types/ALProcedureType';
import { XMLDocumentation } from '../types/XmlDocumentation';
import { XMLDocumentationExistType } from '../types/XMLDocumentationExistType';
import { ALObjectCache } from '../ALObjectCache';
import * as fs from 'fs';
import { Guid } from 'guid-typescript';
import { StringUtil } from './string/StringUtil';
import CancellationToken from 'cancellationtoken';
import { ProcessingTimeUtil } from './ProcessingTimeUtil';
import { ALCheckDocumentation } from './ALCheckDocumentation';

export class ALSyntaxUtil {
    /**
     * Retrieve definition for AL Object.
     * @param alObjectType ALObjectType.
     * @param alObjectName Object Name.
     */
    public static async GetObjectDefinition(alObjectType: ALObjectType, alObjectName: string): Promise<Location[] | undefined> {
        let definition: Array<Location> | undefined = undefined;

        // get current workspace folder
        const wsPath: string = workspace.workspaceFolders![0].uri.fsPath;
        // create temporary al file name
        const tempFileName: Uri = Uri.file(`${wsPath}/__${Guid.create().toString()}__.al`);
        try 
        {
            // create temp AL-file to execute AL Definition Provider.
            fs.writeFileSync(tempFileName.fsPath,
`codeunit 50000 GoToDefinition {
    trigger OnRun()
    var
        object: ${ALObjectType[alObjectType]} "${alObjectName}";
    begin
    end;
}`);

            // execute AL definition provider.
            definition = await commands.executeCommand('vscode.executeDefinitionProvider', tempFileName, new Position(3, `        object: ${ALObjectType[alObjectType]} `.length + 1));
            if ((definition === undefined) || (definition.length === 0)) {
                console.debug(`No definition for ${ALObjectType[alObjectType]} ${alObjectName} has been found.`);
            }
        } finally {
            // delete temp file.
            if (fs.existsSync(tempFileName.fsPath)) {
                fs.unlinkSync(tempFileName.fsPath);
            }
        }

        return definition;
    }

    /**
     * Test whether the AL object is already in AL Object Cache and remove it from Cache if exist.
     * @param document Current TextDocument.
     */    
    public static ClearALObjectFromCache(document: TextDocument) {
        let alObjects: ALObject[] = ALObjectCache.ALObjects.filter(alObject => (alObject.Uri === document.uri));
        let alObject: ALObject|null = null;
        if (alObjects.length === 0) {
            let alObjectDefinition = this.GetALObjectDefinition(document.getText());
            if ((alObjectDefinition?.groups === null) || (alObjectDefinition?.groups === undefined)) {
                return;
            }

            let objectName: string = alObjectDefinition.groups['ObjectName'];
            let objectType: ALObjectType = this.SelectALObjectType(alObjectDefinition.groups['ObjectType']);

            alObject = this.GetALObjectFromCache(objectType, objectName);
            if (alObject === null) {
                return;
            }
        } else {
            alObject = alObjects[0];
        }

        if (alObject === null) {
            return;
        }

        ALObjectCache.ALObjects.splice(ALObjectCache.ALObjects.indexOf(alObject), 1);   
    }

    /**
     * Get AL Object from ALObjectCache by Object Type and Name.
     * @param objectType ALObjectType.
     * @param objectName AL Object Name.
     */
    public static GetALObjectFromCache(objectType: ALObjectType, objectName: string): ALObject | null {
        let alObject: ALObject | undefined = ALObjectCache.ALObjects.find(alObject => ((alObject.Name === StringUtil.ReplaceAll(objectName, '"')) && (alObject.Type === objectType)));
        if (alObject !== undefined) {
            return alObject;
        }
        return null;
    }

    /**
     * Checks whether the CancellationToken is set and cancelled or not.
     * @param token CancellationToken|null
     * @returns True if the CancellationToken were set and is cancelled. Otherwise false.
     */
    private static TokenIsCancelled(token: CancellationToken|null): boolean {
        if (token === null) {
            return false;
        }
        return token.isCancelled;
    }

    /**
     * Get ALObject from currently loaded text document object.
     * @param document TextDocument to be analyzed.
     */
    public static async GetALObject(document: TextDocument, token: CancellationToken|null = null): Promise<ALObject | null> {
        let totalPerfUtil: ProcessingTimeUtil = new ProcessingTimeUtil();
        let alObject: ALObject|null;

        try {
            let code: string = document.getText();

            let perfUtil: ProcessingTimeUtil = new ProcessingTimeUtil();
            let alObjectDefinition = this.GetALObjectDefinition(code);
            if ((alObjectDefinition?.groups === null) || (alObjectDefinition?.groups === undefined)) {
                throw new Error(`Fatal error: Could not analyze ${document.fileName}.`);
            }
            let objectName: string = alObjectDefinition.groups['ObjectName'];
            let objectType: ALObjectType = this.SelectALObjectType(alObjectDefinition.groups['ObjectType']);
            perfUtil.Measure(`Getting Object Definition for ${ALObjectType[objectType]} ${objectName}`);

            if (this.TokenIsCancelled(token)) {
                return null;
            }

            perfUtil = new ProcessingTimeUtil();
            alObject = this.GetALObjectFromCache(objectType, objectName);            
            perfUtil.Measure(`Looking up in Object Cache for ${ALObjectType[objectType]} ${objectName}`);
            if (alObject !== null) {
                return alObject;
            }
            
            if (this.TokenIsCancelled(token)) {
                return null;
            }

            perfUtil = new ProcessingTimeUtil();
            alObject = new ALObject();
            alObject.Type = objectType;
            alObject.Name = StringUtil.ReplaceAll(objectName, '"');
            alObject.LineNo = this.GetALKeywordDefinitionLineNo(code, alObjectDefinition[0]);
            alObject.Range = this.GetRange(code, alObject.LineNo);
            if (!((alObjectDefinition.groups['ObjectID'] === null) || (alObjectDefinition.groups['ObjectID'] === undefined))) {
                alObject.ID = parseInt(alObjectDefinition.groups['ObjectID']);
            }
            
            if (this.TokenIsCancelled(token)) {
                return null;
            }

            if (!((alObjectDefinition.groups['ExtensionType'] === null) || (alObjectDefinition.groups['ExtensionType'] === undefined))) {
                switch (alObjectDefinition.groups['ExtensionType']) {
                    case 'extends':
                        alObject.ExtensionType = ALObjectExtensionType.Extend;
                        break;
                    case 'implements':
                        alObject.ExtensionType = ALObjectExtensionType.Implement;
                        break;
                }
                alObject.ExtensionObject = StringUtil.ReplaceAll(alObjectDefinition.groups['ExtensionObject'].trim(), '"', '');
            }
            perfUtil.Measure(`Creating new Object ${ALObjectType[objectType]} ${objectName}`);

            if (this.TokenIsCancelled(token)) {
                return null;
            }

            perfUtil = new ProcessingTimeUtil();
            // get AL object properties
            this.GetALObjectProperties(alObject, code);
            perfUtil.Measure(`Getting Object Properties for ${ALObjectType[objectType]} ${objectName}`);
            
            if (this.TokenIsCancelled(token)) {
                return null;
            }
            // get AL procedures
            await this.GetALObjectProcedures(alObject, code, token);
                        
            // get AL file properties
            if (document.fileName !== '__symbol__') {
                alObject.FileName = document.fileName.replace(/^.*[\\\/]/, '');
                alObject.Path = document.fileName.replace(alObject.FileName, '');
                alObject.Uri = document.uri;
            } else {
                alObject.FileName = `${alObject.Name.replace(' ','')}.${ALObjectType[alObject.Type]}.dal`;
            }
            
            if (this.TokenIsCancelled(token)) {
                return null;
            }

            perfUtil = new ProcessingTimeUtil();
            // get XML Documentation
            alObject.XmlDocumentation = this.GetALObjectDocumentation(alObject, code);
            if ((alObject.XmlDocumentation.Exists === XMLDocumentationExistType.No)) {
                ALDocCommentUtil.GenerateObjectDocString(alObject);
            }
            perfUtil.Measure(`Getting XML Documentation for ${ALObjectType[objectType]} ${objectName}`);
            
            perfUtil = new ProcessingTimeUtil();
            const alCheckDoc = new ALCheckDocumentation(document, alObject);
            alCheckDoc.CheckDocumentation();
            perfUtil.Measure(`Checking XML Documentation for ${ALObjectType[objectType]} ${objectName}`);

            if (this.GetALObjectFromCache(alObject.Type, alObject.Name) !== null) {
                ALObjectCache.ALObjects.splice(ALObjectCache.ALObjects.indexOf(alObject), 1); 
            }
            ALObjectCache.ALObjects.push(alObject); // add AL object to AL Object cache.
            totalPerfUtil.Measure(`Overall processing for ${ALObjectType[alObject.Type]} ${alObject.Name}`, 50, 200);
            return alObject;   
        }
        catch (ex)
        {
            if (this.TokenIsCancelled(token)) {
                return null; // silently quit on cancellation request
            }
            console.error(`${ex} Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues.`);
            return null;
        }
    }

    /**
     * Retrieve AL procedures from AL source code.
     * @param alObject ALObject object.
     * @param code AL Source Code.
     */
    private static async GetALObjectProcedures(alObject: ALObject, code: string, token: CancellationToken|null) {
        try
        {
            let procedures: RegExpMatchArray | null = code.match(FindALProceduresRegEx);
            if (procedures === null) {
                return;
            }
            
            if (this.TokenIsCancelled(token)) {
                return;
            }

            let alProcedures: Array<ALProcedure> = [];
            let alProcedureDefinitionTasks: Promise<ALProcedure>[] = [];
            for (let procedureMatch in procedures) {
                let procedureSignature: string = procedures[procedureMatch];
                if (this.TokenIsCancelled(token)) {
                    throw new Error("Cancellation requested.");
                }

                alProcedureDefinitionTasks.push(this.GetALObjectProcedureDefinition(code, procedureSignature, token));
            }
            
            let perfUtil: ProcessingTimeUtil = new ProcessingTimeUtil();
            let alProcedureDefinitions: ALProcedure[] = await Promise.all(alProcedureDefinitionTasks);
            alProcedureDefinitions.forEach(alProcedure => {
                alProcedures.push(alProcedure);
            });            
            perfUtil.Measure(`Adding Procedure Definitions to ${ALObjectType[alObject.Type]} ${alObject.Name}`);

            if (alProcedures.length === 0) {
                throw new Error('Fatal Error: Unable to collect procedure information. Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues.');
            }
            alObject.Procedures = alProcedures;
        }
        catch (ex)
        {
            if (this.TokenIsCancelled(token)) {
                return; // quit silently if exception is caused by token cancellation.
            }
            console.error(`Unable to retrieve procedures from object ${alObject.Name}. Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues.`);
            console.error(ex);
        }
    }

    /**
     * Get procedure definition from AL source code.
     * @param code AL Source Code.
     * @param procedureName AL procedure name.
     */
    private static async GetALObjectProcedureDefinition(code: string, procedureName: string, token: CancellationToken|null): Promise<ALProcedure> {
        if (this.TokenIsCancelled(token)) {
            throw new Error("Cancellation requested.");
        }
        let perfUtil: ProcessingTimeUtil = new ProcessingTimeUtil();
        let alProcedure: ALProcedure = new ALProcedure();

        alProcedure.Name = StringUtil.ReplaceAll(procedureName, '"');
        alProcedure.LineNo = this.GetALKeywordDefinitionLineNo(code, procedureName);
        alProcedure.Range = this.GetRange(code, alProcedure.LineNo);

        if (this.TokenIsCancelled(token)) {
            throw new Error("Cancellation requested.");
        }

        let alProcedureDefinition = procedureName.match(ALProcedureDefinitionRegEx)?.groups;
        if ((alProcedureDefinition === undefined) || (alProcedureDefinition === null)) {
            console.debug(`Failed to get procedure definition for ${alProcedure.Name}.`);
        } else {
            alProcedure.Name = StringUtil.ReplaceAll(alProcedureDefinition['ProcedureName'], '"');
            alProcedure.Code = StringUtil.ReplaceAll(`${alProcedure.Name}(${alProcedureDefinition['Params'] !== undefined ? alProcedureDefinition['Params'] : ''})`, '"');
            alProcedure.Access = this.GetALProcedureAccessLevel(alProcedureDefinition['Access']);            
            alProcedure.Type = this.GetALProcedureType(alProcedureDefinition);

            if (this.TokenIsCancelled(token)) {
                throw new Error("Cancellation requested.");
            }

            // get parameters from procedure definition
            if (alProcedureDefinition['Params'] !== undefined) {
                let alProcedureParams: Array<string> = [];
                if (alProcedureDefinition['Params'].indexOf(';') === -1) { // only one parameter
                    alProcedureParams.push(alProcedureDefinition['Params']);
                } else { // multiple parameters
                    alProcedureDefinition['Params'].split(';').forEach(param => {
                        if (this.TokenIsCancelled(token)) {
                            throw new Error("Cancellation requested.");
                        }
                        alProcedureParams.push(param);
                    });
                }

                alProcedureParams.forEach(param => {
                    this.GetALObjectProcedureParameter(param, alProcedure, code);
                });
            }
            this.GetALObjectProcedureReturn(alProcedureDefinition, alProcedure, code);
        }
        if (this.TokenIsCancelled(token)) {
            throw new Error("Cancellation requested.");
        }
        this.GetALProcedureProperties(alProcedure, code);
        if (alProcedure.TryFunction) {
            alProcedure.Return = new ALProcedureReturn();
            alProcedure.Return.Type = 'Boolean';
            alProcedure.Return.XmlDocumentation.Exists = XMLDocumentationExistType.Yes;
            alProcedure.Return.XmlDocumentation.Documentation = '<returns>False if an runtime error occurred. Otherwise true.</returns>';
        }
        if (this.TokenIsCancelled(token)) {
            throw new Error("Cancellation requested.");
        }

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
        if (this.TokenIsCancelled(token)) {
            throw new Error("Cancellation requested.");
        }

        perfUtil.Measure(`Getting ${alProcedure.Name}`);
        return alProcedure;
    }

    /**
     * Get return type from procedure definition
     * @param alProcedureDefinition ALProcedureDefinition from RegEx.
     * @param alProcedure ALProcedure object to attach return.
     * @param code AL Source Code.
     */
    private static GetALObjectProcedureReturn(alProcedureDefinition: { [key: string]: string; }, alProcedure: ALProcedure, code: string) {
        alProcedureDefinition['ReturnType'] = alProcedureDefinition['ReturnType'].trim();
        if ((alProcedureDefinition['ReturnType'] !== undefined) && (alProcedureDefinition['ReturnType'] !== '')) {
            let alReturn: ALProcedureReturn | undefined = new ALProcedureReturn();
            if (alProcedureDefinition['ReturnType'][alProcedureDefinition['ReturnType'].length - 1] === ';') {
                alProcedureDefinition['ReturnType'] = alProcedureDefinition['ReturnType'].substring(0, alProcedureDefinition['ReturnType'].length - 1).trim();
            }
            if (alProcedureDefinition['ReturnType'].indexOf(':') === -1) {
                alReturn.Type = alProcedureDefinition['ReturnType'].trim();
            } else {
                alReturn.Name = StringUtil.ReplaceAll(alProcedureDefinition['ReturnType'].split(':')[0].trim(), '"');
                alReturn.Type = alProcedureDefinition['ReturnType'].split(':')[1].trim();
            }
            if (alReturn.Type[alReturn.Type.length - 1] === '/') {
                alReturn.Type = alReturn.Type.substring(0, alReturn.Type.length - 2).trim();
            }
            if (alReturn.Type === '') {
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

    /**
     * Get AL Procedure Parameter.
     * @param param Parameter declaration.
     * @param alProcedure ALProcedure object to attach parameter.
     * @param code AL Source Code.
     */
    private static GetALObjectProcedureParameter(param: string, alProcedure: ALProcedure, code: string) {
        let alParameter: ALParameter = new ALParameter();
        alParameter.CallByReference = (param.split(':')[0].match(/\bvar\s/) !== null);
        alParameter.Name = StringUtil.ReplaceAll(param.split(':')[0].trim(), '"');
        // remove var prefix for call-by-reference parameter
        if (alParameter.CallByReference) {
            alParameter.Name = StringUtil.ReplaceAll(alParameter.Name.substr(4).trim(), '"');
        }
        if (param.indexOf(':') !== -1) {
            if (param.split(':')[1].trim().indexOf(' ') === -1) {
                alParameter.Type = param.split(':')[1].trim();
            } else {
                alParameter.Type = param.split(':')[1].trim().split(' ')[0];
                // TODO: Find a smarter solution
                alParameter.Subtype = '';
                for (let i = 1; i <= param.split(':')[1].trim().split(' ').length - 1; i++) {
                    alParameter.Subtype = `${alParameter.Subtype} ${param.split(':')[1].trim().split(' ')[i]}`;
                }
                alParameter.Subtype = alParameter.Subtype.trim();
                if ((alParameter.Type === 'Record') && (alParameter.Subtype.trim().match(/\btemporary\b/) !== null)) {
                    alParameter.Temporary = true;
                    alParameter.Subtype = alParameter.Subtype.replace(/\btemporary\b/, '').trim();
                }
            }
            // get XML Documentation
            alParameter.XmlDocumentation = this.GetALObjectProcedureParameterDocumentation(alProcedure, alParameter, code);
            if ((alParameter.XmlDocumentation.Exists === XMLDocumentationExistType.No)) {
                ALDocCommentUtil.GenerateParameterDocString(alParameter);
            }
            alProcedure.Parameters.push(alParameter);
        }
    }

    /**
     * Get procedure type from procedure definition.
     * @param alProcedureDefinition Captured definition from RegEx.
     * @param alProcedure 
     */
    private static GetALProcedureType(alProcedureDefinition: { [key: string]: string; }): ALProcedureType {
        switch (alProcedureDefinition['Type'].toLowerCase()) {
            case 'trigger':
                return ALProcedureType.Trigger;
            case 'procedure':
                return ALProcedureType.Procedure;
        }

        console.error(`Unknown AL procedure type ${alProcedureDefinition['Type'].toLowerCase()} found.`);
        return ALProcedureType.Procedure;
    }

    /**
     * Analyze code lines prior to AL procedure declaration to get AL procedure properties.
     * @param alProcedure ALProcedure object.
     * @param code AL Source Code.
     */
    private static GetALProcedureProperties(alProcedure: ALProcedure, code: string) {
        if ((alProcedure.Name === '') || (alProcedure.LineNo === 0)) {
            return;
        }

        let codeLines = this.SplitALCodeToLines(code);
        for (let lineNo: number = alProcedure.LineNo; lineNo >= 0; lineNo--) {
            if (this.IsBeginEnd(codeLines[lineNo])) {
                return;
            }
            // get TableNo property for OnRun trigger
            if ((alProcedure.Type === ALProcedureType.Trigger) && (alProcedure.Name === 'OnRun')) {                
                let tableNoSubtype = codeLines[lineNo].match(/(?<!\/\/.*).*?TableNo\s\=(?<Subtype>.*)\;/);
                if ((tableNoSubtype !== null) && (tableNoSubtype !== undefined) && (tableNoSubtype.groups !== undefined)) {
                    
                    let alParameter = new ALParameter();
                    alParameter.Name = 'Rec';
                    alParameter.Type = 'Record';
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
                case 'internal':
                    return ALAccessLevel.Internal;
                case 'local':
                    return ALAccessLevel.Local;
                case 'protected':
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
        let obsoleteReason = code.match(/^(\s*)?ObsoleteReason = (.*);/m);
        try 
        {
            if ((obsoleteReason === null) || (obsoleteReason[2] === undefined)) {
                return '';
            }
            return obsoleteReason[2];
        }
        catch(ex)
        {
            console.debug(`[GetALObjectObsoleteReason] - ${ex}`);
            return '';
        }
    }

    /**
     * Retrieve AL Object ObsoleteState Property from Source Code.
     * @param code AL Source Code.
     */
    private static GetALObjectObsoleteState(code: string): ALObsoleteState {
        let obsoleteState = code.match(/^(\s*)?ObsoleteState = (.*);/m);
        try 
        {
            if ((obsoleteState === null) || (obsoleteState[1] === undefined)) {
                return ALObsoleteState.No;
            }
            
            switch(obsoleteState[2].toLowerCase()) {
                case 'no':
                    return ALObsoleteState.No;
                case 'pending':
                    return ALObsoleteState.Pending;
                case 'removed':
                    return ALObsoleteState.Removed;
                default:
                    throw new Error(`Unexpected ObsoleteState: ${obsoleteState[2]}.`);
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
                case 'normal':
                    return ALCodeunitType.Normal;
                case 'install':
                    return ALCodeunitType.Install;            
                case 'upgrade':
                    return ALCodeunitType.Upgrade;
                case 'test':
                    return ALCodeunitType.Test;
                case 'testrunner':
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
        let accessLevel = code.match(/^(\s*)?Access = (.*);/m);
        try 
        {
            if ((accessLevel === null) || (accessLevel[2] === undefined)) {
                return ALAccessLevel.Public;;
            }

            switch(accessLevel[2].toLowerCase()) {
                case 'internal':
                    return ALAccessLevel.Internal;
                case 'public':
                    return ALAccessLevel.Public;
                default:
                    throw new Error(`Unexpected Access Modifier: ${accessLevel[2]}.`);
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
            case 'codeunit':
                return ALObjectType.Codeunit;
            case 'table':
                return ALObjectType.Table;
            case 'tableextension':
                return ALObjectType.TableExtension;
            case 'page': 
                return ALObjectType.Page;
            case 'pageextension':
                return ALObjectType.PageExtension;
            case 'report':
                return ALObjectType.Report;
            case 'query':
                return ALObjectType.Query;
            case 'xmlport':
                return ALObjectType.XmlPort;
            case 'controladdin':
                return ALObjectType.ControlAddIn;
            case 'enum':
                return ALObjectType.Enum;
            case 'enumextension':
                return ALObjectType.EnumExtension;
            case 'interface':
                return ALObjectType.Interface;
            default:
                console.debug(`Fatal error: Unknown AL object keyword received ${alKeyword}!`);
                return ALObjectType.Unknown;
        }
    }

    /**
     * Calculate the Range of a given line number in AL Source Code.
     * @param code AL Source Code.
     * @param lineNo Line Number.
     */
    public static GetRange(code: string, lineNo: number): Range {
        let line: string[] = this.SplitALCodeToLines(code);

        return new Range(
            new Position(lineNo, (line[lineNo].length - line[lineNo].trim().length)), 
            new Position(lineNo, line[lineNo].length));
    }

    /**
     * Split string object, containing AL Source Code, in string array per line.
     * @param code AL Source Code.
     */
    public static SplitALCodeToLines(code: string): Array<string> {
        return code.replace(/\r/g,'').split('\n');
    }

    /**
     * Test current AL Source Code line for containing 'begin' or 'end;' keyword.
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
                if ((line.trim().startsWith('///'))) {
                    result.Documentation = `${result.Documentation}\r\n${line.replace('///','').trim()}`;
                }
                if ((ALSyntaxUtil.IsProcedureDefinition(line)) || (ALSyntaxUtil.IsObjectDefinition(line)) || (ALSyntaxUtil.IsBeginEnd(line))) {
                    break;
                }
            }

            if (result.Documentation !== '') {
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
    public static GetALObjectProcedureDocumentation(alProcedure: ALProcedure, code: string): XMLDocumentation {
        let result: XMLDocumentation = new XMLDocumentation();
        
        try {
            let codeLines: Array<string> = this.SplitALCodeToLines(code);

            let collect: boolean = false;

            for (var i = (alProcedure.LineNo - 1); (i > 0); i--) {
                let line: string = codeLines[i];
                if (line.trim().startsWith('///')) {
                    if ((line.indexOf('</summary>') !== -1) || (line.indexOf('</remarks>') !== -1) || (line.indexOf('</example>') !== -1)) {
                        collect = true;
                    }

                    if (collect) {
                        if (result.Documentation !== '') {
                            result.Documentation = `${line.replace('///','').trim()}\r\n${result.Documentation}`;
                        } else {
                            result.Documentation = line.replace('///','').trim();
                        }
                    }

                    if ((line.indexOf('<summary>') !== -1) || (line.indexOf('<remarks>') !== -1) || (line.indexOf('<example>') !== -1)) {
                        collect = false;
                    }

                    if (line.match(InheritDocRegEx) !== null) {
                        result.Exists = XMLDocumentationExistType.Inherit;
                        result.Documentation = line.trim().replace('///','');
                        return result;
                    }
                }
                if ((ALSyntaxUtil.IsProcedureDefinition(line)) || (ALSyntaxUtil.IsObjectDefinition(line)) || (ALSyntaxUtil.IsBeginEnd(line))) {
                    break;
                }
            }

            if (result.Documentation !== '') {
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
    public static GetALObjectProcedureParameterDocumentation(alProcedure: ALProcedure, alParameter: ALParameter, code: string): XMLDocumentation {
        let result: XMLDocumentation = new XMLDocumentation();
        
        try {
            let codeLines: Array<string> = this.SplitALCodeToLines(code);

            let collect: boolean = false;

            for (var i = (alProcedure.LineNo - 1); (i > 0); i--) {
                let line: string = codeLines[i];
                if (line.trim().startsWith('///')) {
                    if (line.indexOf('</param>') !== -1) {
                        collect = true;
                    }

                    if (collect) {
                        let docLine: string = line.trimLeft().replace('///','');
                        if (docLine.substr(0, 1) === ' ') {
                            docLine = docLine.substr(1);
                        }
                        if (result.Documentation !== '') {
                            result.Documentation = `${docLine}\r\n${result.Documentation}`;
                        } else {
                            result.Documentation = docLine;
                        }
                    }

                    if (line.indexOf('<param name=') !== -1) {
                        collect = false;

                        if (line.indexOf(`<param name="${alParameter.Name}">`) === -1) {
                            result.Documentation = '';
                        } else {
                            if (result.Documentation !== '') {
                                result.Exists = XMLDocumentationExistType.Yes;
                            }
                            return result;
                        }
                    }
                }
                if ((ALSyntaxUtil.IsProcedureDefinition(line)) || (ALSyntaxUtil.IsObjectDefinition(line)) || (ALSyntaxUtil.IsBeginEnd(line))) {
                    break;
                }
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
    public static GetALObjectProcedureReturnDocumentation(alProcedure: ALProcedure, alReturn: ALProcedureReturn, code: string): XMLDocumentation {
        let result: XMLDocumentation = new XMLDocumentation();
        
        try {
            let codeLines: Array<string> = this.SplitALCodeToLines(code);

            let collect: boolean = false;

            for (var i = (alProcedure.LineNo - 1); (i > 0); i--) {
                let line: string = codeLines[i];
                if (line.trim().startsWith('///')) {
                    if (line.indexOf('</returns>') !== -1) {
                        collect = true;
                    }

                    if (collect) {
                        if (result.Documentation !== '') {
                            result.Documentation = `${line.replace('///','').trim()}\r\n${result.Documentation}`;
                        } else {
                            result.Documentation = line.replace('///','').trim();
                        }
                    }

                    if (line.indexOf('<returns>') !== -1) {
                        collect = false;
                    }
                }
                if ((ALSyntaxUtil.IsProcedureDefinition(line)) || (ALSyntaxUtil.IsObjectDefinition(line)) || (ALSyntaxUtil.IsBeginEnd(line))) {
                    break;
                }
            }

            if (result.Documentation !== '') {
                result.Exists = XMLDocumentationExistType.Yes;
            }
        }
        catch (ex)
        { }

        return result;
    }

    /**
     * Tests whether the given string contains special characters to escape in AL or not.
     * @param string 
     */
    public static HasCharactersToEscape(string: string): boolean {
        return ((string.indexOf(' ') !== -1) ||
               (string.indexOf('/') !== -1) ||
               (string.indexOf('%') !== -1) ||
               (string.indexOf('.') !== -1) ||
               (string.indexOf(':') !== -1) ||
               (string.indexOf('(') !== -1) ||
               (string.indexOf(')') !== -1) ||
               (string.indexOf('[') !== -1) ||
               (string.indexOf(']') !== -1) ||
               (string.indexOf('&') !== -1) ||
               (string.indexOf('$') !== -1) ||
               (string.indexOf('§') !== -1) ||
               (string.indexOf('!') !== -1));        
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