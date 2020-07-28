# Change Log

All notable changes to the "AL XML Documentation" extension will be documented in this file.

## [0.1.0] - 2020-04-29

- Initial release
- `AL XML DOC: Generate markdown documentation for directory` to export markdown documentation for all al source code files in the current directory into the target directory (`markdown_path`).

## [0.1.1] - 2020-04-30

- `Verbose` configuration parameter to display detailed information in output channel. Default is false.
- `AL XML DOC: Generate markdown documentation` to export markdown documentation from currently opened al source code file into the target directory (`markdown_path`).

## [0.1.2] - 2020-05-19

- Create `doc` directory in root folder if `markdown_path` is not defined.
- Auto-generate XML documentation comment after type "///".

## [0.1.3] - 2020-05-20

- Bugfix [#430](https://365businessdev.visualstudio.com/Visual%20Studio%20Code%20AL%20XML%20Documentation%20Extension/_workitems/edit/430) - `Command 'AL DOC: Generate markdown documentation' resulted in an error (Running the contributed command: 'bdev-al-xml-doc.exportMarkdown' failed.)`

## [0.2.0] - 2020-05-26

- Fixed `<param>` format from multiline to single line, according to [C# Programming Guide](https://docs.microsoft.com/de-de/dotnet/csharp/programming-guide/xmldoc/param).
- Support for `trigger` procedures (e.g. `OnRun` trigger).
- Support for object documentation (e.g. `codeunit 50000 MyCodeunit`).
- Fixed `var` in parameter name.
- Add XML documentation comments as snippets with placeholder variables.
- Automatically add `///` when hit enter inside or below a xml documentation comment.
- Allow direct usage of snippets in xml documentation comments.
- `index.md` creation with method list.
- Support for additional object types.
- Fixed multiline problem within xml documentation tags.

## [0.2.1] - 2020-06-15

- Add configuration parameter `exportScope` [#2](https://github.com/365businessdev/vscode-alxmldocumentation/issues/2).
- Fixed [#3](https://github.com/365businessdev/vscode-alxmldocumentation/issues/3) keywords in documentation.
- Moved Repository to GitHub.
- Added Bug Tracking information.

## [0.2.2] - 2020-06-16

- Removed procedure hover from prototype.

## [0.3.0] - 2020-07-02

- Allow underscore in Procedure Name [#1](https://github.com/365businessdev/vscode-alxmldocumentation/issues/1).
- Hover `<summary>` information from xml documentation on procedures.

## [0.3.1] - 2020-07-08

- Fixed Issue [#10](https://github.com/365businessdev/vscode-alxmldocumentation/issues/10) - Supporting documentation for `internal procedure`.
- Added configuration setting `enableDocComments` to disable documentation feature [#9](https://github.com/365businessdev/vscode-alxmldocumentation/issues/9).
- Fixed Issue [#8](https://github.com/365businessdev/vscode-alxmldocumentation/issues/8) - Documentation gets triggered inside procedures.

## [0.3.2] - 2020-07-11

- Fixed Issue [#11](https://github.com/365businessdev/vscode-alxmldocumentation/issues/11) - Allow special characters in object names.

## [0.4.0] - 2020-07-20

- Fixed Issue [#12](https://github.com/365businessdev/vscode-alxmldocumentation/issues/12) - Fixed Inside code detection (begin-end).
- Added `exportScope` description.
- Added diagnostic information and quick fix actions.

## [0.4.1] - 2020-07-20

- Fixed Issue [#14](https://github.com/365businessdev/vscode-alxmldocumentation/issues/14) - Fixed procedure overload support for diagnostics.
- Removed `trigger`-procedures from diagnostics.

## [0.4.2] - 2020-07-28

- Fixed Issue [#20](https://github.com/365businessdev/vscode-alxmldocumentation/issues/20) - Shows warning even when the function is documented.
- Fixed Issue [#18](https://github.com/365businessdev/vscode-alxmldocumentation/issues/18) - Documentation and var parameters.
- Added configuration `askEnableCheckProcedureDocumentation` [#19](https://github.com/365businessdev/vscode-alxmldocumentation/issues/19).
- Added configuration `procedureTypes` [#17](https://github.com/365businessdev/vscode-alxmldocumentation/issues/17) - Missing documentation non public functions
- Added check for unused parameter documentations in diagnostics.
- Fixed Issue [#21(1)](https://github.com/365businessdev/vscode-alxmldocumentation/issues/21) - Support for quoted procedure names.
- Fixed Issue [#21(2)](https://github.com/365businessdev/vscode-alxmldocumentation/issues/21) - Fixed keywords in documentation.
- Support placeholder `${workspaceFolder}` in `markdown_path` configuration [#18](https://github.com/365businessdev/vscode-alxmldocumentation/issues/21).
- Added object name to markdown `index.md`.
