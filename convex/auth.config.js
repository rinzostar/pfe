import { convexAuth } from "@convex-dev/auth";
import { Password } from "@convex-dev/auth/password";

export default convexAuth({
  providers: [Password],
});