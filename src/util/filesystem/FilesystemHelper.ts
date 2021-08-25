import * as fs from 'fs';
import path = require('path');

export class FilesystemHelper {
    /**
     * Get Directory from file path.
     * @param filePath 
     * @returns Directory Path
     */
    public static GetDirectoryFromFilename(filePath: string): string {
        return path.dirname(filePath);
    }

    /**
     * Tests whether a directory already exist or not.
     * @param dirPath Path to directory
     * @returns True if directory exists. Otherwise false.
     */
    public static DirectoryExists(dirPath: string): boolean {
        return fs.existsSync(dirPath);
    }

    /**
     * Tests whether a directory already exist or not. If not directory will be created.
     * @param dirPath Path to directory
     * @returns True if folder exists or has been created successfully. Otherwise false.
     */
    public static CreateDirectoryIfNotExist(dirPath: string): boolean {
        if (!this.DirectoryExists(dirPath)) {
            fs.mkdirSync(dirPath);

            return fs.existsSync(dirPath);
        } else {
            return true;
        }
    }
    
    /**
     * Delete all files and directories inside directory
     * @param dirPath Path to directory
     */
    public static ClearDirectory(dirPath: string) {
        fs.readdirSync(dirPath).forEach(file => {
            let stats = fs.statSync(`${dirPath}/${file}`); 
            if (stats.isFile()) {
                this.DeleteFile(path.join(dirPath, file));
            } 

            if (stats.isDirectory()) {
                FilesystemHelper.ClearDirectory(`${dirPath}/${file}`);
                if (fs.readdirSync(`${dirPath}/${file}`).length === 0) {
                    fs.rmdirSync(`${dirPath}/${file}`);
                }
            }
        });
    }

    /**
     * Create or recreate file.
     * @param filePath 
     * @param initialContent 
     */
    public static CreateFile(filePath: string, initialContent: string = ''): boolean {
        if (!this.CreateDirectoryIfNotExist(this.GetDirectoryFromFilename(filePath))) {
            throw new Error(`Unable to create or find directory ${this.GetDirectoryFromFilename(filePath)}. Please verify permissions set in filesystem.`);            
        }

        fs.writeFileSync(filePath, initialContent);
        return fs.existsSync(filePath);
    }

    /**
     * Tests whether a file already exist or not.
     * @param filePath Path to file
     * @returns True if file exists. Otherwise false.
     */
    public static FileExists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    /**
     * Read file content.
     * @param filePath Path to file
     * @returns File content.
     */
    public static ReadFile(filePath: string): string {
        if (!this.FileExists(filePath)) {
            return '';
        }
        return fs.readFileSync(filePath, 'utf8');
    }

    /**
     * Delete file.
     * @param filePath Path to file.
     */
    public static DeleteFile(filePath: string) {
        if (this.FileExists(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}