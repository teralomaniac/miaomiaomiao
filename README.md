# Miaomiaomiao

A proxy.

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

## Limitations

Only Anthropic API format is supported.

Messages will be squashed into question: ... answer: ... format.

File mode will be used when encodeURIComponent(prompt) > 32K
