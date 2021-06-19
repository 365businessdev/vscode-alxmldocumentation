import * as path from 'path';
import { runTests } from 'vscode-test';

const workspacePath = path.join(__dirname, '..', '..', 'src', 'testMultiRootWorkspace', 'multi.code-workspace');
process.env.IS_CI_SERVER_TEST_DEBUGGER = '';

const EXTENSION_ROOT_DIR_FOR_TESTS = path.join(__dirname, '..', '..');

function start() {
    console.log('*'.repeat(100));
    console.log('Start Multiroot tests');
    runTests({
        extensionDevelopmentPath: EXTENSION_ROOT_DIR_FOR_TESTS,
        extensionTestsPath: path.join(EXTENSION_ROOT_DIR_FOR_TESTS, 'out', 'test', 'index'),
        launchArgs: [workspacePath],
        extensionTestsEnv: { ...process.env, UITEST_DISABLE_INSIDERS: '1' },
    }).catch((ex) => {
        console.error('End Multiroot tests (with errors)', ex);
        process.exit(1);
    });
}
start();