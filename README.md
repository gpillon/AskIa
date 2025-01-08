# 🤖 AskIA - Your K8s YAML AI Coding Buddy!

Yo! Welcome to AskIA - the VS Code extension that's like having a super-smart AI friend helping you write k8s manifests! 

# 📚 Urgent TODOs

- [ ] Find a Better Name

## 🎮 What Can This Do?

- 🚀 **K8s Magic**: Generate Kubernetes files by just describing what you want in plain English! Like "Hey, give me a nginx deployment with 3 replicas" - BOOM! Done!
- 🛠️ **K8s Tweaker**: Need to modify your K8s files? Just tell it what you want to change and watch the magic happen
- ✨ **Smart Code Completion**: Type a semicolon `:` and get AI-powered suggestions. It's like autocomplete on steroids!


## 📚 Engines & API

It uses the OpenAI API to generate the completions.

I tested with the following engines:
 - Podman AI (https://podman-ai.github.io/podman-ai/) - Model `ibm-granite-8b`
 - OpenAI (https://platform.openai.com/docs/guides/code-completion) - Model `gpt-3.5-turbo`
 - Ollama (https://ollama.ai/) - Model `ibm-granite-8b` (read the Known Issues below, it's not working well)


## 🏃‍♂️ Getting Started

1. Install this bad boy from the VS Code marketplace (Naaaa, it's not published yet)
2. (Optional) Get yourself an API key if you want to use the OpenAI API (you'll need one, sorry!)
3. Drop that API key in your settings
4. Start coding like a boss! 

## 🔥 Development

To develop this extension, you need to have the following tools installed:
 - Node.js
 - VS Code
 - Pnpm (Should work with npm or yarn, but i ♥ pnpm)

### 🫡 How ?
 - Edit the package.json to use the engine you want, editing the `askia.apiServer` and `askia.model` fields (maybe there is a better way to do this...)
 - Run `pnpm install` (or `$YOUR_FAVORITE_PACKAGE_MANAGER install`) to install the dependencies.
 - Run `pnpm run watch` to start the extension in watch mode.
 - Open the file `src/extension.ts`.
 - Press `F5` to start debugging the extension.
 - NOTE: you must have a opened workspace within the folder where you want to generate the k8s manifest.
 - press `Cmd+Shift+P` and type `AskIA: Generate Kubernetes File`
 - type `nginx deployment with 3 replicas and service`
 - press enter
 - you should see the a new file with the k8s manifest in the same folder
 - now press `Cmd+Shift+P` and type `AskIA: Suggest K8s Modifications`
 - type `add a volume to the nginx deployment`
 - press enter
 - you should see the k8s manifest in the file with the modifications
 
## ⚙️ Settings You Can Mess With

Pop these in your VS Code settings:

```json
{
"askia.apiKey": "your-super-secret-key",
"askia.apiServer": "http://localhost:11434/v1",
"askia.model": "granite-8b"
}
```

## 🎯 Commands

Just hit `Cmd+Shift+P` (or `Ctrl+Shift+P` if you're on Windows/Linux) and type:
- `AskIA: Generate Kubernetes File` - For spawning new K8s manifests
- `AskIA: Suggest K8s Modifications` - For tweaking existing ones

# 💡 Ideas
 - In the suggestion function, I think it could be optimized by upoload a context, with the k8s manifest...

## 🐛 Known Issues

- Sometimes it gets too excited and generates more YAML than you need (An idea could be to enhance the `system` message to avoid this)
- It might occasionally try to be too clever (I'm working on its ego)
- Ollama: It looks not working well beause the `system` message is not evaluated.

## 🎉 What's New?

### v0.0.1
- First release! It's alive! 🎈
- Added K8s generation and modification features
- Threw in some smart code completion because why not?

## 🤝 Contributing

Found a bug? Got a cool idea? Feel like making this even more awesome? Hit us up with a PR! 

## 📬 Need Help?

If something's not working right or you just want to chat about the extension, open an issue on GitHub. I don't bite! 

## 📝 Disclaimer

**This extension is a proof of concept and is not meant to be used in production. It is a fun way to learn how to use LLMs and how to create a VS Code extension.** I'ts just a fun experiment, and my first VS Code extension.

---

Made with 🍕 and ☕️ by developers who think AI should be fun!

