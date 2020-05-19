export class StringUtil {
    public static IsNullOrWhiteSpace(line: string): boolean {
        return (line === null || line.trim() === '');
    }

    public static IsProcedure(line: string): boolean {
        if (line === null) {
            return false;
        }

        const isProcedure: boolean = line.trim().startsWith('procedure');
        if (isProcedure) {
            return true;
        }

        const isLocalProcedure: boolean = line.trim().startsWith('local procedure');
        if (isLocalProcedure) {
            return true;
        }

        return false;
    }

    public static RemoveComment(line: string): string {
        if (line === null) { 
            return "";
        }
        return line.replace(/\/\/.*/, '').replace(/\/\*.*\*\//, '');
    }
}