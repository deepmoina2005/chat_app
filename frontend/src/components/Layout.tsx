import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { MessageSquare, User, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { resetChat } from "@/store/slices/chatSlice";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { socketService } from "@/lib/socket";

export default function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { activeConversation } = useAppSelector((state) => state.chat);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      socketService.disconnect();
      dispatch(logout());
      dispatch(resetChat());
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const navItems = [
    { icon: MessageSquare, label: "Chats", to: "/" },
    { icon: Search, label: "Discover", to: "/discover" },
    { icon: User, label: "Profile", to: "/profile" },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "hidden md:flex md:w-64 border-r border-border bg-card/30 backdrop-blur-xl flex-col",
        activeConversation && "max-md:hidden"
      )}>
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            ChatApp
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="w-6 h-6 shrink-0" />
              <span className="font-medium hidden md:block">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-accent/50 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.name?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl px-3"
            onClick={handleLogout}
          >
            <LogOut className="w-6 h-6 shrink-0" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 relative overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/5",
        activeConversation ? "pb-0" : "pb-20 md:pb-0"
      )}>
        <Outlet />
      </main>

      {/* Bottom Navigation - Mobile */}
      {!activeConversation && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border md:hidden flex justify-around p-3 z-50">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 transition-all duration-200",
                  isActive ? "text-primary scale-110" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-destructive">
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </nav>
      )}
    </div>
  );
}
