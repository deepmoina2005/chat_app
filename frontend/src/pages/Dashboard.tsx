import { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { socketService } from "@/lib/socket";
import { setConversations, setActiveConversation, setMessages, addMessage, 
  markMessagesAsReadRedux, 
  updateUserPresence, 
  updateUserProfile,
  deleteMessageRedux, 
  clearMessages,
  removeConversationRedux 
} from "@/store/slices/chatSlice";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Search, MessageSquare, Trash2, Check, CheckCheck, MoreVertical, Paperclip, X, Loader2, Plus, User as UserIcon, CheckCircle2, XCircle, Ban, ChevronLeft } from "lucide-react";
import axios from "axios";
import { API_URL, cn } from "@/lib/utils";
import { type RootState } from "@/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ProfileModal } from "@/components/ProfileModal";
import { NewChatModal } from "@/components/NewChatModal";
import { toast } from "sonner";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state: RootState) => state.auth);
  const { conversations, activeConversation, messages } = useAppSelector((state: RootState) => state.chat);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isViewingContact, setIsViewingContact] = useState(false);

  const toggleMessageSelection = (id: string) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMessages(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedMessages.size === 0) return;
    if (!confirm(`Delete ${selectedMessages.size} messages for everyone?`)) return;
    
    try {
      for (const id of selectedMessages) {
        await axios.delete(`${API_URL}/chat/message/${id}?type=everyone`, { withCredentials: true });
        dispatch(deleteMessageRedux({ id, type: "everyone" }));
      }
      setSelectedMessages(new Set());
      setIsSelectMode(false);
      toast.success("Messages deleted");
    } catch (error) {
      toast.error("Failed to delete some messages");
    }
  };

  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return "Offline";
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return `Last seen today at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
    return `Last seen ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  useEffect(() => {
    if (user) {
      socketService.connect(user.id);
      
      const handleNewMessage = (message: any) => {
         dispatch(addMessage(message));
      };

      const handleUserTyping = ({ userId, isTyping }: any) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      };

      const handleUserOnline = ({ userId }: {userId: string}) => {
        dispatch(updateUserPresence({ id: userId, isOnline: true }));
      };
      
      const handleUserOffline = ({ userId, lastSeen }: {userId: string, lastSeen: string}) => {
        dispatch(updateUserPresence({ id: userId, isOnline: false, lastSeen }));
      };

      const handleMessagesRead = ({ readerId, senderId }: any) => {
         dispatch(markMessagesAsReadRedux({ senderId, readerId }));
      };

      const handleMessageDeleted = ({ messageId, type }: any) => {
         dispatch(deleteMessageRedux({ id: messageId, type: type || "everyone" }));
      };

      const handleChatCleared = ({ byUserId, otherUserId }: any) => {
         if (user?.id === otherUserId || user?.id === byUserId) {
             const clearedWith = user.id === otherUserId ? byUserId : otherUserId;
             dispatch(clearMessages(clearedWith));
         }
      };

      const handleProfileUpdated = (updatedUser: any) => {
        dispatch(updateUserProfile({
          id: updatedUser.id,
          name: updatedUser.name,
          image: updatedUser.image,
          about: updatedUser.about
        }));
      };

      socketService.on("new_message", handleNewMessage);
      socketService.on("user_typing", handleUserTyping);
      socketService.on("user_online", handleUserOnline);
      socketService.on("user_offline", handleUserOffline);
      socketService.on("messages_read", handleMessagesRead);
      socketService.on("message_deleted", handleMessageDeleted);
      socketService.on("chat_cleared", handleChatCleared);
      socketService.on("profile_updated", handleProfileUpdated);
      socketService.on("conversation_deleted", ({ otherUserId }: any) => {
        dispatch(removeConversationRedux(otherUserId));
      });
      
      fetchConversations();

      return () => {
        socketService.off("new_message");
        socketService.off("user_typing");
        socketService.off("user_online");
        socketService.off("user_offline");
        socketService.off("messages_read");
        socketService.off("message_deleted");
        socketService.off("chat_cleared");
        socketService.off("profile_updated");
        socketService.off("conversation_deleted");
        socketService.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    if (activeConversation && user) {
      fetchMessages(activeConversation.id);
      const room = [user.id, activeConversation.id].sort().join("-");
      socketService.emit("join", room);

      // Remove check_online emit since we initialize online users via fetchConversations

      // Mark messages as read since we just opened this chat
      axios.post(`${API_URL}/chat/mark-read`, { senderId: activeConversation.id }, { withCredentials: true })
        .then(() => dispatch(markMessagesAsReadRedux({ senderId: activeConversation.id, readerId: user.id })))
        .catch(console.error);
    }
  }, [activeConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/chat/conversations`, {
        withCredentials: true,
      });
      dispatch(setConversations(response.data));
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    try {
      const response = await axios.get(`${API_URL}/chat/messages/${otherUserId}`, {
        withCredentials: true,
      });
      dispatch(setMessages(response.data.messages || response.data));
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !activeConversation) return;

    try {
        const content = newMessage;
        setNewMessage("");
        
        // Clear typing indicator immediately upon sending
        if (isTyping) {
          setIsTyping(false);
          const room = [user?.id || "", activeConversation.id].sort().join("-");
          socketService.emit("typing", { conversationId: room, isTyping: false });
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }

        let imageUrl = null;
        if (selectedImage) {
          setIsUploading(true);
          const formData = new FormData();
          formData.append("image", selectedImage);
          const uploadRes = await axios.post(`${API_URL}/chat/media`, formData, {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          });
          imageUrl = uploadRes.data.imageUrl;
          setIsUploading(false);
          setSelectedImage(null);
          setImagePreview(null);
        }
        
      const response = await axios.post(`${API_URL}/chat/send`, {
        receiverId: activeConversation.id,
        content: content,
        imageUrl: imageUrl,
      }, {
        withCredentials: true,
      });
      
      // Optimistically add the message to the state
      if (response.data) {
        dispatch(addMessage(response.data));
      }
    } catch (error) {
      console.error("Failed to send message", error);
      setIsUploading(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!activeConversation || !user) return;

    const room = [user.id, activeConversation.id].sort().join("-");

    if (!isTyping) {
      setIsTyping(true);
      socketService.emit("typing", { conversationId: room, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.emit("typing", { conversationId: room, isTyping: false });
    }, 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearChat = async () => {
    if (!activeConversation) return;
    try {
      await axios.delete(`${API_URL}/chat/clear/${activeConversation.id}`, { withCredentials: true });
      dispatch(clearMessages(activeConversation.id));
      toast.success("Chat cleared");
    } catch (error) {
      toast.error("Failed to clear chat");
    }
  };

  const handleDeleteChat = async () => {
    if (!activeConversation) return;
    if (!confirm("Are you sure you want to delete this chat permanently? You will also be unfriended.")) return;
    try {
      await axios.delete(`${API_URL}/chat/conversation/${activeConversation.id}`, { withCredentials: true });
      dispatch(removeConversationRedux(activeConversation.id));
      toast.success("Chat deleted");
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  };

  const handleBlockUser = async () => {
    if (!activeConversation) return;
    try {
      await axios.post(`${API_URL}/user/block/${activeConversation.id}`, {}, { withCredentials: true });
      toast.success("User blocked");
    } catch (error) {
      toast.error("Failed to block user");
    }
  };

  const handleDeleteMessage = async (msgId: string, type: "me" | "everyone") => {
    try {
      await axios.delete(`${API_URL}/chat/message/${msgId}?type=` + type, { withCredentials: true });
      dispatch(deleteMessageRedux({ id: msgId, type }));
    } catch (error) {
       console.error("Failed to delete message", error);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversations List */}
      <div className={cn(
        "w-full md:w-80 border-r border-border bg-card/20 backdrop-blur-md flex flex-col transition-all duration-300",
        activeConversation && "max-md:hidden"
      )}>

        <div className="p-4 border-b border-border sticky top-0 bg-card/10 backdrop-blur-xl z-20 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              ChatApp
            </h1>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full hover:bg-primary/10 transition-all active:scale-95"
                title="Search"
                onClick={() => setIsSearchModalOpen(true)}
              >
                <Search className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full hover:bg-primary/10 transition-all active:scale-95"
                onClick={() => setIsNewChatModalOpen(true)}
                title="New Chat"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
          {/* Desktop Search - Hidden on Small Mobile Header, but let's keep it visible on Desktop List */}
          <div className="mt-3 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                className="pl-9 bg-background/50 border-border rounded-full" 
                placeholder="Search chats..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {conversations.filter(c => (c.name || c.username).toLowerCase().includes(searchTerm.toLowerCase())).map((conv: any) => (
            <div
              key={conv.id}
              onClick={() => dispatch(setActiveConversation(conv))}
              className={cn(
                "flex items-center space-x-3 p-4 cursor-pointer transition-colors border-b border-border/50",
                activeConversation?.id === conv.id ? "bg-primary/10 border-r-2 border-r-primary" : "hover:bg-accent/30"
              )}
            >
              <div className="relative">
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarImage src={conv.image} />
                  <AvatarFallback>
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
                      {conv.name?.[0] || conv.username?.[0] || "U"}
                    </div>
                  </AvatarFallback>
                </Avatar>
                {conv.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold truncate">{conv.name || conv.username}</h3>
                  <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                    {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate italic">
                  {conv.lastMessage?.content || "No messages yet"}
                </p>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No conversations yet. Go to Discover to find friends!
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Window */}
      <div className={cn(
        "flex-1 flex flex-col bg-background/30 backdrop-blur-sm transition-all duration-300",
        !activeConversation && "max-md:hidden"
      )}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border bg-card/10 backdrop-blur-xl flex items-center justify-between shadow-sm sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <Button 
                   variant="ghost" 
                   size="icon" 
                   className="md:hidden rounded-full mr-1 h-8 w-8" 
                   onClick={() => dispatch(setActiveConversation(null))}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Avatar className="w-10 h-10 border border-border">
                   <AvatarImage src={activeConversation.image} />
                   <AvatarFallback>
                     <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
                      {activeConversation.name?.[0] || activeConversation.username?.[0] || "U"}
                    </div>
                   </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-bold">{activeConversation.name || activeConversation.username}</h2>
                  <p className="text-[10px] whitespace-pre font-medium">
                    {typingUsers.has(activeConversation.id) ? (
                      <span className="italic animate-pulse text-green-500">Typing...</span>
                    ) : activeConversation.isOnline ? (
                      <span className="text-green-500">Online</span>
                    ) : (
                      <span className="text-muted-foreground">{formatLastSeen(activeConversation.lastSeen)}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 transition-all">
                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-card/80 backdrop-blur-xl border-border">
                    <DropdownMenuItem onClick={() => setIsViewingContact(true)} className="gap-2 cursor-pointer">
                      <UserIcon className="w-4 h-4" /> Contact Info
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsSelectMode(!isSelectMode)} className="gap-2 cursor-pointer">
                      <CheckCircle2 className="w-4 h-4" /> {isSelectMode ? "Cancel Select" : "Select Messages"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleClearChat} className="gap-2 cursor-pointer text-yellow-500 hover:text-yellow-600">
                      <Trash2 className="w-4 h-4" /> Clear Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteChat} className="gap-2 cursor-pointer text-destructive hover:text-destructive/80">
                      <Trash2 className="w-4 h-4" /> Delete Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => dispatch(setActiveConversation(null))} className="gap-2 cursor-pointer">
                      <XCircle className="w-4 h-4" /> Close Chat
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={activeConversation.isBlocked ? async () => {
                        try {
                          await axios.post(`${API_URL}/user/unblock/${activeConversation.id}`, {}, { withCredentials: true });
                          toast.success("User unblocked");
                          fetchConversations();
                        } catch (error) { toast.error("Failed to unblock"); }
                      } : handleBlockUser} 
                      className={cn("gap-2 cursor-pointer font-semibold", activeConversation.isBlocked ? "text-green-500" : "text-destructive")}
                    >
                      <Ban className="w-4 h-4" /> {activeConversation.isBlocked ? "Unblock User" : "Block User"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Select Actions Bar */}
            {isSelectMode && (
              <div className="bg-primary/10 border-b border-primary/20 p-2 flex items-center justify-between animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => { setIsSelectMode(false); setSelectedMessages(new Set()); }}>
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                  <span className="text-sm font-medium">{selectedMessages.size} selected</span>
                </div>
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={selectedMessages.size === 0}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                </Button>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                 {messages.map((msg: any, i: number) => {
                   const isMe = msg.senderId === user?.id;
                   return (
                     <div key={msg.id} className={cn("flex flex-col group", isMe ? "items-end" : "items-start")}>
                         <div className={cn("flex items-center gap-2", isMe ? "flex-row" : "flex-row-reverse")}>
                            {isSelectMode && !msg.isDeleted && (
                              <div 
                                onClick={() => toggleMessageSelection(msg.id)}
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all",
                                  selectedMessages.has(msg.id) 
                                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30" 
                                    : "border-muted-foreground/30 hover:border-primary/50"
                                )}
                              >
                                {selectedMessages.has(msg.id) && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            )}
                            <div className={cn(
                              "flex gap-1 transition-opacity", 
                              isSelectMode ? "opacity-0 invisible pointer-events-none" : "opacity-0 group-hover:opacity-100"
                            )}>
                             {!msg.isDeleted && (
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="w-6 h-6 rounded-full hover:bg-muted focus-visible:ring-0"
                                   >
                                     <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                   </Button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent align={isMe ? "end" : "start"} side="top" className="w-40 z-[100] shadow-xl border-border shadow-black/20">
                                     {isMe && (
                                       <DropdownMenuItem 
                                         className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-xs py-2" 
                                         onClick={() => handleDeleteMessage(msg.id, "everyone")}
                                       >
                                         Delete for everyone
                                       </DropdownMenuItem>
                                     )}
                                     <DropdownMenuItem 
                                       className="cursor-pointer text-xs py-2 focus:bg-accent"
                                       onClick={() => handleDeleteMessage(msg.id, "me")}
                                     >
                                       Delete for me
                                     </DropdownMenuItem>
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             )}
                           </div>
                           <div 
                             onClick={() => isSelectMode ? toggleMessageSelection(msg.id) : null}
                             className={cn(
                               "max-w-[70%] p-1 rounded-2xl text-sm shadow-sm overflow-hidden transition-all duration-200",
                               isSelectMode && "cursor-pointer hover:ring-2 hover:ring-primary/30",
                               selectedMessages.has(msg.id) && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[0.98]",
                               msg.isDeleted ? "bg-muted text-muted-foreground italic border border-border/50 p-3" :
                               isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border rounded-tl-none"
                             )}
                           >
                             {!msg.isDeleted && msg.imageUrl && (
                               <div className={cn(
                                 "mb-1 rounded-xl overflow-hidden",
                                 !isSelectMode && "cursor-pointer"
                               )} onClick={(e) => {
                                 if (!isSelectMode) {
                                   e.stopPropagation();
                                   window.open(msg.imageUrl, '_blank');
                                 }
                               }}>
                                 <img src={msg.imageUrl} alt="attached" className="max-w-full h-auto object-cover hover:scale-105 transition-transform duration-300" />
                               </div>
                             )}
                              <div className={cn(!msg.isDeleted && msg.imageUrl && "px-2 pb-2")}>
                                {msg.isDeleted ? "🚫 This message was deleted" : msg.content}
                              </div>
                            </div>
                         </div>
                        <div className="flex items-center space-x-1 mt-1 px-1">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                             <span className="text-muted-foreground">
                                {msg.isRead ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3" />}
                             </span>
                          )}
                        </div>
                        {i === messages.length - 1 && <div ref={scrollRef} />}
                     </div>
                   );
                })}
              </div>
            </ScrollArea>

            {/* Input */}
            {!isSelectMode && (
              <div className="p-4 bg-card/5 backdrop-blur-xl border-t border-border">
                {imagePreview && (
                  <div className="max-w-4xl mx-auto mb-4 relative inline-block">
                    <img src={imagePreview} className="h-32 rounded-lg border border-border" alt="preview" />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                      onClick={removeSelectedImage}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center space-x-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileSelect} 
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="w-12 h-12 rounded-full hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Input
                  className="flex-1 bg-background/50 border-border rounded-full py-6 px-6 focus-visible:ring-primary"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleTyping}
                  disabled={isUploading}
                />
                <Button type="submit" size="icon" className="w-12 h-12 rounded-full shadow-lg shadow-primary/20 transition-transform active:scale-95" disabled={isUploading}>
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </form>
            </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
             <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center animate-pulse">
                <MessageSquare className="w-12 h-12 text-primary/40" />
             </div>
             <div>
                <h2 className="text-2xl font-bold">Your Messages</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Select a conversation from the sidebar or start a new one to begin chatting in real-time.
                </p>
             </div>
          </div>
        )}
      </div>
      {/* Modals */}
      <ProfileModal 
        user={user} 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        isSelf={true}
      />
      <ProfileModal 
        user={activeConversation} 
        isOpen={isViewingContact} 
        onClose={() => setIsViewingContact(false)} 
        isSelf={false}
      />
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />

      <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Search Conversations</DialogTitle>
          </DialogHeader>
          <div className="relative py-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              autoFocus
              className="pl-9 bg-background border-border rounded-full" 
              placeholder="Who are you looking for?" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
             {conversations
                .filter(c => (c.name || c.username).toLowerCase().includes(searchTerm.toLowerCase()))
                .map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => { dispatch(setActiveConversation(c)); setIsSearchModalOpen(false); }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent cursor-pointer border border-transparent hover:border-border transition-all"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={c.image} />
                      <AvatarFallback>{(c.name || c.username)?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{c.name || c.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.lastMessage?.content || "No messages"}</p>
                    </div>
                  </div>
                ))
             }
             {searchTerm && conversations.filter(c => (c.name || c.username).toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
               <p className="text-center text-sm text-muted-foreground py-4">No results for "{searchTerm}"</p>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
