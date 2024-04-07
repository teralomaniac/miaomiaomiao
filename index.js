const express = require("express");
const https = require("https");
const { v4: uuidv4 } = require("uuid");
const app = express();
const port = 8080;
const YOUCOM_COOKIE = process.env.YOUCOM_COOKIE;

app.post("/v1/messages", (req, res) => {
	req.rawBody = "";
	req.setEncoding("utf8");

	req.on("data", function (chunk) {
		req.rawBody += chunk;
	});

	req.on("end", function () {
		res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
		try {
			let jsonBody = JSON.parse(req.rawBody);
			if (jsonBody.stream == false) {
				res.send(
					JSON.stringify({
						id: uuidv4(),
						content: [
							{
								text: "Please turn on streaming.",
							},
							{
								id: "string",
								name: "string",
								input: {},
							},
						],
						model: "string",
						stop_reason: "end_turn",
						stop_sequence: "string",
						usage: {
							input_tokens: 0,
							output_tokens: 0,
						},
					})
				);
			} else if (jsonBody.stream == true) {
				// squash messages
				let userMessage = [{ question: "", answer: "" }];
				let userQuery = "";
				let lastUpdate = true;
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

				let msgid = uuidv4();

				// send message start
				res.write(
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
				res.write(createEvent("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }));
				res.write(createEvent("ping", { type: "ping" }));
				// proxy response
				let youcom_params = new URLSearchParams();
				youcom_params.append("page", "0");
				youcom_params.append("count", "0");
				youcom_params.append("safeSearch", "Off");
				youcom_params.append("q", userQuery);
				youcom_params.append("incognito", "true");
				youcom_params.append("chatId", msgid);
				youcom_params.append("traceId", msgid);
				youcom_params.append("conversationTurnId", msgid);
				youcom_params.append("selectedAIModel", "claude_3_opus");
				youcom_params.append("selectedChatMode", "custom");
				youcom_params.append("pastChatLength", userMessage.length - 1);
				youcom_params.append("queryTraceId", msgid);
				youcom_params.append("use_personalization_extraction", "false");
				youcom_params.append("domain", "youchat");
				youcom_params.append("responseFilter", "");
				youcom_params.append("mkt", "zh-CN");
				youcom_params.append("chat", JSON.stringify(userMessage));

				var proxyReq = https.request(
					{
						hostname: "you.com",
						port: 443,
						method: "GET",
						path: "/api/streamingSearch?" + youcom_params.toString(),
						headers: {
							cookie: YOUCOM_COOKIE,
							"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
							accept: "text/event-stream",
							"content-type": "application/x-www-form-urlencoded",
						},
					},
					(proxyRes) => {
						let cachedLine = "";
						proxyRes.on("data", (chunk) => {
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
											res.write(createEvent("content_block_delta", chunkJSON));
										}
									});
								}
							} catch (e) {
								console.log(e);
							}
						});
						proxyRes.on("end", () => {
							// send ending
							res.write(createEvent("content_block_stop", { type: "content_block_stop", index: 0 }));
							res.write(
								createEvent("message_delta", {
									type: "message_delta",
									delta: { stop_reason: "end_turn", stop_sequence: null },
									usage: { output_tokens: 12 },
								})
							);
							res.write(createEvent("message_stop", { type: "message_stop" }));

							res.end();
						});
					}
				);
				proxyReq.on("error", (e) => {
					throw e;
				});
				//proxyReq.write(youcom_params.toString());
				proxyReq.end();
			} else {
				throw new Error("Invalid request");
			}
		} catch (e) {
			res.write(JSON.stringify({ error: e.message }));
			res.end();
			return;
		}
	});
});

// handle other
app.use((req, res, next) => {
	console.log(req);
	res.status(404).send("Not Found");
});

app.listen(port, () => {
	console.log(`YouChat proxy listening on port ${port}`);
});

// eventStream util
function createEvent(event, data) {
	// if data is object, stringify it
	if (typeof data === "object") {
		data = JSON.stringify(data);
	}
	return `event: ${event}\ndata: ${data}\n\n`;
}
