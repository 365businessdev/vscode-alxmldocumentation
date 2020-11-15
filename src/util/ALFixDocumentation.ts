import { Position, Range, SnippetString, TextEditor } from 'vscode';
import { ALParameter } from '../types/ALParameter';
import { ALProcedure } from '../types/ALProcedure';
import { ALDocCommentUtil } from './ALDocCommentUtil';
import { ALSyntaxUtil } from './ALSyntaxUtil';

export class ALFixDocumentation {
    /**
     * Add missing XML documentation for AL procedure.
     * @param editor {TextEditor}
     * @param alProcedure {ALProcedure}
     */
    public static FixDocumentation(editor: TextEditor | undefined, alProcedure: ALProcedure) {
        if (editor === undefined) {
            return;
        }

        let lineNo = this.FindLineNoToStartXmlDocumentation(editor, alProcedure);

        editor.insertSnippet(new SnippetString(
            `${ALDocCommentUtil.GetProcedureDocumentation(alProcedure)}\r\n`),
            new Position(lineNo, ALDocCommentUtil.GetLineStartPosition(editor.document, lineNo))
        );
    }
    
    /**
     * Add missing Summary XML documentation for AL procedure.
     * @param editor {TextEditor}
     * @param alProcedure {ALProcedure}
     */
    public static FixSummaryDocumentation(editor: TextEditor | undefined, alProcedure: ALProcedure) {
        if (editor === undefined) {
            return;
        }

        let lineNo = this.FindLineNoToStartXmlDocumentation(editor, alProcedure);
        
        editor.insertSnippet(new SnippetString(
            `/// ${alProcedure.XmlDocumentation.Documentation.replace('__idx__', '1').split('\r\n').join('\r\n/// ')}\r\n`),
            new Position(lineNo, ALDocCommentUtil.GetLineStartPosition(editor.document, lineNo))
        );
    }

    /**
     * Add missing Summary XML documentation for AL procedure.
     * @param editor {TextEditor}
     * @param alProcedure {ALProcedure}
     */
    public static FixParameterDocumentation(editor: TextEditor | undefined, alProcedure: ALProcedure) {
        if (editor === undefined) {
            return;
        }

        let placeholderIdx = 1;
        let xmlDocumentation: string = ALDocCommentUtil.GenerateProcedureDocString(alProcedure, placeholderIdx);
        alProcedure.Parameters?.forEach(alParameter => {
            placeholderIdx++;
            xmlDocumentation += ALDocCommentUtil.GenerateParameterDocString(alParameter, placeholderIdx);
        });
        let jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(xmlDocumentation);
        let parameters: { alParameter: ALParameter | undefined; documentation: string; insertAtLineNo: number }[] = [];
        if (jsonDocumentation.param.length === undefined) {
            parameters.push({
                alParameter: alProcedure.Parameters!.find(alParameter => (alParameter.Name === jsonDocumentation.param.attr.name)),
                documentation: jsonDocumentation.param.value,
                insertAtLineNo: ALDocCommentUtil.GetXmlDocumentationNodeLineNo(editor, alProcedure.LineNo, 'param', 'name', jsonDocumentation.param.attr.name)
            });
        } else {
            jsonDocumentation.param.forEach((param: { attr: { name: string; }; value: string; }) => {
                parameters.push({
                    alParameter: alProcedure.Parameters!.find(alParameter => (alParameter.Name === param.attr.name)),
                    documentation: param.value,
                    insertAtLineNo: ALDocCommentUtil.GetXmlDocumentationNodeLineNo(editor, alProcedure.LineNo, 'param', 'name', param.attr.name)
                });
            });
        }

        let i = 0;
        let j = 0;
        parameters.forEach(parameter => {
            if (parameter.insertAtLineNo === -1) {
                if ((i === 0) || (parameters[i-1].insertAtLineNo === -1)) {
                    parameter.insertAtLineNo = ALDocCommentUtil.GetXmlDocumentationNodeLineNo(editor, alProcedure.LineNo, 'summary');
                } else {
                    parameter.insertAtLineNo = parameters[i-1].insertAtLineNo + j;
                }
                if (parameter.alParameter !== undefined) {
                    editor.insertSnippet(new SnippetString(`/// ${ALDocCommentUtil.GenerateParameterDocString(parameter.alParameter, i)}\r\n`), 
                        new Position(parameter.insertAtLineNo, ALDocCommentUtil.GetLineStartPosition(editor.document, parameter.insertAtLineNo)));
                }
                j++;
            }
            i++;
        });
    }

    public static FixReturnTypeDocumentation(editor: TextEditor | undefined, alProcedure: ALProcedure) {
        if (editor === undefined) {
            return;
        }

        if (!alProcedure.Return) {
            return;
        }

        let lineNo = this.FindLineNoToStartXmlDocumentation(editor, alProcedure, false);
        
        editor.insertSnippet(new SnippetString(
            `/// ${alProcedure.Return.XmlDocumentation.Documentation.replace('__idx__', '1').split('\r\n').join('\r\n/// ')}\r\n`),
            new Position(lineNo, ALDocCommentUtil.GetLineStartPosition(editor.document, lineNo))
        );
    }

    /**
     * Remove unnecessary parameter documentation from XML documentation.
     * @param editor {TextEditor}
     * @param alProcedure {ALProcedure}
     * @param range {Range} of the unnecessary parameter documentation.
     */
    public static FixUnnecessaryParameterDocumentation(editor: TextEditor | undefined, alProcedure: ALProcedure, range: Range) {
        if (editor === undefined) {
            return;
        }

        editor.edit(edit => {
            edit.delete(new Range(new Position(range.start.line - 1, this.GetLastCharacterOfLine(editor, range.start.line - 1)),new Position(range.end.line, range.end.character)));
        });
    }

    /**
     * Get last character position of a given line.
     * @param editor {TextEditor}
     * @param lineNo Line number to get the last character position from.
     */
    static GetLastCharacterOfLine(editor: TextEditor, lineNo: number): number {
        let codeLines: Array<string> = ALSyntaxUtil.SplitALCodeToLines(editor.document.getText());
        return codeLines[lineNo].length;
    }

    /**
     * Get line number to paste XML documentation for given ALProcedure. 
     * @param editor {TextEditor}
     * @param alProcedure {ALProcedure}
     */
    private static FindLineNoToStartXmlDocumentation(editor: TextEditor, alProcedure: ALProcedure, includeComments: boolean = true): number {
        let codeLines: Array<string> = ALSyntaxUtil.SplitALCodeToLines(editor.document.getText());
        let lineNo = 0;
        for (lineNo = alProcedure.LineNo - 1; lineNo > 0; lineNo--) {
            if (!codeLines[lineNo].trim().startsWith('[')) {
                if ((!codeLines[lineNo].trim().startsWith('///')) || (!includeComments)) {
                    break;
                }
            }
        }
        lineNo++;

        return lineNo;
    }

}