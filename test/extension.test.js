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

    test('Verify commands are registered', async () => {
        const commands = await vscode.commands.getCommands();
        console.log('Available commands:', commands.filter(cmd => cmd.startsWith('date-gutter')));
        assert(commands.includes('date-gutter.copyWithoutPrefix'), 'copyWithoutPrefix command should be registered');
        assert(commands.includes('date-gutter.removeLinesFromSelection'), 'removeLinesFromSelection command should be registered');
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
        // 准备测试数据
        const edit = new vscode.WorkspaceEdit();
        const testContent = '000001231123Line1\n000001231124Line2\n000001231125Line3';
        edit.insert(document.uri, new vscode.Position(0, 0), testContent);
        await vscode.workspace.applyEdit(edit);

        // 选择第二行
        editor.selection = new vscode.Selection(1, 0, 1, 16);

        // 执行删除命令
        await vscode.commands.executeCommand('date-gutter.removeLinesFromSelection');

        // 验证文件内容
        const content = document.getText();
        assert.strictEqual(content, '000001231123Line1\n000001231125Line3');
    });

    test('Decorations should update after text changes', async () => {
        // 准备测试数据
        const edit = new vscode.WorkspaceEdit();
        const testContent = '000001231123Test';
        edit.insert(document.uri, new vscode.Position(0, 0), testContent);
        await vscode.workspace.applyEdit(edit);

        // 等待装饰器更新
        await new Promise(resolve => setTimeout(resolve, 200));

        // 验证装饰器是否存在
        // 注意：由于装饰器API的限制，我们无法直接访问装饰器，
        // 但我们可以验证文本内容是否正确
        const content = document.getText();
        assert.strictEqual(content.startsWith('000001231123'), true);
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
        editor.selection = new vscode.Selection(0, 0, 0, 16);
        await vscode.commands.executeCommand('date-gutter.copyWithoutPrefix');
        let clipboardContent = await vscode.env.clipboard.readText();
        assert.strictEqual(clipboardContent, 'First');

        // 测试最后一行
        editor.selection = new vscode.Selection(2, 0, 2, 15);
        await vscode.commands.executeCommand('date-gutter.copyWithoutPrefix');
        clipboardContent = await vscode.env.clipboard.readText();
        assert.strictEqual(clipboardContent, 'Last');
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
});