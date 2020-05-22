import { isNullOrUndefined } from "util";

export class ALDocCommentUtil {
    public static GenerateObjectDocString(groups: { [key: string]: string; }): string {
        let docString = "";

        // format object type
        if (groups['ObjectType'].indexOf('extension') !== -1) {
            groups['ObjectType'] = groups['ObjectType'].replace('extension', ' extension');
        }
        groups['ObjectType'] = groups['ObjectType'].replace(/(\w)(\w*)/g, function(g0,g1,g2){return g1.toUpperCase() + g2.toLowerCase();});

        docString += "/// <summary> \n";
        docString += "/// ${1:" + groups['ObjectType'] + " " + groups['ObjectName'] + " (ID " + groups['ObjectID'] + ").}\n";
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
                docString += "/// <param name=\"" + paramName + "\">";
                docString += "${" + placeholderIdx + ":Parameter of type " + paramDataType + ".}";
                docString += "</param>";
            });
        }

        if (!isNullOrUndefined(groups['ReturnType'])) {
            placeholderIdx++;
            let returnTypeDefintion = groups['ReturnType'].split(':');
            
            docString += "\n";
            docString += "/// ";
            docString += "<returns>";
            docString += "${" + placeholderIdx + ":";
            if ((!isNullOrUndefined(returnTypeDefintion[0])) && (returnTypeDefintion[0] !== "")) {
                docString += "Return variable \"" + returnTypeDefintion[0].trim() + "\"";
            } else {
                docString += "Return value";
            }

            if ((!isNullOrUndefined(returnTypeDefintion[1])) && (returnTypeDefintion[1] !== "")) {
                docString += " of type " + returnTypeDefintion[1].trim();
            }
            docString += ".}";
            docString += "</returns>";
        }

        return docString;
    }
}