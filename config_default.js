// config.js - 从 Config.env 手动转换的配置
window.loadedConfig = { // 将配置赋给 window.loadedConfig
    API_URl: "",
    API_Key: "",
    API_Timeout: 60, // 秒
    StreamingOutput: false,//开启流式输出
    AI_LIST: 5,
    AI_CHAT_MODE: "NatureRandom", // 可选值: sequentialQueue, shuffledQueue, randomSubsetQueue, ButtonSend, NatureRandom
// # sequentialQueue 按AI编号顺序发言 # shuffledQueue 按编号随机顺序发言 # randomSubsetQueue 随机几个模型发言(并不会让所有list中的AI都发言，每次发言ai数量也是随机的) # ButtonSend 根据用户点击对应编号的AI发言按钮来让ai发言(请在界面提供每个AImodel的邀请发言按钮)	
// # NatureRandom 强化的随机模式，会根据前文来确定下一轮随机组

    User_Name: "莱恩",
    USER_Prompt: "莱恩是一位人类男性",
	UserAvatar: "莱恩.jpg",
    GroupPrompt: "这里是莱恩家的聊天室，当前系统时间为{{Date::time}}。当各位因为个人原因想要暂时离开聊天室时(比如不想继续发言聊天了，或者因为要去处理别的工作，或者要离开当前场景等等)，可以在聊天末尾输入[[QuitGroup]]来暂时离开当前群聊(持续一轮）",
    models: [
        {
            Name: "猫娘小克",
            Tag: "小克,科普,知识，天文，物理，化学，数学，生物",  //用于上下位队列匹配
            Model: "gemini-2.5-pro-exp-03-25",
            Maxtoken: 100000,
            Outputtoken: 27890,
            Temperature: 0.35,
            SystemPrompts: "",
            Image: true,
            Websearch: true,
			Avatar: "猫娘小克.jpg"
        },
        {
            Name: "犬娘小吉",
            Tag: "小吉，评论，文化，社会，政治，心理，法律，哲学",
            Model: "gemini-2.5-pro-exp-03-25",
            Maxtoken: 100000,
            Outputtoken: 27890,
            Temperature: 0.65,
            SystemPrompts: "",
            Image: true,
            Websearch: true,
			Avatar: "犬娘小吉.jpg"
        },
	    {
            Name: "蛇娘小冰",
            Tag: "小冰，游戏，动漫，御宅，动画，萌，吐槽",
            Model: "gemini-2.5-pro-exp-03-25",
            Maxtoken: 100000,
            Outputtoken: 27890,
            Temperature: 0.85,
            SystemPrompts: "",
            Image: true,
            Websearch: true,
			Avatar: "蛇娘小冰.jpg"
        },
        {
            Name: "龙娘小娜",
            Tag: "小娜，莱恩家，管理，女仆长",
            Model: "gemini-2.5-pro-exp-03-25",
            Maxtoken: 100000,
            Outputtoken: 27890,
            Temperature: 0.55,
            SystemPrompts: "",
            Image: true,
            Websearch: true,
			Avatar: "龙娘小娜.jpg"
        },
        {
            Name: "鸟娘小雨",
            Tag: "小雨，写作，故事，创作，文案",
            Model: "gemini-2.5-pro-exp-03-25",
            Maxtoken: 100000,
            Outputtoken: 27890,
            Temperature: 1.05,
            SystemPrompts: "",
            Image: true,
            Websearch: true,
			Avatar: "鸟娘小雨.jpg"
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
