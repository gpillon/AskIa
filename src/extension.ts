// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let openai: OpenAI;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Activating AskIA extension...');  // Debug log
	const config = vscode.workspace.getConfiguration('askia');
	const apiKey = config.get<string>('apiKey');
	const apiServer = config.get<string>('apiServer');

	if (!apiKey) {
		vscode.window.showErrorMessage('Please configure your API key in settings'); //really needed? 
		return;
	}

	console.log('Initializing OpenAI client...');  // Debug log
	openai = new OpenAI({
		apiKey: apiKey,
		baseURL: apiServer
	});

	console.log('Registering completion provider...');  // Debug log
	const provider = vscode.languages.registerCompletionItemProvider(
		["yaml"], // Add more languages as needed
		new AICompletionProvider(),
		'.' // Trigger character
	);

	context.subscriptions.push(provider);
	console.log('AskIA extension activated successfully');  // Debug log

	// Register the K8s generator command
	let disposable = vscode.commands.registerCommand('askia.generateK8s', async () => {
		try {
			// Get user requirements
			const requirement = await vscode.window.showInputBox({
				prompt: 'Describe the Kubernetes resource you need (e.g., "nginx deployment with 3 replicas and service")',
				placeHolder: 'Enter your Kubernetes resource requirements'
			});

			if (!requirement) {
				return;
			}

			// Show progress
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Generating Kubernetes file...",
				cancellable: false
			}, async (progress) => {
				// Get the K8s manifest from AI
				const completion = await openai.chat.completions.create({
					model: config.get<string>('model') || 'gpt-3.5-turbo',
					messages: [
						{
							role: 'system',
							content: 'You are a Kubernetes expert. Generate valid YAML manifests based on requirements. Only output the YAML content, no explanations.'
						},
						{
							role: 'user',
							content: `Generate a Kubernetes manifest for: ${requirement}`
						}
					],
					temperature: 0.2,
				});

				const yamlContent = completion.choices[0].message.content;
				
				if (!yamlContent) {
					throw new Error('No content generated');
				}

				// Get active workspace folder
				const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
				if (!workspaceFolder) {
					throw new Error('No workspace folder open');
				}

				// Create k8s directory if it doesn't exist
				const k8sDir = path.join(workspaceFolder.uri.fsPath, 'k8s');
				if (!fs.existsSync(k8sDir)) {
					fs.mkdirSync(k8sDir);
				}

				// Generate filename based on content
				const filename = `${requirement.toLowerCase().replace(/[^a-z0-9]/g, '-')}.yaml`;
				const filepath = path.join(k8sDir, filename);

				// Write the file
				fs.writeFileSync(filepath, yamlContent);

				// Open the file
				const document = await vscode.workspace.openTextDocument(filepath);
				await vscode.window.showTextDocument(document);

				vscode.window.showInformationMessage(`Kubernetes manifest generated: ${filename}`);
			});

		} catch (error) {
			console.error('Error generating K8s file:', error);
			vscode.window.showErrorMessage('Failed to generate Kubernetes file: ' + (error as Error).message);
		}
	});

	context.subscriptions.push(disposable);

	// Register the modification command
	let modifyCommand = vscode.commands.registerCommand('askia.modifyK8s', async () => {
		try {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				throw new Error('No file open');
			}

			const documentUri = editor.document.uri;
			const currentContent = editor.document.getText();

			const requirement = await vscode.window.showInputBox({
				prompt: 'What modifications do you need? (e.g., "increase replicas to 5" or "add resource limits")',
				placeHolder: 'Enter your modification requirements'
			});

			if (!requirement) {
				return;
			}

			// Create temporary files for diff
			const tmpDir = os.tmpdir();
			const originalFile = path.join(tmpDir, 'original.yaml');
			const modifiedFile = path.join(tmpDir, 'modified.yaml');

			// Write original content
			fs.writeFileSync(originalFile, currentContent);
			// Initialize modified file with original content
			fs.writeFileSync(modifiedFile, currentContent);

			// Store current active editor to restore focus later
			const activeEditor = vscode.window.activeTextEditor;

			// Open diff view immediately
			const diffTitle = 'Original ↔ Modified (Review Changes)';
			await vscode.commands.executeCommand('vscode.diff',
				vscode.Uri.file(originalFile),
				vscode.Uri.file(modifiedFile),
				diffTitle
			);

			let modifiedContent = '';
			
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Generating modifications...",
				cancellable: false
			}, async (progress) => {
				console.log('Generating modifications... for user: ' + requirement);
				let tokenCount = 0;
				
				const stream = await openai.chat.completions.create({
					model: config.get<string>('model') || 'gpt-3.5-turbo',
					messages: [
						{
							role: 'system',
							content: `You are a Kubernetes expert. Given a K8s manifest and modification requirements:
							1. YOU MUST ALWAYS RETURN ONLY the modified YAML only, no other text or comments
							2. ALWAYS output the complete YAML that includes your changes
							3. Only modify the specific parts mentioned in the requirements
							4. Keep all existing configurations intact
							5. Add new configurations only when explicitly requested
							6. Output the complete YAML that includes your changes
							7. YOU MUST ALWAYS RETURN ONLY the modified YAML only, no other text or comments
							`
						},
						{
							role: 'user',
							content: `Current manifest:\n${currentContent}\n\nRequired modifications: ${requirement}\n\nRemember: Do not remove any existing content!`
						}
					],
					temperature: 0.2,
					stream: true
				});

				// Stream the response
				for await (const chunk of stream) {
					const content = chunk.choices[0]?.delta?.content || '';
					if (content) {
						modifiedContent += content;
						tokenCount += content.length;
						
						// Update progress
						progress.report({
							message: `Received ${tokenCount} characters...`,
							increment: content.length
						});
						
						// Update the modified file with current content
						fs.writeFileSync(modifiedFile, modifiedContent);
					}
				}

				if (!modifiedContent) {
					throw new Error('No modifications generated');
				}

				// Ask for confirmation
				const action = await vscode.window.showWarningMessage(
					'Do you want to apply these modifications?',
					'Apply',
					'Reject'
				);

				if (action === 'Apply') {
					// Close diff editor by showing the original document
					const document = await vscode.workspace.openTextDocument(documentUri);
					const newEditor = await vscode.window.showTextDocument(document);

					// Apply changes
					const edit = new vscode.WorkspaceEdit();
					edit.replace(
						documentUri,
						new vscode.Range(
							document.positionAt(0),
							document.positionAt(document.getText().length)
						),
						modifiedContent
					);
					
					await vscode.workspace.applyEdit(edit);
					await document.save();
					vscode.window.showInformationMessage('Modifications applied successfully!');
				} else {
					// Restore focus to original editor if it exists
					if (activeEditor) {
						await vscode.window.showTextDocument(activeEditor.document);
					}
					vscode.window.showInformationMessage('Modifications rejected');
				}

				// Clean up temporary files
				try {
					fs.unlinkSync(originalFile);
					fs.unlinkSync(modifiedFile);
				} catch (e) {
					console.error('Error cleaning up temp files:', e);
				}
			});

		} catch (error) {
			console.error('Error modifying K8s file:', error);
			vscode.window.showErrorMessage('Failed to modify Kubernetes file: ' + (error as Error).message);
		}
	});

	context.subscriptions.push(modifyCommand);
}

