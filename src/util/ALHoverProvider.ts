import { CancellationToken, Hover, HoverProvider, Position, ProviderResult, TextDocument } from "vscode";
import { ALDocCommentUtil } from "./ALDocCommentUtil";
import { ALLangServerProxy } from "./ALLangServerProxy";
import { ALSyntaxUtil } from "./ALSyntaxUtil";

export class ALHoverProvider implements HoverProvider {
    async provideHover(document: TextDocument, position: Position, token: CancellationToken) {   

        // retrieve source code from language server
        let alLangServerProxy = new ALLangServerProxy();     
        const alSourceCode = await alLangServerProxy.GetALSourceCode(document.uri.toString(), position);
        if (alSourceCode === undefined) {
            console.debug(`Unable to retrieve Source Code for ${document.fileName} at Position ${position} from Language Server.`);
            return;
        }
        
        // extract xml documentation if exist (search backwards from line no given by GoToDefinition)
        var xmlDocumentation = '';
        let alSourceCodeLines = ALSyntaxUtil.SplitALCodeToLines(alSourceCode.value);
        for (var i = (alSourceCode.pos.line - 1); (i > 0); i--) {
            let line = alSourceCodeLines[i];
            if (line.trim().startsWith('///')) {
                xmlDocumentation = `${line.replace('///','').trim()}\r\n${xmlDocumentation}`;
            }
            if ((ALSyntaxUtil.IsProcedureDefinition(line)) || (ALSyntaxUtil.IsObjectDefinition(line)) || (ALSyntaxUtil.IsBeginEnd(line))) {
                break;
            }
        }
        if (xmlDocumentation === '') {
            console.debug('Nothing found.');
            return;
        }

        // convert XML Documentation to more readable JSON object.
        let jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(xmlDocumentation);

        // build hover text with summary
        let hoverText: string[] = [];

        // AL Language Version 6.x is providing simple XML Documentation capabilities. Do not push procedure summary in this case.
        if (alLangServerProxy.GetALExtension()?.packageJSON.version < "6.0.0") {
            if ((jsonDocumentation.summary) && (jsonDocumentation.summary !== "")) {
                hoverText.push(jsonDocumentation.summary);
            } else {
                return; // don't show w/o summary
            }
        }

        // add Return to hover message.
        if ((jsonDocumentation.returns) && (jsonDocumentation.returns.trim() !== "")) {
            hoverText.push(`Returns: ${jsonDocumentation.return}`);
        }

        // add Remarks to hover message.
        if ((jsonDocumentation.remarks) && (jsonDocumentation.remarks.trim() !== "")) {
            hoverText.push(`Remarks: ${jsonDocumentation.remarks}`);
        } 

        if (hoverText.length > 0) {
            return new Hover(hoverText);
        } else {
            return;
        }
    }
}