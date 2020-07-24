import { languages, workspace } from "vscode";
import { ALHoverProvider } from "./util/ALHoverProvider";
import { ALSignatureHelpProvider } from './util/ALSignatureHelpProvider';
import { Configuration } from "./util/Configuration";

export class DoHover {    
    constructor() {    
        // check configuration for enabled Summary presentation
        if (Configuration.SummaryHoverIsEnabled()) {
            languages.registerHoverProvider('al', new ALHoverProvider());            
        }                
        // check configuration for enabled Parameter presentation
        // if (Configuration.SignatureHoverIsEnabled()) {
        //     languages.registerSignatureHelpProvider('al', new ALSignatureHelpProvider(), '(', ',');
        // }
    }

    public dispose() {
    }
}