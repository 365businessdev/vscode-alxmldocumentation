import { languages } from "vscode";
import { ALHoverProvider } from "./util/ALHoverProvider";

export class DoHover {

    /**
     * DoHover constructor.
     */
    constructor() {
        languages.registerHoverProvider('al', new ALHoverProvider());
    }    

    public dispose() { }
}