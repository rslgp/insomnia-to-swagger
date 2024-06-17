const vscode = require('vscode');
const json2yaml = require('./src/insomnia-swagger');

function activate(context) {
  const convertCommand = vscode.commands.registerCommand('insomniaToSwagger.convert', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document) {
      const document = editor.document;
      if (document.languageId === 'json') {
        const jsonContent = JSON.parse(document.getText());
		let yamlString = "";
		try {
			yamlString = json2yaml.convertToYaml(jsonContent);			
		} catch (error) {			
			vscode.window.showErrorMessage(`Error converting JSON: ${error.message}`);
		}
        if (yamlString) {
          const newDocument = vscode.workspace.openTextDocument({ content: yamlString, language: 'yaml' });
		  newDocument.then( (v) => {
			vscode.window.showTextDocument(v);
		  })
        }
      } else {
        vscode.window.showInformationMessage('Please open a JSON file to convert.');
      }
    } else {
      vscode.window.showInformationMessage('No active text editor found.');
    }
  });

  context.subscriptions.push(convertCommand);
}

function deactivate() {}

exports.activate = activate;
exports.deactivate = deactivate;
