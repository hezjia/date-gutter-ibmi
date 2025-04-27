const vscode = require('vscode');

// Create decorator types
let dateGutterDecorationType;
let dateHideDecorationType;

// Get configuration
function getConfiguration() {
    return vscode.workspace.getConfiguration('dateGutter');
}

// Check if date decorator should be enabled for the file
function shouldEnableForFile(document) {
    const config = getConfiguration();
    
    // Check if extension is enabled
    if (!config.get('enabled', true)) {
        return false;
    }

    // Enable only for local files
    if (document.uri.scheme !== 'file') {
        return false;
    }

    // Check if opened in codefori object browser
    if (document.uri.scheme === 'objectBrowser' || 
        document.uri.scheme === 'member' || 
        document.uri.scheme === 'streamfile' ||
        document.uri.path.startsWith('/IBMi/')) {
        return false;
    }

    // Get enabled file types
    const enabledFileTypes = config.get('enabledFileTypes', ['.txt', '.md']);
    
    // Check if file extension is in enabled list
    const fileExtension = '.' + document.fileName.split('.').pop().toLowerCase();
    return enabledFileTypes.includes(fileExtension);
}

// Format Date YYMMDD
function formatDateToYYMMDD(date) {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

// Check if Date in YYMMDD format
function isDateFormat(text) {
    if (!text || text.length !== 6) {
        return false;
    }

    // 检查是否全是数字
    if (!/^\d{6}$/.test(text)) {
        return false;
    }

    const year = parseInt('20' + text.slice(0, 2));
    const month = parseInt(text.slice(2, 4));
    const day = parseInt(text.slice(4, 6));

    // 检查月份和日期是否有效
    if (month < 1 || month > 12) {
        return false;
    }

    const lastDayOfMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > lastDayOfMonth) {
        return false;
    }

    return true;
}

// Generate Line Number Maximum 999999
function generateLineNumber(lineIndex) {
    const sequenceNum = Math.min(lineIndex + 1, 999999);
    return sequenceNum.toString().padStart(6, '0');
}


// 更新装饰器
async function updateDecorations(editor) {
    try {
        if (!editor || !editor.document || !dateGutterDecorationType || !dateHideDecorationType) {
            console.log('Editor, document or decoration types are not available');
            return;
        }

        const document = editor.document;
        
        if (!shouldEnableForFile(document)) {
            editor.setDecorations(dateGutterDecorationType, []);
            editor.setDecorations(dateHideDecorationType, []);
            return;
        }

        const gutterDecorations = [];
        const hideDecorations = [];

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;
            
            // 检查行是否为空
            if (text.trim().length === 0) {
                continue;
            }

            // 检查前12位是否都是数字
            if (text.length >= 12 && /^\d{12}/.test(text)) {
                // 提取日期部分
                const dateStr = text.slice(6, 12);

                // Gutter 装饰器：显示日期
                const gutterDecoration = {
                    renderOptions: {
                        before: {
                            contentText: dateStr,
                            color: '#888888',
                            margin: '0 10px 0 0'
                        }
                    },
                    range: line.range
                };
                gutterDecorations.push(gutterDecoration);

                // Hide first 12 digits while keeping them clickable
                const hideDecoration = {
                    range: new vscode.Range(
                        new vscode.Position(i, 0),  // Start at position 0 (sequence)
                        new vscode.Position(i, 12)  // End at position 12 (end of date)
                    )
                };
                hideDecorations.push(hideDecoration);
            }
        }
 
        // 应用装饰器
        await Promise.all([
            Promise.resolve(editor.setDecorations(dateGutterDecorationType, gutterDecorations)),
            Promise.resolve(editor.setDecorations(dateHideDecorationType, hideDecorations))
        ]);
    } catch (error) {
        console.error('Error updating decorations:', error);
    }
}

