import { ALProcedureType, ALAccessLevel, ALProcedureSubtype, ALObsoleteState } from "../types";
import { ALParameter } from "./ALParameter";

export class ALProcedure {
    /**
     * Name of the procedure
     * @type {string}
     */
    public Name: string|undefined;

    /**
     * Line number of the procedure.
     * @type {number}
     */
    public LineNo: number = 0;
    
    /**
     * Access level of the Procedure.
     * @type {ALAccessLevel}
     */
    public Access: ALAccessLevel = ALAccessLevel.Public;

    /**
     * Procedure Type.
     * @type {ALProcedureType}
     */
    public Type: ALProcedureType = ALProcedureType.Procedure;

    /**
     * Procedure Subtype.
     * @type {ALProcedureSubtype}
     */
    public Subtype: ALProcedureSubtype = ALProcedureSubtype.Normal;

    /**
     * Specifies procedure is a TryFunction.
     * @type {boolean}
     */
    public TryFunction: boolean = false;

    /**
     * Obsolete State for procedure.
     * @type {ALObsoleteState}
     */
    public ObsoleteState: ALObsoleteState = ALObsoleteState.No;

    /**
     * Obsolete Reasone for procedure.
     * @type {string}
     */
    public ObsoleteReason: string = "";

    /**
     * List of parameters of the procedure.
     * @type {ALParameter}
     */
    public Parameters: Array<ALParameter> = [];

    /**
     * Return value of the procedure.
     * @type {{Name,Type}}
     */
    public Return: { Name: string, Type: string } | undefined = undefined;
}