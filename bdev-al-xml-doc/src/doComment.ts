import {Position, Disposable, TextDocumentContentChangeEvent, TextEditor, window, workspace, WorkspaceConfiguration, ThemeIcon, Selection, Range } from 'vscode';
import { StringUtil } from './util/StringUtil';
import { ALSyntaxUtil } from './util/ALSyntaxUtil';
import { VSCodeApi } from './api/VSCodeApi';
import { CodeType } from './types';
import { isNullOrUndefined } from 'util';

export class DoComment {
    private disposable: Disposable;
    private event!: TextDocumentContentChangeEvent;
    private activeEditor!: TextEditor;
    private vsCodeApi!: VSCodeApi;
    private codeType: CodeType;

    constructor() {       
        const subscriptions: Disposable[] = [];
        this.codeType = CodeType.Undefined;

        workspace.onDidChangeTextDocument(event => {
            const activeEditor = window.activeTextEditor;

            if (activeEditor && event.document === activeEditor.document) {
                this.onEvent(activeEditor, event.contentChanges[0]);
            }
        }, this, subscriptions);
        
        this.disposable = Disposable.from(...subscriptions);
    }

    private onEvent(activeEditor: TextEditor, event: TextDocumentContentChangeEvent) {
        this.Execute(activeEditor, event);
    }

    public Execute(activeEditor: TextEditor, event: TextDocumentContentChangeEvent) {
        this.event = event;
        this.vsCodeApi = new VSCodeApi(activeEditor);
        this.activeEditor = activeEditor;

        if (isNullOrUndefined(this.event) || isNullOrUndefined(this.activeEditor)) {
            return;
        }

        if (!this.IsDoCommentTrigger()) {
            return;
        }

        if (this.vsCodeApi.ReadLine(this.vsCodeApi.GetNextLine()).trim().startsWith('///')) {
            return;
        }

        let xmlDocumentation = "";

        const code: string = this.GetCode();
        switch (+this.codeType) {
            case CodeType.Procedure:
                var procedureDefinition = ALSyntaxUtil.AnalyzeProcedureDefinition(code);
                if (isNullOrUndefined(procedureDefinition)) {
                    return;
                }        
                var groups = procedureDefinition.groups;
                if (isNullOrUndefined(groups)) {
                    return;
                }   

                xmlDocumentation = this.GenerateProcedureDocString(this.vsCodeApi.ReadLine(this.vsCodeApi.GetActiveLine()).indexOf('///'), groups);
                break;            
            case CodeType.Object:
                var objectDefinition = ALSyntaxUtil.AnalyzeObjectDefinition(code);
                if (isNullOrUndefined(objectDefinition)) {
                    return;
                }        
                var groups = objectDefinition.groups;
                if (isNullOrUndefined(groups)) {
                    return;
                }   

                xmlDocumentation = this.GenerateObjectDocString(this.vsCodeApi.ReadLine(this.vsCodeApi.GetActiveLine()).indexOf('///'), groups);
                break;
            default:
                return; // something unexpected
        }   
        this.WriteDocString(xmlDocumentation);
    }

    private IsDoCommentTrigger(): boolean {
        if (isNullOrUndefined(this.event)) {
            return false;
        }

        const eventText: string = this.event.text;
        if (eventText === null || eventText === '') {
            return false;
        }

        const currentChar: string = this.vsCodeApi.ReadCurrentChar();
        if (currentChar === null) {
            return false;
        }

        const activeLine: string = this.vsCodeApi.ReadLineAtCurrent();
        if (activeLine.match(/^[ \t]*\/{3}[ \t]*$/) === null) {
            return false;
        }

        return true;
    }

    private WriteDocString(docString: string) {
        // remove starting "///"
        docString = docString.substring(docString.indexOf("///") + 3);

        const position: Position = this.vsCodeApi.GetActivePosition();
        this.activeEditor.edit((editBuilder) => {
            editBuilder.insert(this.vsCodeApi.ShiftPositionChar(position, 1), docString);
        });
    }

    private GenerateObjectDocString(indentPlaces: number, groups: { [key: string]: string; }): string {

        var indent = StringUtil.GetIndentSpaces(this.vsCodeApi.ReadLine(this.vsCodeApi.GetActiveLine()).indexOf('///'));

        let docString = "";

        // format object type
        if (groups['ObjectType'].indexOf('extension') !== -1) {
            groups['ObjectType'] = groups['ObjectType'].replace('extension', ' extension');
        }
        groups['ObjectType'] = groups['ObjectType'].replace(/(\w)(\w*)/g, function(g0,g1,g2){return g1.toUpperCase() + g2.toLowerCase();});

        docString += indent + "/// <summary> \n";
        docString += indent + "/// " + groups['ObjectType'] + " " + groups['ObjectName'] + " (ID " + groups['ObjectID'] + ").\n";
        docString += indent + "/// </summary>";

        return docString;
    }

    private GenerateProcedureDocString(indentPlaces: number, groups: { [key: string]: string; }): string {
        let indent = StringUtil.GetIndentSpaces(indentPlaces);

        let docString = "";
        if (!isNullOrUndefined(groups['ProcedureName'])) {
            docString += indent + "/// <summary> \n";
            docString += indent + "/// Description for " + groups['ProcedureName'] + ".\n";
            docString += indent + "/// </summary>";
        }   

        if ((!isNullOrUndefined(groups['Params'])) && (groups['Params'] !== "")) {
            let paramDefinitions = groups['Params'].split(';');
            paramDefinitions.forEach(paramDefinition => {
                paramDefinition = paramDefinition.trim();
                let param = paramDefinition.split(':');
                let paramName = param[0].trim();
                let paramDataType = param[1].trim();

                docString += "\n";
                docString += indent + "/// <param name=\"" + paramName + "\">";
                docString += "Parameter of type " + paramDataType + ".";
                docString += "</param>";
            });
        }

        if (!isNullOrUndefined(groups['ReturnType'])) {
            let returnTypeDefintion = groups['ReturnType'].split(':');
            
            docString += "\n";
            docString += indent + "/// ";
            docString += "<returns>";
            if ((!isNullOrUndefined(returnTypeDefintion[0])) && (returnTypeDefintion[0] !== "")) {
                docString += "Return variable \"" + returnTypeDefintion[0].trim() + "\"";
            } else {
                docString += "Return value";
            }

            if ((!isNullOrUndefined(returnTypeDefintion[1])) && (returnTypeDefintion[1] !== "")) {
                docString += " of type " + returnTypeDefintion[1].trim();
            }
            docString += ".";
            docString += "</returns>";
        }

        return docString;
    }

    private GetCode(eol: string = '\n'): string {
        const lineCount: number = this.vsCodeApi.GetLineCount();
        const curLine: number = this.vsCodeApi.GetActiveLine();

        let code = '';
        for (let i: number = curLine; i < lineCount - 1; i++) {
            const line: string = this.vsCodeApi.ReadLine(i + 1);

            // Skip empty line
            if (StringUtil.IsNullOrWhiteSpace(line)) {
                continue;
            }

            code += line + eol;

            if (ALSyntaxUtil.IsObject(line)) {
                this.codeType = CodeType.Object;
                return code.trim();
            }

            if (ALSyntaxUtil.IsProcedure(line)) {
                this.codeType = CodeType.Procedure;
                return code.trim();
            }
        }

        return "";
    }

    public dispose() {
        this.disposable.dispose();
    }
}