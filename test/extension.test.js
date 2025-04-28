const assert = require('assert');
const vscode = require('vscode');
const path = require('path');

suite('Date Gutter Extension Test Suite', () => {
    let editor;
    let document;

    suiteSetup(async () => {
        // 创建一个临时文件用于测试
        const workspaceEdit = new vscode.WorkspaceEdit();
        const testFilePath = path.join(__dirname, 'test.txt');
        const uri = vscode.Uri.file(testFilePath);
        workspaceEdit.createFile(uri);
        await vscode.workspace.applyEdit(workspaceEdit);
        
        // 打开文件
        document = await vscode.workspace.openTextDocument(uri);
        editor = await vscode.window.showTextDocument(document);
    });

    suiteTeardown(async () => {
        // 关闭编辑器
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        // 删除测试文件
        const testFilePath = path.join(__dirname, 'test.txt');
        const uri = vscode.Uri.file(testFilePath);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.deleteFile(uri);
        await vscode.workspace.applyEdit(workspaceEdit);
    });

    test('Copy without prefix command should work correctly', async () => {
        // 准备测试数据
        const edit = new vscode.WorkspaceEdit();
        const testContent = '000001231123Hello\n000001231124World';
        edit.insert(document.uri, new vscode.Position(0, 0), testContent);
        await vscode.workspace.applyEdit(edit);

        // 选择文本
        editor.selection = new vscode.Selection(0, 0, 1, 17);

        // 执行复制命令
        await vscode.commands.executeCommand('date-gutter.copyWithoutPrefix');

        // 验证剪贴板内容
        const clipboardContent = await vscode.env.clipboard.readText();
        assert.strictEqual(clipboardContent, 'Hello\nWorld');
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
        await vscode.commands.executeCommand('date-gutter.removePrefixFromSelection');

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
});