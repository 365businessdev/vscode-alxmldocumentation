export class ALParameter {
    /**
     * Name of the procedure.
     * @type {string}
     */
    public Name: string|undefined;

    /**
     * Data type.
     * @type {string}
     */
    public Type: string|undefined;

    /**
     * Data Subtype.
     * @type {string}
     */
    public Subtype: string|undefined;

    /**
     * Call-by-Reference parameter.
     * @type {boolean}
     */
    public CallByReference: boolean = false;
}