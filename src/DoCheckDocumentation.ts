import { window, workspace, TextEditor, languages, commands, Position, SnippetString, TextDocument, Range } from "vscode";
import { ALCheckDocumentation } from "./util/ALCheckDocumentation";
import { ALFixDocumentation } from "./util/ALFixDocumentation";
import { ALDocCommentUtil } from "./util/ALDocCommentUtil";
import { ALSyntaxUtil } from "./util/ALSyntaxUtil";
import { Configuration } from "./util/Configuration";

export class DoCheckDocumentation {  
    private activeEditor!: TextEditor;
    private alUpdateDecorations: ALCheckDocumentation = new ALCheckDocumentation();

    constructor() {
        window.onDidChangeActiveTextEditor(editor => {
            if ((editor === undefined) || (editor === null)) {
                return;
            }
            this.activeEditor = editor;

            this.alUpdateDecorations.CheckDocumentation(this.activeEditor.document);
        });

        workspace.onDidChangeTextDocument(event => {   
            if (!this.activeEditor) {
                if (window.activeTextEditor?.document === event.document) {
                    this.activeEditor = window.activeTextEditor;
                }
            }

            if ((!this.activeEditor) || (event.document !== this.activeEditor.document)) {
                return;
            }

            this.alUpdateDecorations.CheckDocumentation(this.activeEditor.document);
        });

        workspace.onDidChangeConfiguration(event => {
            let affected = event.affectsConfiguration(Configuration.ExtensionIdent());
            if (affected) {
                Configuration.AskEnableCheckProcedureDocumentation();
                this.InitializeCheckDocumentation();
            }
        });

        languages.registerCodeActionsProvider('al',
            new ALFixDocumentation(), {
                providedCodeActionKinds: ALFixDocumentation.providedCodeActionKinds
            });

        // quick fix commands
        commands.registerCommand("bdev-al-xml-doc.fixDocumentation", (procedureState: { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null) => {
            this.FixDocumentation(window.activeTextEditor, procedureState);
        });
        commands.registerCommand("bdev-al-xml-doc.fixSummaryDocumentation", (procedureState: { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null) => {
            this.FixSummaryDocumentation(window.activeTextEditor, procedureState);
        });
        commands.registerCommand("bdev-al-xml-doc.fixParameterDocumentation", (procedureState: { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null) => {
            this.FixParameterDocumentation(window.activeTextEditor, procedureState);
        });
        commands.registerCommand("bdev-al-xml-doc.fixReturnTypeDocumentation", (procedureState: { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null) => {
            this.FixReturnTypeDocumentation(window.activeTextEditor, procedureState);
        });

        this.InitializeCheckDocumentation();
    }    

    private InitializeCheckDocumentation() {
        workspace.findFiles('**/*.al').then(allFiles => {
            allFiles.forEach(file => {
                workspace.openTextDocument(file.fsPath).then(document => {
                    this.alUpdateDecorations.CheckDocumentation(document);
                });
            });
        });
    }
        
    private FixDocumentation(editor: TextEditor | undefined, procedureState: { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null) {    
        if (!editor) {
            return;
        }
        
        editor.insertSnippet(new SnippetString(
            ALDocCommentUtil.GenerateProcedureDocString(
                ALSyntaxUtil.AnalyzeProcedureDefinition(editor.document.getText().split("\r\n")[procedureState!.position.start.line])!.groups!) + "\n"), 
                new Position(procedureState!.position.start.line, ALDocCommentUtil.GetLineStartPosition(editor.document, procedureState!.position.start.line))); //vsCodeApi.GetActiveLineStartPosition());
    }

    private FixSummaryDocumentation(editor: TextEditor | undefined, procedureState: { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null) {    
        if (!editor) {
            return;
        }

        try { 
            let procedureDocumentation = ALDocCommentUtil.GenerateProcedureDocString(ALSyntaxUtil.AnalyzeProcedureDefinition(editor.document.getText().split("\r\n")[procedureState!.position.start.line])!.groups!);
            
            let lineNo = ALDocCommentUtil.GetFirstXmlDocumentationLineNo(editor, procedureState!.position.start.line);
            if (lineNo === -1) {
                return;
            }
            editor.insertSnippet(new SnippetString(ALDocCommentUtil.GetXmlDocumentationNode(procedureDocumentation, 'summary') + "\n"), 
                new Position(lineNo, ALDocCommentUtil.GetLineStartPosition(editor.document, lineNo)));                    
        } catch {
            return;
        }
    }

    private FixParameterDocumentation(editor: TextEditor | undefined, procedureState: { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null) {    
        if (!editor) {
            return;
        }

        try {
            let procedureDefinition = ALSyntaxUtil.AnalyzeProcedureDefinition(editor.document.getText().split("\r\n")[procedureState!.position.start.line])!.groups!;
            let procedureDocumentation = ALDocCommentUtil.GenerateProcedureDocString(procedureDefinition);

            let jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(procedureDocumentation);
            let parameters: { name: string; documentation: string; insertAtLineNo: number }[] = [];
            jsonDocumentation.param.forEach((param: { attr: { name: string; }; value: string; }) => {
                parameters.push({
                    name: param.attr.name,
                    documentation: param.value,
                    insertAtLineNo: ALDocCommentUtil.GetXmlDocumentationNodeLineNo(editor, procedureState!.position.start.line, 'param', 'name', param.attr.name)
                });
            });

            let i = 0;
            let j = 0;
            parameters.forEach(parameter => {
                if (parameter.insertAtLineNo === -1) {
                    if ((i === 0) || (parameters[i-1].insertAtLineNo === -1)) {
                        parameter.insertAtLineNo = ALDocCommentUtil.GetXmlDocumentationNodeLineNo(editor, procedureState!.position.start.line, 'summary');
                    } else {
                        parameter.insertAtLineNo = parameters[i-1].insertAtLineNo + j;
                    }
                    editor.insertSnippet(new SnippetString(ALDocCommentUtil.GetXmlDocumentationNode(procedureDocumentation, 'param', 'name', parameter.name) + "\n"), 
                        new Position(parameter.insertAtLineNo, ALDocCommentUtil.GetLineStartPosition(editor.document, parameter.insertAtLineNo)));
                    j++;
                }
                i++;
            });        
        } catch {
            return;
        }
    }

    private FixReturnTypeDocumentation(editor: TextEditor | undefined, procedureState: { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null) {    
        if (!editor) {
            return;
        }
        try {
            let procedureDocumentation = ALDocCommentUtil.GenerateProcedureDocString(ALSyntaxUtil.AnalyzeProcedureDefinition(editor.document.getText().split("\r\n")[procedureState!.position.start.line])!.groups!);
            
            let lineNo = ALDocCommentUtil.GetLastXmlDocumentationLineNo(editor, procedureState!.position.start.line);
            if (lineNo === -1) {
                return;
            }
            editor.insertSnippet(new SnippetString(ALDocCommentUtil.GetXmlDocumentationNode(procedureDocumentation, 'returns') + "\n"), 
                new Position(lineNo, ALDocCommentUtil.GetLineStartPosition(editor.document, lineNo)));    
        } catch {
            return;
        }
    }

    public dispose() {
    }
}