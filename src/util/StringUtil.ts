export class StringUtil {
    /**
     * Tests whether a string is null or whitespace.
     * @param line String object.
     */
    public static IsNullOrWhiteSpace(line: string): boolean {
        return (line === null || line.trim() === '');
    }

    /**
     * Returns a string containing the number of whitespace to indent.
     * @param indentPlaces No. of whitespace to indent.
     */
    public static GetIndentSpaces(indentPlaces: number): string {
        let indent = "";
        for (var i = 0; i < indentPlaces; i++) {
            indent += " ";
        }

        return indent;
    }
}