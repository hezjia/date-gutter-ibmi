const vscode = require('vscode');

// 创建装饰器类型
let dateGutterDecorationType;
let dateHideDecorationType;

// 获取配置
function getConfiguration() {
    return vscode.workspace.getConfiguration('dateGutter');
}

// 检查文件是否应该启用日期装饰器
function shouldEnableForFile(document) {
    const config = getConfiguration();
    
    // 检查扩展是否被启用
    if (!config.get('enabled', true)) {
        return false;
    }

    // 获取启用的文件类型
    const enabledFileTypes = config.get('enabledFileTypes', ['.txt', '.md']);
    
    // 检查文件扩展名是否在启用列表中
    const fileExtension = '.' + document.fileName.split('.').pop().toLowerCase();
    return enabledFileTypes.includes(fileExtension);
}

// 格式化日期为YYMMDD格式
function formatDateToYYMMDD(date) {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

// 检查文本是否符合日期格式（YYMMDD）
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

// 生成行号（6位数字，最大999999）
function generateLineNumber(lineIndex) {
    const sequenceNum = Math.min(lineIndex + 1, 999999);
    return sequenceNum.toString().padStart(6, '0');
}

// 从文本行提取日期 (now looks at positions 6-11 after 6-digit sequence)
function extractDateFromLine(line) {
    if (line.length >= 12) {
        const dateStr = line.slice(6, 12);
        if (isDateFormat(dateStr)) {
            const year = parseInt('20' + dateStr.slice(0, 2));
            const month = parseInt(dateStr.slice(2, 4)) - 1;
            const day = parseInt(dateStr.slice(4, 6));
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }
    return null;
}

// 更新装饰器
async function updateDecorations(editor) {
    try {
        if (!editor || !editor.document || !dateGutterDecorationType || !dateHideDecorationType) {
            console.log('Editor, document or decoration types are not available');
            return;
        }

        const document = editor.document;
        
        // 检查文件是否应该启用装饰器
        if (!shouldEnableForFile(document)) {
            // 清除现有的装饰器
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

            const date = extractDateFromLine(text);
            let dateStr;
            let shouldHide = false;

            if (date) {
                // 如果找到有效日期
                dateStr = formatDateToYYMMDD(date);
                shouldHide = true;
            } else {
                // 如果没有找到有效日期，使用 "000000"
                dateStr = "000000";
                shouldHide = false;
            }

            // Gutter 装饰器：显示日期
            const gutterDecoration = {
                renderOptions: {
                    before: {
                        contentText: dateStr,
                        color: date ? '#888888' : '#CCCCCC', // 默认日期使用更浅的颜色
                        margin: '0 10px 0 0'
                    }
                },
                range: line.range
            };
            gutterDecorations.push(gutterDecoration);

            // 只有在找到实际日期时才隐藏文本
            if (shouldHide) {
                const hideDecoration = {
                    range: new vscode.Range(
                        new vscode.Position(i, 0),  // Start at position 0 (sequence)
                        new vscode.Position(i, 12)  // End at position 12 (end of date)
                    )
                };
                hideDecorations.push(hideDecoration);
            }
        }

        // 创建操作图标装饰器
        const actionDecorations = [];
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (line.text.trim().length > 0) {
                actionDecorations.push({
                    range: line.range
                });
            }
        }

        // 应用三种装饰器
        await Promise.all([
            Promise.resolve(editor.setDecorations(dateGutterDecorationType, gutterDecorations)),
            Promise.resolve(editor.setDecorations(dateHideDecorationType, hideDecorations)),
            Promise.resolve(editor.setDecorations(gutterActionDecorationType, actionDecorations))
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

    // 创建装饰器类型
    dateGutterDecorationType = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
    });

    // 创建隐藏日期文本的装饰器类型
    dateHideDecorationType = vscode.window.createTextEditorDecorationType({
        textDecoration: 'none; display: none',
        color: 'transparent',
        opacity: '0'
    });

    // 创建gutter操作图标装饰器
    const gutterActionDecorationType = vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.parse('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>'),
        gutterIconSize: 'contain'
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
                            // 只在空行或不以日期开头的行添加日期
                            if (!lineText.trim() || !isDateFormat(lineText.substring(6, 12))) {
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
                    
                    // Check each line for missing prefix
                    for (let i = 0; i < document.lineCount; i++) {
                        const line = document.lineAt(i);
                        const text = line.text;
                        
                        // Skip empty lines
                        if (text.trim().length === 0) continue;
                        
                        // Check if line has complete prefix
                        if (text.length < 12 || !/^\d{12}/.test(text)) {
                            const sequence = generateLineNumber(i);
                            // Use 000000 as default date
                            const newPrefix = sequence + '000000';
                            
                            // Replace or insert prefix
                            if (text.length >= 6 && /^\d{6}/.test(text)) {
                                // Has partial prefix (sequence only)
                                edit.replace(
                                    document.uri,
                                    new vscode.Range(
                                        new vscode.Position(i, 0),
                                        new vscode.Position(i, 6)
                                    ),
                                    newPrefix
                                );
                            } else {
                                // No prefix at all
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

    // 添加gutter图标点击监听器
    const gutterActionClick = vscode.window.onDidChangeTextEditorSelection(async event => {
        try {
            if (event.kind === vscode.TextEditorSelectionChangeKind.Mouse && 
                event.selections.length > 0) {
                const position = event.selections[0].active;
                if (position.character === 0) {
                    await showGutterMenu(event.textEditor, position.line);
                }
            }
        } catch (error) {
            console.error('Error handling gutter click:', error);
        }
    });

    // 确保装饰器类型和监听器被正确清理
    context.subscriptions.push({
        dispose: () => {
            if (dateGutterDecorationType) {
                dateGutterDecorationType.dispose();
                dateGutterDecorationType = undefined;
            }
            gutterActionClick.dispose();
        }
    });
}

// 处理行删除
async function deleteLine(editor, line) {
    if (!editor || !editor.document) return;
    
    const range = new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, editor.document.lineAt(line).text.length)
    );
    
    await editor.edit(editBuilder => {
        editBuilder.delete(range);
    });
}

// 处理行复制
async function copyLine(editor, line) {
    if (!editor || !editor.document) return;
    
    const text = editor.document.lineAt(line).text;
    await vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage('行内容已复制到剪贴板');
}

// 显示浮动菜单
async function showGutterMenu(editor, line) {
    const items = [
        {
            label: '$(copy) 复制行',
            description: '复制当前行内容',
            action: 'copy'
        },
        {
            label: '$(trash) 删除行',
            description: '删除当前行',
            action: 'delete'
        }
    ];
    
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: '选择操作'
    });
    
    if (selected) {
        switch (selected.action) {
            case 'copy':
                await copyLine(editor, line);
                break;
            case 'delete':
                await deleteLine(editor, line);
                break;
        }
    }
}

function deactivate() {
    try {
        // 清理 gutter 装饰器
        if (dateGutterDecorationType) {
            dateGutterDecorationType.dispose();
            dateGutterDecorationType = undefined;
        }
        
        // 清理隐藏日期的装饰器
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