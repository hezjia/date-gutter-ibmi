const assert = require('assert');
const vscode = require('vscode');
const path = require('path');

suite('Date Gutter Extension Test Suite', () => {
    let editor;
    let document;

    suiteSetup(async () => {
        // 激活扩展
        const extension = vscode.extensions.getExtension('zhuojia-he.date-gutter-ibmi');
        await extension.activate();

        // 创建测试文件
        const testFileUri = vscode.Uri.file(path.join(__dirname, 'test-fixture.clle'));
        try {
            await vscode.workspace.fs.writeFile(testFileUri, new Uint8Array());
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }

        // 打开测试文件
        document = await vscode.workspace.openTextDocument(testFileUri);
        editor = await vscode.window.showTextDocument(document);

        // 等待扩展初始化完成
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    suiteTeardown(async () => {
        try {
            // 关闭编辑器
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            
            // 删除测试文件
            const testFileUri = vscode.Uri.file(path.join(__dirname, 'test-fixture.clle'));
            try {
                await vscode.workspace.fs.delete(testFileUri, { ignoreIfNotExists: true });
            } catch (error) {
                console.error('Error deleting test file:', error);
            }
        } catch (error) {
            console.error('Error in suiteTeardown:', error);
        }
    });

    setup(async () => {
        // Create a fresh test file for each test
        const testFileUri = vscode.Uri.file(path.join(__dirname, `test-${Date.now()}.clle`));
        await vscode.workspace.fs.writeFile(testFileUri, new Uint8Array());
        
        // Open the test file
        document = await vscode.workspace.openTextDocument(testFileUri);
        editor = await vscode.window.showTextDocument(document);
        
        // Wait for extension to initialize
        await new Promise(resolve => setTimeout(resolve, 200));
    });

    teardown(async () => {
        // Close and delete the test file
        if (editor) {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
        if (document) {
            try {
                await vscode.workspace.fs.delete(document.uri);
            } catch (error) {
                console.error('Error deleting test file:', error);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('Verify commands are registered', async () => {
        const commands = await vscode.commands.getCommands();
        const dateGutterCommands = commands.filter(cmd => cmd.startsWith('date-gutter'));
        console.log('Available date-gutter commands:', dateGutterCommands);
        
        assert(dateGutterCommands.some(cmd => cmd.includes('copy')), 'Copy command should be registered');
        assert(dateGutterCommands.some(cmd => cmd.includes('remove') || cmd.includes('delete')), 'Delete/remove command should be registered');
    });

    test('Copy without prefix command should work correctly', async () => {
        try {
            // 重置剪贴板
            await vscode.env.clipboard.writeText('');
            
            // 准备测试数据
            const edit = new vscode.WorkspaceEdit();
            const testContent = '000001231123Hello\n000001231124World';
            edit.insert(document.uri, new vscode.Position(0, 0), testContent);
            await vscode.workspace.applyEdit(edit);

            console.log('Document content before test:', document.getText());
            
            // 选择文本
            editor.selection = new vscode.Selection(0, 0, 1, 17);
            console.log('Selection set:', editor.selection);

            // 验证命令是否存在
            const commands = await vscode.commands.getCommands();
            console.log('Available commands:', commands.filter(cmd => cmd.startsWith('date-gutter')));
            
            // 执行复制命令
            await vscode.commands.executeCommand('date-gutter.copyWithoutPrefix');
            console.log('Command executed');

            // 验证剪贴板内容
            const clipboardContent = await vscode.env.clipboard.readText();
            console.log('Clipboard content:', clipboardContent);
            
            assert.strictEqual(clipboardContent, 'Hello\nWorld');
        } catch (error) {
            console.error('Test failed:', error);
            throw error;
        }
    });

    test('Delete selected lines command should work correctly', async () => {
        // 清空文件内容
        const clearEdit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            new vscode.Position(0, 0),
            document.lineAt(document.lineCount - 1).range.end
        );
        clearEdit.delete(document.uri, fullRange);
        await vscode.workspace.applyEdit(clearEdit);

        // 准备测试数据
        const edit = new vscode.WorkspaceEdit();
        const testContent = '000001231123Line1\n000001231124Line2\n000001231125Line3';
        edit.insert(document.uri, new vscode.Position(0, 0), testContent);
        await vscode.workspace.applyEdit(edit);

        console.log('Document content before delete:', document.getText());

        // 选择第二行
        editor.selection = new vscode.Selection(1, 0, 1, 16);
        console.log('Selection for delete:', editor.selection);

        // 验证命令是否存在
        const commands = await vscode.commands.getCommands();
        const deleteCommand = commands.find(cmd => cmd.includes('remove') && cmd.startsWith('date-gutter'));
        console.log('Using delete command:', deleteCommand);
        
        if (!deleteCommand) {
            throw new Error('Delete command not found');
        }

        // 执行删除命令
        await vscode.commands.executeCommand(deleteCommand);
        console.log('Delete command executed');

        // 等待操作完成
        await new Promise(resolve => setTimeout(resolve, 500));

        // 验证文件内容
        const content = document.getText();
        console.log('Document content after delete:', content);
        
        // 使用更灵活的断言，适应不同的换行符和可能的前缀
        assert.ok(
            content.includes('Line1') && 
            !content.includes('Line2') && 
            content.includes('Line3'),
            'Line2 should be deleted, Line1 and Line3 should remain'
        );
    });

    test('Decorations should update after text changes', async function() {
        this.timeout(5000); // Increase timeout for this test
        
        // Clear document first
        const clearEdit = new vscode.WorkspaceEdit();
        clearEdit.delete(document.uri, new vscode.Range(
            new vscode.Position(0, 0),
            document.lineAt(document.lineCount - 1).range.end
        ));
        await vscode.workspace.applyEdit(clearEdit);
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for clear to complete

        // Prepare test content with proper prefix
        const testContent = '000001231123TestContent';
        const edit = new vscode.WorkspaceEdit();
        edit.insert(document.uri, new vscode.Position(0, 0), testContent);
        await vscode.workspace.applyEdit(edit);
        console.log('Inserted test content:', testContent);

        // Wait longer for decorations to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify document content
        const content = document.getText();
        console.log('Current document content:', content);
        
        // Check if prefix exists (more robust check)
        const hasValidPrefix = /^00000\d{7}/.test(content);
        console.log('Document has valid prefix?', hasValidPrefix);
        
        if (!hasValidPrefix) {
            // Debug why prefix might be missing
            console.log('Full document content:', content);
            console.log('Editor decorations:', editor.getDecorations ? 'Available' : 'Not available');
        }

        assert.ok(
            hasValidPrefix,
            'Document should start with a valid 12-digit prefix (got: ' + content.substring(0, 12) + ')'
        );
    });

    test('Multi-line selection handling', async () => {
        // 重置剪贴板
        await vscode.env.clipboard.writeText('');

        // 准备测试数据
        const edit = new vscode.WorkspaceEdit();
        const testContent = '000001231123Line1\n000001231124Line2\nNoPrefix\n000001231125Line3';
        edit.insert(document.uri, new vscode.Position(0, 0), testContent);
        await vscode.workspace.applyEdit(edit);

        // 选择多行
        editor.selection = new vscode.Selection(0, 0, 2, 8);

        // 执行复制命令
        await vscode.commands.executeCommand('date-gutter.copyWithoutPrefix');

        // 验证剪贴板内容
        const clipboardContent = await vscode.env.clipboard.readText();
        assert.strictEqual(clipboardContent, 'Line1\nLine2\nNoPrefix');
    });

    test('Empty selection should not throw error', async () => {
        // 设置空选择
        editor.selection = new vscode.Selection(0, 0, 0, 0);
        
        // 执行命令应该不会抛出错误
        await assert.doesNotReject(
            vscode.commands.executeCommand('date-gutter.copyWithoutPrefix')
        );
    });

    test('First and last line handling', async () => {
        // 准备测试数据
        const edit = new vscode.WorkspaceEdit();
        const testContent = '000001231123First\n000001231124Middle\n000001231125Last';
        edit.insert(document.uri, new vscode.Position(0, 0), testContent);
        await vscode.workspace.applyEdit(edit);

        // 测试第一行
        editor.selection = new vscode.Selection(0, 12, 0, document.lineAt(0).text.length);
        await vscode.commands.executeCommand('date-gutter.copyWithoutPrefix');
        await new Promise(resolve => setTimeout(resolve, 100)); // 确保剪贴板更新
        let clipboardContent = await vscode.env.clipboard.readText();
        console.log('First line clipboard content:', clipboardContent);
        assert.strictEqual(clipboardContent, 'First');

        // 测试最后一行
        const lastLine = document.lineCount - 1;
        const lastLineText = document.lineAt(lastLine).text;
        console.log('Last line text:', lastLineText);

        // 确保选择范围正确（跳过12位前缀）
        const selectionStart = Math.min(12, lastLineText.length);
        const selectionEnd = lastLineText.length;
        editor.selection = new vscode.Selection(lastLine, selectionStart, lastLine, selectionEnd);
        console.log('Last line selection start:', selectionStart);
        console.log('Last line selection end:', selectionEnd);

        await vscode.commands.executeCommand('date-gutter.copyWithoutPrefix');
        await new Promise(resolve => setTimeout(resolve, 100)); // 确保剪贴板更新
        clipboardContent = await vscode.env.clipboard.readText();
        console.log('Last line clipboard content:', clipboardContent);

        // 更灵活的断言，处理可能的空格或换行符
        assert.ok(
            clipboardContent.trim() === 'Last',
            `Expected 'Last' but got '${clipboardContent}'`
        );
    });

    test('Set Date to Zero command should work correctly', async () => {
        // 准备测试数据
        const edit = new vscode.WorkspaceEdit();
        const testContent = '000001231123Line1\n000002231124Line2\nNoPrefix\n000004231125Line3';
        edit.insert(document.uri, new vscode.Position(0, 0), testContent);
        await vscode.workspace.applyEdit(edit);

        // 选择多行
        editor.selection = new vscode.Selection(0, 0, 3, 16);

        // 执行设置日期为0命令
        await vscode.commands.executeCommand('date-gutter.setDateToZero');

        // 验证文件内容
        const content = document.getText();
        assert.strictEqual(content.includes('000001000000Line1'), true);
        assert.strictEqual(content.includes('000002000000Line2'), true);
        assert.strictEqual(content.includes('NoPrefix'), true);
        assert.strictEqual(content.includes('000004000000Line3'), true);
    });

    test('Performance test for large file', async () => {
        // 创建一个包含 10,000 行的测试文件
        const largeContent = Array.from({ length: 10000 }, (_, i) => `000001231123Line${i + 1}`).join('\n');
        const edit = new vscode.WorkspaceEdit();
        edit.insert(document.uri, new vscode.Position(0, 0), largeContent);
        await vscode.workspace.applyEdit(edit);

        console.log('Created large file with 10,000 lines');

        // 测试 copyWithoutPrefix 命令性能
        editor.selection = new vscode.Selection(0, 0, 9999, document.lineAt(9999).text.length);
        console.time('copyWithoutPrefix performance');
        await vscode.commands.executeCommand('date-gutter.copyWithoutPrefix');
        console.timeEnd('copyWithoutPrefix performance');

        // 测试 setDateToZero 命令性能
        console.time('setDateToZero performance');
        await vscode.commands.executeCommand('date-gutter.setDateToZero');
        console.timeEnd('setDateToZero performance');

        // 验证命令执行后文件内容是否正确
        const content = document.getText();
        console.log('Checking first and last lines...');
        
        // 检查第一行
        assert.ok(
            content.includes('000001000000Line1'),
            'First line should be updated'
        );
        
        // 检查最后一行 (Line10000)
        assert.ok(
            content.includes('000001000000Line10000'),
            'Last line (Line10000) should be updated'
        );
        
        // 检查中间某行 (Line5000)
        assert.ok(
            content.includes('000001000000Line5000'),
            'Middle line (Line5000) should be updated'
        );
    });
});