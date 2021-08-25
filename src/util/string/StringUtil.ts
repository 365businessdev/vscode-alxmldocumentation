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

    /**
     * Common Replace All function, to replace all occurrences of a string in the base string.
     * @param string Base String.
     * @param search Substring to replace.
     * @param replaceWith Replacement for the substring. (optional)
     */
    public static ReplaceAll(string: string, search: string, replaceWith: string = ''): string {
        return string.replace(new RegExp(search, 'g'), replaceWith);
    }

    public static GetTimestamp(): string {
        let date: Date = new Date();
        return `[${this.GetDatePart(date)} ${this.GetTimePart(date)}]`;
    }

    private static GetDatePart(date: Date): string {
        return `${date.getFullYear()}-${(date.getMonth() < 10 ? '0' : '') + date.getMonth()}-${(date.getDay() < 10 ? '0' : '') + date.getDay()}`;
    }

    private static GetTimePart(date: Date): string {
        return `${(date.getHours() < 10 ? '0' : '') + date.getHours()}:${(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()}:${(date.getSeconds() < 10 ? '0' : '') + date.getSeconds()}.${date.getMilliseconds().toString().substring(0, 3).padStart(3, "0")}`;
    }
}