import { HoverProvider, TextDocument, Position, CancellationToken, workspace, Hover } from "vscode";
import { ALLangServerProxy } from "./ALLangServerProxy";
import { ALSyntaxUtil } from "./ALSyntaxUtil";
import { ALDocCommentUtil } from "./ALDocCommentUtil";
import { isNullOrUndefined } from "util";

export class ALHoverProvider implements HoverProvider {
    async provideHover(document: TextDocument, position: Position, token: CancellationToken) {   
        // retrieve source code from language server
        let alLangServerProxy = new ALLangServerProxy();     
        const alSourceCode = await alLangServerProxy.GetALSourceCode(document.uri.toString(), position);
        if (alSourceCode === undefined) {
            return;
        }
        
        // extract xml documentation if exist (search backwards from line no given by GoToDefinition)
        var docBuffer = '';
        let alSourceCodeLines = alSourceCode.value.split(/\r\n|\r|\n/);
        for (var i = (alSourceCode.pos.line - 1); (i > 0); i--) {
            let line = alSourceCodeLines[i];
            if (line.trim().startsWith('///')) {
                docBuffer = `${line.replace('///','').trim()}\r\n${docBuffer}`;
            }
            if ((ALSyntaxUtil.IsProcedure(line)) || (ALSyntaxUtil.IsObject(line))) {
                break;
            }
        }
        if (docBuffer === '') {
            return;
        }

        let jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(docBuffer);
        // build hover text with summary
        let hoverText: string[] = [];
        if ((jsonDocumentation.summary) && (jsonDocumentation.summary !== "")) {
            hoverText.push(jsonDocumentation.summary);
        } else {
            return; // don't show w/o summary
        }

        if ((jsonDocumentation.remarks) && (jsonDocumentation.remarks !== "")) {
            hoverText.push(`**Remarks:** ${jsonDocumentation.remarks}`);
        } 

        if (!isNullOrUndefined(hoverText)) {
            return new Hover(hoverText);
        } else {
            return;
        }
    }
    
}