import { languages } from "vscode";
import { ALDocCommentProvider } from "./util/ALDocCommentProvider";
import { ALHoverProvider } from "./util/ALHoverProvider";

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
    }    

    public dispose() { }
}