class AICompletionProvider implements vscode.CompletionItemProvider {
	async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position
	): Promise<vscode.CompletionItem[]> {
		console.log('Completion provider triggered');  // Debug log
		const linePrefix = document.lineAt(position).text.substring(0, position.character);
		
		if (!linePrefix.endsWith(':')) {
			return [];
		}

		console.log('Semicolon detected, getting completions...');  // Debug log
		try {
			const config = vscode.workspace.getConfiguration('askia');
			const model = config.get<string>('model') || 'gpt-3.5-turbo';

			// Get context (previous few lines of code)
			const startLine = Math.max(0, position.line - 5);
			const context = document.getText(new vscode.Range(
				new vscode.Position(startLine, 0),
				position
			));

			const completion = await openai.chat.completions.create({
				model: model,
				messages: [
					{
						role: 'system',
						content: `
						You are a code YAML Kubernetes expert. Provide short, relevant code completions.
						1. You MUST ALWAYS RETURN ONLY the completions, no other text or comments
						2. Return suggestion in the format of "suggestion: <suggestion>"
						3. Try to deteect if is a openshift or kubernetes manifest and provide the correct completions
						4. You MUST ALWAYS RETURN ONLY the completions, no other text or comments
						`
					},
					{
						role: 'user',
						content: `Complete this code:\n${context}`
					}
				],
				max_tokens: 50,
				temperature: 0.3,
			});

			const suggestions = completion.choices[0].message.content?.split('\n') || [];
			
			return suggestions.map(suggestion => {
				const item = new vscode.CompletionItem(suggestion, vscode.CompletionItemKind.Method);
				item.detail = 'AI Suggestion';
				return item;
			});

		} catch (error) {
			console.error('Error getting completions:', error);
			return [];
		}
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
