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
    try {
        // Double-check document exists
        if (!document || !document.fileName) {
            console.log('Invalid document object');
            return false;
        }

        const config = getConfiguration();
        
        // Strict check if extension is enabled
        if (!config.get('enabled', true)) {
            console.log('Extension is disabled in settings');
            return false;
        }

        // Strict scheme checking
        const supportedSchemes = ['file', 'untitled', 'git', 'gitfs'];
        if (!supportedSchemes.includes(document.uri.scheme)) {
            console.log(`Unsupported scheme: ${document.uri.scheme}`);
            return false;
        }

        // Explicit IBMi object browser check
        if (document.uri.scheme === 'objectBrowser' || 
            document.uri.scheme === 'member' || 
            document.uri.scheme === 'streamfile' ||
            (document.uri.path && document.uri.path.startsWith('/IBMi/'))) {
            console.log('File is in IBMi object browser');
            return false;
        }

        // Get enabled file types with strict validation
        const defaultFileTypes = ['.rpgle', '.sqlrpgle', '.clle', '.dds', '.pf', '.lf'];
        const enabledFileTypes = config.get('enabledFileTypes', defaultFileTypes)
            .map(ext => ext.toLowerCase().trim())
            .filter(ext => ext.startsWith('.')); // Ensure proper extensions

        // Strict file extension check
        const fileName = document.fileName.toLowerCase();
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) {
            console.log('File has no extension');
            return false;
        }

        const fileExt = fileName.slice(lastDotIndex);
        const isEnabled = enabledFileTypes.includes(fileExt);
        
        if (!isEnabled) {
            console.log(`File extension not supported: ${fileExt}`);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error in shouldEnableForFile:', error);
        return false;
    }
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
            if (editor) {
                editor.setDecorations(dateGutterDecorationType, []);
                editor.setDecorations(dateHideDecorationType, []);
            }
            return;
        }

        const document = editor.document;
        
        if (!shouldEnableForFile(document)) {
            editor.setDecorations(dateGutterDecorationType, []);
            editor.setDecorations(dateHideDecorationType, []);
            return;
        }

        if (document.lineCount === 0) {
            editor.setDecorations(dateGutterDecorationType, []);
            editor.setDecorations(dateHideDecorationType, []);
            return;
        }

        const gutterDecorations = [];
        const hideDecorations = [];
        const visibleRanges = editor.visibleRanges;
        
        // 只处理可见范围（Git视图或普通视图）
        const rangesToProcess = (document.uri.scheme === 'git' || document.uri.scheme === 'gitfs')
            ? visibleRanges.filter(range => 
                range.start.line >= 0 && range.end.line < document.lineCount)
            : visibleRanges.length > 0 
                ? visibleRanges 
                : [new vscode.Range(0, 0, document.lineCount - 1, 0)];

        // 批量处理可见行
        for (const range of rangesToProcess) {
            const startLine = Math.max(0, range.start.line);
            const endLine = Math.min(document.lineCount - 1, range.end.line);
            
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
                    continue;
                }
            }
        }

        // 立即应用装饰器
        editor.setDecorations(dateGutterDecorationType, gutterDecorations);
        editor.setDecorations(dateHideDecorationType, hideDecorations);
    } catch (error) {
        console.error('Error updating decorations:', error);
        if (editor) {
            editor.setDecorations(dateGutterDecorationType, []);
            editor.setDecorations(dateHideDecorationType, []);
        }
    }
}, 50); // 进一步减少防抖时间以改善滚动体验

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
        const removeLinesAction = new vscode.CodeAction(
            'Delete Selected Lines',
            vscode.CodeActionKind.RefactorRewrite
        );
        removeLinesAction.command = {
            command: 'date-gutter.removeLinesFromSelection',
            title: 'Delete Selected Lines',
            tooltip: 'Delete selected lines (including number prefix if present)'
        };
        // 设置操作的适用范围
        removeLinesAction.isPreferred = false;
        actions.push(removeLinesAction);

        // 创建添加前缀操作
        const addPrefixAction = new vscode.CodeAction(
            'Add Line Number Prefix',
            vscode.CodeActionKind.RefactorRewrite
        );
        addPrefixAction.command = {
            command: 'date-gutter.addPrefixToSelection',
            title: 'Add Line Number Prefix',
            tooltip: 'Add 12-digit prefix (6-digit line number + 6 zeros) to selected lines'
        };
        // 设置操作的适用范围
        addPrefixAction.isPreferred = false;
        actions.push(addPrefixAction);

        return actions;
    }
}

