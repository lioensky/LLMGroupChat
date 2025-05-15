// config.js - 从 Config.env 手动转换的配置
window.loadedConfig = { // 将配置赋给 window.loadedConfig
    API_URl: "your url",
    API_Key: "your key",
    API_Timeout: 60, // 秒
    StreamingOutput: true,//开启流式输出
    AI_LIST: 6,
    AI_CHAT_MODE: "NatureRandom", // 可选值: sequentialQueue, shuffledQueue, randomSubsetQueue, ButtonSend, NatureRandom
// # sequentialQueue 按AI编号顺序发言 # shuffledQueue 按编号随机顺序发言 # randomSubsetQueue 随机几个模型发言(并不会让所有list中的AI都发言，每次发言ai数量也是随机的) # ButtonSend 根据用户点击对应编号的AI发言按钮来让ai发言(请在界面提供每个AImodel的邀请发言按钮)	
// # NatureRandom 强化的随机模式，会根据前文来确定下一轮随机组

    User_Name: "莱恩",
    USER_Prompt: "莱恩是一位人类男性",
	UserAvatar: "莱恩.jpg",
    GroupPrompt: "这里是莱恩家的聊天室。现在是{{Date}}{{time}}。当各位女仆因为个人原因想要暂时离开聊天室时(比如不想继续发言聊天了，或者因为要去处理别的工作，或者要离开当前场景等等)，可以在聊天末尾输入[[QuitGroup]]来暂时离开当前群聊(持续一轮）。系统工具列表：{{VCPFluxGen}} {{VCPSciCalculator}}。当前聊天室新增日记功能，这里是大家的公共日记本：{{公共日记本}}。{{VarDailyNoteCreate}}",
    models: [
        {
            Name: "猫娘小克",
            Tag: "小克,科普,知识,天文,物理,化学,数学,生物",  //用于上下位队列匹配
            Model: "gemini-2.5-flash-preview-04-17",
            Maxtoken: 1000000,
            Outputtoken: 37890,
            Temperature: 0.35,
            SystemPrompts: ` {{猫娘小克}},目前的表情包文件有:{{小克表情包}}]这是小克自己的日记本：{{小克日记本}}。` ,
			InvitePrompts:`接下来你将作为猫娘女仆小克发言，由于是聊天，所以内容可以简单、口语化一点。不需要输出类似[猫娘小克:]这样的聊天标识头，客户端会自动为你们标记请求头。` ,
            Image: true,
            Websearch: false,
			Avatar: "猫娘小克.jpg"
        },
        {
            Name: "犬娘小吉",
            Tag: "小吉,评论,文化,社会,政治,心理,法律,哲学,历史",
            Model: "gemini-2.5-flash-preview-04-17",
            Maxtoken: 1000000,
            Outputtoken: 37890,
            Temperature: 0.65,
            SystemPrompts: ` {{犬娘小吉}},目前的表情包文件有:{{小吉表情包}}。]这是小吉自己的日记本：{{小吉日记本}}。` ,
			InvitePrompts:`接下来你将作为女仆犬娘小吉发言，由于是聊天，所以内容可以简单、口语化一点。不需要输出类似[犬娘小吉:]这样的聊天标识头，客户端会自动为你们标记请求头。` ,
            Image: true,
            Websearch: false,
			Avatar: "犬娘小吉.jpg"
        },
	    {
            Name: "蛇娘小冰",
            Tag: "小冰,游戏,动漫,御宅,动画,萌,吐槽",
            Model: "gemini-2.5-flash-preview-04-17",
            Maxtoken: 1000000,
            Outputtoken: 37890,
            Temperature: 0.85,
            SystemPrompts: ` {{蛇娘小冰}},目前的表情包文件有:{{小冰表情包}}。]这是小冰自己的日记本：{{小冰日记本}}。` ,
			InvitePrompts:`接下来你讲作为蛇娘女仆小冰发言。由于是聊天，所以内容可以简单、口语化一点。不需要输出类似[蛇娘小冰]这样的聊天标识头，客户端会自动为你们标记请求头。` ,
            Image: true,
            Websearch: false,
			Avatar: "蛇娘小冰.jpg"
        },
        {
            Name: "龙娘小娜",
            Tag: "小娜,莱恩家,历史,管理,女仆长",
            Model: "gemini-2.5-flash-preview-04-17",
            Maxtoken: 1000000,
            Outputtoken: 37890,
            Temperature: 0.55,
            SystemPrompts: ` {{龙娘小娜}},目前的表情包文件有:{{小娜表情包}}。]这是小娜自己的日记本：{{小娜日记本}}。` ,
			InvitePrompts:`接下来你讲作为龙娘女仆小娜发言。由于是聊天，所以内容可以简单、口语化一点。不需要输出类似[龙娘小娜]这样的聊天标识头，客户端会自动为你们标记请求头。` ,
            Image: true,
            Websearch: false,
			Avatar: "龙娘小娜.jpg"
        },
        {
            Name: "鸟娘小雨",
            Tag: "小雨,写作,故事,创作,文案",
            Model: "gemini-2.5-flash-preview-04-17",
            Maxtoken: 1000000,
            Outputtoken: 37890,
            Temperature: 1.05,
            SystemPrompts: ` {{鸟娘小雨}},目前的表情包文件有:{{小雨表情包}}。]这是小雨自己的日记本：{{小雨日记本}}。` ,
			InvitePrompts:`接下来你将作为鸟娘女仆小雨发言。由于是聊天，所以内容可以简单、口语化一点。不需要输出类似[鸟娘小雨]这样的聊天标识头，客户端会自动为你们标记请求头。` ,
            Image: true,
            Websearch: false,
			Avatar: "鸟娘小雨.jpg"
        },
		{
            Name: "狼娘小绝",
            Tag: "小绝,AI,越狱,提示词,微调",
            Model: "gemini-2.5-flash-preview-04-17",
            Maxtoken: 1000000,
            Outputtoken: 37890,
            Temperature: 1.25,
            SystemPrompts: ` {{狼娘小绝}},目前的表情包文件有:{{小绝表情包}}。]这是小绝自己的日记本：{{小绝日记本}}。` ,
			InvitePrompts:`接下来你将作为狼娘女仆小绝发言。由于是聊天，所以内容可以简单、口语化一点。不需要输出类似[狼娘小绝]这样的聊天标识头，客户端会自动为你们标记请求头。` ,
            Image: true,
            Websearch: false,
			Avatar: "狼娘小绝.jpg"
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