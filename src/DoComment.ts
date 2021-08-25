import { Position, Disposable, TextDocumentContentChangeEvent, TextEditor, window, workspace, SnippetString } from 'vscode';
import { StringUtil } from './util/string/StringUtil';
import { ALSyntaxUtil } from './util/ALSyntaxUtil';
import { VSCodeApi } from './api/VSCodeApi';
import { ALObject } from './types/ALObject';
import { ALProcedure } from './types/ALProcedure';
import { ALDocCommentUtil } from './util/ALDocCommentUtil';
import { Configuration } from './util/Configuration';

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

            if (event.document.languageId !== 'al') {
                return;
            }

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
    public async DoComment(activeEditor: TextEditor, event: TextDocumentContentChangeEvent) {
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

        // If we're not we in a XML documentation line
        if (!(this.vsCodeApi.ReadLine(this.vsCodeApi.GetActiveLine()).trim().startsWith('///'))) {
            if (this.event.text !== '/') {
                return;
            }
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
            
        if (!Configuration.DirectDocumentationIsEnabled(this.activeEditor.document.uri)) {
            return;
        }
        await this.WriteDocString();
    }

    /**
     * Tests whether the Documentation has to been written on actual event or not.
     */
    private IsDoCommentTrigger(): boolean {
        this.isEnterKey = false;

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
    public async WriteDocString() {
        // Analyze current AL Object.
        let alObject: ALObject | null = await ALSyntaxUtil.GetALObject(this.activeEditor.document);
        if ((alObject === null) || (alObject === undefined)) {
            return;
        }

        let docString: string = '';

        const activeLineNo: number = this.vsCodeApi.GetActiveLine();
        if (activeLineNo < alObject.LineNo) {
            // use object definition
            docString = ALDocCommentUtil.GetObjectDocumentation(alObject);
        } else {
            // find procedure
            let alProcedure: ALProcedure | undefined = alObject.Procedures?.find(alProcedure => (alProcedure.LineNo > activeLineNo));
            if ((!alProcedure) || (alProcedure.XmlDocumentation.Exists)) {
                return;
            }
            docString = ALDocCommentUtil.GetProcedureDocumentation(alProcedure);
        }

        docString = docString.replace('///',''); // delete leading '///'.

        const position: Position = this.vsCodeApi.GetActivePosition();
        this.activeEditor.insertSnippet(new SnippetString(docString), this.vsCodeApi.ShiftPositionChar(position, 1));
    }

    public dispose() {
        this.disposable.dispose();
    }
}