# Change Log

All notable changes to the "date-gutter-ibmi" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-05-15

### Added
- New code action: "Remove 12-digit Prefix"
  - Removes the 12-digit prefix from lines
  - Works in two modes:
    - Selection mode: Only processes selected lines
    - Full document mode: Processes all lines when no selection
  - Only affects lines with valid 12-digit prefix
  - Shows operation summary in status message
  - Available in editor context menu

### Changed
- Updated documentation with new feature details
- Improved user feedback for prefix removal operations


## [1.3.2] - 2025-05-11

### Fixed
- Preserve original dates during undo/redo operations
- Fixed flickering when selecting lines in other files
- Improved decoration update performance

## [1.3.0] - 2025-05-10

### Added
- New code action: "Add Line Number Prefix"
  - Adds 12-digit prefix to selected lines
  - First 6 digits are line number
  - Last 6 digits are zeros (000000)
  - Only adds to lines without existing prefix
- New command: `Date Gutter: Add Line Number Prefix`
- Enhanced multi-line support for prefix addition
- Automatic decoration update after adding prefixes

### Changed
- Updated documentation with new feature details
- Improved user feedback for prefix addition operations
- Enhanced code action menu with new option
- Renamed internal command from `removePrefixFromSelection` to `removeLinesFromSelection` for clarity

## [1.2.0] - 2025-04-28

### Added
- Code action menu (light bulb) for selected lines
  - "Copy Selected Lines": Copy selected text without 12-digit prefix
  - "Delete Selected Lines": Delete selected lines completely
- Enhanced line deletion:
  - Removes entire line content including hidden 12-digit prefix
  - Automatically cleans up gutter decorations
  - Works with multi-line selections
- Improved selection handling:
  - Better multi-line selection support
  - Maintains cursor position after operations
  - Proper handling of line endings

### Changed
- Optimized decoration updates for better performance
- Improved error handling and user feedback
- Enhanced selection behavior for numbered lines
- Updated documentation with new features
- Remove Key binding configuration for Ctrl+C/Command+C

## [Unreleased]

## [1.1.3] - 2025-04-26

### Added
- Smart copy functionality (Ctrl+C) that automatically excludes prefix numbers
- New command `dateGutter.copyWithoutPrefix` for filtered copying
- Key binding configuration for Ctrl+C/Command+C
- Debug logging for copy operations

### Changed
- Updated README with new feature documentation
- Improved copy behavior for multi-line selections
- Modified gutter decoration settings for better selection handling

## [1.0.0] - 2025-04-25

### Added
- Initial release of Date Gutter for IBMi
- Display dates in YYMMDD format in the editor gutter
- Auto-hide dates in text content while showing in gutter
- Default "000000" display for lines without dates:
  - Shows in lighter color to distinguish from actual dates
  - No text hiding for lines without dates
  - Applies to all non-empty lines in supported files
- Command to insert current date at cursor position
- Command to update existing date to current date
- Configurable extension settings:
  - Enable/disable the extension globally
  - Configure supported file types through `enabledFileTypes` setting
- Built-in support for IBMi source types:
  - RPG ILE (.rpgle)
  - SQL RPG (.sqlrpgle)
  - CL (.clle, .clp)
  - Display File (.dspf)
  - Printer File (.prtf)
  - Physical File (.pf)
  - Logical File (.lf)
  - Command (.cmd)
  - Binding Directory (.bnd)
  - Service Program (.srvpgm)

### Changed
- Updated documentation with English descriptions
- Improved date formatting for better readability
- Added comprehensive file type configuration support
- Focused default support on IBMi development files
- Enhanced gutter display with default date indicators