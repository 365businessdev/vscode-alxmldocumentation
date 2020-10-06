import { ALObjectType, ALCodeunitType, ALObsoleteState, ALAccessLevel } from "../types";
import { ALProcedure } from "./ALProcedure";

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
    public Type: ALObjectType|undefined;

    /**
     * Subtype of the AL Object.
     * @type {ALCodeunitType}
     */
    public Subtype: ALCodeunitType = ALCodeunitType.Normal;

    /**
     * Obsolete State of the AL Object.
     * @type {ALObsoleteState}
     */
    public ObsoleteState: ALObsoleteState = ALObsoleteState.No;

    /**
     * Obsolete Reason of the AL Object.
     * @type {string} 
     */   
    public ObsoleteReason: string = "";

    /**
     * List of procedures in the AL Object or undefined.
     * @type {Array<ALProcedure>|undefined}
     */
    public Procedures: Array<ALProcedure>|undefined = undefined;
}