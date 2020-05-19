# XML Documentation Comments Support for AL language in Visual Studio Code

Generate XML documentation comments for AL language in Visual Studio Code and generate markdown files from Source Code.

## Usage
### Generate context aware XML documentation comments
Type `///` in AL source code, it auto-generates an context aware XML documentation comment like this:

![Generate context aware XML documentation comments][GenerateXmlDoc]

### Generate markdown files from XML documentation comments
There are two commands available to generate markdown files from XML documentation:

| Command | Description | 
| --- | --- |
| `AL DOC: Generate markdown documentation` | Create markdown documentation file for the currently opend AL source code file. |
| `AL DOC: Generate markdown documentation for directory` | Create markdown documentation files for all AL source code files in the currently opened directory. |

> **Note**<br>All commands start with `AL DOC` prefix to make it easier to find them.

![Generate markdown files from XML documentation comments][GenerateMDDoc]

> **Note**<br>This features exports all valid XML documentation from codeunit objects with access modifier `Public` and Subtype `Normal` (empty). One markdown file per method will be created inside a directory which is named like the AL source file (e.g. `MyCodeunit.Codeunit.al`)

### Snippets
Additional three snippets are included into the extension:
#### Summary XML documentation
Adds simple `<summary>` xml documentation comment:
```c#
    /// <summary>
    /// This is the description of a specific procedure, trigger or object.
    /// </summary>
```
#### Example code XML documentation
Adds `<example>` xml documentation comment:
```c#
    /// <example>
    /// This is the description of an example
    /// <code>
    /// if (i <> y) then
    ///   DoSomething(i, y);
    /// </code>
    /// </example>
```
#### Remarks XML documentation
Adds `<remarks>` xml documentation comment:
```c#
    /// <remarks>
    /// This are some specific remarks for the documented procedure.
    /// </remarks>
```

## Installation
1. Install Visual Studio Code 1.44.0 or higher
2. Launch Visual Studio Code
3. From the extension view Ctrl-Shift-X (Windows, Linux) or Cmd-Shift-X (macOS)
4. Search and Choose the extension AL XML Documentation
5. Reload Visual Studio Code

## Setup
The menu under File > Preferences (Code > Preferences on Mac) provides entries to configure user and workspace settings. 

There are two configuration parameters available:

| Configuration Parameter | Description | Default Value |
| --- | --- | --- |
| `markdown_path` | Specifies the path where the markdown files should be created. | `doc` folder in workspace root directory |
| `verbose` | Specifies whether detailed information should be output during markdown creation. | `false` | 

> **Important**<br>The object directory (e.g. `doc\mycodeunit.codeunit.al\`) will be deleted if already exist.

### settings.json
```json 
{
    "bdev-al-xml-doc.markdown_path": "C:/Documentation/",
    "bdev-al-xml-doc.verbose": true    
}
```

## Supported Languages
This extension is only processing AL language source code files.

## Supported XML Tags

| XML Tag | Supported |
| --- | :---: |
| `summary` | ![Check] |
| `param` | ![Check] |
| `returns` | ![Check] |
| `remarks` | ![Check] |
| `example` | ![Check] |


## License
This extension is licensed under the [MIT License](https://365businessdev.visualstudio.com/Visual%20Studio%20Code%20AL%20XML%20Documentation%20Extension/_git/Visual%20Studio%20Code%20AL%20XML%20Documentation%20Extension?path=%2Fbdev-al-xml-doc%2FLICENSE.txt).

## Known Issues
 - None


[GenerateXmlDoc]: https://365businessdev.visualstudio.com/4cb83d4a-eb34-4814-b956-f9f37c442462/_apis/git/repositories/ee60b269-870f-4369-8cf5-1e5ffb21c10b/items?path=%2Fbdev-al-xml-doc%2Fdoc%2FAddXmlDocComment.gif&versionDescriptor%5BversionOptions%5D=0&versionDescriptor%5BversionType%5D=0&versionDescriptor%5Bversion%5D=master&resolveLfs=true&%24format=octetStream&api-version=5.0 "Generate context aware XML documentation comments"
[GenerateMDDoc]: https://365businessdev.visualstudio.com/4cb83d4a-eb34-4814-b956-f9f37c442462/_apis/git/repositories/ee60b269-870f-4369-8cf5-1e5ffb21c10b/items?path=%2Fbdev-al-xml-doc%2Fdoc%2FGenerateMarkdownDoc.gif&versionDescriptor%5BversionOptions%5D=0&versionDescriptor%5BversionType%5D=0&versionDescriptor%5Bversion%5D=master&resolveLfs=true&%24format=octetStream&api-version=5.0 "Generate markdown files from XML documentation comments"
[Check]: https://cdn4.iconfinder.com/data/icons/icocentre-free-icons/137/f-check_256-16.png "Check Icon"