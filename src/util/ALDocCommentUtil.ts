import { isNullOrUndefined } from "util";
import { TextDocument, TextEditor } from "vscode";
import { VSCodeApi } from "../api/VSCodeApi";
import { ALSyntaxUtil } from "./ALSyntaxUtil";

export class ALDocCommentUtil {
    public static GetJsonFromXmlDocumentation(xmlDocumentation: string): any {        
        // transform xml to json
        var parser = require('fast-xml-parser');
        var options = {
            attributeNamePrefix : "",
            attrNodeName: "attr",
            textNodeName : "value",
            ignoreAttributes : false,
            ignoreNameSpace : true,
            parseAttributeValue : true
        };
        try {
            var jsonDocumentation = parser.parse(`<?xml version="1.0."?><root>${xmlDocumentation}</root>`, options, true);
        } catch(ex) {
            return;
        }

        return jsonDocumentation.root;
    }

    public static GetXmlDocumentationNode(xmlDocumentation: string, xmlNode: string, attrName: string = "", attrValue: string = ""): string {
        let isTag: boolean = false;
        let docNode: string = "";
        xmlDocumentation.split("\n").forEach(line => {
            if (attrName !== "") {
                if (line.includes(`<${xmlNode} ${attrName}="${attrValue}">`)) {
                    isTag = true;
                }
            } else {
                if (line.includes(`<${xmlNode}>`)) {
                    isTag = true;
                }
            }
            if (isTag) {
                if (docNode !== "") {
                    docNode = `${docNode}\n`;
                }
                docNode = `${docNode}${line}`;
            }
            if (line.includes(`</${xmlNode}>`)) {
                isTag = false;
            }
        });

        return docNode;
    }

    public static GetXmlDocumentationNodeLineNo(editor: TextEditor, startingLineNo: number = -1, nodeName: string, attrName: string = "", attrValue: string = ""): number { 
        let paramEndLineNo: number = -1;

        if (startingLineNo === -1) {
            let vsCodeApi = new VSCodeApi(editor); 
            startingLineNo = vsCodeApi.GetActivePosition().line;
        }

        let alCode = editor.document.getText().replace(/\r/g,'').split('\n');    
        for (let lineNo = startingLineNo - 1; lineNo > 0; lineNo--) {
            let line = alCode[lineNo];
            switch (true) {
                case ALSyntaxUtil.IsObject(line):
                case ALSyntaxUtil.IsProcedure(line, (lineNo > 0) ? alCode[lineNo - 1] : ""):
                case ALSyntaxUtil.IsBeginEnd(line):
                    return -1;
                default:
                    if (line.includes(`</${nodeName}>`)) {
                        paramEndLineNo = lineNo;
                    }

                    if (attrName !== "") {
                        if (line.includes(`<${nodeName} ${attrName}="${attrValue}">`)) {
                            return paramEndLineNo + 1;
                        }
                    } else {
                        if (line.includes(`<${nodeName}>`)) {
                            return paramEndLineNo + 1;
                        }
                    }
                    break;
            }
        }
        return -1;
    }

    public static GetFirstXmlDocumentationLineNo(editor: TextEditor, startingLineNo: number = -1): number { 
        if (startingLineNo === -1) {
            let vsCodeApi = new VSCodeApi(editor); 
            startingLineNo = vsCodeApi.GetActivePosition().line;
        }

        let isInsideDoc: boolean = false;
        let alCode = editor.document.getText().replace(/\r/g,'').split('\n');    
        for (let lineNo = startingLineNo - 1; lineNo > 0; lineNo--) {
            let line = alCode[lineNo];
            switch (true) {
                case ALSyntaxUtil.IsObject(line):
                case ALSyntaxUtil.IsProcedure(line, (lineNo > 0) ? alCode[lineNo - 1] : ""):
                case ALSyntaxUtil.IsBeginEnd(line):
                    if (!isInsideDoc) {
                        return -1; // should never happen
                    } else {
                        return lineNo + 1;
                    }
                case line.includes('///'):
                    isInsideDoc = true;
                    break;
                case !line.includes('///'):
                    if (isInsideDoc) {
                        return lineNo + 1;
                    }
                    break;
            }
        }
        return -1;
    }

