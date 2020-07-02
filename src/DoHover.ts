import { languages, workspace } from "vscode";
import { ALHoverProvider } from "./util/ALHoverProvider";

export class DoHover {    
    constructor() {    
        // check configuration for enabled Summary presentation
        if (workspace.getConfiguration("bdev-al-xml-doc").enableSummaryHover) {
            languages.registerHoverProvider('al', new ALHoverProvider());            
        }
    }

    public dispose() {
    }
}