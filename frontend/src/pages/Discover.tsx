import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Search, UserPlus, Check, X, Clock } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/lib/utils";
import { toast } from "sonner";

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = async (query: string = "") => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/friends/discover`, {
        params: { search: query },
        withCredentials: true,
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const sendRequest = async (receiverId: string) => {
    try {
      await axios.post(`${API_URL}/friends/request`, { receiverId }, {
        withCredentials: true,
      });
      toast.success("Friend request sent!");
      fetchUsers(search);
    } catch (error) {
      toast.error("Failed to send friend request");
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      await axios.post(`${API_URL}/friends/request/id/${requestId}/accept`, {}, {
        withCredentials: true,
      });
      toast.success("Friend request accepted!");
      fetchUsers(search);
    } catch (error) {
      toast.error("Failed to accept friend request");
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await axios.post(`${API_URL}/friends/request/id/${requestId}/reject`, {}, {
        withCredentials: true,
      });
      toast.success("Friend request rejected");
      fetchUsers(search);
    } catch (error) {
      toast.error("Failed to reject friend request");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Discover People</h1>
        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            className="pl-9 bg-card/50 border-border rounded-full py-6 focus-visible:ring-primary" 
            placeholder="Search by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-card/20 animate-pulse rounded-2xl border border-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((u) => (
            <Card key={u.id} className="border-border bg-card/30 backdrop-blur-xl hover:bg-card/50 transition-all duration-300 group overflow-hidden">
              <CardContent className="p-4 flex items-center space-x-4">
                <Avatar className="w-16 h-16 border-2 border-primary/10 group-hover:border-primary/30 transition-colors">
                   <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase">
                    {u.name?.[0] || u.username?.[0]}
                  </div>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate text-lg">{u.name || u.username}</h3>
                  <p className="text-xs text-muted-foreground truncate mb-2">{u.email}</p>
                  
                  {u.relationship === "FRIEND" ? (
                    <div className="flex items-center text-[10px] font-bold text-primary uppercase tracking-wider">
                       <Check className="w-3 h-3 mr-1" /> Friends
                    </div>
                  ) : u.relationship === "REQUEST_SENT" ? (
                    <div className="flex items-center text-[10px] font-bold text-yellow-500 uppercase tracking-wider">
                       <Clock className="w-3 h-3 mr-1" /> Request Sent
                    </div>
                  ) : u.relationship === "REQUEST_RECEIVED" ? (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="h-8 w-8 rounded-full p-0 shadow-lg shadow-primary/20 hover:shadow-primary/30"
                        onClick={() => acceptRequest(u.friendRequestId)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="h-8 w-8 rounded-full p-0 shadow-lg shadow-destructive/20 hover:shadow-destructive/30"
                        onClick={() => rejectRequest(u.friendRequestId)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      className="h-8 rounded-full px-4 shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
                      onClick={() => sendRequest(u.id)}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-2" /> Add Friend
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && users.length === 0 && (
        <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-border/50">
          <p className="text-muted-foreground text-lg">No users found.</p>
          <p className="text-sm text-muted-foreground/60">Try searching for a different name or email.</p>
        </div>
      )}
    </div>
  );
}
