import { CancellationToken, Hover, HoverProvider, Location, MarkdownString, Position, TextDocument } from 'vscode';
import { ALProcedure } from '../types/ALProcedure';
import { ALDocumentationExists } from '../types/ALDocumentationExists';
import { ALDocCommentUtil } from './ALDocCommentUtil';
import { ALLangServerProxy } from './ALLangServerProxy';

export class ALHoverProvider implements HoverProvider {
    async provideHover(document: TextDocument, position: Position, token: CancellationToken) {   
        let result: MarkdownString = new MarkdownString();

        // retrieve source code from language server
        let alLangServerProxy = new ALLangServerProxy();     
        const alDefinition = await alLangServerProxy.GetALObjectFromDefinition(document.uri.toString(), position);
        if ((alDefinition === undefined) || (alDefinition.ALObject === null)) {
            return;
        }

        // find AL procedure by line no.
        let alProcedure: ALProcedure | undefined = alDefinition.ALObject.Procedures?.find(procedure => procedure.LineNo === alDefinition.Position.line);
        if ((alProcedure === undefined) || (alProcedure.ALDocumentation.Exists === ALDocumentationExists.No)) {
            return; // not found
        }

        let jsonDocumentation: any = await alDefinition.ALObject.GetDocumentationAsJsonObject(alProcedure);                
        // AL Language Version 6.x is providing simple XML Documentation capabilities. Do not push procedure summary in this case.
        if ((alLangServerProxy.GetALExtension()?.packageJSON.version < '6.0.0') || (alProcedure.ALDocumentation.Exists === ALDocumentationExists.Inherit)) {
            // add Summary to hover message.
            if ((jsonDocumentation.summary) && (jsonDocumentation.summary !== '')) {
                result.appendMarkdown(`${jsonDocumentation.summary} \n`);
            } else {
                return; // don't show w/o summary
            }
        }
        // add Remarks to hover message.
        if ((jsonDocumentation.remarks) && (jsonDocumentation.remarks.trim() !== '')) {
            result.appendMarkdown(`*${jsonDocumentation.remarks}*  \n`);
        } 

        // add Return to hover message.
        if ((alProcedure.Return !== undefined) && (alProcedure.Return.ALDocumentation.Exists === ALDocumentationExists.Yes)) {
            // convert XML Documentation to more readable JSON object.
            let returnDocumentation = ALDocCommentUtil.GetJsonFromALDocumentation(alProcedure.Return.ALDocumentation.Documentation);
            if ((returnDocumentation.returns) && (returnDocumentation.returns.trim() !== '')) {
                result.appendMarkdown(`${returnDocumentation.returns} \n`);
            }
        }
        
        // add Example to hover message.
        if (jsonDocumentation.example) {
            result.appendMarkdown(`#### Example \n`);
            result.appendMarkdown(`${jsonDocumentation.example.value} \n`);
            result.appendCodeblock(jsonDocumentation.example.code);
        }

        if (result.value !== '') {
            return new Hover(result);
        }
    }
}