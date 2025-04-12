# 🤖 AI 群聊派对 🎉

欢迎来到 AI 群聊派对！这是一个简单而有趣的本地聊天室，让人类用户（就是你！）可以和多个 AI 小伙伴同时在线唠嗑。

## ✨ 主要特色

*   **多人在线**：你不是一个人在战斗！可以同时与多个（最多 5 个）不同的 AI 模型聊天。
*   **多种聊天模式**：
    *   `sequentialQueue`：AI 们按顺序排队发言，一个接一个。
    *   `shuffledQueue`：AI 们随机排队，每次你发话后，下一个随机 AI 接话。
    *   `randomSubsetQueue`：每次你发话后，随机挑选几个 AI 出来七嘴八舌。
    *   `ButtonSend`：AI 们很矜持，需要你点名邀请（点击对应按钮）才肯发言。
*   **记忆力超群**：支持多个独立的聊天会话记录，每个记录都带有创建时间戳，方便回顾。聊天记录保存在你的浏览器 `localStorage` 里。
*   **火眼金睛**：支持发送图片给具备多模态能力的 AI（比如 Gemini、Claude）。点击输入框旁边的 📎 按钮即可。
*   **与时俱进**：AI 们知道现在是什么时候，系统提示中会自动注入当前日期时间。
*   **联网冲浪**：
    *   配置为 `Websearch: true` 的 Gemini 模型或者 GPT 模型可以通过你的中转服务器调用 Google 搜索（需要服务器端支持）。
*   **高度可配置**：所有的 API 地址、密钥、模型参数、AI 个性（System Prompts）等都在 `config.js` 文件里设置。

## 🚀 如何开始派对？

1.  **配置你的 AI 伙伴**：
    *   打开 `config.js` 文件。
    *   根据你的需要修改 `API_URl`, `API_Key`。
    *   设置你想同时聊天的 AI 数量 (`AI_LIST`)。
    *   选择你喜欢的聊天模式 (`AI_CHAT_MODE`)。
    *   为每个 AI 模型 (`models` 数组) 配置正确的模型名称 (`Model`)、显示名称 (`Name`)、系统提示 (`SystemPrompts`)、是否支持图片 (`Image: true/false`) 以及是否启用 Web 搜索 (`Websearch: true/false`，仅对需要工具调用的模型有效)。
2.  **打开聊天室**：在你的网页浏览器中直接打开 `index.html` 文件。
3.  **开始聊天**：输入你的消息，或者根据聊天模式点击按钮，和 AI 们开始愉快的交流吧！

## 💡 温馨提示

*   聊天记录保存在浏览器本地存储 (`localStorage`) 中，清除浏览器数据会导致记录丢失。
*   Gemini 的 Web 搜索功能需要你的中转服务器支持工具调用 (Tool Calling)。

---

玩得开心！看看你能和 AI 们聊出什么火花！ 😉
