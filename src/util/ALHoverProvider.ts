import { CancellationToken, Hover, HoverProvider, MarkdownString, Position, TextDocument } from "vscode";
import { ALProcedure } from "../types/ALProcedure";
import { ALDocCommentUtil } from "./ALDocCommentUtil";
import { ALLangServerProxy } from "./ALLangServerProxy";

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
        if ((alProcedure === undefined) || (!alProcedure.XmlDocumentation.DocumentationExists)) {
            return; // not found
        }

        let jsonDocumentation: any;
        if (alProcedure.XmlDocumentation.DocumentationExists) {
            // convert XML Documentation to more readable JSON object.
            jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedure.XmlDocumentation.Documentation);
            // AL Language Version 6.x is providing simple XML Documentation capabilities. Do not push procedure summary in this case.
            if (alLangServerProxy.GetALExtension()?.packageJSON.version < "6.0.0") {
                // add Summary to hover message.
                if ((jsonDocumentation.summary) && (jsonDocumentation.summary !== "")) {
                    result.appendMarkdown(`${jsonDocumentation.summary} \r\n`);
                } else {
                    return; // don't show w/o summary
                }
            }
            // add Remarks to hover message.
            if ((jsonDocumentation.remarks) && (jsonDocumentation.remarks.trim() !== "")) {
                // result.appendMarkdown(`#### Remarks \r\n`);
                result.appendMarkdown(`*${jsonDocumentation.remarks}*  \r\n`);
            } 
        }

        // add Return to hover message.
        if ((alProcedure.Return !== undefined) && (alProcedure.Return.XmlDocumentation.DocumentationExists)) {
            // convert XML Documentation to more readable JSON object.
            jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedure.Return.XmlDocumentation.Documentation)
            if ((jsonDocumentation.returns) && (jsonDocumentation.returns.trim() !== "")) {
                // result.appendMarkdown(`#### Returns \r\n`);
                result.appendMarkdown(`${jsonDocumentation.returns} \r\n`);
            }
        }
        
        // add Example to hover message.
        if (alProcedure.XmlDocumentation.DocumentationExists) {
            // convert XML Documentation to more readable JSON object.
            jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedure.XmlDocumentation.Documentation);
            if (jsonDocumentation.example) {
                result.appendMarkdown(`#### Example \r\n`);
                result.appendMarkdown(`${jsonDocumentation.example.value} \r\n`);
                result.appendCodeblock(jsonDocumentation.example.code);
            }
        }

        if (result.value !== "") {
            return new Hover(result);
        }
    }
}