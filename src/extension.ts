import * as vscode from 'vscode';
import OpenAI from "openai";
import { ChatCompletion } from 'openai/resources/index.mjs';
import { exec } from 'child_process';

// The OpenAI API key used for commit message generation
const API_KEY = process.env.OPENAI_API_KEY_BETTERCOMMIT;

// The OpenAI chat model used for commit message generation
const MODEL = "gpt-4o-mini";

// The maximum number of characters under which a single request can be made to the OpenAI API
const SINGLE_REQUEST_THRESHOLD = 64 * 1024;

// The text that will be appended to the SYSTEM message if it is the first commit in the user's repository
const INITIAL_COMMIT_AUGMENTATION =
	"This is the initial commit for the repository. " +
	"DO NOT waste time including information about setup files, project files, dev files, etc. " +
	"Focus on actual 'user' code/files";

// The SYSTEM message that will be sent to the OpenAI API
const SYSTEM_MESSAGE =
	"You are preparing a commit message for a git repository. Write a detailed and specific commit message that clearly describes the changes made. " +
	"Avoid generalizations and focus on providing precise details. " +
	"Avoid being too verbose if the changes are simple, but ensure you provide enough information for someone else to understand the changes. " +
	"Overall, aim to provide a clear and concise commit message that accurately reflects the changes made. Keep it brief and to the point, unless the changes are complex. " +
	"You will receive a git diff output to help you with the commit message. " +
	"Beautifully Format the commit message using Markdown so it looks realy nice. " +
	"Do not use code blocks or the # symbol at the beginning of lines, as # is used for comments in the COMMIT_EDITMSG file. " +
	"Instead, use dashes - or asterisks *text* for any required formatting. " +
	"Ensure your message follows these rules, as it will be directly pasted into the COMMIT_EDITMSG file. " +
	"NEVER respond with anything other than a commit message.  If you recieved unexpected input or conditions, simply don't respond (no characters generated)";

// The SYSTEM message that will be sent to the OpenAI API for polishing the commit message after merging multiple commit messages together for each diff chunk
const SYSTEM_MESSAGE_POLISHED =
	"Polish the commit message to make it look nice. make sure all summaries are combined together and not scattered throughout and make it more cohesive." +
	"This commit message was pieced together from multiple diff chunks, so ensure it reads well as a single message. " +
	"NEVER respond with anything other than a commit message.  If you recieved unexpected input or conditions, simply don't respond (no characters generated)";

// Only used for the first commit in the user's repository
const SYSTEM_MESSAGE_INITIAL_COMMIT = SYSTEM_MESSAGE + "\n" + INITIAL_COMMIT_AUGMENTATION;

// Only used for the first commit in the user's repository
const SYSTEM_MESSAGE_POLISHED_INITIAL_COMMIT = SYSTEM_MESSAGE_POLISHED + "\n" + INITIAL_COMMIT_AUGMENTATION;

let statusBarItem: vscode.StatusBarItem;
let initialCommit = false;
let tokenCount = 0;


function isFirstCommit(): Promise<boolean> {
	return new Promise((resolve, reject) => {

		const options = { cwd: vscode.workspace.workspaceFolders![0].uri.fsPath };

		exec('git rev-list --count HEAD', options, (error, stdout, stderr) => {
			if (error) {
				// If HEAD is unknown, it's likely an empty repository
				if (stderr.includes('unknown revision')) {
					resolve(true);
				} else {
					reject("Error: " + error.message);
				}
			} else {
				const commitCount = parseInt(stdout.trim(), 10);
				if (commitCount === 0) {
					resolve(true);
				} else {
					resolve(false);
				}
			}
		});
	});
}


function runGitDiff(): Promise<string | null> {
	return new Promise((resolve, reject) => {
		// Run the git diff command

		const options = { cwd: vscode.workspace.workspaceFolders![0].uri.fsPath };

		exec('git diff --cached', options, (error, stdout, stderr) => {
			if (error) {
				reject("Error: " + error.message);
			} else {
				resolve(stdout === "" ? null : stdout);
			}
		});
	});
}


// Split the diff string into chunks
function splitDiffString(diffString: string): string[] {

	let chunks = diffString.split("diff --git");
	chunks = chunks.map((chunk, index) => {
		return "diff --git" + chunk;
	});

	return chunks;
}