function activate(context) {
    // 注册 CodeAction 提供器（支持Git差异视图）
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            [
                { scheme: 'file' },    // 本地文件
                { scheme: 'untitled' }, // 未保存的文件
                { scheme: 'git' },      // Git差异视图
                { scheme: 'gitfs' }     // Git差异视图
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
        vscode.commands.registerCommand('date-gutter.removeLinesFromSelection', async () => {
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

    // Handle editor close and switch events
    context.subscriptions.push(
        vscode.window.onDidChangeVisibleTextEditors(editors => {
            try {
                const wasActiveEditorClosed = activeEditor && !editors.includes(activeEditor);
                const isNewEditorActive = editors.length > 0 && editors[0] !== activeEditor;
                
                if (wasActiveEditorClosed) {
                    isEditorClosing = true;
                    // Clean up decorations immediately
                    if (activeEditor && dateGutterDecorationType && dateHideDecorationType) {
                        activeEditor.setDecorations(dateGutterDecorationType, []);
                        activeEditor.setDecorations(dateHideDecorationType, []);
                    }
                }
                
                // Reset closing flag if new editor is active
                if (isNewEditorActive) {
                    isEditorClosing = false;
                }
                
                // Update decorations for newly visible editors
                editors.forEach(async editor => {
                    if (editor !== activeEditor) {
                        await updateDecorations(editor);
                    }
                });
            } catch (error) {
                console.error('Error in editor visibility change handler:', error);
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

    // 监听可见范围变化（优化滚动性能）
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorVisibleRanges(async event => {
            try {
                if (isEditorClosing || !activeEditor || event.textEditor !== activeEditor) {
                    return;
                }
                
                // 立即更新可见区域的装饰器（跳过防抖）
                const document = activeEditor.document;
                if (!document || !shouldEnableForFile(document)) {
                    return;
                }

                const gutterDecorations = [];
                const hideDecorations = [];
                
                // 只处理当前可见范围
                for (const range of event.visibleRanges) {
                    const startLine = Math.max(0, range.start.line);
                    const endLine = Math.min(document.lineCount - 1, range.end.line);
                    
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
                            continue;
                        }
                    }
                }

                // 立即应用装饰器（不等待防抖）
                activeEditor.setDecorations(dateGutterDecorationType, gutterDecorations);
                activeEditor.setDecorations(dateHideDecorationType, hideDecorations);
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
            if (!activeEditor || !activeEditor.document) {
                pendingUpdates.clear();
                return;
            }
    
            // Verify file type
            if (!shouldEnableForFile(activeEditor.document)) {
                pendingUpdates.clear();
                return;
            }
    
            const edit = new vscode.WorkspaceEdit();
            const newDate = formatDateToYYMMDD(new Date());
            const document = activeEditor.document;
    
            // Process updates in order
            const sortedUpdates = Array.from(pendingUpdates)
                .sort((a, b) => a.number - b.number);
    
            for (const line of sortedUpdates) {
                try {
                    if (line.number >= 0 && line.number < document.lineCount) {
                        const lineText = document.lineAt(line.number).text;
                        
                        if (line.needsPrefix && (line.isNew || lineText.length < 12 || !/^\d{12}/.test(lineText))) {
                            const sequence = generateLineNumber(line.number);
                            edit.insert(
                                document.uri,
                                new vscode.Position(line.number, 0),
                                sequence + newDate
                            );
                        } else if (!line.isNew && lineText.length >= 12 && /^\d{12}/.test(lineText)) {
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
                } catch (error) {
                    console.error(`Error processing line ${line.number}:`, error);
                }
            }
    
            // Apply all edits
            if (edit.size > 0) {
                const success = await vscode.workspace.applyEdit(edit);
                if (!success) {
                    console.error('Failed to apply workspace edits');
                }
            }
    
            // Update decorations
            await updateDecorations(activeEditor);
            
        } catch (error) {
            console.error('Error in processUpdates:', error);
        } finally {
            pendingUpdates.clear();
            isUpdating = false;
        }
    }, 100);

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(async event => {
            try {
                if (isEditorClosing || !activeEditor || event.document !== activeEditor.document) {
                    return;
                }
    
                // Strict document validation
                if (!event.document || event.document.isClosed || !event.document.fileName) {
                    pendingUpdates.clear();
                    return;
                }
    
                // Strict file type check with additional validation
                if (!shouldEnableForFile(event.document) || 
                    !event.document.uri || 
                    !['file', 'untitled'].includes(event.document.uri.scheme)) {
                    pendingUpdates.clear();
                    return;
                }
    
                // Additional check to prevent Copilot interference
                const isCopilotEdit = event.contentChanges.some(change => 
                    change.text.includes('\n') && 
                    change.text.trim().length > 0 &&
                    change.range.start.character === 0 &&
                    change.range.end.character === 0
                );
                
                if (isCopilotEdit) {
                    console.log('Detected potential Copilot edit - skipping');
                    return;
                }
    
                // Process each content change
                event.contentChanges.forEach(change => {
                    try {
                        const isNewLine = change.text.includes('\n') || change.text.includes('\r\n');
                        const isEndOfLine = change.range.start.character === 
                            event.document.lineAt(change.range.start.line).text.length;
                        const isPureNewline = (change.text === '\n' || change.text === '\r\n') && 
                            change.rangeLength === 0;
    
                        // Special case: pure newline at end of line (Enter key pressed)
                        if (isNewLine && isEndOfLine && isPureNewline) {
                            // Only process the new lines, not the current line
                            const newLineCount = (change.text.match(/\n/g) || []).length;
                            for (let i = change.range.start.line + 1; i <= change.range.start.line + newLineCount; i++) {
                                if (i < event.document.lineCount) {
                                    try {
                                        const lineText = event.document.lineAt(i).text;
                                        if (!(lineText.length >= 12 && /^\d{12}/.test(lineText))) {
                                            pendingUpdates.add({ 
                                                number: i, 
                                                isNew: true,
                                                needsPrefix: shouldEnableForFile(event.document)
                                            });
                                        }
                                    } catch (error) {
                                        console.error(`Error processing new line ${i}:`, error);
                                    }
                                }
                            }
                        } else {
                            // Normal case: process all modified lines
                            for (let i = change.range.start.line; i <= change.range.end.line; i++) {
                                try {
                                    const lineText = event.document.lineAt(i).text;
                                    const hasPrefix = lineText.length >= 12 && /^\d{12}/.test(lineText);
                                    
                                    pendingUpdates.add({ 
                                        number: i, 
                                        isNew: !hasPrefix,
                                        needsPrefix: !hasPrefix && shouldEnableForFile(event.document)
                                    });
                                } catch (error) {
                                    console.error(`Error processing line ${i}:`, error);
                                }
                            }
    
                            // Handle new lines in normal case
                            if (isNewLine) {
                                const newLineCount = (change.text.match(/\n/g) || []).length;
                                for (let i = change.range.start.line + 1; i <= change.range.start.line + newLineCount; i++) {
                                    if (i < event.document.lineCount) {
                                        try {
                                            const lineText = event.document.lineAt(i).text;
                                            if (!(lineText.length >= 12 && /^\d{12}/.test(lineText))) {
                                                pendingUpdates.add({ 
                                                    number: i, 
                                                    isNew: true,
                                                    needsPrefix: shouldEnableForFile(event.document)
                                                });
                                            }
                                        } catch (error) {
                                            console.error(`Error processing new line ${i}:`, error);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error processing content change:', error);
                    }
                });
    
                // Trigger batch processing
                if (pendingUpdates.size > 0) {
                    await processUpdates();
                }
            } catch (error) {
                console.error('Error in document change handler:', error);
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

    // 注册添加前缀命令
    context.subscriptions.push(
        vscode.commands.registerCommand('date-gutter.addPrefixToSelection', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !editor.document) return;

            if (!shouldEnableForFile(editor.document)) {
                return;
            }

            const edit = new vscode.WorkspaceEdit();
            const document = editor.document;
            const newDate = "000000"; // 6位全0作为日期部分
            
            // 收集所有要添加前缀的行
            const linesToAddPrefix = new Set();
            
            for (const selection of editor.selections) {
                for (let i = selection.start.line; i <= selection.end.line; i++) {
                    const line = document.lineAt(i);
                    const text = line.text;
                    
                    // 只对没有12位前缀的行添加前缀
                    if (!(text.length >= 12 && /^\d{12}/.test(text))) {
                        linesToAddPrefix.add(i);
                    }
                }
            }

            // 按行号排序
            const sortedLines = Array.from(linesToAddPrefix).sort((a, b) => a - b);
            
            // 添加前缀
            for (const lineNum of sortedLines) {
                const sequence = generateLineNumber(lineNum);
                edit.insert(
                    document.uri,
                    new vscode.Position(lineNum, 0),
                    sequence + newDate
                );
            }

            if (edit.size > 0) {
                // 执行编辑操作
                const success = await vscode.workspace.applyEdit(edit);
                
                if (success) {
                    // 更新装饰器
                    await updateDecorations(editor);
                    
                    const count = linesToAddPrefix.size;
                    vscode.window.showInformationMessage(
                        `Added line number prefix to ${count} line${count > 1 ? 's' : ''}`
                    );
                }
            }
        })
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
            // Reset all state on deactivation
            isEditorClosing = false;
            activeEditor = undefined;
            pendingUpdates.clear();
        }
    });
    
    // Add periodic state validation
    setInterval(() => {
        if (activeEditor && !vscode.window.visibleTextEditors.includes(activeEditor)) {
            console.log('Cleaning up stale editor reference');
            activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                updateDecorations(activeEditor);
            }
        }
    }, 30000); // Check every 30 seconds
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