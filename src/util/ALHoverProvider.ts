import { CancellationToken, Hover, HoverProvider, Location, MarkdownString, Position, TextDocument } from 'vscode';
import { ALObjectType } from '../types/ALObjectType';
import { ALProcedure } from '../types/ALProcedure';
import { XMLDocumentationExistType } from '../types/XMLDocumentationExistType';
import { ALDocCommentUtil } from './ALDocCommentUtil';
import { ALLangServerProxy } from './ALLangServerProxy';
import { ALSyntaxUtil } from './ALSyntaxUtil';

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
        if ((alProcedure === undefined) || (alProcedure.XmlDocumentation.Exists === XMLDocumentationExistType.No)) {
            return; // not found
        }

        let jsonDocumentation: any;
        // convert XML Documentation to more readable JSON object.
        jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedure.XmlDocumentation.Documentation);

        switch (alProcedure.XmlDocumentation.Exists) {
            case XMLDocumentationExistType.Yes:
                
                // AL Language Version 6.x is providing simple XML Documentation capabilities. Do not push procedure summary in this case.
                if (alLangServerProxy.GetALExtension()?.packageJSON.version < '6.0.0') {
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
                if ((alProcedure.Return !== undefined) && (alProcedure.Return.XmlDocumentation.Exists === XMLDocumentationExistType.Yes)) {
                    // convert XML Documentation to more readable JSON object.
                    jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedure.Return.XmlDocumentation.Documentation);
                    if ((jsonDocumentation.returns) && (jsonDocumentation.returns.trim() !== '')) {
                        result.appendMarkdown(`${jsonDocumentation.returns} \n`);
                    }
                }
                
                // add Example to hover message.
                if (alProcedure.XmlDocumentation.Exists === XMLDocumentationExistType.Yes) {
                    // convert XML Documentation to more readable JSON object.
                    jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedure.XmlDocumentation.Documentation);
                    if (jsonDocumentation.example) {
                        result.appendMarkdown(`#### Example \n`);
                        result.appendMarkdown(`${jsonDocumentation.example.value} \n`);
                        result.appendCodeblock(jsonDocumentation.example.code);
                    }
                }
                break;
            case XMLDocumentationExistType.Inherit:
                if ((jsonDocumentation.inheritdoc !== undefined) && (jsonDocumentation.inheritdoc.attr.cref !== undefined)) {
                    let codeRef: string = jsonDocumentation.inheritdoc.attr.cref; // Pattern: <Interface Name>.<Procedure Name>
                    let codeRefFound: boolean = false;

                    // split code reference.
                    let codeRefObjectName: string = codeRef.split('.')[0];
                    let codeRefProcedureCode: string = codeRef.split('.')[1];

                    let objDefinition: Array<Location> | undefined = await ALSyntaxUtil.GetObjectDefinition(ALObjectType.Interface, codeRefObjectName);
                    if (objDefinition !== undefined) {
                        const alLangServer = new ALLangServerProxy();
                        const alDefinition = await alLangServer.GetALObjectFromDefinition(objDefinition[0].uri.toString(), objDefinition[0].range.start);
                        if ((alDefinition !== undefined) && (alDefinition.ALObject !== null)) {
                            let codeRefProcedure: ALProcedure | undefined = alDefinition.ALObject.Procedures?.find(codeRefProcedure => (codeRefProcedure.Code === codeRefProcedureCode));
                            if (codeRefProcedure !== undefined) {
                                codeRefFound = true;
                                result.appendMarkdown(`*Inherit documentation from ${codeRefProcedure.Name} in ${ALObjectType[alDefinition.ALObject.Type]} ${alDefinition.ALObject.Name}.*  \n`);

                                jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(codeRefProcedure.XmlDocumentation.Documentation);
                                if ((jsonDocumentation.summary) && (jsonDocumentation.summary !== '')) {
                                    result.appendMarkdown(`${jsonDocumentation.summary}  \n`);
                                }
                                if ((jsonDocumentation.remarks) && (jsonDocumentation.remarks.trim() !== '')) {
                                    // result.appendMarkdown(`#### Remarks \n`);
                                    result.appendMarkdown(`*${jsonDocumentation.remarks}*  \n`);
                                } 
                                if ((codeRefProcedure.Return !== undefined) && (codeRefProcedure.Return.XmlDocumentation.Exists === XMLDocumentationExistType.Yes)) {
                                    // convert XML Documentation to more readable JSON object.
                                    jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(codeRefProcedure.Return.XmlDocumentation.Documentation);
                                    if ((jsonDocumentation.returns) && (jsonDocumentation.returns.trim() !== '')) {
                                        // result.appendMarkdown(`#### Returns \n`);
                                        result.appendMarkdown(`Returns: ${jsonDocumentation.returns}  \n`);
                                    }
                                }
                                if (codeRefProcedure.XmlDocumentation.Exists === XMLDocumentationExistType.Yes) {
                                    // convert XML Documentation to more readable JSON object.
                                    jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(codeRefProcedure.XmlDocumentation.Documentation);
                                    if (jsonDocumentation.example) {
                                        result.appendMarkdown(`  \n`);
                                        result.appendMarkdown(`**Example**  \n`);
                                        result.appendMarkdown(`${jsonDocumentation.example.value}  \n`);
                                        result.appendCodeblock(jsonDocumentation.example.code);
                                    }
                                }
                            }
                        }
                    } 

                    if (!codeRefFound) {
                        result.appendMarkdown(`Inherit documentation from ${jsonDocumentation.inheritdoc.attr.cref}. \n`);
                    }
                }
                break;
        }

        if (result.value !== '') {
            return new Hover(result);
        }
    }
}