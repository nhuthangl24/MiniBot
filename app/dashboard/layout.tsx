import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { SessionProvider } from "@/components/SessionProvider";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { CreditCard } from "lucide-react";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { ProfileMenu } from "@/components/ProfileMenu";
import Link from "next/link";

function serializeSession(session: any) {
  if (!session) return null;
  return JSON.parse(JSON.stringify(session));
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const safeSession = serializeSession(session);

  return (
    <SessionProvider session={safeSession}>
      <div className="flex bg-[#030712] text-gray-200 min-h-screen font-sans antialiased selection:bg-cyan-500/30">
        <DashboardSidebar />

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          {/* Decorative background effects */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/5 blur-[150px] rounded-full pointer-events-none -z-10" />

          {/* Topbar */}
          <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-white/[0.01] backdrop-blur-xl shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-extrabold tracking-tight text-white/90">
                Hi, {safeSession?.user?.name?.split(" ")[0] || "User"} 👋
              </h2>
            </div>

            <div className="flex gap-4 items-center">
              <Link
                href="/dashboard/topup"
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-xl transition-all duration-300 group"
              >
                <CreditCard className="w-4 h-4 text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span className="text-sm font-semibold text-gray-300 group-hover:text-white">
                  Nạp tiền
                </span>
              </Link>

              <NotificationsMenu />

              <div className="h-6 w-px bg-white/10 mx-2" />

              <ProfileMenu
                name={safeSession?.user?.name}
                image={safeSession?.user?.image}
                userId={safeSession?.user?.id?.toString()}
                discordId={(safeSession?.user as { discordId?: string })?.discordId}
              />
            </div>
          </header>

          {/* Main Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
