import {Position, Disposable, TextDocumentContentChangeEvent, TextEditor, window, workspace, commands, SnippetString } from 'vscode';
import { StringUtil } from './util/StringUtil';
import { ALSyntaxUtil } from './util/ALSyntaxUtil';
import { ALDocCommentUtil } from './util/ALDocCommentUtil';
import { VSCodeApi } from './api/VSCodeApi';
import { CodeType } from './types';
import { isNullOrUndefined } from 'util';
import { Configuration } from './util/Configuration';

export class DoComment {
    private disposable: Disposable;
    private event!: TextDocumentContentChangeEvent;
    private activeEditor!: TextEditor;
    private vsCodeApi!: VSCodeApi;
    private codeType: CodeType;

    private isEnterKey!: Boolean;

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

        // if action comes from snippet and additional '/// ' is included 
        var doubleDocCommentIndex = this.vsCodeApi.ReadLineAtCurrent().indexOf('/// /// ');
        if (doubleDocCommentIndex !== -1) {
            const position: Position = this.vsCodeApi.GetPosition(this.vsCodeApi.GetActiveLine(), doubleDocCommentIndex);
            const anchor: Position = this.vsCodeApi.GetPosition(position.line, position.character + 4);
            const replaceSelection = this.vsCodeApi.GetSelectionByPosition(anchor, position);
            this.activeEditor.edit((editBuilder) => {
                editBuilder.replace(replaceSelection, '');
            });
        }

        if (!this.IsDoCommentTrigger()) {
            return;
        }

        if (this.isEnterKey) {            
            var indent = StringUtil.GetIndentSpaces(this.vsCodeApi.ReadLine(this.vsCodeApi.GetActiveLine()).indexOf('///'));

            const position: Position = this.vsCodeApi.GetActivePosition();
            const anchor: Position = this.vsCodeApi.GetPosition(this.vsCodeApi.GetNextLine(), indent.length);
            const replaceSelection = this.vsCodeApi.GetSelectionByPosition(anchor, position);
            this.activeEditor.edit((editBuilder) => {
                editBuilder.replace(replaceSelection, `\n${indent}/// `);
            });
            
            commands.executeCommand("cursorMove", {
                to: "right",
                by: "wrappedLine",
                select: false,
                value: 1
            });

            return;
        }

        if (this.vsCodeApi.ReadLine(this.vsCodeApi.GetNextLine()).trim().startsWith('///')) {
            return;
        }
        this.WriteDocString();
    }

    private IsDoCommentTrigger(): boolean {
        this.isEnterKey = false;

        if (!Configuration.DocumentationCommentsIsEnabled()) {
            return false;
        }

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
        // if hit enter at a line with xml doc comment, add '///' to the new line
        if ((currentChar === '') && ((eventText.startsWith('\n') || eventText.startsWith('\r\n') && (eventText.indexOf('///') === -1)))) {
            if (activeLine.indexOf('///') !== -1) {
                this.isEnterKey = true;

                return true;
            }
        }

        if (activeLine.match(/^[ \t]*\/{3}[ \t]*$/) === null) {
            return false;
        }

        if (this.vsCodeApi.GetActiveLine() !== 0) {
            // prevent from double creation
            if (this.vsCodeApi.ReadLine(this.vsCodeApi.GetPreviousLine()).indexOf('///') !== -1) {
                return false;
            }
        }

        return true;
    }

    public WriteDocString(docString: string = "") {
        if (docString === "") {
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

                    docString = ALDocCommentUtil.GenerateProcedureDocString(groups);
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

                    docString = ALDocCommentUtil.GenerateObjectDocString(groups);
                    break;
                default:
                    return; // something unexpected
            }

            // remove starting "///"
            docString = docString.substring(docString.indexOf("///") + 3);
        }

        const position: Position = this.vsCodeApi.GetActivePosition();
        this.activeEditor.insertSnippet(new SnippetString(docString), this.vsCodeApi.ShiftPositionChar(position, 1));
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

            if (ALSyntaxUtil.IsBeginEnd(line)) {
                return "";
            }

            code += line + eol;

            if (ALSyntaxUtil.IsObject(line)) {
                this.codeType = CodeType.Object;
                return code.trim();
            }

            if (ALSyntaxUtil.IsProcedure(line, (i >= 0) ? this.vsCodeApi.ReadLine(i) : '')) {
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