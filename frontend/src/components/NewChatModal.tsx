import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2, User as UserIcon, MessageSquare } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/lib/utils";
import { useDispatch } from "react-redux";
import { setActiveConversation } from "@/store/slices/chatSlice";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const dispatch = useDispatch();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setIsSearching(true);
    setError(null);
    setFoundUser(null);

    try {
      const res = await axios.get(`${API_URL}/user/search/phone`, {
        params: { phoneNumber: phoneNumber.trim() },
        withCredentials: true,
      });
      setFoundUser(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "User not found");
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartChat = () => {
    if (foundUser) {
      dispatch(setActiveConversation(foundUser));
      onClose();
      setPhoneNumber("");
      setFoundUser(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
          <DialogDescription>
            Search for a user by their phone number to start a conversation.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSearch} className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)} 
              className="bg-background rounded-full"
              placeholder="Enter phone number (e.g. +91 9876543210)"
              disabled={isSearching}
            />
            <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          {foundUser && (
            <div className="p-4 rounded-xl border border-border bg-accent/30 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={foundUser.image} />
                  <AvatarFallback>{foundUser.name?.[0] || <UserIcon />}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-sm">{foundUser.name}</h4>
                  <p className="text-xs text-muted-foreground">{foundUser.phoneNumber}</p>
                </div>
              </div>
              <Button size="sm" onClick={handleStartChat} className="rounded-full gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
