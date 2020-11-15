import { commands, window, languages, Range } from 'vscode';
import { ALXmlDocConfigurationPrefix } from './types';
import { ALProcedure } from './types/ALProcedure';
import { ALDocCommentProvider } from './util/ALDocCommentProvider';
import { ALDocumentationQuickFixProvider } from './util/ALDocumentationQuickFix';
import { ALFixDocumentation } from './util/ALFixDocumentation';
import { ALHoverProvider } from './util/ALHoverProvider';
import { ALInheritDocDefinitionProvider } from './util/ALInheritDocDefinitionProvider';

export class RegisterProvider {

    /**
     * RegisterProvider constructor.
     */
    constructor() {
        /**
         * ALHoverProvider is providing Tooltip information for procedures and objects.
         */
        languages.registerHoverProvider({
            scheme: 'file',
            language: 'al'
        }, new ALHoverProvider());

        /**
         * ALDocCommentProvider is providing AL XML documentation templates after typing '///'.
         */
        languages.registerCompletionItemProvider({
            scheme: 'file',
            language: 'al'
        }, new ALDocCommentProvider(),
        '/');

        /**
         * ALInheritDocDefinitionProvider is providing AL XML documentation for inherit objects.
         */
        languages.registerDefinitionProvider({
            scheme: 'file',
            language: 'al'
        }, new ALInheritDocDefinitionProvider());

        /**
         * ALDocumentationQuickFixProvider is providing CodeActions to fix broken or missing XML documentations.
         */
        languages.registerCodeActionsProvider({
            scheme: 'file',
            language: 'al'
        }, new ALDocumentationQuickFixProvider());

        this.RegisterCodeActions();
    }

    private RegisterCodeActions() {        
        commands.registerCommand(`${ALXmlDocConfigurationPrefix}.fixDocumentation`, ( alProcedure: ALProcedure ) => {
            ALFixDocumentation.FixDocumentation(window.activeTextEditor, alProcedure);
        });
        commands.registerCommand(`${ALXmlDocConfigurationPrefix}.fixSummaryDocumentation`, ( alProcedure: ALProcedure ) => {
            ALFixDocumentation.FixSummaryDocumentation(window.activeTextEditor, alProcedure);
        });
        commands.registerCommand(`${ALXmlDocConfigurationPrefix}.fixParameterDocumentation`, ( alProcedure: ALProcedure ) => {
            ALFixDocumentation.FixParameterDocumentation(window.activeTextEditor, alProcedure);
        });
        commands.registerCommand(`${ALXmlDocConfigurationPrefix}.fixReturnDocumentation`, ( alProcedure: ALProcedure ) => {
            ALFixDocumentation.FixReturnTypeDocumentation(window.activeTextEditor, alProcedure);
        });
        commands.registerCommand(`${ALXmlDocConfigurationPrefix}.fixUnnecessaryParameterDocumentation`, ( alProcedure: ALProcedure, range: Range ) => {
            ALFixDocumentation.FixUnnecessaryParameterDocumentation(window.activeTextEditor, alProcedure, range);
        });

    }

    public dispose() {

     }
}