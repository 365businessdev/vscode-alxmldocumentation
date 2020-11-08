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
        let indent = '';
        for (var i = 0; i < indentPlaces; i++) {
            indent += ' ';
        }

        return indent;
    }
    
    /**
     * Append two strings together using the concatenate string.
     * @param baseString 
     * @param append 
     * @param concatString 
     */
    public static AppendString(baseString: string, append: string, concatString: string = ''): string {
        if (baseString.includes(append)) {
            return baseString;
        }
        if (baseString !== '') {
            baseString = `${baseString}${concatString}`;
        }
        baseString = `${baseString}${append}`;

        return baseString;
    }
}