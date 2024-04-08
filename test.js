const FormData = require("form-data");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

(axios.defaults.headers.common["User-Agent"] =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"),
	(axios.defaults.headers.common["Cookie"] = process.env.YOUCOM_COOKIE);

var jsonBody = {
	stream: true,
	messages: [
		{
			role: "user",
			content: "你好，请向我介绍你自己。".repeat(2),
		},
	],
};
async function test() {
	try {
		let userMessage = [{ question: "", answer: "" }];
		let userQuery = "";
		let lastUpdate = true;
		if (jsonBody.system) {
			// 把系统消息加入messages的首条
			jsonBody.messages.unshift({ role: "system", content: jsonBody.system });
		}
		jsonBody.messages.forEach((msg) => {
			if (msg.role == "system" || msg.role == "user") {
				if (lastUpdate) {
					userMessage[userMessage.length - 1].question += msg.content + "\n";
				} else if (userMessage[userMessage.length - 1].question == "") {
					userMessage[userMessage.length - 1].question += msg.content + "\n";
				} else {
					userMessage.push({ question: msg.content + "\n", answer: "" });
				}
				lastUpdate = true;
			} else if (msg.role == "assistant") {
				if (!lastUpdate) {
					userMessage[userMessage.length - 1].answer += msg.content + "\n";
				} else if (userMessage[userMessage.length - 1].answer == "") {
					userMessage[userMessage.length - 1].answer += msg.content + "\n";
				} else {
					userMessage.push({ question: "", answer: msg.content + "\n" });
				}
				lastUpdate = false;
			}
		});
		userQuery = userMessage[userMessage.length - 1].question;
		// if (userMessage[userMessage.length - 1].answer == "") {
		// 	userMessage.pop();
		// }
		console.log(userMessage);

		// 对于多条消息，只保留最后两条用户消息传入 chat，其他作为文件上传
		if (userMessage.length > 2) {
			lastUserMessage = userMessage.slice(-2);

			// user message to plaintext
			let previousMessages = userMessage
				.slice(0, userMessage.length - 2)
				.map((msg) => {
					return `user: ${msg.question}\nassistant: ${msg.answer}`;
				})
				.join("\n");

			previousMessages = "<Previous_Conversation>\n" + previousMessages + "\n</Previous_Conversation>\n";

			userMessage = lastUserMessage;

			// GET https://you.com/api/get_nonce to get nonce
			let nonce = await axios("https://you.com/api/get_nonce").then((res) => res.data);
			if (!nonce) throw new Error("Failed to get nonce");

			// POST https://you.com/api/upload to upload user message
			const form_data = new FormData();
			var messageBuffer = Buffer.from(previousMessages, "utf8");
			form_data.append("file", messageBuffer, { filename: "Previous_Conversation.txt", contentType: "text/plain" });
			var uploadedFile = await axios
				.post("https://you.com/api/upload", form_data, {
					headers: {
						...form_data.getHeaders(),
						"X-Upload-Nonce": nonce,
					},
				})
				.then((res) => res.data.filename);
			if (!uploadedFile) throw new Error("Failed to upload messages");
		}

		let msgid = uuidv4();

		// send message start
		console.log(
			createEvent("message_start", {
				type: "message_start",
				message: {
					id: "${msgid}",
					type: "message",
					role: "assistant",
					content: [],
					model: "claude-3-opus-20240229",
					stop_reason: null,
					stop_sequence: null,
					usage: { input_tokens: 8, output_tokens: 1 },
				},
			})
		);
		console.log(createEvent("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }));
		console.log(createEvent("ping", { type: "ping" }));

		// proxy response

		var proxyReq = await axios.get("https://you.com/api/streamingSearch", {
			params: {
				page: "0",
				count: "0",
				safeSearch: "Off",
				q: userQuery.trim(),
				incognito: "true",
				chatId: msgid,
				traceId: msgid,
				conversationTurnId: msgid,
				selectedAIModel: "claude_3_opus",
				selectedChatMode: "custom",
				pastChatLength: userMessage.length,
				queryTraceId: msgid,
				use_personalization_extraction: "false",
				domain: "youchat",
				responseFilter: "",
				mkt: "zh-CN",
				userFiles: uploadedFile
					? JSON.stringify([
							{
								user_filename: "Previous_Conversation.txt",
								filename: uploadedFile,
								size: messageBuffer.length,
							},
					  ])
					: "",
				chat: JSON.stringify(userMessage),
			},
			headers: {
				accept: "text/event-stream"
			},
			responseType: "stream",
		}).catch((e) => {
			throw e;
		});

		let cachedLine = "";
		const stream = proxyReq.data;
		stream.on("data", (chunk) => {
			// try to parse eventstream chunk
			chunk = chunk.toString();

			if (cachedLine) {
				chunk = cachedLine + chunk;
				cachedLine = "";
			}

			if (!chunk.endsWith("\n")) {
				const lines = chunk.split("\n");
				cachedLine = lines.pop();
				chunk = lines.join("\n");
			}

			try {
				console.log(chunk);
				if (chunk.indexOf("event: youChatToken\n") != -1) {
					chunk.split("\n").forEach((line) => {
						if (line.startsWith(`data: {"youChatToken"`)) {
							let data = line.substring(6);
							let json = JSON.parse(data);
							//console.log(json);
							chunkJSON = JSON.stringify({
								type: "content_block_delta",
								index: 0,
								delta: { type: "text_delta", text: json.youChatToken },
							});
							console.log(json.youChatToken);
							//console.log(createEvent("content_block_delta", chunkJSON));
						}
					});
				}
			} catch (e) {
				console.log(e);
			}
		});
		stream.on("end", () => {
			// send ending
			console.log(createEvent("content_block_stop", { type: "content_block_stop", index: 0 }));
			console.log(
				createEvent("message_delta", {
					type: "message_delta",
					delta: { stop_reason: "end_turn", stop_sequence: null },
					usage: { output_tokens: 12 },
				})
			);
			console.log(createEvent("message_stop", { type: "message_stop" }));
		});
	} catch (e) {
		console.log(JSON.stringify(e));
		return;
	}
}

// eventStream util
function createEvent(event, data) {
	// if data is object, stringify it
	if (typeof data === "object") {
		data = JSON.stringify(data);
	}
	return `event: ${event}\ndata: ${data}\n\n`;
}

test();4