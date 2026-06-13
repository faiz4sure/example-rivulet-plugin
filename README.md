# Example Rivulet Plugin

This repository contains an example plugin for the **Rivulet** ecosystem.

> **Note**: Rivulet is currently in its initial development phase. This plugin serves as a basic example of how to build and integrate custom providers using the official `@rivulet/sdk`.

## Overview

This plugin demonstrates how to build content providers that can integrate into the Rivulet app. It includes:
- **Dummy Provider**: A simple example demonstrating the usage of SDK builders to mock content.
- **MovieBox Provider**: A more complex, functional provider example that interacts with an external API.

## Deno Commands

This project is built using [Deno](https://deno.com/). We've set up several scripts in `deno.json` to help you manage the code:

- **Format Code**: `deno task fmt` or `deno fmt`
  Automatically formats your code according to standard Deno rules.
- **Lint Code**: `deno task lint` or `deno lint`
  Checks your code for syntax issues and Deno best practices.
- **Type Check**: `deno task check`
  Validates your TypeScript types.

## Usage

This plugin relies on the official Deno-native SDK hosted on JSR.

To start developing your own plugin, import the SDK like this:
```typescript
import { servePlugins } from "jsr:@rivulet/sdk";
```

## Contributing

Since the main Rivulet application is evolving, these plugins might change frequently to keep up with the latest SDK updates. Feel free to use this as a reference or template for your own plugins!
