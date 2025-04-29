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

    // Default supported IBMi file types
    const defaultFileTypes = ['.rpgle', '.sqlrpgle', '.clle', '.dds', '.pf', '.lf'];
    
    // Get enabled file types (convert all to lowercase for comparison)
    const enabledFileTypes = config.get('enabledFileTypes', defaultFileTypes)
        .map(ext => ext.toLowerCase());
    
    // Check if file extension is in enabled list (case insensitive)
    const fileNameParts = document.fileName.split('.');
    if (fileNameParts.length < 2) return false; // No extension
    
    const fileExtension = '.' + fileNameParts.pop().toLowerCase();
    return enabledFileTypes.some(ext => ext === fileExtension);
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


// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 更新装饰器
const updateDecorations = debounce(async (editor) => {
    try {
        if (!editor || !editor.document || !dateGutterDecorationType || !dateHideDecorationType) {
            // 如果编辑器无效，清除所有装饰器
            if (editor) {
                editor.setDecorations(dateGutterDecorationType, []);
                editor.setDecorations(dateHideDecorationType, []);
            }
            return;
        }

        const document = editor.document;
        
        // 检查文件类型是否启用该功能
        if (!shouldEnableForFile(document)) {
            editor.setDecorations(dateGutterDecorationType, []);
            editor.setDecorations(dateHideDecorationType, []);
            return;
        }

        // 检查文档是否还有内容
        if (document.lineCount === 0) {
            editor.setDecorations(dateGutterDecorationType, []);
            editor.setDecorations(dateHideDecorationType, []);
            return;
        }

        const gutterDecorations = [];
        const hideDecorations = [];
        const visibleRanges = editor.visibleRanges;
        
        // 如果没有可见范围，使用整个文档
        const rangesToProcess = visibleRanges.length > 0 
            ? visibleRanges 
            : [new vscode.Range(0, 0, document.lineCount - 1, 0)];

        for (const range of rangesToProcess) {
            const startLine = range.start.line;
            const endLine = range.end.line;

            for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
                try {
                    const line = document.lineAt(lineNum);
                    const text = line.text;
                    
                    if (text.length >= 12 && /^\d{12}/.test(text)) {
                        const dateStr = text.slice(6, 12);
                        const decorationRange = new vscode.Range(
                            new vscode.Position(lineNum, 0),
                            new vscode.Position(lineNum, 12)
                        );

                        gutterDecorations.push({
                            range: line.range,
                            renderOptions: {
                                before: {
                                    contentText: dateStr,
                                    color: '#888888',
                                    margin: '0 10px 0 0'
                                }
                            }
                        });
                        hideDecorations.push({ range: decorationRange });
                    }
                } catch (error) {
                    // 如果行不存在（可能被删除），跳过
                    continue;
                }
            }
        }

        // 批量应用装饰器
        editor.setDecorations(dateGutterDecorationType, gutterDecorations);
        editor.setDecorations(dateHideDecorationType, hideDecorations);
    } catch (error) {
        console.error('Error updating decorations:', error);
        // 出错时清除所有装饰器
        if (editor) {
            editor.setDecorations(dateGutterDecorationType, []);
            editor.setDecorations(dateHideDecorationType, []);
        }
    }
}, 100); // 减少防抖时间以提高响应性

