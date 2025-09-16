# PromptZ Integration

This feature allows you to sync prompts and rules from the PromptZ cloud service directly into your Q CLI agents.

## Usage

1. Open the Agent Manager for Q CLI panel
2. Click the cloud download icon (🌩️) in the Q CLI Agents tree view
3. Select prompts from the list to sync
4. New agents will be created automatically with the synced prompts

## Configuration

The integration uses the following PromptZ API settings:
- API URL: `https://your-promptz-api-url.com/graphql`
- API Key: `your-api-key-here`

## Requirements

- Node.js and npm installed
- Internet connection for accessing PromptZ API
- Valid PromptZ account (if authentication is required)

## Troubleshooting

If sync fails:
1. Check your internet connection
2. Verify PromptZ service is accessible
3. Check VS Code output panel for detailed error messages
