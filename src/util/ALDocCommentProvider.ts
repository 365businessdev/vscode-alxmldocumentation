import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Location, Position, ProviderResult, SnippetString, TextDocument } from 'vscode';
import { ALObject } from '../types/ALObject';
import { ALObjectExtensionType } from '../types/ALObjectExtensionType';
import { ALObjectType } from '../types/ALObjectType';
import { ALProcedure } from '../types/ALProcedure';
import { ALDocCommentUtil } from './ALDocCommentUtil';
import { ALLangServerProxy } from './ALLangServerProxy';
import { ALSyntaxUtil } from './ALSyntaxUtil';
import { Configuration } from './Configuration';

export class ALDocCommentProvider implements CompletionItemProvider {
    private alXmlDocCompletionItems: Array<CompletionItem> = [];

    /**
     * Provide XML Documentation Completion Items (IntelliSense) based on triggering position.
     * @param document Actual Document.
     * @param position Trigger Position.
     * @param token CancellationToken.
     * @param context CompletionContext.
     */
    async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): Promise<CompletionItem[] | CompletionList<CompletionItem> | null | undefined> {        
        this.alXmlDocCompletionItems = [];

        if (!Configuration.IntelliSenseDocumentationIsEnabled(document.uri)) {
            return;
        }
        
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
            
            await this.ProvideALProcedureCompletionItems(alObject, alProcedure);
        }

        return this.alXmlDocCompletionItems;
    }

    /**
     * Provide XML Documentation Completion Items for AL Procedure.
     * @param alObject ALObject.
     * @param alProcedure ALProcedure.
     */
    async ProvideALProcedureCompletionItems(alObject: ALObject, alProcedure: ALProcedure) {
        this.AddXmlDocCompletionItem(alProcedure);

        try {
            if ((alObject.ExtensionType === ALObjectExtensionType.Implement) && (alObject.ExtensionObject !== undefined)) {                
                this.AddInheritXmlDocCompletionItem(alObject, alProcedure);

                let inheritObjLocation: Array<Location> | undefined = await ALSyntaxUtil.GetObjectDefinition(ALObjectType.Interface, alObject.ExtensionObject);
                if ((inheritObjLocation === undefined) || (inheritObjLocation.length === 0)) {
                    return;
                }
                await this.AddXmlDocFromInterfaceCompletionItem(inheritObjLocation, alProcedure);
            }
        } catch {
            return;
        }
    }

    /**
     * Add Completion Item for class XML Documentation snippet.
     * @param alProcedure ALProcedure to document.
     */
    private AddXmlDocCompletionItem(alProcedure: ALProcedure) {
        const completionItem: CompletionItem = new CompletionItem(
            'AL XML Documentation Comment',
            CompletionItemKind.Text
        );

        let snippetText: string = ALDocCommentUtil.GetProcedureDocumentation(alProcedure);

        const snippet: SnippetString = new SnippetString(snippetText.replace('///', '')); // delete leading '///'. The trigger character is already in the document when the completion provider is triggered.
        completionItem.insertText = snippet;
        completionItem.documentation = snippetText;
        completionItem.detail = 'XML documentation comment to document AL procedures.';
        completionItem.sortText = '1';

        this.alXmlDocCompletionItems.push(completionItem);
    }

    /**
     * Add Completion Item for copying XML Documentation from Interface Procedure.
     * @param inheritObjLocation Location of Interface Object.
     * @param alProcedure AL Procedure to document.
     */
    private async AddXmlDocFromInterfaceCompletionItem(inheritObjLocation: Location[], alProcedure: ALProcedure) {
        try {
            const alLangServer = new ALLangServerProxy();
            const alDefinition = await alLangServer.GetALObjectFromDefinition(inheritObjLocation[0].uri.toString(), inheritObjLocation[0].range.start);
            if ((alDefinition !== undefined) && (alDefinition.ALObject !== null)) {
                let inheritALProcedure: ALProcedure | undefined = alDefinition.ALObject.Procedures?.find(inheritALProcedure => (inheritALProcedure.Code === alProcedure?.Code));
                if (inheritALProcedure !== undefined) {

                    const inheritCompletionItem2: CompletionItem = new CompletionItem(
                        'AL XML Documentation Interface Comment',
                        CompletionItemKind.Text
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
        } catch(ex) {
            console.error(`[AddXmlDocFromInterfaceCompletionItem] - ${ex} Please report this Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues`);
            return undefined;
        }

    }

    /**
     * Add Completion Item for "inheritdoc" XML Comment.
     * @param alObject ALObject.
     * @param alProcedure AL Procedure to document.
     */
    private AddInheritXmlDocCompletionItem(alObject: ALObject, alProcedure: ALProcedure) {
        const inheritCompletionItem: CompletionItem = new CompletionItem(
            'Inherit AL XML Documentation Comment',
            CompletionItemKind.Text
        );

        inheritCompletionItem.detail = 'XML documentation comment to document inherit AL procedures.';
        let snippetText: string = `/// <inheritdoc cref="${alProcedure.Code}"/>`;
        const snippet: SnippetString = new SnippetString(snippetText.replace('///', '')); // delete leading '///'. The trigger character is already in the document when the completion provider is triggered.
        inheritCompletionItem.insertText = snippet;
        inheritCompletionItem.documentation = snippetText;
        inheritCompletionItem.sortText = '1';
        this.alXmlDocCompletionItems.push(inheritCompletionItem);
    }

    /**
     * Provide XML Documentation Completion Items for AL Object.
     * @param alObject ALObject.
     */
    private ProvideALObjectCompletionItems(alObject: ALObject) {               
        const completionItem: CompletionItem = new CompletionItem(
            'AL XML Documentation Comment',
            CompletionItemKind.Text
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