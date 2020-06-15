# XML Documentation Comments Support for AL language in Visual Studio Code

Generate XML documentation comments for AL language in Visual Studio Code and generate markdown files from Source Code.

## Usage
### Generate context aware XML documentation comments
Type `///` in AL source code, it auto-generates an context aware XML documentation comment like this:

![Generate context aware XML documentation comments][GenerateXmlDoc]

In addition to the regular documentation activity you can:
 - Add new lines in existing XML Documentation comment section. (`///` will automatically added.)
 - Use [Snippets](#Snippets) directly inside the XML Documentation comment section.

### Generate markdown files from XML documentation comments
There are two commands available to generate markdown files from XML documentation:

| Command | Description | 
| --- | --- |
| `AL DOC: Generate markdown documentation` | Create markdown documentation file for the currently opend AL source code file. |
| `AL DOC: Generate markdown documentation for directory` | Create markdown documentation files for all AL source code files in the currently opened directory. |

> **Note**<br>All commands start with `AL DOC` prefix to make it easier to find them.

![Generate markdown files from XML documentation comments][GenerateMDDoc]

Generate markdown documentation files, based on the XML documentation in AL source code. For each object file (e.g. `MyCodeunit.Codeunit.al`) a subdirectory inside the export directory will be created.
Each procedure and trigger method is creating a single file (e.g. `DoSomething.al`) inside the subdirectory. Additionally an index file (`index.md`) will be created per object file and contains a list of every documented element in the source file.

> **Note**<br>This feature exports all valid XML documentation from objects with access modifier `Public` (or not set) and Subtype `Normal` (or not set).<br><br>Additionally warnings will be shown in the output channel in Visual Studio Code to show missing documentations.

### Snippets
Three snippets are included into the extension:
#### Summary XML documentation
`docsummary` snippet adds simple `<summary>` xml documentation comment:
```c#
    /// <summary>
    /// This is the description of a specific procedure, trigger or object.
    /// </summary>
```
#### Example code XML documentation
`docexamplecode` snippet adds `<example>` xml documentation comment:
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
`docremarks` snippet adds `<remarks>` xml documentation comment:
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
| `exportScope` | Specifies whether only global procedures (config value: `global`) or whether all procedures (config value: `all`) should be exported as markdown. | `global` |

> **Important**<br>The object directory (e.g. `doc\mycodeunit.codeunit.al\`) will be deleted if already exist.

### settings.json
```json 
{
    "bdev-al-xml-doc.markdown_path": "C:/Documentation/",
    "bdev-al-xml-doc.verbose": true,
    "bdev-al-xml-doc.exportScope": "all"    
}
```

## Supported Languages
This extension is only processing AL language source code files.

## Supported AL Keywords
| Object Type | Supported |
| --- | :---: |
| `procedure` | ![Supported] |
| `local procedure` | ![Supported] |
| `internal procedure` | ![Supported] |
| `trigger` | ![Supported] |

> **Note**<br>The purpose of the AL XML Documentation is to document your AL Source Code, not to document structures, controls or table fields.<br><br>Therefor it's currently not planned to add support for AL keywords, other the currently supported.

## Supported AL Objects
| Object Type | Supported |
| --- | :---: |
| `codeunit` | ![Supported] |
| `table` | ![Supported] |
| `page` | ![Supported] |
| `enum` | ![Supported] |
| `xmlport` | ![Supported] |
| `interface` | ![Supported] |
| `table extension` | ![Supported] |
| `page extension` | ![Supported] |
| `enum extension` | ![Supported] |
| `page customization` | ![NotSupport] |
| `profile` | ![NotSupport] |

## Supported Documentation XML Tags

| XML Tag | Supported |
| --- | :---: |
| `summary` | ![Supported] |
| `param` | ![Supported] |
| `returns` | ![Supported] |
| `remarks` | ![Supported] |
| `example` | ![Supported] |

## System Requirements
 - Visual Studio Code 1.44.0 (or higher) - [Download here](https://code.visualstudio.com/Download)
 - .NET Core 3.0 (or higher) - [Download here](https://dotnet.microsoft.com/download/dotnet-core/3.0)


## License
This extension is licensed under the [MIT License](https://github.com/365businessdev/vscode-alxmldocumentation/blob/dev/LICENSE.txt).

[GenerateXmlDoc]: https://github.com/365businessdev/vscode-alxmldocumentation/blob/dev/doc/AddXmlDocComment.gif?raw=true "Generate context aware XML documentation comments"
[GenerateMDDoc]: https://github.com/365businessdev/vscode-alxmldocumentation/blob/dev/doc/GenerateMarkdownDoc.gif?raw=true  "Generate markdown files from XML documentation comments"
[Supported]: https://cdn4.iconfinder.com/data/icons/icocentre-free-icons/137/f-check_256-16.png "Supported"
[NotSupport]: https://cdn2.iconfinder.com/data/icons/circular%20icons/no.png "Not Supported"