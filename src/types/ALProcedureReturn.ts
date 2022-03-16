import { ALDocumentation } from './ALDocumentation';

export class ALProcedureReturn {
    /**
     * Name of the return variable, if set.
     */
    public Name: string = '';

    /**
     * Type of the procedure return value.
     */
    public Type: string|undefined;

    /**
     * XML Documentation.
     * @type {ALDocumentation}
     */
    public ALDocumentation: ALDocumentation  = new ALDocumentation();
}