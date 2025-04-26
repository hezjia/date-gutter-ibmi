# Date Gutter for IBMi

A Visual Studio Code extension that displays dates in the editor gutter, specifically designed for IBMi source files. It makes it easy to track and manage dated entries in your IBMi development files. 
IBMi source files use date to keep track changes, RTC download source contains the date information. This extension formats the download source dates in a way that is same as STRSEU in IBMi system.

## Features

- **Date Display**: Shows dates at the beginning of lines in YYMMDD format
- **Auto-hiding**: Automatically hides the date in the text content while displaying it in the gutter
- **Default Date**: Shows "000000" in the gutter for lines without a date
- **IBMi Support**: 
  - Built-in support for all common IBMi source types
  - Optimized for IBMi development workflow
- **Date Commands**: 
  - Insert current date at cursor position
  - Update existing date to current date

## Installation

1. Open Visual Studio Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS)
3. Type `ext install date-gutter-ibmi`
4. Press Enter

## Usage

1. Create or open a supported IBMi source file
2. Add a date at the beginning of a line in YYMMDD format (e.g., "230915")
3. The date will automatically be displayed in the gutter while being hidden in the text
4. Lines without a date will show "000000" in the gutter (in a lighter color)

### Commands

- `Date Gutter: Insert Date`: Inserts current date at cursor position
- `Date Gutter: Update Line Date`: Updates the date at the beginning of the current line to today's date

## Extension Settings

This extension contributes the following settings:

* `dateGutter.enabled`: Enable/disable the date gutter extension (default: `true`)
* `dateGutter.enabledFileTypes`: Array of file extensions where date gutter should be enabled

Default supported IBMi source types:
- `.rpgle` (RPG ILE)
- `.sqlrpgle` (SQL RPG)
- `.clle` (CL)
- `.clp` (CL)
- `.dspf` (Display File)
- `.prtf` (Printer File)
- `.pf` (Physical File)
- `.lf` (Logical File)
- `.cmd` (Command)
- `.bnd` (Binding Directory)
- `.srvpgm` (Service Program)

Example settings.json to add custom file types:
```json
{
    "dateGutter.enabled": true,
    "dateGutter.enabledFileTypes": [
        ".rpgle",
        ".sqlrpgle",
        ".clle",
        ".clp",
        ".dspf",
        ".prtf",
        ".pf",
        ".lf",
        ".cmd",
        ".bnd",
        ".srvpgm",
        ".txt",
        ".log"
    ]
}
```

## Examples

### Basic Usage
```
230915 Started working on the project
Added new features without date
230916 Fixed bugs
Released version 1.0
```

In the above example (in a supported IBMi source file):
- First line: Shows "230915" in the gutter, date is hidden in text
- Second line: Shows "000000" in the gutter (lighter color), no text is hidden
- Third line: Shows "230916" in the gutter, date is hidden in text
- Fourth line: Shows "000000" in the gutter (lighter color), no text is hidden

## Tips

1. Dates should be in YYMMDD format at the beginning of the line
2. Lines without dates will show "000000" in a lighter color
3. Use the provided commands to quickly insert or update dates
4. The extension is specifically designed for IBMi source files
5. Additional file types can be configured in VS Code settings if needed

## Requirements

- Visual Studio Code version 1.60.0 or higher

## Known Issues

None at this time.

## Release Notes

### 1.0.0
- Initial release
- Basic date gutter display
- Date insertion and update commands
- Built-in support for IBMi source types
- Default "000000" display for lines without dates
- Optimized for IBMi development workflow

---

## Contributing

Feel free to submit issues and enhancement requests on our GitHub repository.

## License

This extension is licensed under the [MIT License](LICENSE).

**Enjoy!**