// 更新修改行的日期
async function updateLineDate(editor, line) {
    try {
        if (!editor || !editor.document) {
            console.log('Editor or document is not available');
            return Promise.resolve();
        }

        const document = editor.document;
        
        // 检查文件是否启用
        if (!shouldEnableForFile(document)) {
            return Promise.resolve();
        }
        
        // 检查行号是否有效
        if (line < 0 || line >= document.lineCount) {
            console.log(`Invalid line number: ${line}`);
            return Promise.resolve();
        }

        const lineText = document.lineAt(line).text;
        
        // 检查前12位是否都是数字
        if (lineText.length < 12 || !/^\d{12}/.test(lineText)) {
            return Promise.resolve();
        }
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
// 创建 CodeAction 提供器
class DateGutterActionProvider {
    provideCodeActions(document, range, context, token) {
        // 检查文件类型
        if (!shouldEnableForFile(document)) {
            return [];
        }

        // 检查是否有选择的文本
        if (range.isEmpty) {
            return [];
        }

        // 检查选中的行是否包含12位前缀
        let hasNumberedLine = false;
        for (let i = range.start.line; i <= range.end.line; i++) {
            const line = document.lineAt(i);
            if (line.text.length >= 12 && /^\d{12}/.test(line.text)) {
                hasNumberedLine = true;
                break;
            }
        }

        // 如果没有包含前缀的行，不显示操作菜单
        if (!hasNumberedLine) {
            return [];
        }

        const actions = [];

        // 创建复制操作（不包含前缀）
        const copyAction = new vscode.CodeAction(
            'Copy Selected Lines',
            vscode.CodeActionKind.RefactorExtract
        );
        copyAction.command = {
            command: 'date-gutter.copyWithoutPrefix',
            title: 'Copy Selected Lines',
            tooltip: 'Copy the selected text without the 12-digit prefix'
        };
        // 设置操作的适用范围
        copyAction.isPreferred = false;
        actions.push(copyAction);

        // 创建删除选中行操作
        const removePrefixAction = new vscode.CodeAction(
            'Delete Selected Lines',
            vscode.CodeActionKind.RefactorRewrite
        );
        removePrefixAction.command = {
            command: 'date-gutter.removePrefixFromSelection',
            title: 'Delete Selected Lines',
            tooltip: 'Delete selected lines (including number prefix if present)'
        };
        // 设置操作的适用范围
        removePrefixAction.isPreferred = false;
        actions.push(removePrefixAction);

        return actions;
    }
}

function activate(context) {
    // 注册 CodeAction 提供器
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            [
                { scheme: 'file' }, // 只适用于本地文件
                { scheme: 'untitled' } // 也支持未保存的文件
            ],
            new DateGutterActionProvider(),
            {
                providedCodeActionKinds: [
                    vscode.CodeActionKind.RefactorExtract,
                    vscode.CodeActionKind.RefactorRewrite
                ]
            }
        )
    );

    // 注册删除选中行命令（包括隐藏的前12位和内容）
    context.subscriptions.push(
        vscode.commands.registerCommand('date-gutter.removePrefixFromSelection', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !editor.document) return;

            if (!shouldEnableForFile(editor.document)) {
                return;
            }

            const edit = new vscode.WorkspaceEdit();
            const document = editor.document;
            
            // 收集所有要删除的行，按行号从大到小排序（避免删除影响行号）
            const linesToDelete = new Set();
            const linesWithPrefix = new Set(); // 记录有前缀的行
            
            for (const selection of editor.selections) {
                for (let i = selection.start.line; i <= selection.end.line; i++) {
                    const line = document.lineAt(i);
                    const text = line.text;
                    
                    // 检查是否有12位前缀
                    if (text.length >= 12 && /^\d{12}/.test(text)) {
                        linesWithPrefix.add(i);
                    }
                    linesToDelete.add(i);
                }
            }

            const sortedLines = Array.from(linesToDelete).sort((a, b) => b - a);
            
            // 从后往前删除行，避免行号变化影响删除操作
            for (const lineNum of sortedLines) {
                const line = document.lineAt(lineNum);
                const text = line.text;
                
                // 如果行有12位前缀，删除整行
                if (linesWithPrefix.has(lineNum)) {
                    const range = new vscode.Range(
                        new vscode.Position(lineNum, 0),
                        lineNum < document.lineCount - 1 
                            ? new vscode.Position(lineNum + 1, 0)  // 包括换行符
                            : new vscode.Position(lineNum, text.length)  // 最后一行
                    );
                    edit.delete(document.uri, range);
                } else {
                    // 如果行没有12位前缀，也删除整行
                    const range = new vscode.Range(
                        new vscode.Position(lineNum, 0),
                        lineNum < document.lineCount - 1 
                            ? new vscode.Position(lineNum + 1, 0)  // 包括换行符
                            : new vscode.Position(lineNum, text.length)  // 最后一行
                    );
                    edit.delete(document.uri, range);
                }
            }

            if (edit.size > 0) {
                // 先清除所有装饰器
                editor.setDecorations(dateGutterDecorationType, []);
                editor.setDecorations(dateHideDecorationType, []);
                
                // 执行删除操作
                const success = await vscode.workspace.applyEdit(edit);
                
                if (success) {
                    // 强制立即更新装饰器
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // 只更新装饰器如果编辑器仍然有效
                    if (editor && editor.document) {
                        await updateDecorations(editor);
                    }
                    
                    const prefixCount = linesWithPrefix.size;
                    const totalCount = linesToDelete.size;
                    
                    let message = `Deleted ${totalCount} line${totalCount > 1 ? 's' : ''}`;
                    if (prefixCount > 0) {
                        message += ` (${prefixCount} with number prefix)`;
                    }
                    vscode.window.showInformationMessage(message);
                }
            }
        })
    );

    console.log('date-gutter-extension is now active!');

    // Track editor closing state
    let isEditorClosing = false;

    // Handle editor close event
    context.subscriptions.push(
        vscode.window.onDidChangeVisibleTextEditors(editors => {
            if (activeEditor && !editors.includes(activeEditor)) {
                isEditorClosing = true;
                // Clean up decorations immediately
                if (activeEditor && dateGutterDecorationType && dateHideDecorationType) {
                    activeEditor.setDecorations(dateGutterDecorationType, []);
                    activeEditor.setDecorations(dateHideDecorationType, []);
                }
            }
        })
    );

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
        textDecoration: 'none; transition: all 0.1s ease-in-out',
        opacity: '0',
        color: 'transparent',
        letterSpacing: '-12ch',  // 压缩字符间距
        position: 'absolute',    // 绝对定位
        width: '0',              // 宽度设为0
        marginRight: '-12ch',    // 负边距补偿
        backgroundColor: 'transparent',
        before: {
            contentText: '',
            width: '0',
            margin: '0'
        }
    });

    // Handle multi-line selection adjustments
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
            if (!event.selections || event.selections.length === 0) return;
            
            const editor = event.textEditor;
            if (!editor || !editor.document) return;

            // 检查文件类型是否启用该功能
            if (!shouldEnableForFile(editor.document)) return;

            // 检查文件内容是否包含12位前缀的行
            const hasNumberedLines = editor.document.getText().split('\n').some(line => 
                line.length >= 12 && /^\d{12}/.test(line)
            );
            if (!hasNumberedLines) return;

            const newSelections = [];
            let modified = false;
            let activeIndex = -1;

            // 找到活动选择的索引
            for (let i = 0; i < event.selections.length; i++) {
                if (event.selections[i].isEqual(editor.selection)) {
                    activeIndex = i;
                    break;
                }
            }

            for (let i = 0; i < event.selections.length; i++) {
                const selection = event.selections[i];
                // Skip if single-line selection or no overlap with prefix area
                if (selection.isSingleLine || selection.start.character >= 12) {
                    newSelections.push(selection);
                    continue;
                }

                // 检查选择的起始行是否有12位前缀
                const startLineText = editor.document.lineAt(selection.start.line).text;
                if (!(startLineText.length >= 12 && /^\d{12}/.test(startLineText))) {
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
                    const newSelection = new vscode.Selection(
                        // 如果这是活动选择，保持原始的活动端和锚点顺序
                        i === activeIndex && selection.isReversed ? adjustedEnd : adjustedStart,
                        i === activeIndex && selection.isReversed ? adjustedStart : adjustedEnd
                    );
                    newSelections.push(newSelection);
                    modified = true;
                } else {
                    newSelections.push(selection);
                }
            }

            if (modified) {
                // 保持活动选择的索引
                if (activeIndex !== -1) {
                    editor.selections = newSelections;
                    // 确保活动选择保持在原来的位置
                    const activeSelection = newSelections[activeIndex];
                    editor.selection = activeSelection;
                } else {
                    editor.selections = newSelections;
                }
            }
        })
    );

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

    // 监听活动编辑器变化和可见范围变化
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
        }),
        vscode.window.onDidChangeTextEditorVisibleRanges(async event => {
            try {
                if (isEditorClosing || !activeEditor || event.textEditor !== activeEditor) {
                    return;
                }
                // 立即更新可见区域的装饰器
                await updateDecorations(activeEditor);
            } catch (error) {
                console.error('Error in visible ranges change handler:', error);
            }
        })
    );

    // 监听文档变化
    let pendingUpdates = new Set();
    let isUpdating = false;

    const processUpdates = debounce(async () => {
        if (isUpdating || pendingUpdates.size === 0) return;
        
        isUpdating = true;
        try {
            if (!activeEditor || !activeEditor.document) return;

            // 检查文件类型是否启用该功能
            if (!shouldEnableForFile(activeEditor.document)) {
                pendingUpdates.clear();
                return;
            }

            const edit = new vscode.WorkspaceEdit();
            const newDate = formatDateToYYMMDD(new Date());
            const document = activeEditor.document;

            // 将待更新的行按行号排序
            const sortedUpdates = Array.from(pendingUpdates)
                .sort((a, b) => a.number - b.number);

            // 批量处理所有待更新的行
            for (const line of sortedUpdates) {
                try {
                    // 确保行号有效
                    if (line.number >= 0 && line.number < document.lineCount) {
                        const lineText = document.lineAt(line.number).text;
                        
                        if (line.isNew) {
                            // 处理新行
                            if (lineText.length < 12 || !/^\d{12}/.test(lineText)) {
                                const sequence = generateLineNumber(line.number);
                                edit.insert(
                                    document.uri,
                                    new vscode.Position(line.number, 0),
                                    sequence + newDate
                                );
                            }
                        } else {
                            // 更新现有行的日期
                            if (lineText.length >= 12 && /^\d{12}/.test(lineText)) {
                                edit.replace(
                                    document.uri,
                                    new vscode.Range(
                                        new vscode.Position(line.number, 6),
                                        new vscode.Position(line.number, 12)
                                    ),
                                    newDate
                                );
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error processing line ${line.number}:`, error);
                }
            }

            // 应用所有编辑
            if (edit.size > 0) {
                await vscode.workspace.applyEdit(edit);
            }

            // 一次性更新所有装饰器
            await updateDecorations(activeEditor);
            
        } catch (error) {
            console.error('Error in processUpdates:', error);
        } finally {
            pendingUpdates.clear();
            isUpdating = false;
        }
    }, 100); // 减少延迟以提高响应性

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (isEditorClosing || !activeEditor || event.document !== activeEditor.document) {
                return;
            }

            // 检查文件类型是否启用该功能
            if (!shouldEnableForFile(event.document)) {
                return;
            }

            event.contentChanges.forEach(change => {
                // 检查是否是新行（通过回车键）
                const isNewLine = change.text.includes('\n') || change.text.includes('\r\n');
                
                // 检查是否是在行尾添加的新行
                const isEndOfLine = change.range.start.character === event.document.lineAt(change.range.start.line).text.length;
                
                // 添加修改的行到待更新集合
                for (let i = change.range.start.line; i <= change.range.end.line; i++) {
                    // 检查当前行是否已经有12位前缀
                    const lineText = event.document.lineAt(i).text;
                    const hasPrefix = lineText.length >= 12 && /^\d{12}/.test(lineText);
                    
                    // 如果行没有前缀，标记为新行
                    pendingUpdates.add({ 
                        number: i, 
                        isNew: !hasPrefix
                    });
                }

                // 处理新行
                if (isNewLine && isEndOfLine) {
                    const newLineCount = (change.text.match(/\n/g) || []).length;
                    for (let i = change.range.start.line + 1; i <= change.range.start.line + newLineCount; i++) {
                        // 检查新行是否在文档范围内
                        if (i < event.document.lineCount) {
                            const lineText = event.document.lineAt(i).text;
                            // 只有当新行没有前缀时才添加
                            if (!(lineText.length >= 12 && /^\d{12}/.test(lineText))) {
                                pendingUpdates.add({ number: i, isNew: true });
                            }
                        }
                    }
                }
            });

            // 触发批量更新处理
            if (pendingUpdates.size > 0) {
                processUpdates();
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
   
    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('date-gutter.copyWithoutPrefix', copyWithoutPrefix)
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
    if (!editor || !editor.document) return;
    
    // Check if file is enabled
    if (!shouldEnableForFile(editor.document)) {
        return;
    }

    let fullText = '';

    // 处理选择的文本（如果有的话）
    if (editor.selections.length > 0 && !editor.selection.isEmpty) {
        for (const selection of editor.selections) {
            // 处理多行选择
            if (selection.start.line === selection.end.line) {
                // 单行选择
                const line = editor.document.lineAt(selection.start.line);
                const lineText = line.text;
                const startChar = selection.start.character;
                const endChar = selection.end.character;

                // 如果选择包含前12个字符，需要排除它们
                if (startChar < 12 && lineText.length >= 12 && /^\d{12}/.test(lineText)) {
                    const adjustedStart = Math.max(12, startChar);
                    fullText += lineText.substring(adjustedStart, endChar);
                } else {
                    fullText += lineText.substring(startChar, endChar);
                }
            } else {
                // 多行选择
                for (let i = selection.start.line; i <= selection.end.line; i++) {
                    const line = editor.document.lineAt(i);
                    const lineText = line.text;
                    let startChar = (i === selection.start.line) ? selection.start.character : 0;
                    let endChar = (i === selection.end.line) ? selection.end.character : lineText.length;

                    // 如果这一行以12位数字开头，并且选择包含这些数字，则排除它们
                    if (startChar < 12 && lineText.length >= 12 && /^\d{12}/.test(lineText)) {
                        startChar = Math.max(12, startChar);
                    }

                    fullText += lineText.substring(startChar, endChar);
                    if (i < selection.end.line) fullText += '\n';
                }
            }
        }
    } else {
        // 如果没有选择，处理当前行
        const currentLine = editor.selection.active.line;
        const lineText = editor.document.lineAt(currentLine).text;
        
        // 如果当前行以12位数字开头，排除它们
        if (lineText.length >= 12 && /^\d{12}/.test(lineText)) {
            fullText = lineText.substring(12);
        } else {
            fullText = lineText;
        }
    }
    
    await vscode.env.clipboard.writeText(fullText);
    vscode.window.showInformationMessage('Copied text (excluding prefix numbers)');
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