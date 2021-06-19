import { XMLDocumentation } from './XMLDocumentation';

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
     * @type {XMLDocumentation}
     */
    public XmlDocumentation: XMLDocumentation  = new XMLDocumentation();
}