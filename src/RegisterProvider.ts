import { languages } from "vscode";
import { ALDocCommentProvider } from "./util/ALDocCommentProvider";
import { ALHoverProvider } from "./util/ALHoverProvider";
import { ALInheritDocDefinitionProvider } from "./util/ALInheritDocDefinitionProvider";

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
    }

    public dispose() {

     }
}