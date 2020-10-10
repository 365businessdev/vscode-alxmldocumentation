import { ALObjectExtensionType, ALObjectType } from "../types";
import { ALObject } from "../al-types/ALObject";
import { ALProcedure } from "../al-types/ALProcedure";
import { ALParameter } from "../al-types/ALParameter";
import { ALProcedureReturn } from "../al-types/ALProcedureReturn";

export class ALDocCommentUtil {
    /**
     * Create Object XML Documentation for given AL Object.
     * @param alObject ALObject object.
     */
    public static GenerateObjectDocString(alObject: ALObject, idx: number = -1): string {
        let docString = "";

        docString += "/// <summary> \n";
        docString += "/// ${" + ((idx === -1) ? "__idx__" : 1) + ":" + ALObjectType[alObject.Type] + " " + alObject.Name ;
        if (alObject.ID !== undefined) {
            docString += " (ID " + alObject.ID + ")";
        }
        if (alObject.ExtensionType !== undefined) {
            switch (alObject.ExtensionType) {
                case ALObjectExtensionType.Extend:
                    docString += " extends Record " + alObject.ExtensionObject;
                    break;
                case ALObjectExtensionType.Implement:
                    docString += " implements Interface " + alObject.ExtensionObject;
                    break;
            }
        }
        docString += ".}\n";
        docString += "/// </summary>";

        alObject.XmlDocumentation = docString;

        return docString;
    }

    /**
     * Create Procedure XML Documentation for given AL Procedure.
     * @param alProcedure ALProcedure object.
     */
    public static GenerateProcedureDocumentation(alProcedure: ALProcedure): string {
        let docString = "";
        let placeholderIdx = 0;

        if (alProcedure.Name === undefined) {
            return "";
        }

        placeholderIdx++;

        docString += this.GenerateProcedureDocString(alProcedure, placeholderIdx);

        if ((alProcedure.Parameters !== undefined) && (alProcedure.Parameters.length !== 0)) {
            alProcedure.Parameters.forEach(alParameter => {
                placeholderIdx++;
                docString += "\n";
                docString += this.GenerateParameterDocString(alParameter, placeholderIdx);
            });
        }
        if (alProcedure.Return !== undefined) {
            placeholderIdx++;
            docString += "\n";
            docString += this.GenerateProcedureReturnDocString(alProcedure.Return, placeholderIdx);
        }

        return docString;
    }
    
    /**
     * Generate Procedure summary XML Documentation for given AL Procedure.
     * @param alProcedure ALProcedure object.
     * @param idx Placeholder Index for Snippet.
     */
    public static GenerateProcedureDocString(alProcedure: ALProcedure, idx: number = -1): string {
        let docString: string = "/// ";
        docString += "<summary> \n";
        docString += "/// ${" + ((idx === -1) ? "__idx__" : idx) + ":" + alProcedure.Name + ".}\n";
        docString += "/// </summary>";

        alProcedure.XmlDocumentation = docString;

        return docString;
    }

    /**
     * Generate Parameter XML Documentation for given AL Parameter.
     * @param alParameter ALParameter object.
     * @param idx Placeholder Index for Snippet.
     */
    public static GenerateParameterDocString(alParameter: ALParameter, idx: number = -1): string {
        let docString: string = "/// ";
        docString += "<param name=\"" + alParameter.Name + "\">";
        docString += "${" + ((idx === -1) ? "__idx__" : idx) + ":";
        if (alParameter.Temporary) {
            docString += "Temporary ";
        }
        if (alParameter.CallByReference) {
            docString += "VAR ";
        }
        docString += alParameter.Type;
        if (alParameter.Subtype !== "") {
            docString += " " + alParameter.Subtype;
        }
        docString += ".}";
        docString += "</param>";

        alParameter.XmlDocumentation = docString;

        return docString;
    }

    /**
     * Generate Return Value XML Documentation for given Return.
     * @param alProcedureReturn Return Type object.
     * @param idx Placeholder Index for Snippet.
     */
    public static GenerateProcedureReturnDocString(alProcedureReturn: ALProcedureReturn, idx: number = -1): string {
        let docString: string = "/// ";
        docString += "<returns>";
        docString += "${" + ((idx === -1) ? "__idx__" : idx) + ":";
        if (alProcedureReturn.Name !== "") {
            docString += "Return variable " + alProcedureReturn.Name;
        } else {
            docString += "Return value";
        }
        docString += " of type " + alProcedureReturn.Type;
        docString += ".}";
        docString += "</returns>";

        alProcedureReturn.XmlDocumentation = docString;

        return docString;
    }
}