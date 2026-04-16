import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { connectToDatabase } from "@/lib/db";
import { syncUserReferralCode } from "@/lib/referral";
import { User } from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      await connectToDatabase();
      const discordId = (profile as unknown as { id: string })?.id;
      let _user = await User.findOne({ discordId });

      if (!_user) {
        _user = await User.create({
          discordId,
          username:
            (profile as unknown as { username: string })?.username || user.name,
          avatar:
            (profile as unknown as { avatar: string })?.avatar || user.image,
          email: user.email,
          role: discordId === process.env.DISCORDID ? "admin" : "user",
        });
      } else if (
        discordId === process.env.DISCORDID &&
        _user.role !== "admin"
      ) {
        _user.role = "admin";
        await _user.save();
      }
      await syncUserReferralCode(_user);
      return true;
    },
    async session({ session, token }) {
      await connectToDatabase();
      if (token.sub) {
        const _user = await User.findOne({ email: session.user?.email });
        if (_user) {
          (session.user as any).id = _user._id;
          (session.user as any).discordId = _user.discordId;
          (session.user as any).role = _user.role;
        }
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
