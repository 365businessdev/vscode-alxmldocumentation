import { Range } from 'vscode';
import { ALAccessLevel } from './ALAccessLevel';
import { ALObsoleteState } from './ALObsoleteState';
import { ALParameter } from './ALParameter';
import { ALProcedureReturn } from './ALProcedureReturn';
import { ALProcedureSubtype } from './ALProcedureSubtype';
import { ALProcedureType } from './ALProcedureType';
import { ALDocumentation } from './ALDocumentation';

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
     * Procedure declaration code.
     * @type {string}
     */
    public Code: string = '';

    /**
     * Range in TextDocument of the procedure
     * @type {Range}
     */
    public Range: Range | undefined;
    
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
     * Obsolete Reason for procedure.
     * @type {string}
     */
    public ObsoleteReason: string = '';

    /**
     * List of parameters of the procedure.
     * @type {ALParameter}
     */
    public Parameters: Array<ALParameter> = [];

    /**
     * Return value of the procedure.
     * @type {ALProcedureReturn}
     */
    public Return: ALProcedureReturn | undefined = undefined;

    /**
     * XML Documentation.
     * @type {ALDocumentation}
     */
    public ALDocumentation: ALDocumentation  = new ALDocumentation();

    /**
     * Get AL Example Syntax to call this function.
     * Example:
     * [[DataType] := ] ProcedureName([[var ]param1: DataType[temporary]])
     * @returns AL Code.
     */
    public GetSyntax(): string {
        let syntax: string = `${this.Name}(`;
        let param: string = '';
        if (this.Parameters) {
            this.Parameters.forEach(alParameter => {
                if (param !== '') {
                    param += ', ';
                }
                if (alParameter.CallByReference) {
                    param += 'var ';
                }
                param += `${alParameter.Name}: ${alParameter.Type}${alParameter.Subtype !== undefined ? ` ${alParameter.Subtype}` : ''}${alParameter.Temporary ? ' temporary': ''}`;
            });
        }
        syntax += `${param})`;

        if (this.Return?.Type !== undefined) {
            syntax = `[${this.Return.Type}] := ${syntax}`;
        }

        return syntax;
    }
}