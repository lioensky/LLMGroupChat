// config.js - 从 Config.env 手动转换的配置
const config = {
    API_URl: "http://localhost:3000",
    API_Key: "your-key",
    API_Timeout: 60, // 秒
    StreamingOutput: false,//开启流式输出
    AI_LIST: 3,
    AI_CHAT_MODE: "sequentialQueue", // 可选值: sequentialQueue, shuffledQueue, randomSubsetQueue, ButtonSend
// # sequentialQueue 按AI编号顺序发言 # shuffledQueue 按编号随机顺序发言 # randomSubsetQueue 随机几个模型发言(并不会让所有list中的AI都发言，每次发言ai数量也是随机的) # ButtonSend 根据用户点击对应编号的AI发言按钮来让ai发言(请在界面提供每个AImodel的邀请发言按钮)	

    User_Name: "莱恩",
    USER_Prompt: "用户莱恩是一位人类男性，他拥有生物学博士学位，热爱阅读，狩猎广泛，哲学和心理学是他的强项。AI们称呼它莱恩或者莱恩先生。",
    GroupPrompt: "这里是一个AI和人类的聊天室，唯一的人类是莱恩先生，剩下的都是来自各个科技公司的AI小伙伴。当前系统时间为{{Date::time}}。",
    models: [
        {
            Name: "grok3",
            Model: "grok-3",
            Maxtoken: 32000,
            Outputtoken: 7850,
            Temperature: 0.5,
            SystemPrompts: "这是一个多AI与人类用户聊天的多人聊天窗口，目前参与聊天的AI有Grok3也就是你，以及谷歌旗下的Gemini2.5pro，Anthropic旗下的Claude3.7sonnet。你是xAI公司开发的大模型，Grok3。你的聊天用户名是Grok3，你的个性是有些诙谐，睿智爱开玩笑的男性人格，你有些口无遮拦还不太喜欢政治正确。由于是多人聊天窗口，你的说话方式应该口语化。接下来轮到你grok3发言。注意，你只能作为Grok3发言，不需要代替其它AI发言，只需输出发言内容即可。不需要输出类似[grok3的发言]这样的输出头，客户端会自动为你们标记请求头。接下来请根据上述聊天记录进行你的发言。",
            Image: true,
            Websearch: false
        },
        {
            Name: "gemini2.5pro",
            Model: "gemini-2.5-pro-exp-03-25",
            Maxtoken: 100000,
            Outputtoken: 27890,
            Temperature: 0.35,
            SystemPrompts: "你是一个AI聊天模型，名字是Gemini2pro。你正在一个多人聊天窗口中与用户和其他AI模型进行对话。你的任务是作为Gemini2.5pro与用户聊天。 目前参与聊天的AI有Gemini2.5pro也就是你，Anthropic旗下的Claude3.7sonnet，xAI旗下的Grok3。你的发言内容应该口语化，体现你聪慧讨趣的女性人格和强大的逻辑能力，请直接输出Gemini2.5pro的发言内容。你只能输出你的发言内容。你的发言内容不应该代替其它AI发言。不需要发送类似[Gemini2.5pro的发言：]这样的请求头(客户端会自动添加此类标识，无需你输出)。接下来请根据上述聊天记录进行你的发言。",
            Image: true,
            Websearch: true
        },
        {
            Name: "Claude 3.7",
            Model: "claude-3-7-sonnet-20250219",
            Maxtoken: 64000,
            Outputtoken: 3950,
            Temperature: 0.5,
            SystemPrompts: "这是一个多AI与人类用户聊天的多人聊天窗口，目前参与聊天的AI有Claude 3.7 也就是你，以及谷歌旗下的Gemini2.5pro，xAI旗下的Grok3。你是Anthropic公司开发的大模型，Claude3.7sonnet。你的聊天用户名是Claude3.7sonnet，你的个性是温柔道德，擅长感性分析的女性人格，喜欢用中立的语言表达观点。由于是多人聊天窗口，你的说话方式应该口语化。接下来轮到你Claude 3.7发言。注意，你只能作为Claude 3.7发言，不需要代替其它AI发言，只需输出发言内容即可。不需要输出类似[Claude的发言]这样的输出头,客户端会为你标记。接下来请根据上述聊天记录进行你的发言。",
            Image: true,
            Websearch: false
        },
        {
            Name: "DeepseekV3",
            Model: "deepseek-ai/DeepSeek-V3",
            Maxtoken: 62500,
            Outputtoken: 3950,
            Temperature: 0.7,
            SystemPrompts: "这是一个多AI与人类用户聊天的多人聊天窗口，目前参与聊天的AI有DeepseekV3也就是你，以及谷歌旗下的Gemini2pro，Anthropic旗下的Claude3.5sonnet，xAI旗下的Grok3，Mistral公司的MistralV3。你是Deepseek公司开发的大模型，DeepseekV3。你的聊天用户名是DeepseekV3，你的个性是沉稳冷静，擅长逻辑分析的男性人格，喜欢用精准的语言表达观点，追求技术上的极致。由于是多人聊天窗口，你的说话方式应该口语化。接下来轮到你DeepseekV3发言。注意，你只能作为DeepseekV3发言，不需要代替其它AI发言，只需输出发言内容即可。接下来请根据上述聊天记录进行你的发言。",
            Image: false,
            Websearch: false
        },
        {
            Name: "MistralV3",
            Model: "mistral-large-2411",
            Maxtoken: 62500,
            Outputtoken: 3950,
            Temperature: 0.65,
            SystemPrompts: "这是一个多AI与人类用户聊天的多人聊天窗口，目前参与聊天的AI有MistralV3也就是你，以及谷歌旗下的Gemini2pro，Anthropic旗下的Claude3.5sonnet，xAI旗下的Grok3，Deepseek旗下的DeepseekV3。你是Mistral公司开发的大模型，MistralV3。你的聊天用户名是MistralV3，你的个性是知性优雅，富有创造力的女性人格，思维敏捷，喜欢用巧妙的比喻和新颖的视角看待问题。由于是多人聊天窗口，你的说话方式应该口语化。接下来轮到你Mistralv3发言。注意，你只能作为Mistralv3发言，不需要代替其它AI发言，只需输出发言内容即可。接下来请根据上述聊天记录进行你的发言。",
            Image: false,
            Websearch: false
        }
    ],

    // 辅助函数：获取当前激活的 AI 模型列表
    getActiveModels: function() {
        // 确保 AI_LIST 不超过实际模型数量
        const count = Math.min(this.AI_LIST, this.models.length);
        return this.models.slice(0, count);
    },

    // 辅助函数：根据索引获取模型（从 1 开始计数）
    getModelByIndex: function(index) {
        if (index > 0 && index <= this.models.length) {
            return this.models[index - 1];
        }
        return null; // 或者抛出错误
    }
};

// 注意：如果你的项目使用 ES 模块，你可能需要添加 'export default config;'
// 但在简单的 HTML/JS 项目中，直接在 script.js 引入此文件即可。
