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