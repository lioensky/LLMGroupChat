# 🤖 AI 群聊派对（更新至Pro） 🎉

欢迎来到 AI 群聊派对！这是一个功能丰富、界面友好的本地聊天室，让人类用户（就是你！）可以和多个 AI 小伙伴同时在线唠嗑，并提供了多种互动方式和个性化选项。最新版本已经完美适配移动端使用！

## ✨ 主要特色

*   **多配置文件支持**：轻松切换不同的 AI 配置组合！通过顶部的下拉菜单选择预设的 `config_*.js` 文件，满足不同场景或实验需求。配置保存在本地存储中。
*   **多人在线**：你不是一个人在战斗！可以同时与多个（可配置数量）不同的 AI 模型聊天。
*   **多种聊天模式**：
    *   `sequentialQueue`：AI 们按顺序排队发言，一个接一个。
    *   `shuffledQueue`：AI 们随机排队，每次你发话后，下一个随机 AI 接话。
    *   `randomSubsetQueue`：每次你发话后，随机挑选几个 AI 出来七嘴八舌。
    *   `NatureRandom`：模拟更自然的群聊！AI 是否发言取决于上一轮聊天中是否被提及 (`@tag`) 以及一定的随机性。需要为 AI 配置 `Tag` 属性。
    *   `ButtonSend`：AI 们很矜持，需要你点名邀请（点击对应按钮）才肯发言。
*   **浮动 AI 状态面板**：
    *   实时查看当前所有活动 AI 的头像和名称。
    *   **发言指示**：当前轮次发言的 AI 头像会高亮显示，不发言的则会灰显。
    *   **单轮排除**：点击 AI 头像旁的 `X` 按钮，可以临时禁止该 AI 在下一轮发言（AI 自己使用 `[[QuitGroup]]` 退出也会显示）。
    *   **持续静音**：点击 AI 头像旁的 `!` 按钮，可以永久禁言该 AI，直到你再次点击取消。静音状态会保存在本地存储中。
*   **AI 主动退群**：AI 可以在其回复末尾加上 `[[QuitGroup]]` 标记，表示它想在下一轮“潜水”不发言。
*   **@提及功能**：
    *   在消息中使用 `@AI的Tag` 可以提高该 AI 在 `NatureRandom` 模式下发言的概率。
    *   使用 `@所有人` 可以强制所有未被手动排除或静音的 AI 在下一轮发言。
    *   所有提及都会被高亮显示。
*   **多会话管理**：支持创建和切换多个独立的聊天会话，每个会话都有独立的聊天记录，并以创建时间命名，方便回顾。聊天记录保存在你的浏览器 `localStorage` 里。
*   **多模态支持**：支持发送图片给具备多模态能力的 AI（如 Gemini、Claude）。点击输入框旁边的 📎 按钮即可选择图片。
*   **Markdown 渲染**：AI 的回复支持 Markdown 格式，代码、列表、引用等都能优雅显示。
*   **与时俱进**：AI 们知道现在是什么时候，系统提示中会自动注入当前日期时间。
*   **联网冲浪**：
    *   配置为 `Websearch: true` 的 Gemini 模型可以通过你的中转服务器调用 Google 搜索（需要服务器端支持）。
    *   Grok 模型似乎自带联网技能，随时准备网上冲浪！
*   **API 错误重试**：当调用 AI API 失败或超时时，系统会自动尝试重新连接（最多 2 次）。
*   **个性化外观**：
    *   支持为用户和每个 AI 配置专属头像（在 `config.js` 中设置 `UserAvatar` 和 `Avatar`）。
    *   聊天背景和页面背景会随机更换漂亮的图片。
*   **响应式设计**：界面已适配桌面和移动设备，在不同尺寸屏幕上都能获得良好体验。
*   **高度可配置**：API 地址、密钥、模型参数、AI 个性（System Prompts）、头像、标签等都在 `config_*.js` 文件里设置。

## 🚀 如何开始派对？
1.  **下载资源包压缩包**：源码文件缺乏许多贴图内容，直接从https://github.com/lioensky/LLMGroupChat/releases/tag/image 下载资源包解压到源码里。
2.  **选择或创建配置文件**：
    *   你可以直接修改 `config_default.js`，或者复制一份并重命名为 `config_*.js`（例如 `config_mypreset.js`）。
    *   在 `script.js` 文件顶部的 `availableConfigs` 数组中注册你的新配置文件，给它起个名字。
3.  **配置你的 AI 伙伴**：
    *   打开你选择的配置文件（如 `config_default.js`）。
    *   根据你的需要修改 `API_URl`, `API_Key`。
    *   设置你想同时聊天的 AI 数量 (`AI_LIST`)。
    *   选择你喜欢的聊天模式 (`AI_CHAT_MODE`)。
    *   配置用户名称 (`User_Name`) 和头像 (`UserAvatar`，图片放在 `image/` 目录下)。
    *   为每个 AI 模型 (`models` 数组) 配置：
        *   正确的模型名称 (`Model`)
        *   显示名称 (`Name`)
        *   头像 (`Avatar`，图片放在 `image/` 目录下)
        *   个性化系统提示 (`SystemPrompts`)
        *   用于 `@提及` 和 `NatureRandom` 模式的标签 (`Tag`)，支持一个角色多个tag比如“tag1，tag2，tag3……”
        *   是否支持图片 (`Image: true/false`)
        *   是否启用 Web 搜索 (`Websearch: true/false`，仅对需要工具调用的模型有效)
        *   其他模型参数（如 `Outputtoken`, `Temperature`）
4.  **打开聊天室**：在你的网页浏览器中直接打开 `index.html` 文件。
5.  **选择配置**：如果配置了多个文件，在页面顶部的下拉菜单中选择你想使用的配置。
6.  **开始聊天**：输入你的消息，发送图片，或者根据聊天模式点击按钮/使用 `@提及`，和 AI 们开始愉快的交流吧！

## 💡 温馨提示

*   聊天记录、静音列表和上次选择的配置都保存在浏览器本地存储 (`localStorage`) 中，清除浏览器数据会导致这些信息丢失。
*   Gemini 的 Web 搜索功能需要你的中转服务器支持工具调用 (Tool Calling)。
*   浮动 AI 状态面板提供了便捷的交互方式，试试点击上面的按钮！

---

玩得开心！看看你能和 AI 们聊出什么火花！ 😉
