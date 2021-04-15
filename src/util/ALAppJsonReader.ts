import * as fs from 'fs';

export class ALAppJsonReader {
    public static ReadManifest(filePath: string): any {
        if (!fs.existsSync(filePath)) {
            throw new Error(`App manifest (app.json) could not been found. Path: ${filePath}`);
        }

        let appJson: any = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return appJson;
    }
}