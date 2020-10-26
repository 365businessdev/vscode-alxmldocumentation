import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Position, ProviderResult, SnippetString, TextDocument } from "vscode";
import { ALObjectCache } from "../ALObjectCache";
import { ALObject } from "../types/ALObject";
import { ALObjectExtensionType } from "../types/ALObjectExtensionType";
import { ALObjectType } from "../types/ALObjectType";
import { ALProcedure } from "../types/ALProcedure";
import { ALDocCommentUtil } from "./ALDocCommentUtil";
import { ALSyntaxUtil } from "./ALSyntaxUtil";

export class ALDocCommentProvider implements CompletionItemProvider {
    private alXmlDocCompletionItems: Array<CompletionItem> = [];

    /**
     * Provide XML Documentation Completion Items (IntelliSense) based on triggering position.
     * @param document Actual Document.
     * @param position Trigger Position.
     * @param token CancellationToken.
     * @param context CompletionContext.
     */
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {        
        if (context.triggerCharacter === undefined) {
            return;
        }
        
        let activeLine = ALSyntaxUtil.SplitALCodeToLines(document.getText())[position.line];
        if (activeLine.match(/^[ \t]*\/{3}[ \t]*$/) === null) {
            return;
        }        

        let alObject: ALObject | null = ALSyntaxUtil.GetALObject(document);
        if (alObject === null) {
            return;
        }

        if (alObject.LineNo > position.line) {     
            this.ProvideALObjectCompletionItems(alObject);
        } else {
            // find procedure
            let alProcedure: ALProcedure | undefined = alObject.Procedures?.find(alProcedure => (alProcedure.LineNo > position.line));
            if (!alProcedure) {
                return;
            }
            
            this.ProvideALProcedureCompletionItems(alObject, alProcedure);
        }

        return this.alXmlDocCompletionItems;
    }

    /**
     * Provide XML Documentation Completion Items for AL Procedure.
     * @param alObject ALObject.
     * @param alProcedure ALProcedure.
     */
    ProvideALProcedureCompletionItems(alObject: ALObject, alProcedure: ALProcedure) {
        const completionItem: CompletionItem = new CompletionItem(
            'AL XML Documentation Comment',
            CompletionItemKind.Snippet
        );

        let snippetText: string = ALDocCommentUtil.GetProcedureDocumentation(alProcedure);
        
        const snippet: SnippetString = new SnippetString(snippetText.replace('///', '')); // delete leading '///'. The trigger character is already in the document when the completion provider is triggered.
        completionItem.insertText = snippet;
        completionItem.documentation = snippetText;
        completionItem.detail = 'XML documentation comment to document AL procedures.';
        completionItem.sortText = '1';

        this.alXmlDocCompletionItems.push(completionItem);

        if ((alObject.ExtensionType === ALObjectExtensionType.Implement) && (alObject.ExtensionObject !== undefined)) {
            const inheritCompletionItem: CompletionItem = new CompletionItem(
                'Inherit AL XML Documentation Comment',
                CompletionItemKind.Snippet
            );

            inheritCompletionItem.detail = 'XML documentation comment to document inherit AL procedures.';
            let snippetText: string = `/// <inheritdoc cref="${alObject.ExtensionObject}.${alProcedure.Name}"/>`;
            const snippet: SnippetString = new SnippetString(snippetText.replace('///', '')); // delete leading '///'. The trigger character is already in the document when the completion provider is triggered.
            inheritCompletionItem.insertText = snippet;
            inheritCompletionItem.documentation = snippetText;
            inheritCompletionItem.sortText = '1';
            this.alXmlDocCompletionItems.push(inheritCompletionItem);

            let inheritALObject: ALObject | null = ALSyntaxUtil.GetALObjectFromCache(ALObjectType.Interface, alObject.ExtensionObject);
            if (inheritALObject !== null) {
                // TODO: Support procedure overload
                let inheritALProcedure : ALProcedure | undefined = inheritALObject.Procedures?.find(inheritALProcedure => (inheritALProcedure.Name === alProcedure?.Name));
                if (inheritALProcedure !== undefined) {
        
                    const inheritCompletionItem2: CompletionItem = new CompletionItem(
                        'AL XML Documentation Interface Comment',
                        CompletionItemKind.Snippet
                    );
            
                    let snippetText: string = ALDocCommentUtil.GetProcedureDocumentation(inheritALProcedure);
                    
                    const snippet: SnippetString = new SnippetString(snippetText.replace('///', '')); // delete leading '///'. The trigger character is already in the document when the completion provider is triggered.
                    inheritCompletionItem2.insertText = snippet;
                    inheritCompletionItem2.documentation = snippetText;            
                    inheritCompletionItem2.detail = 'XML documentation interface comment.';
                    inheritCompletionItem2.sortText = '1';
            
                    this.alXmlDocCompletionItems.push(inheritCompletionItem2);
                }
            }
        }
    }

    /**
     * Provide XML Documentation Completion Items for AL Object.
     * @param alObject ALObject.
     */
    private ProvideALObjectCompletionItems(alObject: ALObject) {               
        const completionItem: CompletionItem = new CompletionItem(
            'AL XML Documentation Comment',
            CompletionItemKind.Snippet
        );

        let snippetText: string = ALDocCommentUtil.GetObjectDocumentation(alObject);
        const snippet: SnippetString = new SnippetString(snippetText.replace('///', '')); // delete leading '///'. The trigger character is already in the document when the completion provider is triggered.
        completionItem.insertText = snippet;

        completionItem.detail = 'XML documentation comment to document AL objects.';
        completionItem.documentation = snippetText;
        completionItem.sortText = '1';

        this.alXmlDocCompletionItems.push(completionItem);

        return this.alXmlDocCompletionItems;
    }
    
}