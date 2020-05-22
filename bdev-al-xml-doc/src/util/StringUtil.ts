export class StringUtil {
    public static IsNullOrWhiteSpace(line: string): boolean {
        return (line === null || line.trim() === '');
    }

    public static GetIndentSpaces(indentPlaces: number): string {
        let indent = "";
        for (var i = 0; i < indentPlaces; i++) {
            indent += " ";
        }

        return indent;
    }
}