// 更新修改行的日期
async function updateLineDate(editor, line) {
    try {
        if (!editor || !editor.document) {
            console.log('Editor or document is not available');
            return Promise.resolve();
        }

        const document = editor.document;
        
        // 检查行号是否有效
        if (line < 0 || line >= document.lineCount) {
            console.log(`Invalid line number: ${line}`);
            return Promise.resolve();
        }

        const lineText = document.lineAt(line).text;
        const newDate = formatDateToYYMMDD(new Date());
        
        if (lineText.length >= 12) {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(
                document.uri,
                new vscode.Range(
                    new vscode.Position(line, 6),  // Start at position 6 (after sequence)
                    new vscode.Position(line, 12)  // End at position 12 (end of date)
                ),
                newDate
            );
            
            // 等待编辑操作完成
            const editResult = await vscode.workspace.applyEdit(edit);
            if (!editResult) {
                console.log(`Failed to apply edit at line ${line}`);
            }
            return editResult;
        }
        return Promise.resolve();
    } catch (error) {
        console.error(`Error updating line ${line}:`, error);
        return Promise.resolve();
    }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    console.log('date-gutter-extension is now active!');

    // Create decorator types with gutter display configuration
    dateGutterDecorationType = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        gutterIconPath: context.asAbsolutePath('icon.png'),
        gutterIconSize: 'contain',
        after: {
            margin: '0 0 0 1em',
            width: '6em'
        }
    });

    // Create decorator type for hiding date text while keeping it clickable
    dateHideDecorationType = vscode.window.createTextEditorDecorationType({
        textDecoration: 'none',
        opacity: '0',
        color: 'transparent',
        letterSpacing: '-12ch',  // 压缩字符间距
        position: 'absolute',    // 绝对定位
        width: '0',              // 宽度设为0
        marginRight: '-12ch',    // 负边距补偿
        before: {
            contentText: '',
            width: '0',
            margin: '0'
        }
    });

    // Handle multi-line selection adjustments
    vscode.window.onDidChangeTextEditorSelection(event => {
        if (!event.selections || event.selections.length === 0) return;
        
        const editor = event.textEditor;
        const newSelections = [];
        let modified = false;

        for (const selection of event.selections) {
            // Skip if single-line selection or no overlap with prefix area
            if (selection.isSingleLine || selection.start.character >= 12) {
                newSelections.push(selection);
                continue;
            }

            // Adjust selection to start after 12-character prefix
            const adjustedStart = new vscode.Position(
                selection.start.line,
                Math.max(12, selection.start.character)
            );
            const adjustedEnd = selection.end;
            
            if (!adjustedStart.isEqual(selection.start)) {
                newSelections.push(new vscode.Selection(adjustedStart, adjustedEnd));
                modified = true;
            } else {
                newSelections.push(selection);
            }
        }

        if (modified) {
            editor.selections = newSelections;
        }
    });

    // 注册文本编辑器变更事件
    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        updateDecorations(activeEditor);
    }

    // 添加全局未处理 Promise 拒绝处理器
    const errorHandler = (error) => {
        console.error('Unhandled promise rejection:', error);
    };
    process.on('unhandledRejection', errorHandler);
    
    // 确保在扩展停用时清理错误处理器
    context.subscriptions.push({
        dispose: () => {
            process.removeListener('unhandledRejection', errorHandler);
        }
    });

    // 监听活动编辑器变化
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async editor => {
            try {
                activeEditor = editor;
                if (editor) {
                    await updateDecorations(editor);
                }
            } catch (error) {
                console.error('Error in editor change handler:', error);
            }
        })
    );

    // 监听文档变化
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(async event => {
            try {
                if (activeEditor && event.document === activeEditor.document) {
                    const newLines = new Set();
                    const modifiedLines = new Set();

                    // 分析文本变化
                    event.contentChanges.forEach(change => {
                        // 检查是否是新行
                        const isNewLine = change.text.includes('\n') || 
                                        change.text.includes('\r\n');
                        
                        // 获取受影响的行
                        for (let i = change.range.start.line; i <= change.range.end.line; i++) {
                            modifiedLines.add(i);
                        }

                        // 如果是新行，记录新行的行号
                        if (isNewLine) {
                            const newLineCount = (change.text.match(/\n/g) || []).length;
                            for (let i = change.range.start.line + 1; 
                                 i <= change.range.start.line + newLineCount; 
                                 i++) {
                                newLines.add(i);
                            }
                        }
                    });

                    // 确保编辑器仍然有效
                    if (!activeEditor.document || activeEditor.document !== event.document) {
                        return;
                    }

                    // 处理新行
                    if (newLines.size > 0) {
                        const edit = new vscode.WorkspaceEdit();
                        const newDate = formatDateToYYMMDD(new Date());
                        
                        for (const line of newLines) {
                            const lineText = activeEditor.document.lineAt(line).text;
                            // Add 12-digit prefix (6 line number + 6 zeros) if missing
                            if (lineText.length < 12 || !/^\d{12}/.test(lineText.substr(0, 12))) {
                                const sequence = generateLineNumber(line);
                                edit.insert(
                                    activeEditor.document.uri,
                                    new vscode.Position(line, 0),
                                    sequence + newDate
                                );
                            }
                        }
                        
                        await vscode.workspace.applyEdit(edit);
                    }

                    // 更新修改行的日期
                    await Promise.all(
                        Array.from(modifiedLines).map(async line => {
                            try {
                                await updateLineDate(activeEditor, line);
                            } catch (error) {
                                console.error(`Error updating line ${line}:`, error);
                            }
                        })
                    );

                    // 再次检查编辑器是否仍然有效
                    if (activeEditor && activeEditor.document) {
                        await updateDecorations(activeEditor);
                    }
                }
            } catch (error) {
                console.error('Error in document change handler:', error);
            }
        })
    );

    // 监听文档保存
    context.subscriptions.push(
        vscode.workspace.onWillSaveTextDocument(async event => {
            try {
                if (activeEditor && event.document === activeEditor.document) {
                    const document = event.document;
                    const edit = new vscode.WorkspaceEdit();
                    let modified = false;

                    for (let i = 0; i < document.lineCount; i++) {
                        const line = document.lineAt(i);
                        const text = line.text;
                        
                        // Skip empty lines
                        if (text.trim().length === 0) {
                            continue;
                        }
                        
                        const needsPrefix = text.length < 12 || !/^\d{12}/.test(text.substr(0, 12));
                        
                        if (needsPrefix) {
                            const sequence = generateLineNumber(i);
                            const newPrefix = sequence + '000000'; // Fixed 6 zeros as date
                            
                            // Replace or insert prefix
                            if (text.length >= 6 && /^\d{6}/.test(text)) {
                                edit.replace(
                                    document.uri,
                                    new vscode.Range(
                                        new vscode.Position(i, 0),
                                        new vscode.Position(i, 6)
                                    ),
                                    newPrefix
                                );
                            } else {
                                edit.insert(
                                    document.uri,
                                    new vscode.Position(i, 0),
                                    newPrefix
                                );
                            }
                            modified = true;
                        }
                    }
                    
                    // Apply edits if needed
                    if (modified) {                        
                        await vscode.workspace.applyEdit(edit);
                    }
                    
                    // Update decorations
                    await updateDecorations(activeEditor);
                }
            } catch (error) {
                console.error('Error in document save handler:', error);
            }
        })
    );

    // 监听配置变化
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async event => {
            try {
                if (event.affectsConfiguration('dateGutter.enabled') || 
                    event.affectsConfiguration('dateGutter.enabledFileTypes')) {
                    if (activeEditor) {
                        await updateDecorations(activeEditor);
                    }
                }
            } catch (error) {
                console.error('Error in configuration change handler:', error);
            }
        })
    );

    // Listen for text document open
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(async document => {
            if (shouldEnableForFile(document)) {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document === document) {
                    const config = getConfiguration();
                    
                    // Only auto-complete if enabled in settings
                    const autoCompleteEnabled = config.get('autoCompletePrefix', true);
                    console.log(`Auto-complete prefix enabled: ${autoCompleteEnabled}`);
                    
                    if (autoCompleteEnabled) {
                        // Check and add line numbers if needed
                        const edit = new vscode.WorkspaceEdit();
                        let modified = false;
                        let linesModified = 0;

                        for (let i = 0; i < document.lineCount; i++) {
                            const line = document.lineAt(i);
                            const text = line.text;

                            // Skip empty lines
                            if (text.trim().length === 0) {
                                console.log(`Skipping empty line ${i}`);
                                continue;
                            }

                            const needsPrefix = text.length < 12 || !/^\d{12}/.test(text.substr(0, 12));
                            console.log(`Line ${i}: needsPrefix=${needsPrefix}, text=${text.substr(0, 12)}...`);

                            if (needsPrefix) {
                                const lineNumber = generateLineNumber(i);
                                const newPrefix = lineNumber + '000000'; // Fixed 6 zeros as date
                                
                                console.log(`Adding prefix to line ${i}: ${newPrefix}`);
                                edit.insert(
                                    document.uri,
                                    new vscode.Position(i, 0),
                                    newPrefix
                                );
                                modified = true;
                                linesModified++;
                            }
                        }

                        // Apply edits if needed
                        if (modified) {
                            console.log(`Applying edits to ${linesModified} lines`);
                            const editResult = await vscode.workspace.applyEdit(edit);
                            console.log(`Edit applied successfully: ${editResult}`);
                            if (!editResult) {
                                console.error('Failed to apply workspace edit');
                            }
                        } else {
                            console.log('No lines needed prefix updates');
                        }
                    }
                    await updateDecorations(editor);
                }
            }
        })
    );

    // Register copy without prefix command
    context.subscriptions.push(
        vscode.commands.registerCommand('dateGutter.copyWithoutPrefix', copyWithoutPrefix)
    );

    // Ensure decorator types are properly cleaned up
    context.subscriptions.push({
        dispose: () => {
            if (dateGutterDecorationType) {
                dateGutterDecorationType.dispose();
                dateGutterDecorationType = undefined;
            }
            if (dateHideDecorationType) {
                dateHideDecorationType.dispose();
                dateHideDecorationType = undefined;
            }
        }
    });
}

// Handle copying text while excluding first 12 digits
async function copyWithoutPrefix() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    let fullText = '';
    for (const selection of editor.selections) {
        for (let i = selection.start.line; i <= selection.end.line; i++) {
            const lineText = editor.document.lineAt(i).text;
            // Skip first 12 digits if they exist
            fullText += (lineText.length > 12 && /^\d{12}/.test(lineText) 
                ? lineText.substring(12) 
                : lineText) + '\n';
        }
    }
    
    await vscode.env.clipboard.writeText(fullText.trim());
    vscode.window.showInformationMessage('Copied (excluding prefix numbers)');
}

function deactivate() {
    try {
        if (dateGutterDecorationType) {
            dateGutterDecorationType.dispose();
            dateGutterDecorationType = undefined;
        }
        if (dateHideDecorationType) {
            dateHideDecorationType.dispose();
            dateHideDecorationType = undefined;
        }
    } catch (error) {
        console.error('Error during extension deactivation:', error);
    }
}

module.exports = {
    activate,
    deactivate
}