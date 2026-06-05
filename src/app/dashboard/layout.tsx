import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#0a0e1a] light:bg-[var(--background)]">
        {/* Ambient gradient mesh */}
        <div className="fixed inset-0 pointer-events-none gradient-mesh" />
        <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

        <Sidebar />
        <main className="flex-1 overflow-y-auto relative z-10">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
