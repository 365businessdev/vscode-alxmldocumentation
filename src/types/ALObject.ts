import { Uri } from 'vscode';
import { ALAccessLevel } from './ALAccessLevel';
import { ALCodeunitType } from './ALCodeunitType';
import { ALObjectExtensionType } from './ALObjectExtensionType';
import { ALObjectType } from './ALObjectType';
import { ALObsoleteState } from './ALObsoleteState';
import { ALProcedure } from './ALProcedure';
import { XMLDocumentation } from './XmlDocumentation';

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
}