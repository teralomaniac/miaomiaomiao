# Miaomiaomiao

A proxy. [Usage 使用方法](usage.md)

**It is forbidden to use this project for profit.**

**禁止用于盈利用途。**

## Usage

```bash
npm install
```

then set the environment variable (see code) and 

```bash
node index
```

## Limitations 限制

Only Anthropic API format is supported.

只支持A社的API格式

Messages will be squashed into question: ... answer: ... format.

消息会被进行一些格式转换

File mode will be used when encodeURIComponent(prompt) > 32K

文本编码后大于32K的话会采用文件模式

In general, the prefill from the website will affect RP, so CoT is recommend.

网站的前置填充会影响效果，建议使用CoT类破限

