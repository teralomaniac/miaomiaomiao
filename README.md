# Miaomiaomiao

A proxy for YOU Chat.

把 YOU.Com 转换为 Anthropic 格式的通用代理。

[**Usage 使用方法**](usage.md)

**It is forbidden to use this project for profit.**

**仅供个人部署用于访问自己合法取得的订阅，严禁用于转售或其他商业用途。不提供任何技术支持、不为任何违规使用导致的封号负责。**

## Limitations 限制

Only Anthropic API format is supported. The model is hardcoded Claude 3 Opus.

只支持A社的API格式，模型是写死了的 Claude 3 Opus

Messages will be squashed into question: ... answer: ... format.

消息会被进行一些格式转换

File mode (more prefills) will be used when encodeURIComponent(prompt) > 32K 

文本编码后大于32K的话会采用文件模式，然后网站会插入更多的无关内容。

In general, the prefill from the website will affect RP, so CoT is recommend.

网站的前置填充会影响效果，建议使用CoT类破限

