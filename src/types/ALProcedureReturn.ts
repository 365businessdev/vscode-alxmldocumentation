export class ALProcedureReturn {
    /**
     * Name of the return variable, if set.
     */
    public Name: string = "";

    /**
     * Type of the procedure return value.
     */
    public Type: string|undefined;

    /**
     * XML Documentation.
     * @type {{ DocumentationExists: boolean, Documentation: string }}
     */
    public XmlDocumentation: { DocumentationExists: boolean, Documentation: string }  = { DocumentationExists: false, Documentation: ''};
}