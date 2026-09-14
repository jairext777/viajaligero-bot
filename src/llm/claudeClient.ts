import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config/env.js";

export const claude = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
