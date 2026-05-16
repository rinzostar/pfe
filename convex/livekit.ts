"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { AccessToken } from "livekit-server-sdk";

export const getToken = action({
  args: {
    roomName: v.string(),
    identity: v.string(),
    isHost: v.boolean(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new Error("LiveKit credentials not configured");
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: args.identity,
      name: args.identity,
    });

    token.addGrant({
      room: args.roomName,
      roomJoin: true,
      canPublish: args.isHost,
      canSubscribe: true,
      canPublishData: true,
    });

    return { token: await token.toJwt() };
  },
});
