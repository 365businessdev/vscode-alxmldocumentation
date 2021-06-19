import { Range, Uri } from 'vscode';
import { ALDocCommentUtil } from '../util/ALDocCommentUtil';
import { ALLangServerProxy } from '../util/ALLangServerProxy';
import { ALSyntaxUtil } from '../util/ALSyntaxUtil';
import { ALAccessLevel } from './ALAccessLevel';
import { ALCodeunitType } from './ALCodeunitType';
import { ALObjectExtensionType } from './ALObjectExtensionType';
import { ALObjectType } from './ALObjectType';
import { ALObsoleteState } from './ALObsoleteState';
import { ALProcedure } from './ALProcedure';
import { XMLDocumentation } from './XMLDocumentation';
import { XMLDocumentationExistType } from './XMLDocumentationExistType';

export class ALObject {
    /**
     * File Name of the AL Object.
     * @type {string}
     */
    public FileName: string|undefined;
    
    /**
     * File Path of the AL Object file.
     * @type {string}
     */
    public Path: string|undefined;

    /**
     * A universal resource identifier representing either a file on disk or another resource.
     * @type {Uri}
     */
    public Uri: Uri|undefined;

    /**
     * Line number of the Object definition.
     */
    public LineNo: number = 0;

    /**
     * Range in TextDocument of the procedure
     * @type {Range}
     */
    public Range: Range | undefined;

    /**
     * Name of the AL Object.
     * @type {string}
     */
    public Name: string|undefined;

    /**
     * ID of the AL Object.
     * @type {Number}
     */
    public ID: Number|undefined;

    /**
     * Access level of the AL Object.
     * @type {ALAccessLevel}
     */
    public Access: ALAccessLevel = ALAccessLevel.Public;

    /**
     * Type of the AL Object.
     * @type {ALObjectType}
     */
    public Type: ALObjectType = ALObjectType.Unknown;

    /**
     * Subtype of the AL Object.
     * @type {ALCodeunitType}
     */
    public Subtype: ALCodeunitType = ALCodeunitType.Normal;

    /**
     * Type of object extension or undefined.
     */
    public ExtensionType: ALObjectExtensionType | undefined;

    /**
     * Name of the object implemented/extended or undefined.
     */
    public ExtensionObject: string | undefined;

    /**
     * Obsolete State of the AL Object.
     * @type {ALObsoleteState}
     */
    public ObsoleteState: ALObsoleteState = ALObsoleteState.No;

    /**
     * Obsolete Reason of the AL Object.
     * @type {string} 
     */   
    public ObsoleteReason: string = '';

    /**
     * List of procedures in the AL Object or undefined.
     * @type {Array<ALProcedure>|undefined}
     */
    public Procedures: Array<ALProcedure>|undefined;

    /**
     * XML Documentation.
     * @type {XMLDocumentation}
     */
    public XmlDocumentation: XMLDocumentation  = new XMLDocumentation();    

    /**
     * Return XML Documentation for request object converted as JSON object.
     * @param obj ALObject | ALProcedure
     * @returns JSON Object | Empty string
     */
    public async GetDocumentationAsJsonObject(obj: ALObject | ALProcedure | null = null): Promise<any> {
        if (obj === null) {
            obj = this;
        }
        if (obj.XmlDocumentation.Exists === XMLDocumentationExistType.No) {
            return '';
        }

        let documentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(obj.XmlDocumentation.Documentation);
        switch (obj.XmlDocumentation.Exists) {
            case XMLDocumentationExistType.Yes:
                return documentation;
            case XMLDocumentationExistType.Inherit:
                if (obj instanceof ALObject) {
                    console.debug('Inherit documentation for ALObject is not supported.');
                    return '';
                }

                if ((this.ExtensionType !== ALObjectExtensionType.Implement) || (documentation.inheritdoc === undefined) || (documentation.inheritdoc.attr.cref === undefined)) {
                    return '';
                }
                
                // split code reference.
                let codeRefObjectName: string = this.ExtensionObject!;
                let codeRefProcedureCode: string = documentation.inheritdoc.attr.cref;
                let codeRef: string = `${codeRefObjectName}.${codeRefProcedureCode}`;
   
                return await ALSyntaxUtil.GetObjectDefinition(ALObjectType.Interface, codeRefObjectName).then(async(objDefinition) => {
                    if (objDefinition === undefined) {
                        console.debug(`Unable to find object definition for code reference ${codeRef}.`);
                        return '';
                    }
                    try {
                        const alLangServer = new ALLangServerProxy();
                        return await alLangServer.GetALObjectFromDefinition(objDefinition[0].uri.toString(), objDefinition[0].range.start).then(alDefinition => {
                            if ((alDefinition === undefined) || (alDefinition.ALObject === null)) {
                                console.debug(`Unable to find definition for code reference ${codeRef}.`);
                                return '';
                            }

                            let codeReference: ALProcedure | undefined = alDefinition.ALObject.Procedures?.find(codeRefProcedure => (codeRefProcedure.Code === codeRefProcedureCode));
                            if ((codeReference === undefined) ||(codeReference?.XmlDocumentation.Exists === XMLDocumentationExistType.No)) {
                                return '';
                            }
                            documentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(codeReference.XmlDocumentation.Documentation);
                            return documentation;
                        });
                    } catch {
                        return '';
                    }
                });
        }
    }
}