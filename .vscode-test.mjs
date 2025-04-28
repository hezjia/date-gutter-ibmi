import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'test/**/*.test.js',
    mocha: {
        timeout: 10000, // 增加超时时间
    },
    workspaceFolder: 'test/fixtures',
    extensionDevelopmentPath: process.cwd(),
    extensionTestsPath: path.join(process.cwd(), 'test'),
    launchArgs: [
        '--disable-extensions', // 禁用其他扩展
        '--disable-workspace-trust' // 禁用工作区信任
    ]
});