    public static GetLastXmlDocumentationLineNo(editor: TextEditor, startingLineNo: number = -1): number { 
        if (startingLineNo === -1) {
            let vsCodeApi = new VSCodeApi(editor); 
            startingLineNo = vsCodeApi.GetActivePosition().line;
        }

        let alCode = editor.document.getText().replace(/\r/g,'').split('\n');    
        for (let lineNo = startingLineNo - 1; lineNo > 0; lineNo--) {
            let line = alCode[lineNo];
            if (line.includes('///')) {
                return lineNo + 1;
            }
        }
        return -1;
    }

    public static GetLineStartPosition(document: TextDocument, lineNo: number): number {
        let alCode = document.getText().replace(/\r/g,'').split('\n');
        return ((alCode[lineNo].length) - (alCode[lineNo].trim().length));
    }

    public static GenerateObjectDocString(groups: { [key: string]: string; }): string {
        let docString = "";

        // format object type
        if (groups['ObjectType'].indexOf('extension') !== -1) {
            groups['ObjectType'] = groups['ObjectType'].replace('extension', ' extension');
        }
        groups['ObjectType'] = groups['ObjectType'].replace(/(\w)(\w*)/g, function(g0,g1,g2){return g1.toUpperCase() + g2.toLowerCase();});

        docString += "/// <summary> \n";
        docString += "/// ${1:" + groups['ObjectType'] + " " + groups['ObjectName'] ;
        if (!isNullOrUndefined(groups['ObjectID'])) {
            docString += " (ID " + groups['ObjectID'] + ")";
        }
        docString += ".}\n";
        docString += "/// </summary>";

        return docString;
    }

    public static GenerateProcedureDocString(groups: { [key: string]: string; }): string {
        let docString = "";
        let placeholderIdx = 0;

        if (!isNullOrUndefined(groups['ProcedureName'])) {
            placeholderIdx++;

            docString += "/// <summary> \n";
            docString += "/// ${" + placeholderIdx + ":Description for " + groups['ProcedureName'] + ".}\n";
            docString += "/// </summary>";
        }   

        if ((!isNullOrUndefined(groups['Params'])) && (groups['Params'] !== "")) {
            let paramDefinitions = groups['Params'].split(';');
            paramDefinitions.forEach(paramDefinition => {
                placeholderIdx++;

                paramDefinition = paramDefinition.trim();
                let param = paramDefinition.split(':');
                let paramName = param[0].trim();
                if (paramName.indexOf('var') !== -1) {
                    paramName = paramName.substring(paramName.indexOf('var') + 4);
                }
                let paramDataType = param[1].trim();

                docString += "\n";
                docString += "/// <param name=\"" + paramName.replace(/"/g,"") + "\">";
                docString += "${" + placeholderIdx + ":Parameter of type " + paramDataType + ".}";
                docString += "</param>";
            });
        }

        if (!isNullOrUndefined(groups['ReturnType'])) {
            placeholderIdx++;
            let returnTypeDefinition = groups['ReturnType'].split(':');
            
            docString += "\n";
            docString += "/// ";
            docString += "<returns>";
            docString += "${" + placeholderIdx + ":";
            if ((!isNullOrUndefined(returnTypeDefinition[0])) && (returnTypeDefinition[0] !== "")) {
                docString += "Return variable \"" + returnTypeDefinition[0].trim() + "\"";
            } else {
                docString += "Return value";
            }

            if ((!isNullOrUndefined(returnTypeDefinition[1])) && (returnTypeDefinition[1] !== "")) {
                docString += " of type " + returnTypeDefinition[1].trim();
            }
            docString += ".}";
            docString += "</returns>";
        }

        return docString;
    }
}