// Generate a commit message for a chunk of diff
async function generateCommitMessageForChunk(chunk: string): Promise<string> {

	// Call the openai API using chat completion
	const openai = new OpenAI({ apiKey: API_KEY });

	const chatCompletion = await openai.chat.completions.create({
		messages: [{ role: "system", content: initialCommit ? SYSTEM_MESSAGE_INITIAL_COMMIT : SYSTEM_MESSAGE }, { role: "user", content: "diff:\n" + chunk }],
		model: MODEL,
		max_tokens: 512,
	}) as ChatCompletion;

	// Check if the completion is successful
	if (chatCompletion.choices.length === 0 || !chatCompletion.choices[0].message.content) {
		console.log(chatCompletion.choices[0].finish_reason);
		console.log(chatCompletion.choices[0].message.refusal);
		return "";
	}

	return chatCompletion.choices[0].message.content;
}

async function generateCommitMessageForChunks(chunks: string[]): Promise<string> {

	// Prepare an array of commit messages with the same length as the chunks
	const commitMessages: string[] = [];
	for (let i = 0; i < chunks.length; i++) {
		commitMessages.push("");
	}

	// Generate commit message for each chunk
	const promises = chunks.map(async (chunk, index) => {
		commitMessages[index] = await generateCommitMessageForChunk(chunk);
	});

	await Promise.all(promises);

	// Combine the commit messages
	const combinedCommitMessage = commitMessages.join("\n");

	return combinedCommitMessage;
}

async function generateCommitMessage() {
	// use gpt-4o-mini to generate commit message

	// Check if the user is making the first commit
	initialCommit = await isFirstCommit();

	// Change the status bar item to show that the extension is working
	const oldText = statusBarItem.text;
	statusBarItem.text += "$(loading~spin)";

	const oldTooltip = statusBarItem.tooltip;
	statusBarItem.tooltip = "Generating commit message...";

	// Function to remove the loading spinner from the status bar before returning
	const removeLoading = () => {
		statusBarItem.text = oldText;
		statusBarItem.tooltip = oldTooltip;
	};

	// Execute git diff command
	const gitDiff = await runGitDiff();
	if (gitDiff === null) {
		vscode.window.showInformationMessage("No changes to commit.");
		removeLoading();
		return;
	}

	// Check for errors
	if (gitDiff.startsWith("Error:")) {
		vscode.window.showErrorMessage(gitDiff);
		removeLoading();
		return;
	}

	// Split the diff into chunks
	let diffChunks = splitDiffString(gitDiff);

	const completeDiff = diffChunks.join("\n");

	// If the token count is less than the threshold, use a single request
	if (completeDiff.length <= SINGLE_REQUEST_THRESHOLD) {
		diffChunks = [completeDiff];
	}

	// Generate commit message for each chunk
	const commitMessage = await generateCommitMessageForChunks(diffChunks);

	// Add a final formatting to the commit message
	const openai = new OpenAI({ apiKey: API_KEY });
	const chatCompletion = await openai.chat.completions.create({
		messages: [{ role: "system", content: initialCommit ? SYSTEM_MESSAGE_POLISHED_INITIAL_COMMIT : SYSTEM_MESSAGE_POLISHED }, { role: "user", content: "diff:\n" + commitMessage }],
		model: MODEL,
		max_tokens: 2048,
	}) as ChatCompletion;

	// Check if the completion is successful
	if (chatCompletion.choices.length === 0 || !chatCompletion.choices[0].message.content) {
		vscode.window.showErrorMessage("Failed to generate commit message.");
		removeLoading();
		return;
	}

	const polishedCommitMessage = chatCompletion.choices[0].message.content;

	removeLoading();

	// Put the generated commit message in the clipboard
	vscode.env.clipboard.writeText(polishedCommitMessage);

	vscode.window.showInformationMessage("Commit message generated and copied to clipboard.");
}

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('bettercommitmessages.generateCommitMessage', generateCommitMessage);

	// Register a command that is invoked when the status bar
	// item is selected
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -100);
	statusBarItem.text = "$(git-commit) $(comment)";
	statusBarItem.tooltip = "Generate a commit message";
	statusBarItem.command = "bettercommitmessages.generateCommitMessage";
	statusBarItem.name = "Git Commit Message Generator";
	statusBarItem.show();

	context.subscriptions.push(disposable, statusBarItem);
}

// This method is called when your extension is deactivated
export function deactivate() { }