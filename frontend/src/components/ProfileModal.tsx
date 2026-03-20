import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User as UserIcon } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/lib/utils";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/slices/authSlice";

interface ProfileModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  isSelf?: boolean;
}

export function ProfileModal({ user, isOpen, onClose, isSelf = false }: ProfileModalProps) {
  const dispatch = useDispatch();
  const [name, setName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [about, setAbout] = useState(user?.about || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async () => {
    if (!name.trim()) return;
    setIsUpdating(true);
    try {
      const res = await axios.patch(`${API_URL}/user/profile`, { name, phoneNumber, about }, { withCredentials: true });
      dispatch(setUser(res.data));
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post(`${API_URL}/user/profile-picture`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      dispatch(setUser(res.data));
    } catch (error) {
      console.error("Failed to upload profile picture", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{isSelf ? "Edit Profile" : "Contact Info"}</DialogTitle>
          <DialogDescription>
            {isSelf ? "Update your public profile information here." : `Viewing ${user?.name}'s profile.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative group">
            <Avatar className="w-24 h-24 border-2 border-primary/20">
              <AvatarImage src={user?.image} />
              <AvatarFallback className="text-2xl">
                {user?.name?.charAt(0) || <UserIcon />}
              </AvatarFallback>
            </Avatar>
            {isSelf && (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                >
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Camera className="w-6 h-6 text-white" />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
              </>
            )}
          </div>

          <div className="w-full space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Display Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="bg-background"
              placeholder="Enter your name"
              disabled={isUpdating}
            />
          </div>

          <div className="w-full space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
            <Input 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)} 
              className="bg-background"
              placeholder="e.g. +91 9876543210"
              disabled={isUpdating}
            />
          </div>
          
          <div className="w-full space-y-2">
            <label className="text-sm font-medium text-muted-foreground">About / Status</label>
            <Input 
              value={about} 
              onChange={(e) => setAbout(e.target.value)} 
              className="bg-background"
              placeholder="e.g. Hey there! I am using this chat app."
              disabled={isUpdating}
            />
          </div>
          
          <div className="w-full space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Email Address</label>
            <p className="text-sm px-3 py-2 bg-muted rounded-md text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {isSelf && (
            <Button onClick={handleUpdateProfile} disabled={isUpdating || (name === user?.name && phoneNumber === user?.phoneNumber && about === user?.about)}>
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
