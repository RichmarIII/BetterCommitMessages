# Better Commit Messages

## Overview

Better Commit Messages is a Visual Studio Code extension that automates the generation of commit messages using OpenAI's GPT-4o-mini model. By analyzing Git diffs, this extension provides descriptive and meaningful commit messages to help you maintain a clear and informative commit history. GPT-4o-mini is significantly more advanced than GPT-3-turbo and is about four times cheaper, offering improved performance at a reduced cost.

## Features

- **Automated Commit Message Generation**: Utilizes OpenAI's GPT-4o-mini model to create commit messages based on the changes in your Git repository.
- **VSCode Integration**:
  - **Status Bar Button**: Includes a button in the status bar at the bottom left, styled with a Git commit icon and a message icon, to generate commit messages with a single click.
  - **Command Palette**: You can also generate commit messages by running the command from the command palette.
- **Clipboard Integration**: The generated commit message is automatically copied to your clipboard for easy pasting.
- **Cost-Effective**: Leverages GPT-4o-mini, providing superior performance compared to GPT-3-turbo at a fraction of the cost.
- **API Key Configuration**: Requires your OpenAI API key to be set in an environment variable.

## Installation

### Local Development Installation

1. **Clone the Repository**:

   ```sh
   git clone git@github.com:RichmarIII/BetterCommitMessages.git
   cd BetterCommitMessages
   ```

2. **Install Dependencies**:

   ```sh
   npm install
   ```

3. **Package the Extension**:
   - Install `vsce` if you haven’t already:
  
     ```sh
     npm install -g vsce
     ```

   - Package the extension:

     ```sh
     vsce package
     ```

4. **Install the Extension in VSCode**:
   - Open Visual Studio Code.
   - Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS).
   - Click on the `...` (more actions) button and select `Install from VSIX...`.
   - Choose the `.vsix` file created from the previous step and install it.

## Usage

1. **Set Up OpenAI API Key**:
   - Ensure your OpenAI API key is set in the environment variable named `OPENAI_API_KEY_BETTERCOMMIT`.

2. **Generate Commit Messages**:
   - **Using the Status Bar Button**:
     - Locate the status bar button at the bottom left of the VSCode window, styled with a Git commit icon and a message icon.
     - Click the button to generate a commit message based on the current Git diffs.
   - **Using the Command Palette**:
     - Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
     - Search for and select the command for generating a commit message.
   - The generated commit message will be copied to your clipboard automatically.

3. **Review and Commit**:
   - Paste the generated commit message from your clipboard into your commit message field.
   - Proceed with your commit as usual.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.

## Notices

Third-party software and data are subject to their respective licenses. See [NOTICE](NOTICE.md) for more information.

## Contributing

Contributions are welcome! If you have suggestions, bug reports, or feature requests, please open an issue or submit a pull request on [GitHub](https://github.com/RichmarIII/BetterCommitMessages).
