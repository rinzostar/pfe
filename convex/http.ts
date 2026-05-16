import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.register(http);

export default http;
