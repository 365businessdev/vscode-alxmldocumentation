import { languages, workspace } from "vscode";
import { ALHoverProvider } from "./util/ALHoverProvider";
import { ALSignatureHelpProvider } from './util/ALSignatureHelpProvider';

export class DoHover {    
    constructor() {    
        // check configuration for enabled Summary presentation
        if (workspace.getConfiguration("bdev-al-xml-doc").enableSummaryHover) {
            languages.registerHoverProvider('al', new ALHoverProvider());            
        }                
        // check configuration for enabled Parameter presentation
        // if (workspace.getConfiguration("bdev-al-xml-doc").enableSignatureHover) {
        //     languages.registerSignatureHelpProvider('al', new ALSignatureHelpProvider(), '(', ',');
        // }
    }

    public dispose() {
    }
}