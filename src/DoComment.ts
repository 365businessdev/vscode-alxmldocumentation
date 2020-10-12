import { Position, Disposable, TextDocumentContentChangeEvent, TextEditor, window, workspace, commands, SnippetString } from 'vscode';
import { StringUtil } from './util/StringUtil';
import { ALSyntaxUtil } from './util/ALSyntaxUtil';
import { VSCodeApi } from './api/VSCodeApi';
import { ALObject } from './types/ALObject';
import { ALProcedure } from './types/ALProcedure';

export class DoComment {
    private disposable: Disposable;
    private event!: TextDocumentContentChangeEvent;
    private activeEditor!: TextEditor;
    private vsCodeApi!: VSCodeApi;
    private isEnterKey!: Boolean;

    /**
     * DoComment constructor
     */
    constructor() {       
        const subscriptions: Disposable[] = [];

        workspace.onDidChangeTextDocument(event => {
            const activeEditor = window.activeTextEditor;

            if (activeEditor && event.document === activeEditor.document) {
                this.DoComment(activeEditor, event.contentChanges[0]);
            }
        }, this, subscriptions);
        
        this.disposable = Disposable.from(...subscriptions);
    }

    /**
     * Do comment on current event.
     * @param activeEditor TextEditor object.
     * @param event TextDocumentContentChangeEvent object.
     */
    public DoComment(activeEditor: TextEditor, event: TextDocumentContentChangeEvent) {
        this.event = event;
        this.vsCodeApi = new VSCodeApi(activeEditor);
        this.activeEditor = activeEditor;

        if ((this.event === undefined) || (this.event === null) || (this.activeEditor === undefined) || (this.activeEditor === null)) {
            return;
        }

        // if action comes from snippet an additional '/// ' is included 
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

            return;
        }

        if (this.vsCodeApi.ReadLine(this.vsCodeApi.GetNextLine()).trim().startsWith('///')) {
            return;
        }
        this.WriteDocString();
    }

    /**
     * Tests whether the Documentation has to been written on actual event or not.
     */
    private IsDoCommentTrigger(): boolean {
        this.isEnterKey = false;

        // TODO: configuration
        // if (!Configuration.DocumentationCommentsIsEnabled(this.activeEditor.document.uri)) {
        //     return false;
        // }

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

    /**
     * Write XML Documentation string to current editor.
     */
    public WriteDocString() {
        // Analyze current AL Object.
        let alObject: ALObject | null = ALSyntaxUtil.GetObject(this.activeEditor.document);
        if ((alObject === null) || (alObject === undefined)) {
            return;
        }

        let docString: string = "";

        const activeLineNo: number = this.vsCodeApi.GetActiveLine();
        if (activeLineNo < alObject.LineNo) {
            // use object definition
            docString = alObject.XmlDocumentation.Documentation.replace("__idx__", "1");
        } else {
            // find procedure
            let alProcedure: ALProcedure | undefined = alObject.Procedures?.find(alProcedure => (alProcedure.LineNo > activeLineNo));
            if ((!alProcedure) || (alProcedure.XmlDocumentation.DocumentationExists)) {
                return;
            }
            let snippetIdx: number = 1;

            docString = alProcedure.XmlDocumentation.Documentation.replace("__idx__", snippetIdx.toString()).split("\r\n").join("\r\n/// ");
            alProcedure.Parameters.forEach(alParameter => {
                snippetIdx++;
                docString += "\r\n" + alParameter.XmlDocumentation.Documentation.replace("__idx__", snippetIdx.toString()).split("\r\n").join("\r\n/// ");
            });
            if (alProcedure.Return !== undefined) {
                snippetIdx++;
                docString += "\r\n" + alProcedure.Return.XmlDocumentation.Documentation.replace("__idx__", snippetIdx.toString()).split("\r\n").join("\r\n/// ");
            }
        }

        // remove starting "///"
        docString = docString.replace("__idx__", "1").substring(docString.indexOf("///") + 3);

        const position: Position = this.vsCodeApi.GetActivePosition();
        this.activeEditor.insertSnippet(new SnippetString(docString), this.vsCodeApi.ShiftPositionChar(position, 1));
    }

    /**
     * Find associated AL Source Code line no. based on current cursor position.
     */
    private FindAssocSourceLineNo(): number {
        const lineCount: number = this.vsCodeApi.GetLineCount();
        const curLine: number = this.vsCodeApi.GetActiveLine();

        // find assoc. AL Source Code for documentation.
        for (let i: number = curLine; i < lineCount - 1; i++) {
            const line: string = this.vsCodeApi.ReadLine(i + 1);

            // Skip empty line
            if (StringUtil.IsNullOrWhiteSpace(line)) {
                continue;
            }

            if (ALSyntaxUtil.IsBeginEnd(line)) {
                return -1;
            }

            if ((ALSyntaxUtil.IsObjectDefinition(line)) || (ALSyntaxUtil.IsProcedureDefinition(line))) {
                return i + 1;
            }
        }

        return -1;
    }

    public dispose() {
        this.disposable.dispose();
    }
}